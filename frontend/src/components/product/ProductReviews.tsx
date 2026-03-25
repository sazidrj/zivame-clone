// src/components/product/ProductReviews.tsx
import React, { useState } from "react";
import { Star, ThumbsUp, MessageSquare } from "lucide-react";
import { useReviews, useSubmitReview } from "../../hooks/useProducts";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

interface ProductReviewsProps {
  slug: string;
  avgRating: number;
  reviewCount: number;
}

const StarRating: React.FC<{
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  interactive?: boolean;
}> = ({ value, onChange, size = 16, interactive = false }) => {
  const [hovered, setHovered] = useState(0);
  const display = interactive ? (hovered || value) : value;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={interactive ? "button" : undefined}
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
          disabled={!interactive}
        >
          <Star
            size={size}
            className={
              star <= display
                ? "fill-amber-400 text-amber-400"
                : "fill-gray-200 text-gray-200"
            }
          />
        </button>
      ))}
    </div>
  );
};

const RatingBar: React.FC<{ stars: number; count: number; total: number }> = ({
  stars,
  count,
  total,
}) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="w-4 text-gray-600 text-right">{stars}</span>
    <Star size={11} className="fill-amber-400 text-amber-400 flex-shrink-0" />
    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-amber-400 rounded-full transition-all"
        style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
      />
    </div>
    <span className="w-6 text-gray-500 text-right">{count}</span>
  </div>
);

export const ProductReviews: React.FC<ProductReviewsProps> = ({
  slug,
  avgRating,
  reviewCount,
}) => {
  const { isAuthenticated } = useAuthStore();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: reviews, isLoading } = useReviews(slug, page);
  const submitMutation = useSubmitReview(slug);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { toast.error("Please select a rating"); return; }
    try {
      await submitMutation.mutateAsync({ rating, title, body });
      toast.success("Review submitted!");
      setShowForm(false);
      setRating(0); setTitle(""); setBody("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit review");
    }
  };

  return (
    <section className="mt-14">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <MessageSquare size={20} className="text-pink-600" />
          Customer Reviews
        </h2>
        {isAuthenticated && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-pink-600 font-medium border border-pink-200 
              rounded-xl px-4 py-2 hover:bg-pink-50 transition-colors"
          >
            Write a Review
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex gap-8 items-center">
          {/* Big score */}
          <div className="text-center flex-shrink-0">
            <div className="text-5xl font-black text-gray-900 leading-none">
              {avgRating.toFixed(1)}
            </div>
            <StarRating value={avgRating} size={18} />
            <p className="text-xs text-gray-400 mt-1">{reviewCount} reviews</p>
          </div>

          {/* Distribution bars */}
          {reviews && (
            <div className="flex-1 space-y-1.5 min-w-0">
              {[5, 4, 3, 2, 1].map((stars) => (
                <RatingBar
                  key={stars}
                  stars={stars}
                  count={reviews.rating_distribution?.[stars] || 0}
                  total={reviewCount}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Write review form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 space-y-4"
        >
          <h3 className="font-semibold text-gray-900">Your Review</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating *
            </label>
            <StarRating value={rating} onChange={setRating} size={28} interactive />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarise your experience"
              maxLength={200}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm 
                focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Review
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tell others what you think..."
              maxLength={2000}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm 
                focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{body.length}/2000</p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl 
                font-medium hover:border-gray-300 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 
                text-white py-3 rounded-xl font-semibold transition-colors text-sm"
            >
              {submitMutation.isPending ? "Submitting…" : "Submit Review"}
            </button>
          </div>
        </form>
      )}

      {/* Review list */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-4/5" />
            </div>
          ))}
        </div>
      ) : reviews?.items?.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews?.items?.map((review: any) => (
            <div
              key={review.id}
              className="bg-white rounded-xl border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-pink-100 rounded-full flex items-center 
                    justify-center text-pink-600 font-bold text-sm flex-shrink-0">
                    {review.user_name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{review.user_name}</p>
                    <div className="flex items-center gap-2">
                      <StarRating value={review.rating} size={13} />
                      {review.is_verified_purchase && (
                        <span className="text-[11px] text-green-600 font-medium">
                          ✓ Verified Purchase
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{review.created_at}</span>
              </div>

              {review.title && (
                <p className="font-semibold text-gray-900 text-sm mb-1">{review.title}</p>
              )}
              {review.body && (
                <p className="text-sm text-gray-600 leading-relaxed">{review.body}</p>
              )}
            </div>
          ))}

          {/* Pagination */}
          {reviews?.pages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              {Array.from({ length: reviews.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                    page === p
                      ? "bg-pink-600 text-white"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-pink-300"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
