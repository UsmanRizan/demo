import { after, NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/monitoring";
import { notifyFacilityReviewed } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { facilityApprovalSchema, parseJson } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

class ApprovalError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/**
 * Approve or reject a facility awaiting review. Approving makes it visible and
 * bookable for players; rejecting hides it again and records the reason.
 *
 * If a rejected facility already has bookings, approval is refused so an admin
 * can't silently put a court back on sale over live reservations.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const parsed = await parseJson(request, facilityApprovalSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { action, reason } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const facility = await tx.facility.findUnique({ where: { id } });

      if (!facility) {
        throw new ApprovalError("Facility not found.", 404);
      }

      if (facility.approvalStatus === "APPROVED" && action === "approve") {
        throw new ApprovalError("This facility is already approved.", 409);
      }

      if (facility.approvalStatus === "REJECTED" && action === "reject") {
        throw new ApprovalError("This facility was already rejected.", 409);
      }

      // Both directions can strand players: approving re-exposes a hidden
      // court, and rejecting hides one that has live reservations.
      const live = await tx.booking.count({
        where: {
          facilityId: id,
          status: { in: ["PENDING", "CONFIRMED"] },
          endAt: { gt: new Date() },
        },
      });

      if (live > 0) {
        throw new ApprovalError(
          "This facility has upcoming bookings. Ask the owner to cancel them before changing its approval.",
          409,
        );
      }

      const updated = await tx.facility.update({
        where: { id },
        data:
          action === "approve"
            ? {
                approvalStatus: "APPROVED",
                approvedAt: new Date(),
                approvedById: currentUser.id,
                rejectionReason: null,
              }
            : {
                approvalStatus: "REJECTED",
                approvedAt: null,
                approvedById: null,
                rejectionReason: reason ?? null,
              },
        include: {
          location: { select: { ownerId: true, name: true } },
        },
      });

      await audit(
        {
          actorId: currentUser.id,
          action: `facility.${action}`,
          entityType: "Facility",
          entityId: id,
          metadata: { name: facility.name, reason: reason ?? null },
          request,
        },
        tx,
      );

      return {
        facility: updated,
        // Guarded above: `action` fixes the resulting status to a decided value.
        approvalStatus: updated.approvalStatus as "APPROVED" | "REJECTED",
      };
    });

    after(() =>
      notifyFacilityReviewed(
        result.facility.location.ownerId,
        result.facility.name,
        result.approvalStatus,
        reason ?? null,
      ),
    );

    return NextResponse.json({
      success: true,
      message:
        action === "approve"
          ? `${result.facility.name} is approved and now bookable.`
          : `${result.facility.name} was rejected. The owner can fix it and resubmit.`,
      facility: {
        id: result.facility.id,
        approvalStatus: result.facility.approvalStatus,
        approvedAt: result.facility.approvedAt?.toISOString() ?? null,
        rejectionReason: result.facility.rejectionReason,
      },
    });
  } catch (error) {
    if (error instanceof ApprovalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    logError("Facility approval error:", error);

    return NextResponse.json(
      { error: "Failed to update facility approval." },
      { status: 500 },
    );
  }
}
