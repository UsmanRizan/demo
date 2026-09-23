import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/monitoring";
import { enforceRateLimits } from "@/lib/rate-limit";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const limited = await enforceRateLimits([
    { key: `upload:user:${user.id}`, limit: 60, windowSeconds: 3600 },
  ]);

  if (limited) {
    return limited;
  }

  try {
    const formData = await request.formData();

    const folder = formData.get("folder") === "locations" ? "locations" : "facilities";

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, or WebP images are allowed" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image must be smaller than 5 MB" },
        { status: 400 },
      );
    }

    // Convert the file to a base64 data URI for the Cloudinary upload.
    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${bytes.toString("base64")}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: "image",
    });

    return NextResponse.json(
      {
        success: true,
        imageUrl: result.secure_url,
        publicId: result.public_id,
      },
      { status: 201 },
    );
  } catch (error) {
    logError("Cloudinary upload error:", error);

    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}
