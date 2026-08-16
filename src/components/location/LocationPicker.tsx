"use client";

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

type LocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (latitude: number, longitude: number) => void;
};

const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,

  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-xl border border-gray-300 bg-gray-100">
      <p className="text-sm text-gray-500">Loading map...</p>
    </div>
  ),
});

export default function LocationPicker(props: LocationPickerProps) {
  return <LocationPickerMap {...props} />;
}
