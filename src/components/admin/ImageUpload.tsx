import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  bucket: "product-images" | "brand-logos" | "category-images" | "store-assets";
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
};

export function ImageUpload({ bucket, value, onChange, label = "Image" }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handle = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
    toast.success("Uploaded");
  };

  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative size-24 rounded border border-zinc-800 overflow-hidden bg-zinc-900">
            <img src={value} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 hover:bg-red-500"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={uploading}
            className="size-24 rounded border-2 border-dashed border-zinc-700 hover:border-orange-500 flex items-center justify-center text-zinc-500 hover:text-orange-400 transition-colors"
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
          </button>
        )}
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handle(f);
            e.target.value = "";
          }}
        />
        {!value && (
          <p className="text-xs text-zinc-500">PNG, JPG up to 5MB</p>
        )}
      </div>
    </div>
  );
}

export function MultiImageUpload({
  bucket,
  values,
  onChange,
}: {
  bucket: "product-images";
  values: string[];
  onChange: (urls: string[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) {
        toast.error(error.message);
        continue;
      }
      uploaded.push(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
    }
    onChange([...values, ...uploaded]);
    setUploading(false);
    if (uploaded.length) toast.success(`Uploaded ${uploaded.length} image(s)`);
  };

  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2">
        Product Images
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {values.map((url, i) => (
          <div key={url} className="relative aspect-square rounded border border-zinc-800 overflow-hidden bg-zinc-900 group">
            <img src={url} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 bg-black/80 rounded-full p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500"
            >
              <X className="size-3" />
            </button>
            {i === 0 && (
              <span className="absolute bottom-1 left-1 text-[10px] uppercase bg-orange-500 text-black px-1.5 py-0.5 rounded">
                Cover
              </span>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="aspect-square rounded border-2 border-dashed border-zinc-700 hover:border-orange-500 flex flex-col items-center justify-center text-zinc-500 hover:text-orange-400 transition-colors gap-1"
        >
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
          <span className="text-[10px] uppercase">Add</span>
        </button>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
