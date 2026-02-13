/**
 * Reusable star rating display component
 * Takes a Google-style rating string ("ONE"–"FIVE") or numeric value
 */

const RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

export default function StarRating({
  rating,
  size = 16,
}: {
  rating: string | number;
  size?: number;
}) {
  const numericRating =
    typeof rating === "number" ? rating : RATING_MAP[rating] || 0;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={star <= numericRating ? "#f59e0b" : "#d1d5db"}
          stroke="none"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}
