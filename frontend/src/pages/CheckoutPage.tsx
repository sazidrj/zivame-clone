// src/pages/CheckoutPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useCartStore } from "../store/cartStore";
import { AddressBook } from "../components/common/AddressBook";
import api from "../services/api";
import toast from "react-hot-toast";
import { Loader2, MapPin, CreditCard, Truck, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

interface AddressForm {
  full_name: string; phone: string; line1: string; line2?: string;
  city: string; state: string; pincode: string;
}

const STATES = [
  "Andhra Pradesh","Assam","Bihar","Delhi","Goa","Gujarat","Haryana",
  "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab",
  "Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","West Bengal",
];

const PAYMENT_METHODS = [
  { id: "cod",      label: "Cash on Delivery", sub: "Pay when you receive",     icon: "💵" },
  { id: "upi",      label: "UPI / PhonePe / GPay", sub: "Instant, free",        icon: "📱" },
  { id: "razorpay", label: "Card / Net Banking",   sub: "Visa, MC, RuPay, EMI", icon: "💳" },
];

type Step = "address" | "payment" | "done";

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCartStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("address");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [selectedAddressData, setSelectedAddressData] = useState<any>(null);

  const { data: savedAddresses = [] } = useQuery<any[]>({
    queryKey: ["addresses"],
    queryFn: async () => { const { data } = await api.get("/addresses"); return data; },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<AddressForm>();

  const shippingCost = totalAmount >= 599 ? 0 : 49;
  const finalAmount = totalAmount + shippingCost;

  const handleAddressNext = handleSubmit((formData) => {
    if (!useNewAddress && !selectedAddressId && savedAddresses.length > 0) {
      toast.error("Please select a delivery address");
      return;
    }
    if (useNewAddress) {
      setSelectedAddressData({ ...formData, country: "India" });
    } else {
      const found = savedAddresses.find((a) => a.id === selectedAddressId);
      if (found) setSelectedAddressData(found);
    }
    setStep("payment");
  });

  const handlePlaceOrder = async () => {
    if (!selectedAddressData) { toast.error("No address selected"); return; }
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/orders", {
        shipping_address: selectedAddressData,
        payment_method: paymentMethod,
      });
      await clearCart();
      setStep("done");
      setTimeout(() => navigate(`/orders/${data.id}`), 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-select default address
  React.useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddressId) {
      const def = savedAddresses.find((a) => a.is_default) || savedAddresses[0];
      setSelectedAddressId(def.id);
    }
    if (savedAddresses.length === 0) setUseNewAddress(true);
  }, [savedAddresses]);

  if (step === "done") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Order Placed! 🎉</h2>
        <p className="text-gray-500 mb-2">Thank you for your purchase.</p>
        <p className="text-sm text-gray-400">Redirecting to order details…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-black text-gray-900 mb-6">Checkout</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[
          { key: "address", label: "Address", num: 1 },
          { key: "payment", label: "Payment", num: 2 },
        ].map((s, i) => (
          <React.Fragment key={s.key}>
            <div className={`flex items-center gap-2 ${step === s.key || (step === "payment" && s.key === "address") ? "text-pink-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step === s.key ? "bg-pink-600 text-white" :
                (step === "payment" && s.key === "address") ? "bg-green-500 text-white" :
                "bg-gray-100 text-gray-400"
              }`}>
                {step === "payment" && s.key === "address" ? "✓" : s.num}
              </div>
              <span className="text-sm font-medium hidden sm:block">{s.label}</span>
            </div>
            {i < 1 && <div className="flex-1 h-px bg-gray-200" />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2">

          {/* ── Address step ─────────────────────────────────────── */}
          {step === "address" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin size={18} className="text-pink-600" /> Delivery Address
              </h2>

              {/* Saved addresses */}
              {savedAddresses.length > 0 && !useNewAddress && (
                <div className="space-y-3">
                  {savedAddresses.map((addr) => (
                    <label key={addr.id}
                      className={`flex gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                        selectedAddressId === addr.id
                          ? "border-pink-600 bg-pink-50"
                          : "border-gray-100 hover:border-pink-200"
                      }`}>
                      <input type="radio" name="address" checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)} className="mt-0.5 text-pink-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{addr.full_name}
                          {addr.is_default && <span className="ml-2 text-[11px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Default</span>}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{addr.phone}</p>
                        <p className="text-xs text-gray-600">{addr.line1}, {addr.city}, {addr.state} — {addr.pincode}</p>
                      </div>
                    </label>
                  ))}
                  <button onClick={() => setUseNewAddress(true)}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm
                      text-gray-500 hover:border-pink-300 hover:text-pink-600 transition-colors">
                    + Add a new address
                  </button>
                </div>
              )}

              {/* New address form */}
              {(useNewAddress || savedAddresses.length === 0) && (
                <>
                  {savedAddresses.length > 0 && (
                    <button onClick={() => setUseNewAddress(false)}
                      className="flex items-center gap-1.5 text-sm text-pink-600 hover:underline mb-2">
                      <ChevronUp size={14} /> Use saved address
                    </button>
                  )}
                  <form onSubmit={handleAddressNext} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                        <input {...register("full_name", { required: true })}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                        {errors.full_name && <p className="text-red-500 text-xs mt-1">Required</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
                        <input {...register("phone", { required: true, pattern: /^[6-9]\d{9}$/ })}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                        {errors.phone && <p className="text-red-500 text-xs mt-1">Valid 10-digit number</p>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 1 *</label>
                      <input {...register("line1", { required: true })} placeholder="House no, street"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 2</label>
                      <input {...register("line2")} placeholder="Landmark (optional)"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
                        <input {...register("city", { required: true })}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">State *</label>
                        <select {...register("state", { required: true })}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white">
                          <option value="">Select</option>
                          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Pincode *</label>
                        <input {...register("pincode", { required: true, pattern: /^\d{6}$/ })}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                      </div>
                    </div>
                    <button type="submit"
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3.5 rounded-xl">
                      Continue to Payment →
                    </button>
                  </form>
                </>
              )}

              {!useNewAddress && savedAddresses.length > 0 && (
                <button onClick={() => {
                  const found = savedAddresses.find((a) => a.id === selectedAddressId);
                  if (found) { setSelectedAddressData(found); setStep("payment"); }
                  else toast.error("Select an address first");
                }}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3.5 rounded-xl mt-4">
                  Continue to Payment →
                </button>
              )}
            </div>
          )}

          {/* ── Payment step ─────────────────────────────────────── */}
          {step === "payment" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard size={18} className="text-pink-600" /> Payment Method
              </h2>

              {/* Selected address summary */}
              {selectedAddressData && (
                <div className="bg-green-50 rounded-xl p-3 flex items-start gap-2 text-sm">
                  <MapPin size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800">{selectedAddressData.full_name}</p>
                    <p className="text-green-700 text-xs">{selectedAddressData.line1}, {selectedAddressData.city} — {selectedAddressData.pincode}</p>
                  </div>
                  <button onClick={() => setStep("address")} className="ml-auto text-xs text-green-600 underline whitespace-nowrap">Change</button>
                </div>
              )}

              <div className="space-y-3">
                {PAYMENT_METHODS.map((m) => (
                  <label key={m.id} className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                    paymentMethod === m.id ? "border-pink-500 bg-pink-50" : "border-gray-100 hover:border-pink-200"
                  }`}>
                    <input type="radio" name="payment" value={m.id}
                      checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id)} className="text-pink-600" />
                    <span className="text-2xl">{m.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{m.label}</p>
                      <p className="text-xs text-gray-500">{m.sub}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep("address")}
                  className="flex-1 border-2 border-gray-200 text-gray-700 font-medium py-3 rounded-xl hover:border-gray-300 text-sm">
                  ← Back
                </button>
                <button onClick={handlePlaceOrder} disabled={isSubmitting}
                  className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm">
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Placing…</> : "Place Order"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 h-fit sticky top-24">
          <h3 className="font-semibold text-gray-900">Order Summary</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600 truncate flex-1 mr-2">{item.product_name} × {item.quantity}</span>
                <span className="font-medium flex-shrink-0">₹{item.subtotal.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>₹{totalAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span className={shippingCost === 0 ? "text-green-600 font-medium" : ""}>
                {shippingCost === 0 ? "FREE" : `₹${shippingCost}`}
              </span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-100">
              <span>Total</span><span>₹{finalAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
            <Truck size={13} className="text-gray-400" />
            <span>Delivery in 3–5 business days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
