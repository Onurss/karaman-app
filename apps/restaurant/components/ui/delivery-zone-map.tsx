'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, Polygon, useJsApiLoader, DrawingManager, Marker } from '@react-google-maps/api';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, MapPin, Trash2, Pencil } from 'lucide-react';
import { Button } from './button';
import { useSupabase } from '@/lib/hooks/use-supabase';
import { KARAMAN_CENTER } from '@karaman/utils';
import type { GeoPoint } from '@karaman/shared-types';

interface Props {
  restaurantId: string;
  restaurantLocation?: GeoPoint | null;
  initialGeoJson?: GeoJsonPolygon | GeoJsonMultiPolygon | null;
  onSaved?: () => void;
}

interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

interface GeoJsonMultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

const LIBRARIES: ('drawing')[] = ['drawing'];

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '420px',
  borderRadius: '0.5rem',
};

const POLYGON_OPTIONS = {
  fillColor: '#22c55e',
  fillOpacity: 0.18,
  strokeColor: '#16a34a',
  strokeWeight: 2,
  editable: true,
  draggable: false,
  clickable: false,
  zIndex: 1,
};

function geoJsonToPaths(
  geojson: GeoJsonPolygon | GeoJsonMultiPolygon | null | undefined
): google.maps.LatLngLiteral[][] {
  if (!geojson) return [];
  if (geojson.type === 'Polygon') {
    return geojson.coordinates.map(ring =>
      ring.map(([lng, lat]) => ({ lat, lng }))
    );
  }
  return geojson.coordinates.flatMap(poly =>
    poly.map(ring => ring.map(([lng, lat]) => ({ lat, lng })))
  );
}

function pathsToGeoJson(paths: google.maps.LatLngLiteral[][]): GeoJsonPolygon | null {
  if (!paths.length || !paths[0].length) return null;
  const rings = paths.map(ring => {
    const coords = ring.map(p => [p.lng, p.lat]);
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push([first[0], first[1]]);
    }
    return coords;
  });
  return { type: 'Polygon', coordinates: rings };
}

export function DeliveryZoneMap({
  restaurantId,
  restaurantLocation,
  initialGeoJson,
  onSaved,
}: Props) {
  const supabase = useSupabase();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    language: 'tr',
    region: 'TR',
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const [paths, setPaths] = useState<google.maps.LatLngLiteral[][]>(() =>
    geoJsonToPaths(initialGeoJson)
  );
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setPaths(geoJsonToPaths(initialGeoJson));
  }, [initialGeoJson]);

  const center = useMemo<google.maps.LatLngLiteral>(() => {
    if (restaurantLocation) return restaurantLocation;
    return KARAMAN_CENTER;
  }, [restaurantLocation]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const readPathsFromPolygon = useCallback(() => {
    const polygon = polygonRef.current;
    if (!polygon) return;
    const newPaths: google.maps.LatLngLiteral[][] = [];
    polygon.getPaths().forEach(path => {
      const ring: google.maps.LatLngLiteral[] = [];
      path.forEach(latLng => {
        ring.push({ lat: latLng.lat(), lng: latLng.lng() });
      });
      newPaths.push(ring);
    });
    setPaths(newPaths);
  }, []);

  const onPolygonLoad = useCallback(
    (polygon: google.maps.Polygon) => {
      polygonRef.current = polygon;
      const listeners: google.maps.MapsEventListener[] = [];
      polygon.getPaths().forEach(path => {
        listeners.push(path.addListener('set_at', readPathsFromPolygon));
        listeners.push(path.addListener('insert_at', readPathsFromPolygon));
        listeners.push(path.addListener('remove_at', readPathsFromPolygon));
      });
      (polygon as unknown as { _listeners?: google.maps.MapsEventListener[] })._listeners = listeners;
    },
    [readPathsFromPolygon]
  );

  const onPolygonUnmount = useCallback(() => {
    const polygon = polygonRef.current as unknown as { _listeners?: google.maps.MapsEventListener[] } | null;
    polygon?._listeners?.forEach(l => l.remove());
    polygonRef.current = null;
  }, []);

  const onPolygonComplete = useCallback((polygon: google.maps.Polygon) => {
    const path = polygon.getPath();
    const ring: google.maps.LatLngLiteral[] = [];
    path.forEach(latLng => {
      ring.push({ lat: latLng.lat(), lng: latLng.lng() });
    });
    setPaths([ring]);
    polygon.setMap(null);
    setIsEditing(false);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (geojson: GeoJsonPolygon | null) => {
      const { error } = await supabase.rpc('restaurant_set_delivery_zone', {
        p_restaurant_id: restaurantId,
        p_polygon_geojson: geojson,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Teslimat bölgesi kaydedildi.');
      onSaved?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = () => {
    const geojson = pathsToGeoJson(paths);
    saveMutation.mutate(geojson);
  };

  const handleClear = () => {
    if (!confirm('Teslimat bölgesini silmek istediğinize emin misiniz? Tüm adreslere teslimat yapılacak.')) {
      return;
    }
    setPaths([]);
    saveMutation.mutate(null);
  };

  const handleStartDraw = () => {
    setPaths([]);
    setIsEditing(true);
  };

  if (!apiKey) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Google Maps API anahtarı tanımlı değil.</p>
        <p className="mt-1 text-xs">
          <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> ortam
          değişkenini ekleyip uygulamayı yeniden başlatın.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Harita yüklenemedi: {loadError.message}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-md border bg-gray-50 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Harita yükleniyor…
      </div>
    );
  }

  const hasPolygon = paths.length > 0 && paths[0].length >= 3;

  return (
    <div className="space-y-3">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={13}
        onLoad={onMapLoad}
        options={{
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
          clickableIcons: false,
        }}
      >
        {restaurantLocation ? (
          <Marker
            position={restaurantLocation}
            label={{ text: 'R', color: '#fff', fontWeight: 'bold' }}
          />
        ) : null}

        {hasPolygon ? (
          <Polygon
            paths={paths}
            options={POLYGON_OPTIONS}
            onLoad={onPolygonLoad}
            onUnmount={onPolygonUnmount}
          />
        ) : null}

        {isEditing && !hasPolygon ? (
          <DrawingManager
            onPolygonComplete={onPolygonComplete}
            options={{
              drawingControl: false,
              drawingMode: google.maps.drawing.OverlayType.POLYGON,
              polygonOptions: POLYGON_OPTIONS,
            }}
          />
        ) : null}
      </GoogleMap>

      <div className="flex flex-wrap items-center gap-2">
        {!hasPolygon && !isEditing ? (
          <Button onClick={handleStartDraw} variant="outline" size="sm">
            <Pencil className="h-4 w-4" /> Bölge Çiz
          </Button>
        ) : null}

        {isEditing ? (
          <span className="text-xs text-gray-500">
            Haritada poligonun köşelerini tıklayarak çizin. Çift tıkla tamamla.
          </span>
        ) : null}

        {hasPolygon ? (
          <>
            <Button
              onClick={handleSave}
              size="sm"
              isLoading={saveMutation.isPending}
            >
              <MapPin className="h-4 w-4" /> Bölgeyi Kaydet
            </Button>
            <Button
              onClick={handleStartDraw}
              variant="outline"
              size="sm"
              disabled={saveMutation.isPending}
            >
              <Pencil className="h-4 w-4" /> Yeniden Çiz
            </Button>
            <Button
              onClick={handleClear}
              variant="ghost"
              size="sm"
              disabled={saveMutation.isPending}
            >
              <Trash2 className="h-4 w-4 text-red-500" /> Sil
            </Button>
          </>
        ) : null}
      </div>

      <p className="text-xs text-gray-500">
        Tanımlı bölge yoksa varsayılan olarak tüm Karaman&apos;a teslimat yapılır. Çizilen
        poligonun dışında kalan adresler sipariş veremez.
      </p>
    </div>
  );
}
