import { galleryAdd, galleryDelete, galleryGet } from "@/lib/gallery";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  return galleryGet("facility", (await params).id);
}

export async function POST(request: Request, { params }: RouteContext) {
  return galleryAdd("facility", (await params).id, request);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  return galleryDelete("facility", (await params).id, request);
}
