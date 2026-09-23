import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { imageAttachSchema, parseJson } from "@/lib/validation";

export const MAX_GALLERY_IMAGES = 10;

type Kind = "facility" | "location";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Only images we uploaded to our own Cloudinary account may be attached. */
export function isOwnCloudinaryUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;

    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      (!cloud || parsed.pathname.startsWith(`/${cloud}/`))
    );
  } catch {
    return false;
  }
}

async function ownsTarget(kind: Kind, id: string, ownerId: string) {
  if (kind === "facility") {
    return !!(await prisma.facility.findFirst({
      where: { id, location: { ownerId } },
      select: { id: true },
    }));
  }

  return !!(await prisma.location.findFirst({
    where: { id, ownerId },
    select: { id: true },
  }));
}

function listImages(kind: Kind, id: string) {
  return kind === "facility"
    ? prisma.facilityImage.findMany({
        where: { facilityId: id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      })
    : prisma.locationImage.findMany({
        where: { locationId: id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
}

async function authorize(kind: Kind, id: string) {
  const user = await getCurrentUser();

  if (!user || user.role !== "OWNER") {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }

  if (!(await ownsTarget(kind, id, user.id))) {
    return {
      response: NextResponse.json(
        { error: `${kind === "facility" ? "Facility" : "Location"} not found` },
        { status: 404 },
      ),
    };
  }

  return { user };
}

export async function galleryGet(kind: Kind, id: string) {
  const auth = await authorize(kind, id);

  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json({ images: await listImages(kind, id) });
}

export async function galleryAdd(kind: Kind, id: string, request: Request) {
  const auth = await authorize(kind, id);

  if (auth.response) {
    return auth.response;
  }

  const parsed = await parseJson(request, imageAttachSchema);

  if (parsed.response) {
    return parsed.response;
  }

  if (!isOwnCloudinaryUrl(parsed.data.url)) {
    return NextResponse.json(
      { error: "Images must be uploaded through BookMyPlay." },
      { status: 400 },
    );
  }

  const existing = await listImages(kind, id);

  if (existing.length >= MAX_GALLERY_IMAGES) {
    return NextResponse.json(
      { error: `You can add up to ${MAX_GALLERY_IMAGES} photos.` },
      { status: 400 },
    );
  }

  const data = {
    url: parsed.data.url,
    publicId: parsed.data.publicId ?? null,
    sortOrder: existing.length,
  };

  const image =
    kind === "facility"
      ? await prisma.facilityImage.create({ data: { ...data, facilityId: id } })
      : await prisma.locationImage.create({ data: { ...data, locationId: id } });

  return NextResponse.json({ image }, { status: 201 });
}

export async function galleryDelete(kind: Kind, id: string, request: Request) {
  const auth = await authorize(kind, id);

  if (auth.response) {
    return auth.response;
  }

  const imageId = new URL(request.url).searchParams.get("imageId");

  if (!imageId) {
    return NextResponse.json({ error: "imageId is required" }, { status: 400 });
  }

  const image =
    kind === "facility"
      ? await prisma.facilityImage.findFirst({ where: { id: imageId, facilityId: id } })
      : await prisma.locationImage.findFirst({ where: { id: imageId, locationId: id } });

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  if (kind === "facility") {
    await prisma.facilityImage.delete({ where: { id: imageId } });
  } else {
    await prisma.locationImage.delete({ where: { id: imageId } });
  }

  if (image.publicId) {
    try {
      await cloudinary.uploader.destroy(image.publicId);
    } catch (error) {
      logError("Cloudinary delete failed (image already detached):", error);
    }
  }

  return NextResponse.json({ success: true });
}
