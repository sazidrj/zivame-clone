// src/pages/OrderDetailPage.tsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, MapPin, CreditCard, Clock, CheckCircle,
  Truck, XCircle, ChevronLeft, AlertCircle
} from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";

const STATUS_STEPS = ["confirmed", "shipped", "delivered"] as const;

const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; icon: React.ReactNode; step: number;
}> = {
  pending:   { label: "Pending",   color: "text-amber-700",  bg: "bg-amber-100",  icon: <Clock size={16} />,        step: 0 },
  confirmed: { label: "Confirmed", color: "text-blue-700",   bg: "bg-blue-100",   icon: <CheckCircle size={16} />,  step: 1 },
  shipped:   { label: "Shipped",   color: "text-purple-700", bg: "bg-purple-100", icon: <Truck size={16} />,        step: 2 },
  delivered: { label: "Delivered", color: "text-green-700",  bg: "bg-green-100",  icon: <CheckCircle size={16} />,  step: 3 },
  cancelled: { label: "Cancelled", color: "text-red-700",    bg: "bg-red-100",    icon: <XCircle size={16} />,      step: -1 },
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery<any>({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/orders/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order cancelled");
    },
    onError: () => toast.error("Could not cancel order"),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4 animate-pulse">
        <div className="h-6 bg-gray-100 rounded w-40" />
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertCircle size={48} className="text-gray-200 mx-auto mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2">Order not found</h2>
        <Link to="/orders" className="text-pink-600 underline text-sm">Back to orders</Link>
      </div>
    );
  }

  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const addr = order.shipping_address;
  const canCancel = ["pending", "confirmed"].includes(order.status);
  const currentStep = status.step;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      {/* Back */}
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-gray-500
        hover:text-pink-600 transition-colors">
        <ChevronLeft size={16} />Back to Orders
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-gray-400">Order ID</p>
            <p className="text-xl font-black text-gray-900">#{order.id}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Placed on {new Date(order.created_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric"
              })}
            </p>
          </div>
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
            font-semibold ${status.bg} ${status.color}`}>
            {status.icon}{status.label}
          </span>
        </div>

        {/* Progress tracker (not for cancelled) */}
        {order.status !== "cancelled" && (
          <div className="mt-6">
            <div className="flex items-center">
              {STATUS_STEPS.map((step, i) => {
                const isComplete = i + 1 < currentStep;
                const isActive   = i + 1 === currentStep;
                const isPending  = i + 1 > currentStep;
                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center
                        text-sm font-bold transition-colors ${
                          isComplete ? "bg-green-500 text-white" :
                          isActive   ? "bg-pink-600 text-white" :
                                       "bg-gray-100 text-gray-400"
                        }`}>
                        {isComplete ? "✓" : i + 1}
                      </div>
                      <p className={`text-[11px] mt-1 font-medium capitalize ${
                        isActive ? "text-pink-600" : isPending ? "text-gray-400" : "text-green-600"
                      }`}>{step}</p>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mb-4 rounded ${
                        i + 1 < currentStep ? "bg-green-400" : "bg-gray-200"
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Package size={16} className="text-pink-600" />
            Items ({order.items?.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex gap-4 p-4">
              <div className="w-16 h-20 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                {item.product_image
                  ? <img src={item.product_image} alt={item.product_name}
                      className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xl">👙</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900">{item.product_name}</p>
                {item.size && (
                  <p className="text-xs text-gray-500 mt-0.5">Size: {item.size}</p>
                )}
                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                <p className="font-bold text-gray-900 mt-1.5">
                  ₹{item.total_price.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2.5">
        <h2 className="font-semibold text-gray-900 mb-3">Price Breakdown</h2>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>₹{(order.total_amount - order.shipping_amount + order.discount_amount).toLocaleString("en-IN")}</span>
        </div>
        {order.discount_amount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span>-₹{order.discount_amount.toLocaleString("en-IN")}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-gray-600">
          <span>Shipping</span>
          <span className={order.shipping_amount === 0 ? "text-green-600 font-medium" : ""}>
            {order.shipping_amount === 0 ? "FREE" : `₹${order.shipping_amount}`}
          </span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
          <span>Total</span>
          <span className="text-lg">₹{order.total_amount.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
          <CreditCard size={13} />
          <span>Payment: <strong className="capitalize">{order.payment_method || "N/A"}</strong>
            {" · "}<span className={order.payment_status === "paid" ? "text-green-600" : "text-amber-600"}>
              {order.payment_status}
            </span>
          </span>
        </div>
      </div>

      {/* Delivery address */}
      {addr && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin size={16} className="text-pink-600" />
            Delivery Address
          </h2>
          <p className="text-sm font-medium text-gray-900">{addr.full_name}</p>
          <p className="text-sm text-gray-600">{addr.phone}</p>
          <p className="text-sm text-gray-600 mt-0.5">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
          <p className="text-sm text-gray-600">{addr.city}, {addr.state} — {addr.pincode}</p>
        </div>
      )}

      {/* Cancel */}
      {canCancel && (
        <button
          onClick={() => {
            if (confirm("Are you sure you want to cancel this order?")) {
              cancelMutation.mutate();
            }
          }}
          disabled={cancelMutation.isPending}
          className="w-full py-3.5 border-2 border-red-200 text-red-600 rounded-xl font-semibold
            hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {cancelMutation.isPending ? "Cancelling…" : "Cancel Order"}
        </button>
      )}
    </div>
  );
}
