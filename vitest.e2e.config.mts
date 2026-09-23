import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * End-to-end tests: run against a live server (E2E_BASE_URL, default
 * http://localhost:3000) and its database. Start the server with
 * NOTIFICATIONS_DRY_RUN=true and OTP_DEV_LOG=true so no SMS is sent.
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["test/e2e/**/*.test.ts"],
    setupFiles: ["./test/e2e/setup-env.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
