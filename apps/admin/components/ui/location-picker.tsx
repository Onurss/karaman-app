'use client';

import { useCallback, useRef, useState } from 'react';
import {
  GoogleMap,
  Marker,
  Autocomplete,
  useJsApiLoader,
} from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';
import { KARAMAN_CENTER } from '@karaman/utils';

const LIBRARIES: 'places'[] = ['places'];
const CONTAINER_STYLE = { width: '100%', height: '320px', borderRadius: '0.5rem' };

export interface PickedLocation {
  lat: number;
  lng: number;
  address?: string;
  district?: string;
}

interface Props {
  lat?: number | null;
  lng?: number | null;
  onChange: (loc: PickedLocation) => void;
}

function extractDistrict(
  components: google.maps.GeocoderAddressComponent[] | undefined,
): string | undefined {
  if (!components) return undefined;
  const find = (type: string) =>
    components.find(c => c.types.includes(type))?.long_name;
  // TR: ilçe genelde administrative_area_level_2; il administrative_area_level_1
  return (
    find('administrative_area_level_2') ??
    find('locality') ??
    find('administrative_area_level_1')
  );
}

/**
 * Karaman haritasından konum seçici. Haritaya tıklayınca / işaretçiyi
 * sürükleyince enlem-boylam ayarlanır ve reverse-geocoding ile adres + ilçe
 * otomatik gelir. Üstte adres arama kutusu (Places Autocomplete) vardır.
 */
export function LocationPicker({ lat, lng, onChange }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    language: 'tr',
    region: 'TR',
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);

  const position = {
    lat: typeof lat === 'number' && !Number.isNaN(lat) ? lat : KARAMAN_CENTER.lat,
    lng: typeof lng === 'number' && !Number.isNaN(lng) ? lng : KARAMAN_CENTER.lng,
  };

  const reverseGeocode = useCallback(
    (p: google.maps.LatLngLiteral) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: p }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          onChange({
            lat: p.lat,
            lng: p.lng,
            address: results[0].formatted_address,
            district: extractDistrict(results[0].address_components),
          });
        } else {
          onChange({ lat: p.lat, lng: p.lng });
        }
      });
    },
    [onChange],
  );

  const handleMapInteract = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      reverseGeocode({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    },
    [reverseGeocode],
  );

  const onPlaceChanged = useCallback(() => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    const loc = place.geometry?.location;
    if (!loc) return;
    const p = { lat: loc.lat(), lng: loc.lng() };
    mapRef.current?.panTo(p);
    mapRef.current?.setZoom(16);
    onChange({
      lat: p.lat,
      lng: p.lng,
      address: place.formatted_address,
      district: extractDistrict(place.address_components),
    });
  }, [autocomplete, onChange]);

  if (loadError) {
    return (
      <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
        Harita yüklenemedi. <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> tanımlı mı kontrol edin.
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-lg bg-gray-50">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Autocomplete
        onLoad={setAutocomplete}
        onPlaceChanged={onPlaceChanged}
        options={{ componentRestrictions: { country: 'tr' } }}
      >
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          placeholder="Adres ara… (veya haritaya tıkla)"
          type="text"
        />
      </Autocomplete>
      <GoogleMap
        mapContainerStyle={CONTAINER_STYLE}
        center={position}
        zoom={13}
        onLoad={m => {
          mapRef.current = m;
        }}
        onClick={handleMapInteract}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        <Marker position={position} draggable onDragEnd={handleMapInteract} />
      </GoogleMap>
      <p className="text-xs text-gray-500">
        Haritaya tıklayın veya işaretçiyi sürükleyin — enlem/boylam ve adres otomatik gelir.
      </p>
    </div>
  );
}
