"use client";

import type { Coordinates, Facility, Period, Slot } from "./types";
import { periods } from "./types";
import { calculateDistance, formatDistance } from "./utils";
import { getSportIcon } from "@/lib/sport-icons";

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
  return (
    <section className="mt-8">
      <div>
        <h2 className="text-3xl font-bold uppercase">Courts near you</h2>

        <p className="mt-2 text-gray-500 uppercase text-sm font-bold">
          {getSportIcon(selectedSportName)} {selectedSportName} · {periods.find((p) => p.id === selectedPeriod)?.title ?? selectedPeriod} · {selectedDate}
        </p>
      </div>

      {locationLoading && (
        <div className="mt-8 border-[2px] border-black bg-white p-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center">
            <svg className="spinner h-6 w-6 text-black" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="mt-3 font-bold uppercase">Finding your location...</p>
          <p className="mt-1 text-sm text-gray-500">
            We&apos;ll sort courts from nearest to furthest.
          </p>
        </div>
      )}

      {!locationLoading && searchLoading && (
        <div className="mt-8 border-[2px] border-black bg-white p-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center">
            <svg className="spinner h-6 w-6 text-black" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="mt-3 font-bold uppercase">Searching available courts...</p>
        </div>
      )}

      {!locationLoading && !searchLoading && facilities.length === 0 && (
        <div className="mt-8 border-[2px] border-black bg-white p-8 text-center">
          <h3 className="text-xl font-bold uppercase">No courts available</h3>
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

            const facilityTotal = facilitySelectedSlots.reduce(
              (sum, slot) => sum + (slot.pricePerHour ?? facility.price),
              0,
            );

            const hasCoords =
              facility.location.latitude !== null &&
              facility.location.longitude !== null;

            const mapsUrl = hasCoords
              ? `https://www.google.com/maps/search/?api=1&query=${facility.location.latitude},${facility.location.longitude}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${facility.location.name}, ${facility.location.address}, ${facility.location.city}`,
                )}`;

            const isBlocked = facility.blockedReason !== null;

            return (
              <article
                key={facility.id}
                className={`border-[3px] bg-white p-4 sm:p-6 ${
                  isBlocked
                    ? "border-gray-400"
                    : isSelectedFacility
                      ? "border-black bg-black text-white"
                      : "border-black"
                }`}
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-bold uppercase text-gray-500">
                        {facility.sports.map((s) => `${getSportIcon(s.name)} ${s.name}`).join(", ")}
                      </p>

                      <h3 className="mt-1 text-xl font-bold uppercase">
                        {facility.name}
                      </h3>

                      <p className="mt-2 text-sm text-gray-600">
                        {facility.location.name}
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        {facility.location.address},{" "}
                        {facility.location.city}
                      </p>

                      <div className="mt-3 flex items-center gap-3">
                        <p className="text-sm font-bold uppercase text-gray-600">
                          {formatDistance(distance)}
                        </p>

                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 border-[2px] border-black px-3 py-1 text-xs font-bold uppercase text-black transition hover:bg-black hover:text-white"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="square"
                            strokeLinejoin="miter"
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
                      <p className="text-xl font-bold uppercase">
                        Rs. {facility.price.toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-gray-400 uppercase font-bold">
                        per hour
                      </p>
                      {facility.avgSurge && facility.avgSurge > 0 && (
                        <p className="mt-1 inline-block border-[2px] border-orange-500 bg-orange-50 px-2 py-0.5 text-xs font-bold uppercase text-orange-600">
                          🔥 +{facility.avgSurge}% surge
                        </p>
                      )}
                    </div>
                  </div>

                  {isBlocked && (
                    <div className="border-[2px] border-gray-400 bg-gray-100 p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg">🚫</span>
                        <div>
                          <p className="text-sm font-bold uppercase text-gray-700">
                            Not available on this date
                          </p>
                          {facility.blockedReason && (
                            <p className="mt-0.5 text-sm text-gray-600">
                              {facility.blockedReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="mb-3 text-sm font-bold uppercase text-gray-700">
                      {isBlocked ? "All slots blocked" : "Available hourly slots"}
                    </p>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                      {facility.slots.filter((slot) => slot.available).map((slot) => {
                        const selected =
                          selectedFacilityId === facility.id &&
                          selectedSlots.includes(slot.startTime);

                        return (
                          <button
                            key={`${facility.id}-${slot.startTime}`}
                            type="button"
                            onClick={() => onToggleSlot(facility, slot)}
                            className={`border-[2px] px-3 py-3 text-sm font-bold uppercase transition ${
                              selected
                                ? "border-white bg-white text-black"
                                : slot.surgePercentage && slot.surgePercentage > 0
                                  ? "border-orange-400 bg-orange-50 text-black hover:bg-orange-100"
                                  : "border-black bg-white text-black hover:bg-black hover:text-white"
                            }`}
                          >
                            <div>{slot.startTime}</div>
                            <div className="text-xs opacity-70">
                              {slot.endTime}
                            </div>
                            {slot.pricePerHour !== undefined && (
                              <div className="mt-1 text-xs font-bold">
                                Rs. {slot.pricePerHour.toLocaleString()}
                              </div>
                            )}
                            {slot.surgePercentage !== undefined && slot.surgePercentage > 0 && (
                              <div className="mt-0.5 text-[10px] font-bold text-orange-600">
                                +{slot.surgePercentage}%
                              </div>
                            )}
                          </button>
                        );
                      })}
                      {facility.slots.filter((slot) => slot.available).length === 0 && (
                        <p className="col-span-full text-sm text-gray-500 uppercase">
                          No available slots for this period.
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelectedFacility && selectedSlotObjects.length > 0 && (
                    <div className="border-[3px] border-white bg-black p-5 text-white">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-400 uppercase font-bold">
                            Selected time
                          </p>
                          <p className="mt-1 font-bold uppercase">
                            {selectedSlotObjects[0].startTime} –{" "}
                            {
                              selectedSlotObjects[
                                selectedSlotObjects.length - 1
                              ].endTime
                            }
                          </p>
                          <p className="mt-1 text-sm text-gray-400">
                            {totalHours} hour{totalHours !== 1 ? "s" : ""}
                          </p>
                        </div>

                        <div className="sm:text-right">
                          <p className="text-sm text-gray-400 uppercase font-bold">Total</p>
                          <p className="text-2xl font-bold">
                            Rs. {totalPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={onProceedToPayment}
                        className="mt-5 w-full border-[3px] border-white bg-white px-5 py-3 text-sm font-bold uppercase text-black transition-colors hover:bg-transparent hover:text-white"
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
