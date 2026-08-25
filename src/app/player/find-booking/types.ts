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
}[] = [
  {
    id: "morning",
    title: "Morning",
    time: "06:00 – 12:00",
    description: "Find courts available in the morning.",
  },
  {
    id: "evening",
    title: "Evening",
    time: "12:00 – 18:00",
    description: "Find courts available in the afternoon and evening.",
  },
  {
    id: "night",
    title: "Night",
    time: "18:00 – 24:00",
    description: "Find courts available at night.",
  },
];
