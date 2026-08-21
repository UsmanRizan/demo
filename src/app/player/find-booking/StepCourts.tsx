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
        <h2 className="text-3xl font-bold">Courts near you</h2>

        <p className="mt-2 text-gray-600">
          {selectedSportName} · {periodLabel} · {selectedDate}
        </p>
      </div>

      {locationLoading && (
        <div className="mt-8 rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="font-medium">Finding your location...</p>

          <p className="mt-2 text-sm text-gray-500">
            We&apos;ll sort courts from nearest to furthest.
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
                        {facility.sports.map((s) => s.name).join(", ")}
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
                            onClick={() => onToggleSlot(facility, slot)}
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

                  {isSelectedFacility && selectedSlotObjects.length > 0 && (
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
                            {totalHours} hour{totalHours !== 1 ? "s" : ""}
                          </p>
                        </div>

                        <div className="sm:text-right">
                          <p className="text-sm text-gray-500">Total</p>

                          <p className="text-2xl font-bold">
                            Rs. {totalPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={onProceedToPayment}
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
  );
}
