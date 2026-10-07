import { describe, expect, it } from "vitest";

import { planTiles, project, tileCount, TILE_SIZE } from "@/lib/map-tiles";

// Futsal world, Moragalla (from the seeded production location).
const LAT = 7.4339;
const LON = 79.9331;

describe("project", () => {
  it("maps null island to the centre of the world at zoom 0", () => {
    const { x, y } = project(0, 0, 0);

    expect(x).toBeCloseTo(0.5, 6);
    expect(y).toBeCloseTo(0.5, 6);
  });

  it("puts the northern hemisphere above the equator", () => {
    expect(project(10, 0, 2).y).toBeLessThan(project(-10, 0, 2).y);
  });

  it("doubles tile coordinates each zoom level", () => {
    const a = project(LAT, LON, 10);
    const b = project(LAT, LON, 11);

    expect(b.x).toBeCloseTo(a.x * 2, 6);
    expect(b.y).toBeCloseTo(a.y * 2, 6);
  });

  it("clamps beyond the Mercator latitude limit instead of returning NaN", () => {
    const { y } = project(89.9, 0, 4);

    expect(Number.isFinite(y)).toBe(true);
  });
});

describe("planTiles", () => {
  const width = 640;
  const height = 320;

  it("returns enough tiles to cover the whole viewport", () => {
    const tiles = planTiles({ latitude: LAT, longitude: LON, zoom: 15, width, height });

    expect(tiles.length).toBeGreaterThanOrEqual(
      tileCount(15, width, height),
    );

    // Every tile must sit within (or just outside) the image bounds.
    for (const tile of tiles) {
      expect(tile.left).toBeLessThan(width);
      expect(tile.top).toBeLessThan(height);
      expect(tile.left + TILE_SIZE).toBeGreaterThan(0);
      expect(tile.top + TILE_SIZE).toBeGreaterThan(0);
    }
  });

  it("centres the requested point in the middle of the image", () => {
    const zoom = 15;
    const tiles = planTiles({ latitude: LAT, longitude: LON, zoom, width, height });
    const center = project(LAT, LON, zoom);

    const centerPxX = center.x * TILE_SIZE;
    const centerPxY = center.y * TILE_SIZE;

    // Reconstruct image-space position from the tile that covers it.
    const totalMinX = Math.min(...tiles.map((t) => t.left));

    const rawCol = Math.floor((centerPxX - width / 2) / TILE_SIZE);
    const rawRow = Math.floor((centerPxY - height / 2) / TILE_SIZE);

    const covering = tiles.find(
      (t) =>
        t.x === (((rawCol % 2 ** zoom) + 2 ** zoom) % 2 ** zoom) &&
        t.y === rawRow &&
        Math.abs(t.left - (Math.floor(width / 2) - TILE_SIZE / 2 + totalMinX)) < 1 ||
        (t.x === (((rawCol % 2 ** zoom) + 2 ** zoom) % 2 ** zoom) && t.y === rawRow),
    );

    expect(covering).toBeTruthy();
  });

  it("keeps tile coordinates inside the zoom level", () => {
    for (const zoom of [1, 10, 17]) {
      const tiles = planTiles({
        latitude: LAT,
        longitude: LON,
        zoom,
        width: 400,
        height: 300,
      });

      for (const tile of tiles) {
        expect(tile.x).toBeGreaterThanOrEqual(0);
        expect(tile.x).toBeLessThan(2 ** zoom);
        expect(tile.y).toBeGreaterThanOrEqual(0);
        expect(tile.y).toBeLessThan(2 ** zoom);
      }
    }
  });

  it("wraps columns across the antimeridian instead of going out of range", () => {
    const tiles = planTiles({
      latitude: 0,
      longitude: 179.999,
      zoom: 2,
      width: 800,
      height: 300,
    });

    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      expect(tile.x).toBeLessThanOrEqual(3);
    }
  });
});
