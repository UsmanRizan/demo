export default function StarRating({
  rating,
  size = "text-base",
}: {
  rating: number;
  size?: string;
}) {
  const rounded = Math.round(rating);

  return (
    <span className={`${size} tracking-tight`} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} aria-hidden="true" className={i < rounded ? "text-black" : "text-gray-300"}>
          ★
        </span>
      ))}
    </span>
  );
}
