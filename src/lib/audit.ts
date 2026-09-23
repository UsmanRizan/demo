import type { Prisma } from "@prisma/client";

import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/request";

type AuditInput = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  request?: Request;
};

/**
 * Record a privileged action. Pass a transaction client to make the log entry
 * part of the same atomic change; otherwise failures are logged, not thrown.
 */
export async function audit(
  input: AuditInput,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const data = {
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: input.metadata,
    ip: input.request ? getClientIp(input.request) : null,
  };

  if (tx) {
    await tx.auditLog.create({ data });
    return;
  }

  try {
    await prisma.auditLog.create({ data });
  } catch (error) {
    logError("Audit log write failed:", error, data);
  }
}
