'use client';

import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabase } from '@/lib/hooks/use-supabase';

interface Props {
  bucket: string;
  pathPrefix: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  maxSizeMB?: number;
  aspect?: 'square' | 'wide';
}

const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ImageUpload({
  bucket,
  pathPrefix,
  value,
  onChange,
  maxSizeMB = 5,
  aspect = 'square',
}: Props) {
  const supabase = useSupabase();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!MIME_TYPES.includes(file.type)) {
      toast.error('Yalnızca JPEG, PNG veya WebP yükleyebilirsiniz.');
      return;
    }
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`Dosya boyutu en fazla ${maxSizeMB} MB olabilir.`);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const fullPath = `${pathPrefix.replace(/\/$/, '')}/${fileName}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(fullPath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });
      if (error) throw error;

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(fullPath);
      onChange(pub.publicUrl);
      toast.success('Görsel yüklendi.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Yükleme başarısız.';
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  const aspectClass = aspect === 'wide' ? 'aspect-[3/1]' : 'aspect-square';

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`relative w-full overflow-hidden rounded-md border-2 border-dashed border-gray-300 bg-gray-50 ${aspectClass} ${
          value ? 'border-solid border-gray-200' : ''
        }`}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Yüklenmiş görsel" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="absolute right-2 top-2 rounded-full bg-white p-1.5 shadow-md hover:bg-red-50"
              aria-label="Görseli kaldır"
            >
              <X className="h-4 w-4 text-red-500" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-500 hover:bg-gray-100"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <ImageIcon className="h-8 w-8" />
                <span className="text-sm font-medium">Görsel yükle</span>
                <span className="text-xs text-gray-400">JPG / PNG / WebP — max {maxSizeMB} MB</span>
              </>
            )}
          </button>
        )}
      </div>

      {value ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          Değiştir
        </button>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleSelect}
        className="hidden"
      />
    </div>
  );
}
