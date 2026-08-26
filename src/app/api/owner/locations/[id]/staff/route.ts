import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { normalizePhone } from "@/lib/utils";

type RouteParams = Promise<{ id: string }>;

// GET - List staff for a location
export async function GET(
  request: Request,
  { params }: { params: RouteParams },
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const location = await prisma.location.findFirst({
      where: { id, ownerId: user.id },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const staffAssignments = await prisma.locationStaff.findMany({
      where: { locationId: id },
      include: {
        staff: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ staff: staffAssignments });
  } catch (error) {
    console.error("Get staff error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

// POST - Assign staff to a location
export async function POST(
  request: Request,
  { params }: { params: RouteParams },
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const location = await prisma.location.findFirst({
      where: { id, ownerId: user.id },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const body = await request.json();

    if (!body.phone || typeof body.phone !== "string") {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    if (!body.password || typeof body.password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    if (body.password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const phone = normalizePhone(body.phone);

    // Find or create the staff user
    let staffUser = await prisma.user.findUnique({ where: { phone } });

    if (staffUser) {
      // If the user exists and is not a PLAYER or STAFF, we can't assign them
      if (staffUser.role !== "PLAYER" && staffUser.role !== "STAFF") {
        return NextResponse.json(
          { error: "This phone number is already registered as an owner or admin" },
          { status: 400 },
        );
      }

      // Update password for existing user
      const passwordHash = await hashPassword(body.password);
      staffUser = await prisma.user.update({
        where: { id: staffUser.id },
        data: {
          passwordHash,
          role: "STAFF",
        },
      });
    } else {
      // Create new staff user
      const passwordHash = await hashPassword(body.password);
      staffUser = await prisma.user.create({
        data: {
          phone,
          passwordHash,
          role: "STAFF",
        },
      });
    }

    // Check if already assigned
    const existingAssignment = await prisma.locationStaff.findUnique({
      where: {
        locationId_staffId: {
          locationId: id,
          staffId: staffUser.id,
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: "This staff member is already assigned to this location" },
        { status: 400 },
      );
    }

    // Assign staff to location
    const assignment = await prisma.locationStaff.create({
      data: {
        locationId: id,
        staffId: staffUser.id,
      },
      include: {
        staff: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ staff: assignment }, { status: 201 });
  } catch (error) {
    console.error("Assign staff error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

// DELETE - Remove staff from a location
export async function DELETE(
  request: Request,
  { params }: { params: RouteParams },
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const location = await prisma.location.findFirst({
      where: { id, ownerId: user.id },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const body = await request.json();

    if (!body.staffId || typeof body.staffId !== "string") {
      return NextResponse.json(
        { error: "Staff ID is required" },
        { status: 400 },
      );
    }

    // Check if assignment exists
    const existingAssignment = await prisma.locationStaff.findUnique({
      where: {
        locationId_staffId: {
          locationId: id,
          staffId: body.staffId,
        },
      },
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Staff member is not assigned to this location" },
        { status: 404 },
      );
    }

    await prisma.locationStaff.delete({
      where: {
        locationId_staffId: {
          locationId: id,
          staffId: body.staffId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove staff error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
