import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";

import FavoriteButton from "@/components/FavoriteButton";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import StarRating from "@/components/StarRating";
import VenueBooking from "@/components/VenueBooking";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocationReviews, getRatingSummaries, reviewerName } from "@/lib/reviews";
import { siteUrl } from "@/lib/site";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getLocation = cache(async (id: string) =>
  prisma.location.findFirst({
    where: { id, isActive: true, owner: { deletedAt: null } },
    include: {
      images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      availabilities: { where: { isActive: true }, orderBy: { dayOfWeek: "asc" } },
      facilities: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
          sports: { where: { isActive: true }, select: { id: true, name: true } },
          images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        },
      },
    },
  }),
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const location = await getLocation(id);

  if (!location) {
    return { title: "Venue not found", robots: { index: false } };
  }

  const sports = [...new Set(location.facilities.flatMap((f) => f.sports.map((s) => s.name)))];
  const description =
    location.description?.slice(0, 160) ||
    `Book ${sports.join(", ") || "sports facilities"} at ${location.name}, ${location.city}. See prices, opening hours and reviews.`;
  const image =
    location.images[0]?.url ??
    location.facilities.find((f) => f.imageUrl)?.imageUrl ??
    location.facilities.flatMap((f) => f.images)[0]?.url;

  return {
    title: `${location.name}, ${location.city}`,
    description,
    alternates: { canonical: `/locations/${location.id}` },
    openGraph: {
      title: `${location.name} | BookMyPlay`,
      description,
      type: "website",
      url: `/locations/${location.id}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function LocationPublicPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const [location, user] = await Promise.all([getLocation(id), getCurrentUser()]);

  if (!location) {
    notFound();
  }

  const [reviews, summaries, favorite] = await Promise.all([
    getLocationReviews(location.id),
    getRatingSummaries([location.id]),
    user
      ? prisma.favorite.findUnique({
          where: { userId_locationId: { userId: user.id, locationId: location.id } },
        })
      : null,
  ]);

  const summary = summaries.get(location.id);
  const gallery = [
    ...location.images.map((img) => img.url),
    ...location.facilities.flatMap((f) => [
      ...(f.imageUrl ? [f.imageUrl] : []),
      ...f.images.map((img) => img.url),
    ]),
  ].filter((url, index, all) => all.indexOf(url) === index);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: location.name,
    description: location.description ?? undefined,
    url: `${siteUrl()}/locations/${location.id}`,
    telephone: location.phone ?? undefined,
    image: gallery.slice(0, 5),
    address: {
      "@type": "PostalAddress",
      streetAddress: location.address,
      addressLocality: location.city,
      addressCountry: "LK",
    },
    ...(location.latitude !== null && location.longitude !== null
      ? { geo: { "@type": "GeoCoordinates", latitude: location.latitude, longitude: location.longitude } }
      : {}),
    ...(summary && summary.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: summary.average,
            reviewCount: summary.count,
          },
        }
      : {}),
  };

  return (
    <main className="min-h-screen bg-white">
      <Header user={user} />
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped cannot break out of the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-gray-500">{location.city}</p>
            <h1 className="mt-1 text-3xl font-bold uppercase sm:text-4xl">{location.name}</h1>
            <p className="mt-2 text-gray-600">{location.address}, {location.city}</p>
            {summary && summary.count > 0 ? (
              <p className="mt-2 flex items-center gap-2 text-sm">
                <StarRating rating={summary.average} />
                <span className="font-bold">{summary.average.toFixed(1)}</span>
                <a href="#reviews" className="text-gray-500 underline">
                  {summary.count} review{summary.count === 1 ? "" : "s"}
                </a>
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-500">No reviews yet</p>
            )}
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <a
              href="#book"
              className="border-[3px] border-black bg-black px-4 py-2.5 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black"
            >
              Book a court
            </a>
            <FavoriteButton
              locationId={location.id}
              initialFavorited={!!favorite}
              signedIn={!!user}
            />
            {location.latitude !== null && location.longitude !== null && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border-[3px] border-black px-4 py-2.5 text-sm font-bold uppercase transition-colors hover:bg-black hover:text-white"
              >
                Directions
              </a>
            )}
          </div>
        </div>

        {gallery.length > 0 && (
          <section aria-label="Photos" className="mt-8 grid gap-3 sm:grid-cols-3">
            {gallery.slice(0, 6).map((url, index) => (
              <div
                key={url}
                className={`relative aspect-[4/3] overflow-hidden border-[3px] border-black ${index === 0 ? "sm:col-span-2 sm:row-span-2" : ""}`}
              >
                <Image
                  src={url}
                  alt={`${location.name} photo ${index + 1}`}
                  fill
                  sizes={index === 0 ? "(min-width: 640px) 66vw, 100vw" : "(min-width: 640px) 33vw, 100vw"}
                  className="object-cover"
                  priority={index === 0}
                />
              </div>
            ))}
          </section>
        )}

        {location.description && (
          <p className="mt-8 max-w-3xl whitespace-pre-line text-gray-700">{location.description}</p>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <VenueBooking
              locationId={location.id}
              initialDate={typeof query.date === "string" ? query.date : undefined}
              initialSportId={typeof query.sport === "string" ? query.sport : undefined}
              initialFacilityId={typeof query.court === "string" ? query.court : undefined}
            />
          </div>

          <aside>
            <h2 className="text-xl font-bold uppercase">Opening hours</h2>
            <dl className="mt-4 border-[3px] border-black p-5 text-sm">
              {DAYS.map((day, dayIndex) => {
                const hours = location.availabilities.find((a) => a.dayOfWeek === dayIndex);

                return (
                  <div key={day} className="flex justify-between py-1">
                    <dt className="font-bold">{day}</dt>
                    <dd className="text-gray-700">
                      {!hours ? "Closed" : hours.isTwentyFourHour ? "Open 24 hours" : `${hours.startTime} – ${hours.endTime}`}
                    </dd>
                  </div>
                );
              })}
            </dl>
            {location.phone && (
              <p className="mt-4 text-sm">
                <span className="font-bold uppercase">Phone: </span>
                <a href={`tel:${location.phone}`} className="underline">
                  {location.phone}
                </a>
              </p>
            )}
          </aside>
        </div>

        <section id="reviews" className="mt-12 scroll-mt-24">
          <h2 className="text-xl font-bold uppercase">Reviews</h2>
          {reviews.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No reviews yet. Players can review a booking after they&apos;ve played.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {reviews.map((review) => (
                <li key={review.id} className="border-[2px] border-black p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold">
                      {reviewerName(review.player)}{" "}
                      <span className="font-normal text-gray-500">· {review.facility.name}</span>
                    </p>
                    <StarRating rating={review.rating} size="text-sm" />
                  </div>
                  {review.comment && <p className="mt-2 text-sm text-gray-700">{review.comment}</p>}
                  <p className="mt-2 text-xs text-gray-400">
                    {new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeZone: "Asia/Colombo" }).format(review.createdAt)}
                  </p>
                  {review.ownerReply && (
                    <div className="mt-3 border-l-[3px] border-black pl-3 text-sm">
                      <p className="text-xs font-bold uppercase text-gray-500">Response from the venue</p>
                      <p className="mt-1 text-gray-700">{review.ownerReply}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Footer />
    </main>
  );
}
