import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";

/** Every facility across all venues, for the admin moderation queue. */
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      where.approvalStatus = status;
    }

    const [facilities, counts] = await Promise.all([
      prisma.facility.findMany({
        where,
        orderBy: [{ approvalStatus: "asc" }, { createdAt: "desc" }],
        include: {
          sports: { select: { id: true, name: true } },
          location: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              owner: {
                select: { id: true, phone: true, firstName: true, lastName: true },
              },
            },
          },
        },
      }),
      prisma.facility.groupBy({
        by: ["approvalStatus"],
        _count: { _all: true },
      }),
    ]);

    const countsByStatus: Record<string, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };

    for (const row of counts) {
      countsByStatus[row.approvalStatus] = row._count._all;
    }

    return NextResponse.json({
      facilities: facilities.map((facility) => ({
        id: facility.id,
        name: facility.name,
        description: facility.description,
        imageUrl: facility.imageUrl,
        price: facility.price.toString(),
        isActive: facility.isActive,
        approvalStatus: facility.approvalStatus,
        approvedAt: facility.approvedAt?.toISOString() ?? null,
        rejectionReason: facility.rejectionReason,
        createdAt: facility.createdAt.toISOString(),
        sports: facility.sports,
        location: {
          id: facility.location.id,
          name: facility.location.name,
          address: facility.location.address,
          city: facility.location.city,
          owner: facility.location.owner,
        },
      })),
      counts: countsByStatus,
    });
  } catch (error) {
    logError("Admin facilities fetch error:", error);

    return NextResponse.json(
      { error: "Failed to fetch facilities." },
      { status: 500 },
    );
  }
}
