import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Render per request so the build never needs a database connection.
  await connection();

  const base = siteUrl();

  const locations = await prisma.location.findMany({
    where: { isActive: true, owner: { deletedAt: null } },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/player/find-booking`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/help`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/contact-owner`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  return [
    ...staticPages,
    ...locations.map((location) => ({
      url: `${base}/locations/${location.id}`,
      lastModified: location.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
