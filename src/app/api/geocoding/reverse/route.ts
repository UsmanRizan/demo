import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon) {
      return NextResponse.json(
        {
          error: "Latitude and longitude are required",
        },
        { status: 400 },
      );
    }

    const latitude = Number(lat);
    const longitude = Number(lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        {
          error: "Invalid coordinates",
        },
        { status: 400 },
      );
    }

    const url = new URL("https://nominatim.openstreetmap.org/reverse");

    url.searchParams.set("lat", latitude.toString());

    url.searchParams.set("lon", longitude.toString());

    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "BookMyPlay/1.0 (location-picker)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Reverse geocoding failed",
        },
        { status: 502 },
      );
    }

    const data = await response.json();

    const address = data.address || {};

    const city =
      address.city ||
      address.town ||
      address.municipality ||
      address.village ||
      address.county ||
      "";

    const formattedAddress = data.display_name || "";

    return NextResponse.json({
      latitude,
      longitude,
      address: formattedAddress,
      city,
    });
  } catch (error) {
    console.error("Reverse geocoding error:", error);

    return NextResponse.json(
      {
        error: "Unable to find address",
      },
      { status: 500 },
    );
  }
}
