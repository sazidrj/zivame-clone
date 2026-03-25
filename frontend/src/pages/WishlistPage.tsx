// src/pages/WishlistPage.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Trash2, ShoppingBag } from "lucide-react";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { AuthModal } from "../components/auth/AuthModal";
import { ProductListItem } from "../types";
import toast from "react-hot-toast";

export default function WishlistPage() {
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const [showAuth, setShowAuth] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<ProductListItem[]>({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const { data } = await api.get("/wishlist");
      return data;
    },
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: (productId: number) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Removed from wishlist");
    },
  });

  const handleMoveToCart = async (product: ProductListItem) => {
    try {
      await addItem(product.id, 1);
      removeMutation.mutate(product.id);
      toast.success("Moved to cart!");
    } catch {
      toast.error("Failed to add to cart");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <Heart size={64} className="text-gray-200 mx-auto mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2">Sign in to see your wishlist</h2>
        <p className="text-gray-500 mb-6">Save your favourite items and come back anytime.</p>
        <button onClick={() => setShowAuth(true)}
          className="bg-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-pink-700">
          Sign In
        </button>
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-gray-900 mb-6">My Wishlist</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-[3/4] bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <Heart size={64} className="text-gray-200 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-gray-900 mb-2">Your wishlist is empty</h2>
        <p className="text-gray-500 mb-6">Click the heart icon on any product to save it here.</p>
        <Link to="/products"
          className="inline-block bg-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-pink-700">
          Explore Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">
          My Wishlist <span className="text-gray-400 font-normal text-lg">({items.length})</span>
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((product) => {
          const discount = product.mrp && product.mrp > product.price
            ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
            : null;

          return (
            <div key={product.id}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow">
              {/* Image */}
              <Link to={`/products/${product.slug}`} className="block relative aspect-[3/4] bg-gray-50">
                {product.primary_image_url ? (
                  <img src={product.primary_image_url} alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">👙</div>
                )}
                {discount && (
                  <span className="absolute top-2 left-2 bg-green-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                    {discount}% OFF
                  </span>
                )}
              </Link>

              {/* Info */}
              <div className="p-3">
                {product.brand && (
                  <p className="text-xs text-pink-600 font-semibold uppercase tracking-wide mb-0.5">{product.brand}</p>
                )}
                <Link to={`/products/${product.slug}`}>
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-pink-600 mb-2 leading-snug">
                    {product.name}
                  </h3>
                </Link>

                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-bold text-gray-900">₹{product.price.toLocaleString("en-IN")}</span>
                  {product.mrp && product.mrp > product.price && (
                    <span className="text-xs text-gray-400 line-through">₹{product.mrp.toLocaleString("en-IN")}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMoveToCart(product)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-pink-600 hover:bg-pink-700
                      text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    <ShoppingBag size={13} />
                    Add to Cart
                  </button>
                  <button
                    onClick={() => removeMutation.mutate(product.id)}
                    disabled={removeMutation.isPending}
                    className="p-2.5 border border-gray-200 rounded-xl text-gray-400
                      hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
