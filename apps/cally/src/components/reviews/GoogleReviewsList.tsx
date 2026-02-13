"use client";

import { useState, useEffect, useCallback } from "react";
import type { GoogleReview } from "@/types/google-business";
import StarRating from "./StarRating";

export default function GoogleReviewsList() {
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviewCount, setTotalReviewCount] = useState(0);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async (pageToken?: string) => {
    try {
      const url = pageToken
        ? `/api/data/app/google-business/reviews?pageToken=${encodeURIComponent(pageToken)}`
        : "/api/data/app/google-business/reviews";

      const res = await fetch(url);
      const json = await res.json();

      if (json.success && json.data) {
        if (pageToken) {
          setReviews((prev) => [...prev, ...json.data.reviews]);
        } else {
          setReviews(json.data.reviews);
        }
        setAverageRating(json.data.averageRating);
        setTotalReviewCount(json.data.totalReviewCount);
        setNextPageToken(json.data.nextPageToken);
      } else {
        setError(json.error || "Failed to load reviews");
      }
    } catch {
      setError("Failed to load reviews");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchReviews().finally(() => setLoading(false));
  }, [fetchReviews]);

  const handleLoadMore = async () => {
    if (!nextPageToken) return;
    setLoadingMore(true);
    await fetchReviews(nextPageToken);
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        <span className="ml-3 text-[var(--text-muted)]">
          Loading Google Reviews...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Header */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold text-[var(--text-main)]">
            {averageRating.toFixed(1)}
          </div>
          <div>
            <StarRating rating={Math.round(averageRating)} size={20} />
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {totalReviewCount} review{totalReviewCount !== 1 ? "s" : ""} on
              Google
            </p>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-8 text-center">
          <p className="text-[var(--text-muted)]">No Google Reviews yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.reviewId}
              review={review}
              onReplyUpdated={() => fetchReviews()}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {nextPageToken && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-4 py-2 border border-[var(--color-border)] text-[var(--text-main)] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load more reviews"}
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  onReplyUpdated,
}: {
  review: GoogleReview;
  onReplyUpdated: () => void;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState(review.reviewReply?.comment || "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/data/app/google-business/reviews/${review.reviewId}/reply`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: replyText.trim() }),
        },
      );
      const json = await res.json();
      if (json.success) {
        setShowReplyInput(false);
        onReplyUpdated();
      }
    } catch {
      console.error("[DBG][GoogleReviewsList] Failed to submit reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = async () => {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/data/app/google-business/reviews/${review.reviewId}/reply`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (json.success) {
        setReplyText("");
        onReplyUpdated();
      }
    } catch {
      console.error("[DBG][GoogleReviewsList] Failed to delete reply");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[var(--color-border)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Reviewer */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-[var(--text-main)]">
              {review.reviewer.displayName}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {formatDate(review.createTime)}
            </span>
          </div>

          {/* Star Rating */}
          <div className="mb-2">
            <StarRating rating={review.starRating} />
          </div>

          {/* Comment */}
          {review.comment && (
            <p className="text-sm text-[var(--text-main)] mb-3">
              {review.comment}
            </p>
          )}

          {/* Existing Reply */}
          {review.reviewReply && !showReplyInput && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-[var(--text-main)]">
                  Your reply
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {formatDate(review.reviewReply.updateTime)}
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                {review.reviewReply.comment}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReplyText(review.reviewReply!.comment);
                    setShowReplyInput(true);
                  }}
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDeleteReply}
                  disabled={deleting}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          )}

          {/* Reply Input */}
          {showReplyInput && (
            <div className="mt-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                className="w-full border border-[var(--color-border)] rounded-lg p-2 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                placeholder="Write your reply..."
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleSubmitReply}
                  disabled={submitting || !replyText.trim()}
                  className="px-3 py-1.5 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit reply"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReplyInput(false);
                    setReplyText(review.reviewReply?.comment || "");
                  }}
                  className="px-3 py-1.5 border border-[var(--color-border)] text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Reply button (when no reply exists and input not shown) */}
          {!review.reviewReply && !showReplyInput && (
            <button
              type="button"
              onClick={() => setShowReplyInput(true)}
              className="text-sm text-[var(--color-primary)] hover:underline mt-1"
            >
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
