"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Coordinates, Facility, Period, Slot, Sport } from "./types";
import { periods } from "./types";
import {
  calculateDistance,
  formatDistance,
  getTodayString,
  isContinuousSelection,
} from "./utils";
import StepSport from "./StepSport";
import StepTime from "./StepTime";
import StepCourts from "./StepCourts";

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

  const selectedFacility = selectedFacilityId
    ? facilities.find((f) => f.id === selectedFacilityId) ?? null
    : null;

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
    ? totalHours * selectedFacility.price
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
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="/player" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              B
            </div>
            <span className="text-lg font-bold text-slate-900">BookMyPlay</span>
          </a>
          <a href="/player" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            My Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Progress */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
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

        {step === 1 && (
          <StepSport
            sports={sports}
            loading={loadingSports}
            onSelect={selectSport}
          />
        )}

        {step === 2 && selectedSport && (
          <StepTime
            selectedSport={selectedSport}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onSearch={searchFacilities}
          />
        )}

        {step === 3 && selectedSport && selectedPeriod && (
          <StepCourts
            selectedSportName={selectedSport.name}
            selectedPeriod={selectedPeriod}
            selectedDate={selectedDate}
            facilities={facilities}
            coordinates={coordinates}
            locationLoading={locationLoading}
            searchLoading={searchLoading}
            selectedFacilityId={selectedFacilityId}
            selectedSlots={selectedSlots}
            selectedSlotObjects={selectedSlotObjects}
            totalHours={totalHours}
            totalPrice={totalPrice}
            onToggleSlot={toggleSlot}
            onProceedToPayment={proceedToPayment}
          />
        )}
      </div>
    </main>
  );
}
