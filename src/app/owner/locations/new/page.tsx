"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import LocationPicker from "@/components/location/LocationPicker";

export default function NewLocationPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");

  const [latitude, setLatitude] = useState<number | null>(null);

  const [longitude, setLongitude] = useState<number | null>(null);

  const [loadingAddress, setLoadingAddress] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleMapLocation(
    nextLatitude: number,
    nextLongitude: number,
  ) {
    setLatitude(nextLatitude);
    setLongitude(nextLongitude);

    setLoadingAddress(true);
    setError("");

    try {
      const response = await fetch(
        `/api/geocoding/reverse?lat=${encodeURIComponent(
          nextLatitude,
        )}&lon=${encodeURIComponent(nextLongitude)}`,
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not determine the address.");
        return;
      }

      setAddress(data.address || "");
      setCity(data.city || "");
    } catch {
      setError(
        "Could not automatically find the address. You can enter it manually.",
      );
    } finally {
      setLoadingAddress(false);
    }
  }

  async function createLocation(event: FormEvent) {
    event.preventDefault();

    if (latitude === null || longitude === null) {
      setError("Please select your location on the map.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/owner/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          address,
          city,
          description,
          phone,
          latitude,
          longitude,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create location");
        return;
      }

      router.push(`/owner/locations/${data.location.id}`);

      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <a href="/owner" className="text-sm text-gray-600">
          ← Back to Owner Dashboard
        </a>

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Create Location</h1>

          <p className="mt-2 text-gray-600">
            First place the pin on your venue. We'll automatically find the
            address and city.
          </p>

          <div className="mt-8">
            <label className="mb-2 block text-sm font-medium">
              Choose location
            </label>

            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              onLocationChange={handleMapLocation}
            />

            <div className="mt-3 text-sm text-gray-500">
              {latitude !== null && longitude !== null ? (
                <>
                  Selected coordinates: {latitude.toFixed(6)},{" "}
                  {longitude.toFixed(6)}
                </>
              ) : (
                "Click the map to place your venue."
              )}
            </div>

            {loadingAddress && (
              <div className="mt-3 rounded-lg bg-gray-100 p-3 text-sm text-gray-600">
                Finding address...
              </div>
            )}
          </div>

          <form onSubmit={createLocation} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Location name
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Colombo Indoor Sports Center"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Address</label>

              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Address will be filled automatically"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                required
              />

              <p className="mt-1 text-xs text-gray-500">
                Automatically filled from the selected map location. You can
                edit it.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">City</label>

              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="City will be filled automatically"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Phone</label>

              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+94771234567"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell players about this location..."
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
              disabled={
                loading ||
                loadingAddress ||
                latitude === null ||
                longitude === null
              }
              className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Location"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          Map data © OpenStreetMap contributors
        </p>
      </div>
    </main>
  );
}
