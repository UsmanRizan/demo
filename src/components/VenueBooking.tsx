"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { FacilityWithSlots, PublicSlot } from "@/lib/availability";
import { getSportIcon } from "@/lib/sport-icons";

const PERIODS = [
  { label: "Early", start: 0, end: 6 * 60 },
  { label: "Morning", start: 6 * 60, end: 12 * 60 },
  { label: "Afternoon", start: 12 * 60, end: 18 * 60 },
  { label: "Night", start: 18 * 60, end: 24 * 60 },
];

function colomboDate(offsetDays = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(
    new Date(Date.now() + offsetDays * 86_400_000),
  );
}

function minutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatLkr(value: number) {
  return `Rs. ${value.toLocaleString("en-LK")}`;
}

export default function VenueBooking({
  locationId,
  initialDate,
  initialSportId,
  initialFacilityId,
}: {
  locationId: string;
  initialDate?: string;
  initialSportId?: string;
  initialFacilityId?: string;
}) {
  const router = useRouter();
  const today = colomboDate();
  const [date, setDate] = useState(
    initialDate && initialDate >= today ? initialDate : today,
  );
  const [sportId, setSportId] = useState(initialSportId ?? "");
  const [facilities, setFacilities] = useState<FacilityWithSlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState<{ facilityId: string; starts: string[] }>({
    facilityId: "",
    starts: [],
  });

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/locations/${locationId}/slots?date=${date}`)
      .then(async (response) => {
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error || "Couldn't load availability.");
          setFacilities([]);
        } else {
          setError("");
          setFacilities(data.facilities);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load availability.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locationId, date]);

  // Scroll the court the player came from into view once slots are loaded.
  useEffect(() => {
    if (!loading && initialFacilityId) {
      document
        .getElementById(`court-${initialFacilityId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading, initialFacilityId]);

  const sports = useMemo(() => {
    const map = new Map<string, string>();
    facilities.forEach((f) => f.sports.forEach((s) => map.set(s.id, s.name)));
    return [...map].map(([id, name]) => ({ id, name }));
  }, [facilities]);

  const visible = sportId
    ? facilities.filter((f) => f.sports.some((s) => s.id === sportId))
    : facilities;

  const selectedFacility = facilities.find((f) => f.id === selection.facilityId);
  const selectedSlots = selectedFacility
    ? selectedFacility.slots
        .filter((slot) => selection.starts.includes(slot.startTime))
        .sort((a, b) => minutes(a.startTime) - minutes(b.startTime))
    : [];
  const total = selectedSlots.reduce((sum, slot) => sum + slot.pricePerHour, 0);

  function changeDate(next: string) {
    if (!next || next === date) return;
    setLoading(true);
    setSelection({ facilityId: "", starts: [] });
    setDate(next);
  }

  function toggle(facility: FacilityWithSlots, slot: PublicSlot) {
    if (!slot.available) return;
    setError("");

    const sameCourt = selection.facilityId === facility.id;
    const current = sameCourt ? selection.starts : [];
    const next = current.includes(slot.startTime)
      ? current.filter((t) => t !== slot.startTime)
      : [...current, slot.startTime];

    const sorted = next.map(minutes).sort((a, b) => a - b);
    const continuous = sorted.every((m, i) => i === 0 || m - sorted[i - 1] === 60);

    if (!continuous) {
      setError("Please pick continuous hours on one court.");
      return;
    }

    setSelection({ facilityId: next.length ? facility.id : "", starts: next });
  }

  function book() {
    if (!selectedFacility || selectedSlots.length === 0) return;

    const params = new URLSearchParams({
      facilityId: selectedFacility.id,
      date,
      startTime: selectedSlots[0].startTime,
      endTime: selectedSlots[selectedSlots.length - 1].endTime,
    });

    router.push(`/player/checkout?${params.toString()}`);
  }

  return (
    <section id="book" className="scroll-mt-24">
      <h2 className="text-xl font-bold uppercase">Book a court</h2>

      <div className="mt-4 flex flex-col gap-4 border-[3px] border-black p-4 sm:flex-row sm:items-end">
        <div>
          <label htmlFor="venue-date" className="block text-xs font-bold uppercase text-gray-500">
            Date
          </label>
          <input
            id="venue-date"
            type="date"
            min={today}
            value={date}
            onChange={(e) => changeDate(e.target.value)}
            className="mt-1 border-[2px] border-black px-3 py-2 text-sm font-bold"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Today", value: today },
            { label: "Tomorrow", value: colomboDate(1) },
          ].map((quick) => (
            <button
              key={quick.label}
              type="button"
              onClick={() => changeDate(quick.value)}
              className={`border-[2px] border-black px-3 py-2 text-xs font-bold uppercase ${
                date === quick.value ? "bg-black text-white" : "hover:bg-black hover:text-white"
              }`}
            >
              {quick.label}
            </button>
          ))}
        </div>
        {sports.length > 1 && (
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={() => setSportId("")}
              className={`border-[2px] border-black px-3 py-2 text-xs font-bold uppercase ${
                !sportId ? "bg-black text-white" : "hover:bg-black hover:text-white"
              }`}
            >
              All sports
            </button>
            {sports.map((sport) => (
              <button
                key={sport.id}
                type="button"
                onClick={() => setSportId(sport.id)}
                className={`border-[2px] border-black px-3 py-2 text-xs font-bold uppercase ${
                  sportId === sport.id ? "bg-black text-white" : "hover:bg-black hover:text-white"
                }`}
              >
                {getSportIcon(sport.name)} {sport.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 border-[2px] border-red-600 p-3 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <p className="mt-6 text-sm font-bold uppercase text-gray-500">Loading availability…</p>
      ) : visible.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No courts are open for booking right now.</p>
      ) : (
        <div className="mt-6 space-y-5">
          {visible.map((facility) => {
            const openSlots = facility.slots.filter((s) => s.available).length;

            return (
              <article
                key={facility.id}
                id={`court-${facility.id}`}
                className={`scroll-mt-24 border-[3px] p-4 sm:p-5 ${
                  facility.id === initialFacilityId ? "border-black shadow-[6px_6px_0_0_#000]" : "border-black"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {facility.imageUrl && (
                    <div className="relative h-28 w-full shrink-0 overflow-hidden border-[2px] border-black sm:h-24 sm:w-36">
                      <Image
                        src={facility.imageUrl}
                        alt={facility.name}
                        fill
                        sizes="(min-width: 640px) 144px, 100vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase text-gray-500">
                      {facility.sports.map((s) => `${getSportIcon(s.name)} ${s.name}`).join(", ")}
                    </p>
                    <h3 className="mt-1 text-lg font-bold uppercase">{facility.name}</h3>
                    {facility.description && (
                      <p className="mt-1 text-sm text-gray-600">{facility.description}</p>
                    )}
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs font-bold uppercase text-gray-500">From</p>
                    <p className="text-lg font-bold">
                      {formatLkr(facility.price)}
                      <span className="text-sm font-normal text-gray-500"> / hr</span>
                    </p>
                  </div>
                </div>

                {facility.blockedReason ? (
                  <p className="mt-4 border-[2px] border-gray-400 bg-gray-100 p-3 text-sm font-bold uppercase text-gray-700">
                    🚫 Closed on this date — {facility.blockedReason}
                  </p>
                ) : facility.slots.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500">Closed on this day.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {openSlots === 0 && (
                      <p className="text-sm font-bold uppercase text-gray-500">Fully booked on this date</p>
                    )}
                    {PERIODS.map((period) => {
                      const slots = facility.slots.filter((slot) => {
                        const start = minutes(slot.startTime);
                        return start >= period.start && start < period.end;
                      });

                      if (slots.length === 0) return null;

                      return (
                        <div key={period.label}>
                          <p className="mb-1.5 text-xs font-bold uppercase text-gray-500">{period.label}</p>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                            {slots.map((slot) => {
                              const selected =
                                selection.facilityId === facility.id &&
                                selection.starts.includes(slot.startTime);

                              return (
                                <button
                                  key={slot.startTime}
                                  type="button"
                                  disabled={!slot.available}
                                  onClick={() => toggle(facility, slot)}
                                  aria-pressed={selected}
                                  className={`border-[2px] px-2 py-2 text-xs font-bold uppercase transition ${
                                    !slot.available
                                      ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300 line-through"
                                      : selected
                                        ? "border-black bg-black text-white"
                                        : slot.surgePercentage > 0
                                          ? "border-orange-400 bg-orange-50 hover:bg-orange-100"
                                          : "border-black hover:bg-black hover:text-white"
                                  }`}
                                >
                                  <span className="block text-sm">{slot.startTime}</span>
                                  {slot.available && (
                                    <span className="block opacity-70">{formatLkr(slot.pricePerHour)}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {selectedFacility && selectedSlots.length > 0 && (
        <div className="sticky bottom-0 z-30 mt-6 border-[3px] border-black bg-black p-4 text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">{selectedFacility.name} · {date}</p>
              <p className="font-bold uppercase">
                {selectedSlots[0].startTime} – {selectedSlots[selectedSlots.length - 1].endTime}
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {selectedSlots.length} hr{selectedSlots.length === 1 ? "" : "s"}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-xl font-bold">{formatLkr(total)}</p>
              <button
                type="button"
                onClick={book}
                className="border-[3px] border-white bg-white px-5 py-2.5 text-sm font-bold uppercase text-black hover:bg-transparent hover:text-white"
              >
                Book now
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
