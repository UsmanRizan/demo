import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";

import { db } from "@/lib/prisma";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 403 },
    );
  }

  const result = await db
    .select({
      id: users.id,
      phone: users.phone,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return NextResponse.json({
    users: result,
  });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { phone, role } = body;

  if (!phone || typeof phone !== "string") {
    return NextResponse.json(
      { error: "Phone number is required." },
      { status: 400 },
    );
  }

  const normalizedPhone = phone.trim();

  if (!/^[0-9+\-\s()]{7,20}$/.test(normalizedPhone)) {
    return NextResponse.json(
      { error: "Invalid phone number format." },
      { status: 400 },
    );
  }

  if (!role || (role !== "PLAYER" && role !== "OWNER" && role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Role must be PLAYER, OWNER, or ADMIN." },
      { status: 400 },
    );
  }

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.phone, normalizedPhone))
    .limit(1);

  if (existingUser) {
    return NextResponse.json(
      { error: "A user with this phone number already exists." },
      { status: 409 },
    );
  }

  const [user] = await db
    .insert(users)
    .values({
      phone: normalizedPhone,
      role,
    })
    .returning();

  return NextResponse.json(
    {
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    },
    { status: 201 },
  );
}
