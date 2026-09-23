import type { Metadata } from "next";
import { redirect } from "next/navigation";

import FavoriteButton from "@/components/FavoriteButton";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import StarRating from "@/components/StarRating";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/reviews";

export const metadata: Metadata = { title: "Saved venues" };

export default async function FavoritesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id, location: { isActive: true } },
    orderBy: { createdAt: "desc" },
    include: {
      location: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          facilities: {
            where: { isActive: true },
            select: { sports: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  const ratings = await getRatingSummaries(favorites.map((f) => f.locationId));

  return (
    <main className="min-h-screen bg-white">
      <Header user={user} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold uppercase sm:text-3xl">Saved venues</h1>
        <p className="mt-1 text-gray-500">Quickly re-book the places you play most.</p>

        {favorites.length === 0 ? (
          <div className="mt-8 border-[3px] border-black p-8 text-center">
            <p className="text-gray-600">
              You haven&apos;t saved any venues yet. Tap <strong>Save</strong> on a venue page
              to keep it here.
            </p>
            <a
              href="/player/find-booking"
              className="mt-4 inline-block border-[3px] border-black bg-black px-5 py-3 text-sm font-bold uppercase text-white hover:bg-white hover:text-black"
            >
              Find a court
            </a>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {favorites.map(({ location }) => {
              const sports = [
                ...new Map(
                  location.facilities.flatMap((f) => f.sports).map((s) => [s.id, s]),
                ).values(),
              ];
              const rating = ratings.get(location.id);

              return (
                <li key={location.id} className="flex flex-col border-[3px] border-black p-5">
                  <a href={`/locations/${location.id}`} className="text-lg font-bold uppercase hover:underline">
                    {location.name}
                  </a>
                  <p className="text-sm text-gray-600">
                    {location.address}, {location.city}
                  </p>
                  {rating && rating.count > 0 && (
                    <p className="mt-1 text-sm">
                      <StarRating rating={rating.average} size="text-sm" /> {rating.average.toFixed(1)} ({rating.count})
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {sports.map((sport) => (
                      <a
                        key={sport.id}
                        href={`/player/find-booking?sport=${sport.id}`}
                        className="border-[2px] border-black bg-black px-3 py-1.5 text-xs font-bold uppercase text-white hover:bg-white hover:text-black"
                      >
                        Book {sport.name}
                      </a>
                    ))}
                    <div className="ml-auto">
                      <FavoriteButton locationId={location.id} initialFavorited signedIn />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Footer />
    </main>
  );
}
