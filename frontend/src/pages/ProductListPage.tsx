// src/pages/ProductListPage.tsx
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { ProductCard } from "../components/product/ProductCard";
import api from "../services/api";
import { PaginatedProducts, ProductFilters } from "../types";

const SORT_OPTIONS = [
  { value: "popularity", label: "Most Popular" },
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

const SIZE_OPTIONS = ["32A", "32B", "32C", "32D", "34A", "34B", "34C", "34D",
  "36B", "36C", "36D", "38B", "38C", "XS", "S", "M", "L", "XL", "XXL"];

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const filters: ProductFilters = {
    category_slug: searchParams.get("category") || undefined,
    search: searchParams.get("search") || undefined,
    sort: (searchParams.get("sort") as ProductFilters["sort"]) || "popularity",
    min_price: searchParams.get("min_price") ? Number(searchParams.get("min_price")) : undefined,
    max_price: searchParams.get("max_price") ? Number(searchParams.get("max_price")) : undefined,
    sizes: searchParams.get("sizes") || undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: 24,
    tags: searchParams.get("tags") || undefined,
  };

  const { data, isLoading } = useQuery<PaginatedProducts>({
    queryKey: ["products", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== "") params[k] = v as string | number;
      });
      const { data } = await api.get("/products", { params });
      return data;
    },
  });

  const updateFilter = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page"); // Reset page only on filter change, not on page change
    setSearchParams(next);
  };

  const toggleSize = (size: string) => {
    const current = filters.sizes ? filters.sizes.split(",") : [];
    const next = current.includes(size)
      ? current.filter((s) => s !== size)
      : [...current, size];
    updateFilter("sizes", next.length > 0 ? next.join(",") : undefined);
  };

  const selectedSizes = filters.sizes ? filters.sizes.split(",") : [];

  const title = filters.search
    ? `Results for "${filters.search}"`
    : filters.category_slug
    ? filters.category_slug.charAt(0).toUpperCase() + filters.category_slug.slice(1)
    : "All Products";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">{title}</h1>
          {data && (
            <p className="text-sm text-gray-500 mt-0.5">
              {data.total.toLocaleString("en-IN")} products
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Sort */}
          <div className="relative">
            <select
              value={filters.sort}
              onChange={(e) => updateFilter("sort", e.target.value)}
              className="appearance-none border border-gray-200 rounded-xl px-4 py-2.5 pr-8
                text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-pink-300
                cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 
              text-gray-500 pointer-events-none" />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 text-sm 
              font-medium transition-colors ${
                showFilters
                  ? "bg-pink-600 text-white border-pink-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-pink-300"
              }`}
          >
            <SlidersHorizontal size={16} />
            Filters
            {(selectedSizes.length > 0 || filters.min_price || filters.max_price) && (
              <span className="bg-white/30 text-xs rounded-full w-5 h-5 flex items-center 
                justify-center font-bold">
                {selectedSizes.length + (filters.min_price ? 1 : 0) + (filters.max_price ? 1 : 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 
          grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Size Filter */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Size</h3>
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedSizes.includes(size)
                      ? "bg-pink-600 text-white border-pink-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-pink-300"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Price Range (₹)</h3>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Min"
                value={filters.min_price || ""}
                onChange={(e) => updateFilter("min_price", e.target.value || undefined)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm 
                  focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
              <span className="text-gray-400">–</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.max_price || ""}
                onChange={(e) => updateFilter("max_price", e.target.value || undefined)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm 
                  focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {[
                { label: "Under ₹500", min: undefined, max: "500" },
                { label: "₹500–₹1000", min: "500", max: "1000" },
                { label: "₹1000–₹2000", min: "1000", max: "2000" },
                { label: "Above ₹2000", min: "2000", max: undefined },
              ].map((range) => (
                <button
                  key={range.label}
                  onClick={() => {
                    updateFilter("min_price", range.min);
                    updateFilter("max_price", range.max);
                  }}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 
                    hover:border-pink-300 hover:text-pink-600 transition-colors"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchParams({});
                setShowFilters(false);
              }}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 
                font-medium"
            >
              <X size={14} /> Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100">
              <div className="aspect-[3/4] bg-gray-100 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <button
                disabled={filters.page <= 1}
                onClick={() => {
                  updateFilter("page", String(filters.page - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-4 h-10 rounded-xl text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:border-pink-300 disabled:opacity-40 disabled:cursor-not-allowed">
                ← Prev
              </button>

              {Array.from({ length: data.pages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === data.pages || Math.abs(p - filters.page) <= 2)
                .reduce((acc: (number | string)[], p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === "..." ? (
                  <span key={`dots-${i}`} className="px-2 text-gray-400">...</span>
                ) : (
                  <button key={p}
                    onClick={() => {
                      updateFilter("page", String(p));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                      filters.page === p
                        ? "bg-[#f05a78] text-white"
                        : "bg-white border border-gray-200 text-gray-700 hover:border-pink-300"
                    }`}>
                    {p}
                  </button>
                ))}

              <button
                disabled={filters.page >= data.pages}
                onClick={() => {
                  updateFilter("page", String(filters.page + 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-4 h-10 rounded-xl text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:border-pink-300 disabled:opacity-40 disabled:cursor-not-allowed">
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500 mb-6">Try adjusting your filters or search terms</p>
          <button
            onClick={() => setSearchParams({})}
            className="bg-pink-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-pink-700"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}