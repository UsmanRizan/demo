import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Seeding database...");

  const admin = await prisma.user.upsert({
    where: {
      phone: "+94743922176",
    },
    update: {
      role: "ADMIN",
      name: "System Admin",
    },
    create: {
      phone: "+94743922176",
      name: "System Admin",
      role: "ADMIN",
    },
  });

  console.log("Admin created:", admin.phone);

  const sports = [
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

  for (const sport of sports) {
    await prisma.sport.upsert({
      where: {
        slug: sport.slug,
      },
      update: {
        name: sport.name,
        isActive: true,
      },
      create: {
        name: sport.name,
        slug: sport.slug,
      },
    });
  }

  console.log("Sports seeded:", sports.length);
  console.log("Seeding complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
