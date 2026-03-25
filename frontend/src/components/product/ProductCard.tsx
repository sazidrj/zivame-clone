// src/components/product/ProductCard.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { ProductListItem } from "../../types";
import toast from "react-hot-toast";

interface ProductCardProps {
  product: ProductListItem;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [imgError, setImgError] = useState(false);

  // Check if wishlisted (only fires when authenticated)
  const { data: wishlistStatus } = useQuery({
    queryKey: ["wishlist-check", product.id],
    queryFn: async () => {
      const { data } = await api.get(`/wishlist/${product.id}/check`);
      return data.wishlisted as boolean;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const wishlisted = wishlistStatus ?? false;

  const toggleWishlist = useMutation({
    mutationFn: async () => {
      if (wishlisted) {
        await api.delete(`/wishlist/${product.id}`);
      } else {
        await api.post(`/wishlist/${product.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-check", product.id] });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success(wishlisted ? "Removed from wishlist" : "Added to wishlist ❤️");
    },
  });

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast("Sign in to save items to your wishlist", { icon: "💡" });
      return;
    }
    toggleWishlist.mutate();
  };

  const discountPercent = product.discount_percent
    ? Math.round(product.discount_percent)
    : product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : null;

  return (
    <div className="group relative bg-white rounded-xl overflow-hidden border border-gray-100
      hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">

      {/* Image */}
      <Link to={`/products/${product.slug}`}>
        <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
          {!imgError && product.primary_image_url ? (
            <img
              src={product.primary_image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br
              from-pink-50 to-rose-100">
              <span className="text-4xl">👙</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {discountPercent && discountPercent > 0 && (
              <span className="bg-green-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                {discountPercent}% OFF
              </span>
            )}
            {product.review_count > 100 && (
              <span className="bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                Bestseller
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Wishlist button */}
      <button
        onClick={handleWishlist}
        disabled={toggleWishlist.isPending}
        className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow-sm
          opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110
          disabled:opacity-60"
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          size={16}
          className={wishlisted ? "fill-pink-600 text-pink-600" : "text-gray-500"}
        />
      </button>

      {/* Info */}
      <div className="p-3">
        {product.brand && (
          <p className="text-xs text-pink-600 font-semibold uppercase tracking-wide mb-0.5">
            {product.brand}
          </p>
        )}
        <Link to={`/products/${product.slug}`}>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug
            hover:text-pink-600 transition-colors mb-2">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {product.avg_rating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center gap-0.5 bg-green-600 text-white
              text-[11px] font-bold px-1.5 py-0.5 rounded">
              <span>{product.avg_rating.toFixed(1)}</span>
              <Star size={9} className="fill-white" />
            </div>
            <span className="text-xs text-gray-400">({product.review_count})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-gray-900">
            ₹{product.price.toLocaleString("en-IN")}
          </span>
          {product.mrp && product.mrp > product.price && (
            <span className="text-xs text-gray-400 line-through">
              ₹{product.mrp.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
