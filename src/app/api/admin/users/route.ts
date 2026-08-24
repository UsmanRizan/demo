import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 403,
      },
    );
  }

  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },

    select: {
      id: true,
      phone: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    users,
  });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 403,
      },
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

  const existingUser = await prisma.user.findUnique({
    where: { phone: normalizedPhone },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "A user with this phone number already exists." },
      { status: 409 },
    );
  }

  const user = await prisma.user.create({
    data: {
      phone: normalizedPhone,
      role,
    },
    select: {
      id: true,
      phone: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}
