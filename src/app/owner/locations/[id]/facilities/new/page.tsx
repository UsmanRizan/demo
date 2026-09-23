"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { getSportIcon } from "@/lib/sport-icons";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

type Sport = {
  id: string;
  name: string;
};

export default function NewFacilityPage() {
  const router = useRouter();
  const params = useParams();

  const locationId = params.id as string;

  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSportIds, setSelectedSportIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadingSports, setLoadingSports] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSports() {
      try {
        const response = await fetch("/api/owner/sports");
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load sports");
          return;
        }

        setSports(data.sports);
      } catch {
        setError("Failed to load sports");
      } finally {
        setLoadingSports(false);
      }
    }

    loadSports();
  }, []);

  async function uploadImage(file: File) {
    setUploading(true);
    setError("");

    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be smaller than 5 MB");
      setUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to upload image");
        return;
      }

      setImageUrl(data.imageUrl);
    } catch {
      setError("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  function removeImage() {
    setImageUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function createFacility(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/owner/facilities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locationId,
          sportIds: selectedSportIds,
          name,
          description,
          price,
          imageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create facility");
        return;
      }

      router.push(`/owner/locations/${locationId}`);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <a
          href={`/owner/locations/${locationId}`}
          className="text-sm text-gray-600"
        >
          ← Back to Location
        </a>

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Add Facility</h1>

          <p className="mt-2 text-gray-600">
            Add a court, turf, room, or other bookable facility.
          </p>

          <form onSubmit={createFacility} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">Facility image</label>

              {imageUrl ? (
                <div className="flex items-start gap-4">
                  <Image
                    src={imageUrl}
                    alt="Facility preview"
                    width={160}
                    height={120}
                    className="h-28 w-40 rounded-lg border border-gray-200 object-cover"
                  />

                  <button
                    type="button"
                    onClick={removeImage}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:border-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center transition hover:border-black">
                  <span className="text-2xl">🖼️</span>
                  <span className="text-sm font-medium">
                    {uploading ? "Uploading..." : "Click to upload an image"}
                  </span>
                  <span className="text-xs text-gray-500">
                    JPEG, PNG, or WebP up to 5 MB
                  </span>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        uploadImage(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Sports (select one or more)
              </label>

              {loadingSports ? (
                <p className="text-sm text-gray-500">Loading sports...</p>
              ) : sports.length === 0 ? (
                <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                  There are no active sports yet. Ask an administrator to add a
                  sport.
                </div>
              ) : (
                <div className="space-y-2">
                  {sports.map((sport) => (
                    <label
                      key={sport.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 transition hover:border-black"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSportIds.includes(sport.id)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedSportIds((prev) => [...prev, sport.id]);
                          } else {
                            setSelectedSportIds((prev) =>
                              prev.filter((id) => id !== sport.id),
                            );
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">{getSportIcon(sport.name)} {sport.name}</span>
                    </label>
                  ))}
                </div>
              )}

              {selectedSportIds.length === 0 && !loadingSports && sports.length > 0 && (
                <p className="mt-1 text-xs text-red-500">
                  Please select at least one sport.
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Facility name
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Badminton Court 1"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Price per booking
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="2500"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                required
              />

              <p className="mt-1 text-xs text-gray-500">
                We&apos;ll make the pricing/slot duration more flexible later.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Air-conditioned court with changing rooms..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || uploading || loadingSports || sports.length === 0 || selectedSportIds.length === 0}
              className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Facility"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
