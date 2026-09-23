import { NextResponse } from "next/server";

import { getLocationReviews, getRatingSummaries, reviewerName } from "@/lib/reviews";

type RouteContext = { params: Promise<{ id: string }> };

/** Public list of a location's reviews. */
export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;

  const [reviews, summaries] = await Promise.all([
    getLocationReviews(id, 50),
    getRatingSummaries([id]),
  ]);

  return NextResponse.json({
    summary: summaries.get(id) ?? { average: 0, count: 0 },
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      ownerReply: review.ownerReply,
      facility: review.facility.name,
      reviewer: reviewerName(review.player),
      createdAt: review.createdAt.toISOString(),
    })),
  });
}
