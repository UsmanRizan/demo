import { vi } from "vitest";

// Unit tests never touch a database; modules that import the Prisma client
// get an empty stub instead (it would otherwise throw without DATABASE_URL).
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

process.env.SESSION_SECRET ??= "unit-test-session-secret";
