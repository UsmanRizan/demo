import type { Facility } from "./types";

export function getTodayString(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function calculateDistance(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const earthRadiusKm = 6371;

  const dLat = ((latitude2 - latitude1) * Math.PI) / 180;
  const dLon = ((longitude2 - longitude1) * Math.PI) / 180;

  const lat1 = (latitude1 * Math.PI) / 180;
  const lat2 = (latitude2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

export function formatDistance(distanceKm: number): string {
  if (!Number.isFinite(distanceKm)) {
    return "Distance unavailable";
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
}

export function isContinuousSelection(
  facility: Facility,
  selectedTimes: string[],
): boolean {
  if (selectedTimes.length <= 1) {
    return true;
  }

  const selectedSlots = facility.slots
    .filter((slot) => selectedTimes.includes(slot.startTime))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  for (let index = 1; index < selectedSlots.length; index++) {
    const previous = selectedSlots[index - 1];
    const current = selectedSlots[index];

    if (previous.endTime !== current.startTime) {
      return false;
    }
  }

  return true;
}
