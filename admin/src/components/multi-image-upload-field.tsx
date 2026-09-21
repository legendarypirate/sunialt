'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { prepareImageForUpload } from '@/lib/image-upload-utils';
import { mn } from '@/lib/mn';

type MultiImageUploadFieldProps = {
  label: string;
  values: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
};

export function MultiImageUploadField({
  label,
  values,
  onChange,
  folder = 'sunialt/products',
}: MultiImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        const prepared = await prepareImageForUpload(file);
        const result = await api.uploadImage(prepared, folder);
        uploaded.push(result.url);
      }
      onChange([...values, ...uploaded]);
    } catch (error) {
      alert(error instanceof Error ? error.message : mn.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>{label}</Label>
          <p className="text-xs text-muted-foreground">{mn.coverImageHint}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
          {uploading ? mn.uploading : mn.addImage}
        </Button>
      </div>

      {values.length === 0 ? (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 text-muted-foreground transition hover:bg-muted/40 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}
          <span className="text-sm">{uploading ? mn.uploading : mn.uploadImage}</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {values.map((url, index) => (
            <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-lg border bg-muted/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="aspect-square w-full object-cover" />
              {index === 0 && (
                <Badge className="absolute left-2 top-2" variant="secondary">
                  {mn.coverImage}
                </Badge>
              )}
              <Button
                type="button"
                size="icon-sm"
                variant="destructive"
                className="absolute right-2 top-2 opacity-90"
                onClick={() => removeAt(index)}
                aria-label={mn.removeImage}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/10 text-muted-foreground transition hover:bg-muted/30 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-xs">{mn.addImage}</span>
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files?.length) uploadFiles(files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
