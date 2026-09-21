'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { prepareImageForUpload } from '@/lib/image-upload-utils';
import { mn } from '@/lib/mn';

type ImageUploadFieldProps = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
};

export function ImageUploadField({ label, value, onChange, folder }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const prepared = await prepareImageForUpload(file);
      const result = await api.uploadImage(prepared, folder);
      onChange(result.url);
    } catch (error) {
      alert(error instanceof Error ? error.message : mn.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value ? (
        <div className="relative overflow-hidden rounded-lg border bg-muted/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="aspect-video w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {mn.changeImage}
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => onChange('')}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 text-muted-foreground transition hover:bg-muted/40 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <ImagePlus className="h-6 w-6" />
          )}
          <span className="text-sm">{uploading ? mn.uploading : mn.uploadImage}</span>
        </button>
      )}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
