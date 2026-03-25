// src/services/productService.ts
import api from "./api";
import { PaginatedProducts, ProductDetail, ProductFilters, Category } from "../types";

export const productService = {
  list: async (filters: ProductFilters): Promise<PaginatedProducts> => {
    const params: Record<string, string | number> = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params[k] = v as string | number;
    });
    const { data } = await api.get("/products", { params });
    return data;
  },

  getBySlug: async (slug: string): Promise<ProductDetail> => {
    const { data } = await api.get(`/products/${slug}`);
    return data;
  },

  getCategories: async (): Promise<Category[]> => {
    const { data } = await api.get("/products/categories");
    return data;
  },

  getReviews: async (slug: string, page = 1, limit = 10) => {
    const { data } = await api.get(`/products/${slug}/reviews`, {
      params: { page, limit },
    });
    return data;
  },

  submitReview: async (
    slug: string,
    payload: { rating: number; title?: string; body?: string }
  ) => {
    const { data } = await api.post(`/products/${slug}/reviews`, payload);
    return data;
  },
};

export const aiService = {
  chat: async (message: string, history: any[], productId?: number) => {
    const { data } = await api.post("/ai/chat", { message, history, product_id: productId });
    return data.reply as string;
  },

  getRecommendations: async (productId: number) => {
    const { data } = await api.get(`/ai/recommendations/${productId}`);
    return data;
  },

  getPersonalizedFeed: async () => {
    const { data } = await api.get("/ai/personalized");
    return data;
  },
};
