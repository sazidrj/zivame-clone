// src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { PaginatedProducts, ProductDetail, ProductFilters } from "../types";

export const useProducts = (filters: ProductFilters) => {
  return useQuery<PaginatedProducts>({
    queryKey: ["products", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== "") params[k] = v as string | number;
      });
      const { data } = await api.get("/products", { params });
      return data;
    },
    placeholderData: (prev) => prev, // Keep old data during refetch
  });
};

export const useProduct = (slug: string | undefined) => {
  return useQuery<ProductDetail>({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await api.get(`/products/${slug}`);
      return data;
    },
    enabled: !!slug,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get("/products/categories");
      return data;
    },
    staleTime: 30 * 60 * 1000, // Categories rarely change
  });
};

export const useRecommendations = (productId: number | undefined) => {
  return useQuery({
    queryKey: ["recommendations", productId],
    queryFn: async () => {
      const { data } = await api.get(`/ai/recommendations/${productId}`);
      return data;
    },
    enabled: !!productId,
  });
};

export const useReviews = (slug: string | undefined, page = 1) => {
  return useQuery({
    queryKey: ["reviews", slug, page],
    queryFn: async () => {
      const { data } = await api.get(`/products/${slug}/reviews`, {
        params: { page, limit: 10 },
      });
      return data;
    },
    enabled: !!slug,
  });
};

export const useSubmitReview = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { rating: number; title?: string; body?: string }) => {
      const { data } = await api.post(`/products/${slug}/reviews`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", slug] });
      queryClient.invalidateQueries({ queryKey: ["product", slug] });
    },
  });
};
