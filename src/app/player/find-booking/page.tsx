"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculatePlayerPrice } from "@/lib/constants";

type Sport = {
  id: string;
  name: string;
  slug: string;
};

type Period = "morning" | "evening" | "night";

type Slot = {
  startTime: string;
  endTime: string;
  available: boolean;
};

type Facility = {
  id: string;
  name: string;
  price: number;
  sport: {
    id: string;
    name: string;
  };
  location: {
    id: string;
    name: string;
    address: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
  };
  slots: Slot[];
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

const periods: {
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

function getTodayString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function calculateDistance(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
) {
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

function formatDistance(distanceKm: number) {
  if (!Number.isFinite(distanceKm)) {
    return "Distance unavailable";
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
}

function isContinuousSelection(facility: Facility, selectedTimes: string[]) {
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

export default function FindBookingPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);

  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);

  const [selectedDate, setSelectedDate] = useState(getTodayString());

  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);

  const [facilities, setFacilities] = useState<Facility[]>([]);

  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(
    null,
  );

  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  const [loadingSports, setLoadingSports] = useState(true);

  const [locationLoading, setLocationLoading] = useState(false);

  const [searchLoading, setSearchLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSports() {
      try {
        const response = await fetch("/api/player/sports");

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load sports");
          return;
        }

        setSports(data.sports);
      } catch {
        setError("Failed to load sports");
      } finally {
        setLoadingSports(false);
      }
    }

    loadSports();
  }, []);

  function selectSport(sport: Sport) {
    setSelectedSport(sport);
    setStep(2);
    setError("");
  }

  async function searchFacilities(period: Period) {
    if (!selectedSport) {
      return;
    }

    if (!selectedDate) {
      setError("Please select a date.");
      return;
    }

    setSelectedPeriod(period);
    setStep(3);
    setFacilities([]);
    setSelectedFacilityId(null);
    setSelectedSlots([]);
    setError("");

    setLocationLoading(true);
    setSearchLoading(true);

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser.");
      }

      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000,
          });
        },
      );

      const playerLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setCoordinates(playerLocation);

      const response = await fetch(
        `/api/player/search?sportId=${encodeURIComponent(
          selectedSport.id,
        )}&date=${encodeURIComponent(selectedDate)}&period=${period}`,
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to find courts");
        return;
      }

      const sortedFacilities = (data.facilities as Facility[])
        .map((facility) => {
          if (
            facility.location.latitude === null ||
            facility.location.longitude === null
          ) {
            return {
              facility,
              distance: Number.POSITIVE_INFINITY,
            };
          }

          const distance = calculateDistance(
            playerLocation.latitude,
            playerLocation.longitude,
            facility.location.latitude,
            facility.location.longitude,
          );

          return {
            facility,
            distance,
          };
        })
        .sort((a, b) => a.distance - b.distance)
        .map((item) => item.facility);

      setFacilities(sortedFacilities);
    } catch (error) {
      console.error(error);

      setError(
        "We couldn't access your location. Please allow location access and try again.",
      );
    } finally {
      setLocationLoading(false);
      setSearchLoading(false);
    }
  }

  function toggleSlot(facility: Facility, slot: Slot) {
    if (!slot.available) {
      return;
    }

    if (selectedFacilityId && selectedFacilityId !== facility.id) {
      setError("You can select time slots from only one court at a time.");
      return;
    }

    setError("");

    const exists = selectedSlots.includes(slot.startTime);

    const nextSlots = exists
      ? selectedSlots.filter((time) => time !== slot.startTime)
      : [...selectedSlots, slot.startTime];

    if (!isContinuousSelection(facility, nextSlots)) {
      setError("Please select continuous hourly slots.");
      return;
    }

    if (nextSlots.length === 0) {
      setSelectedFacilityId(null);
      setSelectedSlots([]);
      return;
    }

    setSelectedFacilityId(facility.id);

    setSelectedSlots(nextSlots.sort());
  }

  function goBack() {
    if (step === 2) {
      setStep(1);
      setSelectedSport(null);
      return;
    }

    if (step === 3) {
      setStep(2);
      setFacilities([]);
      setCoordinates(null);
      setSelectedPeriod(null);
      setSelectedFacilityId(null);
      setSelectedSlots([]);
      setError("");
    }
  }

  function getSelectedFacility() {
    if (!selectedFacilityId) {
      return null;
    }

    return (
      facilities.find((facility) => facility.id === selectedFacilityId) || null
    );
  }

  const selectedFacility = getSelectedFacility();

  const selectedSlotObjects = useMemo(() => {
    if (!selectedFacility) {
      return [];
    }

    return selectedFacility.slots
      .filter((slot) => selectedSlots.includes(slot.startTime))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [selectedFacility, selectedSlots]);

  const totalHours = selectedSlotObjects.length;

  const totalPrice = selectedFacility
    ? totalHours * calculatePlayerPrice(selectedFacility.price)
    : 0;

  function proceedToPayment() {
    if (!selectedFacility || selectedSlotObjects.length === 0) {
      return;
    }

    const startTime = selectedSlotObjects[0].startTime;

    const endTime = selectedSlotObjects[selectedSlotObjects.length - 1].endTime;

    const params = new URLSearchParams({
      facilityId: selectedFacility.id,
      date: selectedDate,
      startTime,
      endTime,
    });

    router.push(`/player/checkout?${params.toString()}`);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold">BookMyPlay</h1>

            <p className="text-sm text-gray-500">Find a Booking</p>
          </div>

          <a href="/player" className="text-sm text-gray-600">
            Player Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Progress */}
        <div className="flex items-center gap-3 text-sm">
          {[
            { number: 1, label: "Sport" },
            { number: 2, label: "Time" },
            { number: 3, label: "Courts" },
          ].map((item, index) => (
            <div key={item.number} className="flex items-center gap-3">
              <span
                className={
                  step >= item.number
                    ? "font-semibold text-black"
                    : "text-gray-400"
                }
              >
                {item.number}. {item.label}
              </span>

              {index < 2 && <span className="text-gray-300">→</span>}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {step > 1 && (
          <button
            type="button"
            onClick={goBack}
            className="mt-6 text-sm text-gray-600"
          >
            ← Back
          </button>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <section className="mt-8">
            <h2 className="text-3xl font-bold">What do you want to play?</h2>

            <p className="mt-2 text-gray-600">
              Choose a sport to find nearby courts.
            </p>

            {loadingSports ? (
              <div className="mt-8 rounded-xl bg-white p-8">
                Loading sports...
              </div>
            ) : (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {sports.map((sport) => (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => selectSport(sport)}
                    className="rounded-2xl border border-gray-200 bg-white p-6 text-left transition hover:border-black hover:shadow-sm"
                  >
                    <h3 className="text-xl font-semibold">{sport.name}</h3>

                    <p className="mt-2 text-sm text-gray-500">
                      Find {sport.name.toLowerCase()} courts near you.
                    </p>
                  </button>
                ))}
              </div>
            )}

            {!loadingSports && sports.length === 0 && (
              <div className="mt-8 rounded-xl bg-white p-8 text-gray-500">
                No sports are currently available.
              </div>
            )}
          </section>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <section className="mt-8">
            <h2 className="text-3xl font-bold">When do you want to play?</h2>

            <p className="mt-2 text-gray-600">
              Sport: <strong>{selectedSport?.name}</strong>
            </p>

            <div className="mt-8 max-w-sm">
              <label className="mb-2 block text-sm font-medium">
                Select date
              </label>

              <input
                type="date"
                min={getTodayString()}
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div className="mt-8 grid gap-4">
              {periods.map((period) => (
                <button
                  key={period.id}
                  type="button"
                  disabled={!selectedDate}
                  onClick={() => searchFacilities(period.id)}
                  className="rounded-2xl border border-gray-200 bg-white p-6 text-left transition hover:border-black hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{period.title}</h3>

                      <p className="mt-1 text-sm font-medium text-gray-500">
                        {period.time}
                      </p>
                    </div>

                    <span className="text-2xl">→</span>
                  </div>

                  <p className="mt-4 text-sm text-gray-600">
                    {period.description}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <section className="mt-8">
            <div>
              <h2 className="text-3xl font-bold">Courts near you</h2>

              <p className="mt-2 text-gray-600">
                {selectedSport?.name} ·{" "}
                {periods.find((period) => period.id === selectedPeriod)?.title}{" "}
                · {selectedDate}
              </p>
            </div>

            {locationLoading && (
              <div className="mt-8 rounded-xl bg-white p-8 text-center shadow-sm">
                <p className="font-medium">Finding your location...</p>

                <p className="mt-2 text-sm text-gray-500">
                  We'll sort courts from nearest to furthest.
                </p>
              </div>
            )}

            {!locationLoading && searchLoading && (
              <div className="mt-8 rounded-xl bg-white p-8 text-center shadow-sm">
                Searching available courts...
              </div>
            )}

            {!locationLoading && !searchLoading && facilities.length === 0 && (
              <div className="mt-8 rounded-xl bg-white p-8 text-center shadow-sm">
                <h3 className="text-xl font-semibold">No courts available</h3>

                <p className="mt-2 text-gray-500">
                  Try another time period or date.
                </p>
              </div>
            )}

            {!locationLoading && !searchLoading && facilities.length > 0 && (
              <div className="mt-8 space-y-5">
                {facilities.map((facility) => {
                  const distance =
                    coordinates &&
                    facility.location.latitude !== null &&
                    facility.location.longitude !== null
                      ? calculateDistance(
                          coordinates.latitude,
                          coordinates.longitude,
                          facility.location.latitude,
                          facility.location.longitude,
                        )
                      : Number.POSITIVE_INFINITY;

                  const isSelectedFacility = selectedFacilityId === facility.id;

                  const facilitySelectedSlots = isSelectedFacility
                    ? selectedSlotObjects
                    : [];

                  const facilityTotal =
                    facilitySelectedSlots.length * facility.price;

                  return (
                    <article
                      key={facility.id}
                      className={`rounded-2xl bg-white p-6 shadow-sm ${
                        isSelectedFacility ? "ring-2 ring-black" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              {facility.sport.name}
                            </p>

                            <h3 className="mt-1 text-xl font-semibold">
                              {facility.name}
                            </h3>

                            <p className="mt-2 text-sm text-gray-600">
                              {facility.location.name}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {facility.location.address},{" "}
                              {facility.location.city}
                            </p>

                            <p className="mt-3 text-sm font-medium">
                              {formatDistance(distance)}
                            </p>
                          </div>

                          <div className="sm:text-right">
                            <p className="text-xl font-bold">
                              Rs. {facility.price.toLocaleString()}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              per hour
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="mb-3 text-sm font-medium">
                            Available hourly slots
                          </p>

                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                            {facility.slots.map((slot) => {
                              const selected =
                                selectedFacilityId === facility.id &&
                                selectedSlots.includes(slot.startTime);

                              return (
                                <button
                                  key={`${facility.id}-${slot.startTime}`}
                                  type="button"
                                  disabled={!slot.available}
                                  onClick={() => toggleSlot(facility, slot)}
                                  className={`rounded-lg border px-3 py-3 text-sm font-medium transition ${
                                    !slot.available
                                      ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                                      : selected
                                        ? "border-black bg-black text-white"
                                        : "border-gray-300 bg-white text-gray-800 hover:border-black"
                                  }`}
                                >
                                  <div>{slot.startTime}</div>

                                  <div className="text-xs opacity-70">
                                    {slot.endTime}
                                  </div>

                                  {!slot.available && (
                                    <div className="mt-1 text-[10px]">
                                      Booked
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {isSelectedFacility &&
                          selectedSlotObjects.length > 0 && (
                            <div className="rounded-xl bg-gray-50 p-5">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Selected time
                                  </p>

                                  <p className="mt-1 font-semibold">
                                    {selectedSlotObjects[0].startTime} –{" "}
                                    {
                                      selectedSlotObjects[
                                        selectedSlotObjects.length - 1
                                      ].endTime
                                    }
                                  </p>

                                  <p className="mt-1 text-sm text-gray-500">
                                    {selectedSlotObjects.length} hour
                                    {selectedSlotObjects.length !== 1
                                      ? "s"
                                      : ""}
                                  </p>
                                </div>

                                <div className="sm:text-right">
                                  <p className="text-sm text-gray-500">Total</p>

                                  <p className="text-2xl font-bold">
                                    Rs. {facilityTotal.toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={proceedToPayment}
                                className="mt-5 w-full rounded-lg bg-black px-5 py-3 font-medium text-white"
                              >
                                Proceed to Payment
                              </button>
                            </div>
                          )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
