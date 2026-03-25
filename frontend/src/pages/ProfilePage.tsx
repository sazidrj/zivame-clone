// src/pages/ProfilePage.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { User, Phone, Mail, Package, Heart, Edit2, Check, LogOut, MapPin } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { authService } from "../services/authService";
import { AddressBook } from "../components/common/AddressBook";
import api from "../services/api";
import toast from "react-hot-toast";

type Tab = "profile" | "orders" | "addresses" | "wishlist";

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const [tab, setTab] = useState<Tab>("profile");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.full_name || "");

  const { data: orders } = useQuery<any[]>({
    queryKey: ["orders"],
    queryFn: async () => { const { data } = await api.get("/orders"); return data; },
    enabled: !!user,
  });

  const { data: wishlist } = useQuery<any[]>({
    queryKey: ["wishlist"],
    queryFn: async () => { const { data } = await api.get("/wishlist"); return data; },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <User size={48} className="text-gray-200 mx-auto mb-4" />
        <p className="text-gray-500">Please sign in to view your profile.</p>
      </div>
    );
  }

  const handleSaveName = async () => {
    if (!name.trim()) return;
    try {
      const updated = await authService.updateProfile({ full_name: name.trim() });
      setUser(updated);
      setEditing(false);
      toast.success("Name updated!");
    } catch {
      toast.error("Failed to update name");
    }
  };

  const totalSpend = orders?.reduce((s: number, o: any) => s + o.total_amount, 0) ?? 0;

  const TABS: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "profile",   label: "Profile",   icon: <User size={15} /> },
    { key: "orders",    label: "Orders",    icon: <Package size={15} />, count: orders?.length },
    { key: "addresses", label: "Addresses", icon: <MapPin size={15} /> },
    { key: "wishlist",  label: "Wishlist",  icon: <Heart size={15} />,  count: wishlist?.length },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      {/* Header card */}
      <div className="bg-gradient-to-r from-pink-600 to-rose-500 rounded-2xl px-6 py-8 text-white">
        <div className="flex items-end gap-4">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center
            text-3xl font-black flex-shrink-0">
            {user.full_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 pb-1">
            {editing ? (
              <div className="flex gap-2 items-center">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  autoFocus
                  className="flex-1 bg-white/20 text-white placeholder-white/60 rounded-xl
                    px-3 py-1.5 text-lg font-bold border border-white/40 focus:outline-none"
                />
                <button onClick={handleSaveName}
                  className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors">
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black">{user.full_name || "Add your name"}</h1>
                <button onClick={() => { setName(user.full_name || ""); setEditing(true); }}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors">
                  <Edit2 size={15} />
                </button>
              </div>
            )}
            <p className="text-pink-100 text-sm mt-0.5">{user.phone || user.email}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { label: "Orders",  value: orders?.length ?? 0 },
            { label: "Spent",   value: `₹${Math.round(totalSpend).toLocaleString("en-IN")}` },
            { label: "Wishlist",value: wishlist?.length ?? 0 },
          ].map((s) => (
            <div key={s.label} className="bg-white/15 rounded-xl px-3 py-2.5 text-center">
              <p className="text-lg font-black">{s.value}</p>
              <p className="text-xs text-pink-100">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {TABS.map(({ key, label, icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-sm
                font-medium transition-colors ${
                  tab === key
                    ? "border-b-2 border-pink-600 text-pink-600 -mb-px"
                    : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
              {count !== undefined && count > 0 && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab === key ? "bg-pink-100 text-pink-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ── Profile tab ───────────────────────────────────────── */}
          {tab === "profile" && (
            <div className="space-y-4">
              {user.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone size={16} className="text-pink-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Mobile</p>
                    <p className="text-sm font-medium text-gray-900">{user.phone}</p>
                  </div>
                </div>
              )}
              {user.email && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail size={16} className="text-pink-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  </div>
                </div>
              )}
              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2
                    border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* ── Orders tab ────────────────────────────────────────── */}
          {tab === "orders" && (
            <div>
              {!orders?.length ? (
                <div className="text-center py-8">
                  <Package size={40} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No orders yet</p>
                  <Link to="/products" className="text-pink-600 text-sm font-medium mt-2 inline-block">
                    Start shopping →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order: any) => (
                    <Link key={order.id} to={`/orders/${order.id}`}
                      className="flex items-center justify-between p-3.5 bg-gray-50
                        rounded-xl hover:bg-pink-50 transition-colors">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Order #{order.id}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleDateString("en-IN")}
                          {" · "}{order.items?.length} item{order.items?.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          ₹{order.total_amount.toLocaleString("en-IN")}
                        </p>
                        <span className={`text-xs font-medium capitalize ${
                          order.status === "delivered" ? "text-green-600" :
                          order.status === "cancelled" ? "text-red-500" : "text-blue-600"
                        }`}>{order.status}</span>
                      </div>
                    </Link>
                  ))}
                  {orders.length > 5 && (
                    <Link to="/orders" className="block text-center text-sm text-pink-600
                      font-medium py-2 hover:underline">
                      View all {orders.length} orders →
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Addresses tab ─────────────────────────────────────── */}
          {tab === "addresses" && <AddressBook />}

          {/* ── Wishlist tab ──────────────────────────────────────── */}
          {tab === "wishlist" && (
            <div>
              {!wishlist?.length ? (
                <div className="text-center py-8">
                  <Heart size={40} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Your wishlist is empty</p>
                  <Link to="/products" className="text-pink-600 text-sm font-medium mt-2 inline-block">
                    Browse products →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {wishlist.slice(0, 6).map((p: any) => (
                    <Link key={p.id} to={`/products/${p.slug}`}
                      className="flex gap-3 items-center p-2.5 bg-gray-50 rounded-xl hover:bg-pink-50 transition-colors">
                      <div className="w-12 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {p.primary_image_url
                          ? <img src={p.primary_image_url} alt={p.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-lg">👙</div>
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-snug">{p.name}</p>
                        <p className="text-xs font-bold text-pink-600 mt-1">₹{p.price.toLocaleString("en-IN")}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {(wishlist?.length ?? 0) > 6 && (
                <Link to="/wishlist" className="block text-center text-sm text-pink-600
                  font-medium pt-3 hover:underline">
                  View all {wishlist!.length} items →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
