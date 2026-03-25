// src/hooks/useWishlist.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import { ProductListItem } from "../types";
import toast from "react-hot-toast";

export const useWishlist = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery<ProductListItem[]>({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const { data } = await api.get("/wishlist");
      return data;
    },
    enabled: isAuthenticated,
  });
};

export const useWishlistCheck = (productId: number) => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ["wishlist-check", productId],
    queryFn: async () => {
      const { data } = await api.get(`/wishlist/${productId}/check`);
      return data.wishlisted as boolean;
    },
    enabled: isAuthenticated && productId > 0,
    staleTime: 5 * 60 * 1000,
  });
};

export const useToggleWishlist = (productId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (wishlisted: boolean) => {
      if (wishlisted) {
        await api.delete(`/wishlist/${productId}`);
      } else {
        await api.post(`/wishlist/${productId}`);
      }
    },
    onSuccess: (_, wasWishlisted) => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-check", productId] });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success(wasWishlisted ? "Removed from wishlist" : "Added to wishlist ❤️");
    },
  });
};
