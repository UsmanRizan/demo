"use client";

import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

import L from "leaflet";

type LocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (latitude: number, longitude: number) => void;
};

const defaultPosition: [number, number] = [7.8731, 80.7718];

const markerIcon = L.divIcon({
  className: "",
  html: `
      <div style="
        width: 28px;
        height: 28px;
        background: #111;
        border: 4px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function MapClickHandler({
  onLocationChange,
}: {
  onLocationChange: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onLocationChange(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onLocationChange,
}: LocationPickerProps) {
  const position: [number, number] =
    latitude !== null && longitude !== null
      ? [latitude, longitude]
      : defaultPosition;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-300">
      <MapContainer
        center={position}
        zoom={latitude !== null && longitude !== null ? 15 : 8}
        scrollWheelZoom
        className="h-[300px] w-full sm:h-[400px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onLocationChange={onLocationChange} />

        {latitude !== null && longitude !== null && (
          <Marker position={[latitude, longitude]} icon={markerIcon} />
        )}
      </MapContainer>
    </div>
  );
}
