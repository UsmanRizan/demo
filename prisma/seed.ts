import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { users, sports } from "../src/db/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
  console.log("Seeding database...");

  /*
   * ------------------------------------------------------
   * ADMIN
   * ------------------------------------------------------
   */

  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.phone, "94743922176"))
    .limit(1);

  let admin;
  if (existingAdmin) {
    [admin] = await db
      .update(users)
      .set({
        role: "ADMIN",
        firstName: "System",
        lastName: "Admin",
      })
      .where(eq(users.phone, "94743922176"))
      .returning();
  } else {
    [admin] = await db
      .insert(users)
      .values({
        phone: "94743922176",
        firstName: "System",
        lastName: "Admin",
        role: "ADMIN",
      })
      .returning();
  }

  console.log("Admin created:", admin.phone);

  /*
   * ------------------------------------------------------
   * SPORTS
   * ------------------------------------------------------
   */

  const sportsData = [
    {
      name: "Badminton",
      slug: "badminton",
    },
    {
      name: "Basketball",
      slug: "basketball",
    },
    {
      name: "Football",
      slug: "football",
    },
    {
      name: "Tennis",
      slug: "tennis",
    },
    {
      name: "Volleyball",
      slug: "volleyball",
    },
  ];

  for (const sport of sportsData) {
    const [existingSport] = await db
      .select()
      .from(sports)
      .where(eq(sports.slug, sport.slug))
      .limit(1);

    if (existingSport) {
      await db
        .update(sports)
        .set({
          name: sport.name,
          isActive: true,
        })
        .where(eq(sports.slug, sport.slug));
    } else {
      await db.insert(sports).values({
        name: sport.name,
        slug: sport.slug,
        isActive: true,
      });
    }
  }

  console.log("Sports seeded:", sportsData.length);

  console.log("Seeding complete.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);

    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
