// src/pages/SearchPage.tsx
import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Sparkles, X } from "lucide-react";
import api from "../services/api";
import { ProductCard } from "../components/product/ProductCard";
import { debounce } from "../utils";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const semantic = searchParams.get("semantic") === "1";
  const [inputValue, setInputValue] = useState(q);

  const { data: results = [], isLoading, isFetching } = useQuery({
    queryKey: ["search", q, semantic],
    queryFn: async () => {
      if (!q || q.length < 2) return [];
      const { data } = await api.get("/search", {
        params: { q, semantic: semantic ? "true" : "false", limit: 40 },
      });
      return data;
    },
    enabled: q.length >= 2,
  });

  // Debounce search input
  const debouncedSearch = React.useMemo(
    () =>
      debounce((val: string) => {
        if (val.length >= 2) {
          const next = new URLSearchParams(searchParams);
          next.set("q", val);
          setSearchParams(next, { replace: true });
        }
      }, 400),
    [searchParams]
  );

  useEffect(() => {
    debouncedSearch(inputValue);
  }, [inputValue]);

  const toggleSemantic = () => {
    const next = new URLSearchParams(searchParams);
    if (semantic) next.delete("semantic");
    else next.set("semantic", "1");
    setSearchParams(next);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search for bras, panties, nightwear..."
            autoFocus
            className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl text-sm
              focus:outline-none focus:border-pink-400 bg-white transition-colors"
          />
          {inputValue && (
            <button
              onClick={() => { setInputValue(""); setSearchParams({}); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full
                text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Semantic search toggle */}
        <button
          onClick={toggleSemantic}
          title="Enable AI-powered semantic search"
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 text-sm font-medium
            transition-all ${
              semantic
                ? "bg-violet-600 border-violet-600 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-violet-300"
            }`}
        >
          <Sparkles size={16} />
          <span className="hidden sm:inline">AI Search</span>
        </button>
      </div>

      {/* Status line */}
      {q && (
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-600">
            {isFetching ? (
              <span className="text-pink-600">Searching…</span>
            ) : results.length > 0 ? (
              <>
                <strong>{results.length}</strong> results for{" "}
                <strong>"{q}"</strong>
                {semantic && (
                  <span className="ml-2 text-violet-600 text-xs font-medium bg-violet-50
                    px-2 py-0.5 rounded-full">✨ AI Search active</span>
                )}
              </>
            ) : (
              <>No results found for <strong>"{q}"</strong></>
            )}
          </p>
          {!semantic && q.length >= 4 && (
            <button onClick={toggleSemantic}
              className="text-xs text-violet-600 hover:underline flex items-center gap-1">
              <Sparkles size={12} /> Try AI search
            </button>
          )}
        </div>
      )}

      {/* Results grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-[3/4] bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : q.length >= 2 && !isFetching ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500 text-sm mb-6">
            Try different keywords, or enable{" "}
            <button onClick={toggleSemantic} className="text-violet-600 underline">
              AI-powered search
            </button>
          </p>
          <Link to="/products"
            className="inline-block bg-pink-600 text-white px-5 py-2.5 rounded-xl
              font-medium hover:bg-pink-700 transition-colors text-sm">
            Browse All Products
          </Link>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Type at least 2 characters to search</p>
        </div>
      )}
    </div>
  );
}
