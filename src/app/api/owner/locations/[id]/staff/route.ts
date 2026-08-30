import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";

import { db } from "@/lib/prisma";
import { locations, locationStaff, users } from "@/db/schema";
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
    const [location] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.ownerId, user.id)))
      .limit(1);

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Get staff assignments with user info
    const assignments = await db
      .select({
        id: locationStaff.id,
        locationId: locationStaff.locationId,
        staffId: locationStaff.staffId,
        createdAt: locationStaff.createdAt,
        staff: {
          id: users.id,
          phone: users.phone,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          createdAt: users.createdAt,
        },
      })
      .from(locationStaff)
      .innerJoin(users, eq(locationStaff.staffId, users.id))
      .where(eq(locationStaff.locationId, id))
      .orderBy(desc(locationStaff.createdAt));

    return NextResponse.json({ staff: assignments });
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
    const [location] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.ownerId, user.id)))
      .limit(1);

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
    let [staffUser] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

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
      const [updated] = await db
        .update(users)
        .set({ passwordHash, role: "STAFF" })
        .where(eq(users.id, staffUser.id))
        .returning();
      staffUser = updated;
    } else {
      // Create new staff user
      const passwordHash = await hashPassword(body.password);
      const [created] = await db
        .insert(users)
        .values({
          phone,
          passwordHash,
          role: "STAFF",
        })
        .returning();
      staffUser = created;
    }

    // Check if already assigned
    const [existingAssignment] = await db
      .select()
      .from(locationStaff)
      .where(
        and(
          eq(locationStaff.locationId, id),
          eq(locationStaff.staffId, staffUser.id),
        ),
      )
      .limit(1);

    if (existingAssignment) {
      return NextResponse.json(
        { error: "This staff member is already assigned to this location" },
        { status: 400 },
      );
    }

    // Assign staff to location
    const [assignment] = await db
      .insert(locationStaff)
      .values({
        locationId: id,
        staffId: staffUser.id,
      })
      .returning();

    return NextResponse.json(
      {
        staff: {
          ...assignment,
          staff: {
            id: staffUser.id,
            phone: staffUser.phone,
            firstName: staffUser.firstName,
            lastName: staffUser.lastName,
            email: staffUser.email,
            createdAt: staffUser.createdAt,
          },
        },
      },
      { status: 201 },
    );
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
    const [location] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.ownerId, user.id)))
      .limit(1);

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
    const [existingAssignment] = await db
      .select()
      .from(locationStaff)
      .where(
        and(
          eq(locationStaff.locationId, id),
          eq(locationStaff.staffId, body.staffId),
        ),
      )
      .limit(1);

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Staff member is not assigned to this location" },
        { status: 404 },
      );
    }

    await db
      .delete(locationStaff)
      .where(
        and(
          eq(locationStaff.locationId, id),
          eq(locationStaff.staffId, body.staffId),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove staff error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
