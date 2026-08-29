export type Sport = {
  id: string;
  name: string;
  slug: string;
};

export type Period = "morning" | "evening" | "night";

export type Slot = {
  startTime: string;
  endTime: string;
  available: boolean;
  pricePerHour?: number;
  surgePercentage?: number;
};

export type Facility = {
  id: string;
  name: string;
  price: number;
  sports: {
    id: string;
    name: string;
  }[];
  location: {
    id: string;
    name: string;
    address: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
  };
  blockedReason: string | null;
  slots: Slot[];
  avgSurge?: number;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export const periods: {
  id: Period;
  title: string;
  time: string;
  description: string;
  start: number;
  end: number;
}[] = [
  {
    id: "morning",
    title: "Morning",
    time: "06:00 – 12:00",
    description: "Find courts available in the morning.",
    start: 6 * 60,
    end: 12 * 60,
  },
  {
    id: "evening",
    title: "Evening",
    time: "12:00 – 18:00",
    description: "Find courts available in the afternoon and evening.",
    start: 12 * 60,
    end: 18 * 60,
  },
  {
    id: "night",
    title: "Night",
    time: "18:00 – 24:00",
    description: "Find courts available at night.",
    start: 18 * 60,
    end: 24 * 60,
  },
];
