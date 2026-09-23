import { galleryAdd, galleryDelete, galleryGet } from "@/lib/gallery";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  return galleryGet("location", (await params).id);
}

export async function POST(request: Request, { params }: RouteContext) {
  return galleryAdd("location", (await params).id, request);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  return galleryDelete("location", (await params).id, request);
}
