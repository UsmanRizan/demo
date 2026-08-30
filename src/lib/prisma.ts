import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Disable prefetch so it's not used during `migrate` / `push`
const client = postgres(connectionString, { max: 10 });

export const db = drizzle(client, { schema });
