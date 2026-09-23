import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { parseJson, staffCreateSchema, staffRemoveSchema } from "@/lib/validation";
import { logError } from "@/lib/monitoring";

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
    logError("Get staff error:", error);
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

    const parsed = await parseJson(request, staffCreateSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { phone, password } = parsed.data;

    // Find or create the staff user
    let staffUser = await prisma.user.findUnique({ where: { phone } });

    if (staffUser) {
      // Never take over an existing account: an owner could otherwise reset a
      // player's password by "adding" their number as staff. Existing staff
      // accounts are assigned as-is and keep their own password.
      if (staffUser.role !== "STAFF" || staffUser.deletedAt) {
        return NextResponse.json(
          {
            error:
              "This phone number already belongs to another account and cannot be added as staff.",
          },
          { status: 400 },
        );
      }
    } else {
      staffUser = await prisma.user.create({
        data: {
          phone,
          passwordHash: await hashPassword(password),
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

    await audit({
      actorId: user.id,
      action: "staff.assign",
      entityType: "Location",
      entityId: id,
      metadata: { staffId: staffUser.id },
      request,
    });

    return NextResponse.json({ staff: assignment }, { status: 201 });
  } catch (error) {
    logError("Assign staff error:", error);
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

    const parsedRemove = await parseJson(request, staffRemoveSchema);

    if (parsedRemove.response) {
      return parsedRemove.response;
    }

    const body = parsedRemove.data;

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

    await audit({
      actorId: user.id,
      action: "staff.remove",
      entityType: "Location",
      entityId: id,
      metadata: { staffId: body.staffId },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("Remove staff error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
