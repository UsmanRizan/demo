/**
 * Opening-hours primitives shared by slot generation and booking validation.
 *
 * Lives in its own module because both `availability.ts` (which builds the
 * player-facing slot grid) and `bookings.ts` (which validates a booking
 * request) need it, and importing between those two would be circular.
 *
 * Owners pick individual hours, so a single day can have several disjoint open
 * ranges — e.g. 08:00-12:00 and 14:00-22:00. The outer startTime/endTime on an
 * Availability row is only the envelope of those ranges.
 */

/** An explicitly open range of hours, e.g. { start: "08:00", end: "12:00" }. */
export type HourRange = { start: string; end: string };

export type OpeningHours = {
  startTime: string;
  endTime: string;
  isTwentyFourHour: boolean;
  /** Explicitly selected hours. Null/empty falls back to the envelope. */
  hours?: unknown;
};

/** "HH:MM" -> minutes past midnight. "24:00" is midnight at the end of the day. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);

  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");

  return `${h}:${m}`;
}

/** Parse a stored hour range, ignoring anything malformed or inverted. */
function parseRange(range: unknown): HourRange | null {
  if (!range || typeof range !== "object") {
    return null;
  }

  const { start, end } = range as Partial<HourRange>;

  if (typeof start !== "string" || typeof end !== "string") {
    return null;
  }

  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
    return null;
  }

  // Reject inverted or zero-length ranges rather than producing bogus slots.
  if (endMinutes <= startMinutes) {
    return null;
  }

  return { start: minutesToTime(startMinutes), end: minutesToTime(endMinutes) };
}

/**
 * Collapse a set of selected hours into contiguous ranges.
 *
 * Owners toggle individual hours, so 8, 9, 10 and 14, 15 become two ranges
 * rather than one 08:00-16:00 window that would expose the lunch break as
 * bookable.
 */
export function mergeHourlySelection(hours: number[]): HourRange[] {
  const sorted = [...new Set(hours)]
    .filter((h) => Number.isInteger(h) && h >= 0 && h < 24)
    .sort((a, b) => a - b);

  if (sorted.length === 0) {
    return [];
  }

  const ranges: HourRange[] = [];
  let runStart = sorted[0];
  let previous = sorted[0];

  const flush = (endExclusive: number) => {
    ranges.push({
      start: minutesToTime(runStart * 60),
      end: minutesToTime(endExclusive * 60),
    });
  };

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];

    if (current === previous + 1) {
      previous = current;
      continue;
    }

    flush(previous + 1);
    runStart = current;
    previous = current;
  }

  flush(previous + 1);

  return ranges;
}

/** Expand a set of stored ranges back into the individual hours they cover. */
export function expandHourRanges(ranges: HourRange[]): number[] {
  const hours = new Set<number>();

  for (const range of ranges) {
    const start = timeToMinutes(range.start) / 60;
    const end = timeToMinutes(range.end) / 60;

    for (let hour = start; hour < end; hour++) {
      hours.add(hour);
    }
  }

  return [...hours].sort((a, b) => a - b);
}

/**
 * Bookable minute ranges for a day, ascending.
 *
 * Explicit `hours` win; rows without them fall back to the single
 * startTime/endTime window so schedules saved before hourly selection existed
 * keep behaving exactly as before.
 */
export function openingRanges(opening: OpeningHours): [number, number][] {
  if (opening.isTwentyFourHour) {
    return [[0, 24 * 60]];
  }

  const stored = Array.isArray(opening.hours) ? opening.hours : [];

  const parsed = stored
    .map(parseRange)
    .filter((range): range is HourRange => range !== null)
    .map(
      (range) =>
        [timeToMinutes(range.start), timeToMinutes(range.end)] as [number, number],
    )
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);

  if (parsed.length > 0) {
    return parsed;
  }

  // "23:59" is used by the UI to mean "until midnight".
  const end =
    opening.endTime === "23:59" ? 24 * 60 : timeToMinutes(opening.endTime);

  return [[timeToMinutes(opening.startTime), end]];
}

/** Outer envelope: earliest open to latest close. */
export function openingWindow(opening: OpeningHours): [number, number] {
  if (opening.isTwentyFourHour) {
    return [0, 24 * 60];
  }

  const ranges = openingRanges(opening);

  return [ranges[0][0], ranges[ranges.length - 1][1]];
}

/** True when the given hour range lies wholly inside one of the open ranges. */
export function coversRange(
  opening: OpeningHours,
  startTime: string,
  endTime: string,
): boolean {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  return openingRanges(opening).some(
    ([open, close]) => start >= open && end <= close,
  );
}
