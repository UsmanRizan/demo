/**
 * Standard Web Mercator (slippy map) tile maths, used to compose a static map
 * image for venue pages without a JavaScript map library or an API key.
 *
 * See https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
 */

export const TILE_SIZE = 256;

/** Mercator diverges at the poles, so latitude is clamped to the valid range. */
const MAX_LATITUDE = 85.05112878;

export type TilePlacement = {
  /** Tile column within the zoom level. */
  x: number;
  /** Tile row within the zoom level. */
  y: number;
  /** Offset in pixels from the top-left of the map image. */
  left: number;
  top: number;
};

/** Fractional tile coordinates of a longitude/latitude at a zoom level. */
export function project(
  latitude: number,
  longitude: number,
  zoom: number,
): { x: number; y: number } {
  const scale = 2 ** zoom;
  const clampedLat = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude));
  const latRad = (clampedLat * Math.PI) / 180;

  return {
    x: ((longitude + 180) / 360) * scale,
    y:
      ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * scale,
  };
}

/**
 * Tiles needed to cover a `width` x `height` image centred on the point, with
 * their pixel offsets so the centre lands in the middle of the image.
 *
 * Columns wrap around the antimeridian; rows are clamped because the Mercator
 * projection has no data above the poles.
 */
export function planTiles(options: {
  latitude: number;
  longitude: number;
  zoom: number;
  width: number;
  height: number;
}): TilePlacement[] {
  const { latitude, longitude, zoom, width, height } = options;

  const scale = 2 ** zoom;
  const center = project(latitude, longitude, zoom);

  const left = center.x * TILE_SIZE - width / 2;
  const top = center.y * TILE_SIZE - height / 2;

  const firstCol = Math.floor(left / TILE_SIZE);
  const firstRow = Math.floor(top / TILE_SIZE);
  const offsetX = left - firstCol * TILE_SIZE;
  const offsetY = top - firstRow * TILE_SIZE;

  const columns = Math.ceil((width + offsetX) / TILE_SIZE);
  const rows = Math.ceil((height + offsetY) / TILE_SIZE);

  const tiles: TilePlacement[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const rawX = firstCol + col;
      const rawY = firstRow + row;

      tiles.push({
        // Wrap horizontally; clamp vertically to the projected world.
        x: ((rawX % scale) + scale) % scale,
        y: Math.max(0, Math.min(scale - 1, rawY)),
        left: col * TILE_SIZE - offsetX,
        top: row * TILE_SIZE - offsetY,
      });
    }
  }

  return tiles;
}

/** Number of tiles needed at a given viewport; used to pick a sane zoom. */
export function tileCount(zoom: number, width: number, height: number): number {
  return Math.ceil(width / TILE_SIZE) * Math.ceil(height / TILE_SIZE);
}

export function tileUrl(zoom: number, x: number, y: number): string {
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}
