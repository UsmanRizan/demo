import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * The database is remote (Neon in us-east-2), so a round trip costs real
 * latency and interactive transactions can legitimately outrun Prisma's 5s
 * default — especially with a cold compute. Without raising these, a booking
 * that takes 6s fails with "query cannot be executed on an expired
 * transaction" rather than simply finishing.
 *
 * onPoolError/onConnectionError matter here: Neon drops idle pooled
 * connections, and pg surfaces that on the pool's 'error' event. Left
 * unhandled it resurfaces later as "Authentication timed out" on whichever
 * request happens to check out the dead connection.
 */
const adapter = new PrismaPg(
  {
    connectionString,
    max: 10,
    // Wait longer for a connection when Neon is starting up or saturated.
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 30_000,
  },
  {
    onPoolError: (error: Error) => {
      console.error("[db] idle pool connection error:", error.message);
    },
    onConnectionError: (error: Error) => {
      console.error("[db] connection error:", error.message);
    },
  },
);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    transactionOptions: {
      timeout: 20_000,
      maxWait: 10_000,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
