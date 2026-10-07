import Image from "next/image";

import { planTiles, tileUrl, TILE_SIZE } from "@/lib/map-tiles";

type VenueMapProps = {
  latitude: number;
  longitude: number;
  name: string;
  /** Rendered pixel size; the container scales it down responsively. */
  width?: number;
  height?: number;
  zoom?: number;
};

/**
 * A static, keyless map of the venue built from OpenStreetMap raster tiles.
 *
 * Rendered on the server as plain images so the venue page needs no map
 * JavaScript, and the marker stays fixed at the venue's coordinates.
 */
export default function VenueMap({
  latitude,
  longitude,
  name,
  width = 720,
  height = 320,
  zoom = 16,
}: VenueMapProps) {
  const tiles = planTiles({ latitude, longitude, zoom, width, height });
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <figure className="mt-6">
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block overflow-hidden border-[3px] border-black"
        style={{ aspectRatio: `${width} / ${height}` }}
        aria-label={`Open ${name} in Google Maps`}
      >
        <div
          className="absolute inset-0"
          style={{ width, height }}
          aria-hidden="true"
        >
          {tiles.map((tile) => (
            <Image
              key={`${tile.x}:${tile.y}`}
              src={tileUrl(zoom, tile.x, tile.y)}
              alt=""
              width={TILE_SIZE}
              height={TILE_SIZE}
              unoptimized
              className="absolute select-none"
              style={{ left: tile.left, top: tile.top }}
            />
          ))}
        </div>

        {/* Marker, pinned to the exact centre of the requested coordinates. */}
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full"
          aria-hidden="true"
        >
          <svg
            width="36"
            height="46"
            viewBox="0 0 24 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]"
          >
            <path
              d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20C24 5.373 18.627 0 12 0Z"
              fill="#111111"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <circle cx="12" cy="12" r="4.5" fill="#FFFFFF" />
          </svg>
        </span>

        {/* Opens the interactive map on click. */}
        <span className="absolute bottom-3 right-3 border-[3px] border-black bg-white px-3 py-1.5 text-xs font-bold uppercase transition-colors group-hover:bg-black group-hover:text-white">
          Open map
        </span>
      </a>

      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>{name}</span>
        {/* Required attribution for OpenStreetMap tile data. */}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-700"
        >
          Map data © OpenStreetMap contributors
        </a>
      </figcaption>
    </figure>
  );
}
