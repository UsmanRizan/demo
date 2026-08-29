import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;

  const location = await prisma.location.findFirst({
    where: {
      id,
      ownerId: user.id,
    },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const rules = await prisma.pricingRule.findMany({
    where: {
      locationId: id,
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({ rules });
}

export async function PUT(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const location = await prisma.location.findFirst({
      where: {
        id,
        ownerId: user.id,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    const body = await request.json();

    if (!Array.isArray(body.rules)) {
      return NextResponse.json(
        { error: "rules must be an array" },
        { status: 400 },
      );
    }

    const rules = body.rules;

    // Validate each rule
    for (const rule of rules) {
      if (typeof rule.startTime !== "string" || typeof rule.endTime !== "string") {
        return NextResponse.json(
          { error: "startTime and endTime are required for each rule" },
          { status: 400 },
        );
      }

      if (!/^\d{2}:\d{2}$/.test(rule.startTime) || !/^\d{2}:\d{2}$/.test(rule.endTime)) {
        return NextResponse.json(
          { error: "Times must use HH:MM format" },
          { status: 400 },
        );
      }

      if (typeof rule.percentage !== "number" || !Number.isFinite(rule.percentage)) {
        return NextResponse.json(
          { error: "percentage must be a valid number" },
          { status: 400 },
        );
      }

      if (rule.percentage < -50 || rule.percentage > 100) {
        return NextResponse.json(
          { error: "percentage must be between -50 and 100" },
          { status: 400 },
        );
      }

      if (rule.dayOfWeek !== null && rule.dayOfWeek !== undefined) {
        if (!Number.isInteger(rule.dayOfWeek) || rule.dayOfWeek < 0 || rule.dayOfWeek > 6) {
          return NextResponse.json(
            { error: "dayOfWeek must be between 0 and 6" },
            { status: 400 },
          );
        }
      }
    }

    const updatedRules = await prisma.$transaction(async (tx) => {
      await tx.pricingRule.deleteMany({
        where: {
          locationId: id,
        },
      });

      if (rules.length > 0) {
        await tx.pricingRule.createMany({
          data: rules.map(
            (rule: {
              name?: string;
              startTime: string;
              endTime: string;
              percentage: number;
              dayOfWeek?: number | null;
              isActive?: boolean;
            }) => ({
              locationId: id,
              name: rule.name || null,
              startTime: rule.startTime,
              endTime: rule.endTime,
              percentage: rule.percentage,
              dayOfWeek: rule.dayOfWeek ?? null,
              isActive: rule.isActive ?? true,
            }),
          ),
        });
      }

      return tx.pricingRule.findMany({
        where: {
          locationId: id,
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });
    });

    return NextResponse.json({
      success: true,
      rules: updatedRules,
    });
  } catch (error) {
    console.error("Pricing rules error:", error);

    return NextResponse.json(
      { error: "Failed to update pricing rules" },
      { status: 500 },
    );
  }
}
