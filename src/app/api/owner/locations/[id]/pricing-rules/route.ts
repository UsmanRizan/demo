import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJson, pricingRulesSchema } from "@/lib/validation";
import { logError } from "@/lib/monitoring";

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

    const parsed = await parseJson(request, pricingRulesSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const rules = parsed.data.rules;

    const updatedRules = await prisma.$transaction(async (tx) => {
      await tx.pricingRule.deleteMany({
        where: {
          locationId: id,
        },
      });

      if (rules.length > 0) {
        await tx.pricingRule.createMany({
          data: rules.map(
            (rule) => ({
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
    logError("Pricing rules error:", error);

    return NextResponse.json(
      { error: "Failed to update pricing rules" },
      { status: 500 },
    );
  }
}
