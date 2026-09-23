import { NextResponse } from "next/server";

import { getFacilitiesWithSlots } from "@/lib/availability";
import { isValidDate } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

/** Public: every court at a venue with its hourly slots for ?date=YYYY-MM-DD. */
export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const date = new URL(request.url).searchParams.get("date");

  if (!date || !isValidDate(date)) {
    return NextResponse.json({ error: "A valid date is required" }, { status: 400 });
  }

  const facilities = await getFacilitiesWithSlots({
    where: { locationId: id },
    date,
  });

  return NextResponse.json(
    { date, facilities },
    { headers: { "Cache-Control": "no-store" } },
  );
}
