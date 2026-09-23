import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations take a session-level advisory lock, which leaks through
    // Neon's PgBouncer pooler. Point the CLI at the direct (non "-pooler")
    // host when DIRECT_URL is set; the app keeps using DATABASE_URL.
    url: process.env.DIRECT_URL || env("DATABASE_URL"),
  },
});
