// src/components/common/AddressBook.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MapPin, Star, Pencil, Trash2, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import api from "../../services/api";
import toast from "react-hot-toast";

interface Address {
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

interface AddressFormData {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

interface AddressBookProps {
  selectable?: boolean;
  selectedId?: number | null;
  onSelect?: (address: Address) => void;
}

const STATES = [
  "Andhra Pradesh","Assam","Bihar","Delhi","Goa","Gujarat","Haryana",
  "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab",
  "Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","West Bengal",
];

export const AddressBook: React.FC<AddressBookProps> = ({
  selectable = false,
  selectedId,
  onSelect,
}) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: async () => {
      const { data } = await api.get("/addresses");
      return data;
    },
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } =
    useForm<AddressFormData>();

  const saveMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      if (editingId) {
        return api.put(`/addresses/${editingId}`, data);
      }
      return api.post("/addresses", { ...data, is_default: addresses.length === 0 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setShowForm(false);
      setEditingId(null);
      reset();
      toast.success(editingId ? "Address updated" : "Address saved");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/addresses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Address deleted");
    },
  });

  const defaultMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/addresses/${id}/default`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });

  const openEdit = (addr: Address) => {
    setEditingId(addr.id);
    setValue("full_name", addr.full_name);
    setValue("phone", addr.phone);
    setValue("line1", addr.line1);
    setValue("line2", addr.line2 || "");
    setValue("city", addr.city);
    setValue("state", addr.state);
    setValue("pincode", addr.pincode);
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Address list */}
      {addresses.map((addr) => (
        <div
          key={addr.id}
          onClick={() => selectable && onSelect?.(addr)}
          className={`relative bg-white rounded-xl border-2 p-4 transition-all
            ${selectable ? "cursor-pointer hover:border-pink-300" : ""}
            ${selectedId === addr.id ? "border-pink-600 bg-pink-50" : "border-gray-100"}`}
        >
          {selectedId === addr.id && (
            <div className="absolute top-3 right-3 w-5 h-5 bg-pink-600 rounded-full
              flex items-center justify-center">
              <Check size={12} className="text-white" />
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3 flex-1 min-w-0">
              <MapPin size={16} className="text-pink-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-gray-900">{addr.full_name}</p>
                  <span className="text-xs text-gray-500">{addr.phone}</span>
                  {addr.is_default && (
                    <span className="text-[11px] bg-green-100 text-green-700 font-semibold
                      px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star size={9} className="fill-green-600 text-green-600" /> Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">
                  {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}
                </p>
                <p className="text-sm text-gray-600">
                  {addr.city}, {addr.state} — {addr.pincode}
                </p>
              </div>
            </div>

            {!selectable && (
              <div className="flex gap-1.5 flex-shrink-0">
                {!addr.is_default && (
                  <button
                    onClick={() => defaultMutation.mutate(addr.id)}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50
                      rounded-lg transition-colors text-xs"
                    title="Set as default"
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  onClick={() => openEdit(addr)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50
                    rounded-lg transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(addr.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50
                    rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Add new address button */}
      {!showForm && (
        <button
          onClick={() => { setEditingId(null); reset(); setShowForm(true); }}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed
            border-gray-200 rounded-xl py-3.5 text-sm text-gray-500 hover:border-pink-300
            hover:text-pink-600 transition-colors"
        >
          <Plus size={16} />
          Add New Address
        </button>
      )}

      {/* Address form */}
      {showForm && (
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
          className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900 text-sm">
            {editingId ? "Edit Address" : "New Address"}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
              <input {...register("full_name", { required: true })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
              <input {...register("phone", { required: true, pattern: /^[6-9]\d{9}$/ })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 1 *</label>
            <input {...register("line1", { required: true })}
              placeholder="House no, street name"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 2</label>
            <input {...register("line2")} placeholder="Landmark, area (optional)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
              <input {...register("city", { required: true })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">State *</label>
              <select {...register("state", { required: true })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white">
                <option value="">Select</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pincode *</label>
              <input {...register("pincode", { required: true, pattern: /^\d{6}$/ })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white" />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); reset(); }}
              className="flex-1 border-2 border-gray-200 text-gray-700 py-2.5 rounded-xl
                text-sm font-medium hover:border-gray-300">
              Cancel
            </button>
            <button type="submit" disabled={saveMutation.isPending}
              className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white
                py-2.5 rounded-xl text-sm font-semibold">
              {saveMutation.isPending ? "Saving…" : "Save Address"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
