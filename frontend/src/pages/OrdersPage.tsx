// src/pages/OrdersPage.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, ChevronRight, Clock, CheckCircle, Truck, XCircle } from "lucide-react";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import { AuthModal } from "../components/auth/AuthModal";

const STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "Pending",   color: "bg-amber-100 text-amber-700",  icon: <Clock size={13} /> },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700",    icon: <CheckCircle size={13} /> },
  shipped:   { label: "Shipped",   color: "bg-purple-100 text-purple-700",icon: <Truck size={13} /> },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700",  icon: <CheckCircle size={13} /> },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700",      icon: <XCircle size={13} /> },
};

export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const [showAuth, setShowAuth] = useState(false);

  const { data: orders, isLoading } = useQuery<any[]>({
    queryKey: ["orders"],
    queryFn: async () => { const { data } = await api.get("/orders"); return data; },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <Package size={64} className="text-gray-200 mx-auto mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2">Sign in to view orders</h2>
        <p className="text-gray-500 mb-6">Track all your orders in one place.</p>
        <button onClick={() => setShowAuth(true)}
          className="bg-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-pink-700">
          Sign In
        </button>
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    );
  }

  if (isLoading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border p-5 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-32 mb-4" />
          <div className="flex gap-3">
            <div className="w-16 h-20 bg-gray-100 rounded-xl" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (!orders?.length) return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <Package size={64} className="text-gray-200 mx-auto mb-4" />
      <h2 className="text-2xl font-black text-gray-900 mb-2">No orders yet</h2>
      <p className="text-gray-500 mb-6">Your orders will appear here once you purchase.</p>
      <Link to="/products" className="inline-block bg-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-pink-700">
        Start Shopping
      </Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-black text-gray-900 mb-6">My Orders</h1>
      <div className="space-y-4">
        {orders.map((order: any) => {
          const s = STATUS[order.status] || STATUS.pending;
          return (
            <div key={order.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Order #{order.id}</p>
                    <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.color}`}>
                    {s.icon}{s.label}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">₹{order.total_amount.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-gray-500">{order.items?.length} item{order.items?.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {order.items?.slice(0, 2).map((item: any) => (
                  <div key={item.id} className="flex gap-3 items-center">
                    <div className="w-14 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                      {item.product_image ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">👙</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}{item.size ? ` · ${item.size}` : ""}</p>
                      <p className="text-sm font-semibold mt-0.5">₹{item.total_price.toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                ))}
                {order.items?.length > 2 && <p className="text-xs text-gray-400">+{order.items.length - 2} more</p>}
              </div>

              <div className="flex items-center justify-end px-4 py-3 border-t border-gray-50">
                <Link to={`/orders/${order.id}`} className="text-sm text-pink-600 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                  View Details <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
