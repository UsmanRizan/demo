"use client";

import type { Coordinates, Facility, Period, Slot } from "./types";
import { periods } from "./types";
import { calculateDistance, formatDistance } from "./utils";

type StepCourtsProps = {
  selectedSportName: string;
  selectedPeriod: Period;
  selectedDate: string;
  facilities: Facility[];
  coordinates: Coordinates | null;
  locationLoading: boolean;
  searchLoading: boolean;
  selectedFacilityId: string | null;
  selectedSlots: string[];
  selectedSlotObjects: Slot[];
  totalHours: number;
  totalPrice: number;
  onToggleSlot: (facility: Facility, slot: Slot) => void;
  onProceedToPayment: () => void;
};

export default function StepCourts({
  selectedSportName,
  selectedPeriod,
  selectedDate,
  facilities,
  coordinates,
  locationLoading,
  searchLoading,
  selectedFacilityId,
  selectedSlots,
  selectedSlotObjects,
  totalHours,
  totalPrice,
  onToggleSlot,
  onProceedToPayment,
}: StepCourtsProps) {
  const periodLabel =
    periods.find((p) => p.id === selectedPeriod)?.title ?? selectedPeriod;

  return (
    <section className="mt-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Courts near you</h2>

        <p className="mt-2 text-slate-500">
          {selectedSportName} · {periodLabel} · {selectedDate}
        </p>
      </div>

      {locationLoading && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-10 w-10 items-center justify-center">
            <svg className="spinner h-6 w-6 text-indigo-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="mt-3 font-medium text-slate-900">Finding your location...</p>
          <p className="mt-1 text-sm text-slate-500">
            We&apos;ll sort courts from nearest to furthest.
          </p>
        </div>
      )}

      {!locationLoading && searchLoading && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-10 w-10 items-center justify-center">
            <svg className="spinner h-6 w-6 text-indigo-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="mt-3 font-medium text-slate-900">Searching available courts...</p>
        </div>
      )}

      {!locationLoading && !searchLoading && facilities.length === 0 && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">No courts available</h3>
          <p className="mt-2 text-slate-500">
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

            const hasCoords =
              facility.location.latitude !== null &&
              facility.location.longitude !== null;

            const mapsUrl = hasCoords
              ? `https://www.google.com/maps/search/?api=1&query=${facility.location.latitude},${facility.location.longitude}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${facility.location.name}, ${facility.location.address}, ${facility.location.city}`,
                )}`;

            return (
              <article
                key={facility.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-6 ${
                  isSelectedFacility
                    ? "border-indigo-300 ring-2 ring-indigo-100"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {facility.sports.map((s) => s.name).join(", ")}
                      </p>

                      <h3 className="mt-1 text-xl font-semibold text-slate-900">
                        {facility.name}
                      </h3>

                      <p className="mt-2 text-sm text-slate-600">
                        {facility.location.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {facility.location.address},{" "}
                        {facility.location.city}
                      </p>

                      <div className="mt-3 flex items-center gap-3">
                        <p className="text-sm font-medium text-slate-600">
                          {formatDistance(distance)}
                        </p>

                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          Open in Maps
                        </a>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-xl font-bold text-slate-900">
                        Rs. {facility.price.toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        per hour
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-medium text-slate-700">
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
                            onClick={() => onToggleSlot(facility, slot)}
                            className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                              !slot.available
                                ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                                : selected
                                  ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
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

                  {isSelectedFacility && selectedSlotObjects.length > 0 && (
                    <div className="rounded-xl bg-slate-50 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-slate-500">
                            Selected time
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {selectedSlotObjects[0].startTime} –{" "}
                            {
                              selectedSlotObjects[
                                selectedSlotObjects.length - 1
                              ].endTime
                            }
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {totalHours} hour{totalHours !== 1 ? "s" : ""}
                          </p>
                        </div>

                        <div className="sm:text-right">
                          <p className="text-sm text-slate-500">Total</p>
                          <p className="text-2xl font-bold text-slate-900">
                            Rs. {totalPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={onProceedToPayment}
                        className="mt-5 w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
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
  );
}
