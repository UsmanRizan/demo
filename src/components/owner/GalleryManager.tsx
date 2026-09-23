"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type GalleryImage = { id: string; url: string };

const MAX_IMAGES = 10;

export default function GalleryManager({
  kind,
  id,
}: {
  kind: "facility" | "location";
  id: string;
}) {
  const base = `/api/owner/${kind === "facility" ? "facilities" : "locations"}/${id}/images`;
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(base)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setImages(data.images ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load photos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [base]);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    try {
      for (const file of Array.from(files).slice(0, MAX_IMAGES - images.length)) {
        const form = new FormData();
        form.append("file", file);
        form.append("folder", kind === "facility" ? "facilities" : "locations");

        const uploadResponse = await fetch("/api/upload", { method: "POST", body: form });
        const uploaded = await uploadResponse.json();

        if (!uploadResponse.ok) {
          setError(uploaded.error || "Upload failed.");
          break;
        }

        const attachResponse = await fetch(base, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: uploaded.imageUrl, publicId: uploaded.publicId }),
        });
        const attached = await attachResponse.json();

        if (!attachResponse.ok) {
          setError(attached.error || "Couldn't add photo.");
          break;
        }

        setImages((current) => [...current, attached.image]);
      }
    } catch {
      setError("Network error during upload.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(imageId: string) {
    setError("");
    const response = await fetch(`${base}?imageId=${imageId}`, { method: "DELETE" });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Couldn't remove photo.");
      return;
    }

    setImages((current) => current.filter((image) => image.id !== imageId));
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Photos</h2>
        <span className="text-sm text-gray-500">
          {images.length}/{MAX_IMAGES}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Photos appear on your public venue page. JPEG, PNG or WebP up to 5 MB.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading photos…</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <div key={image.id} className="group relative aspect-square overflow-hidden rounded-lg border">
              <Image src={image.url} alt="" fill sizes="200px" className="object-cover" />
              <button
                type="button"
                onClick={() => remove(image.id)}
                className="absolute right-1 top-1 rounded bg-black/70 px-2 py-1 text-xs text-white"
                aria-label="Remove photo"
              >
                Remove
              </button>
            </div>
          ))}

          {images.length < MAX_IMAGES && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-500">
              {uploading ? "Uploading…" : "+ Add photos"}
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={uploading}
                onChange={(e) => upload(e.target.files)}
                className="sr-only"
              />
            </label>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
