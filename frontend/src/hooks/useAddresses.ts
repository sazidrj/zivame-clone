// src/hooks/useAddresses.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import toast from "react-hot-toast";

export interface Address {
  id: number;
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
}

export const useAddresses = () => {
  return useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: async () => {
      const { data } = await api.get("/addresses");
      return data;
    },
  });
};

export const useAddAddress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Address, "id" | "is_default">) => {
      const { data } = await api.post("/addresses", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Address saved");
    },
  });
};

export const useDeleteAddress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/addresses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Address deleted");
    },
  });
};

export const useSetDefaultAddress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.patch(`/addresses/${id}/default`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
};
