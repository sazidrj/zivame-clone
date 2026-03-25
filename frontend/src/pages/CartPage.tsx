// src/pages/CartPage.tsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Tag, Truck, X, Loader2 } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import { useCoupon } from "../hooks/useCoupon";
import { AuthModal } from "../components/auth/AuthModal";

export default function CartPage() {
  const { items, totalItems, totalAmount, savings, isLoading, fetchCart, updateItem, removeItem } =
    useCartStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const { applied: appliedCoupon, isValidating, validate: validateCoupon, remove: removeCoupon } = useCoupon();

  useEffect(() => { fetchCart(); }, [isAuthenticated]);

  const shippingCost = totalAmount >= 599 ? 0 : 49;
  const discount = appliedCoupon?.discount_amount ?? 0;
  const finalAmount = totalAmount + shippingCost - discount;

  const handleApplyCoupon = () => validateCoupon(couponInput, totalAmount);

  if (items.length === 0 && !isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <ShoppingBag size={72} className="text-gray-200 mx-auto mb-5" />
        <h2 className="text-2xl font-black text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8">Add some products to get started!</p>
        <Link to="/products" className="inline-block bg-pink-600 text-white px-8 py-3.5
          rounded-xl font-bold hover:bg-pink-700 transition-colors">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-black text-gray-900 mb-6">
          Shopping Cart{" "}
          <span className="text-gray-400 font-normal text-lg">({totalItems} items)</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {/* Free shipping progress */}
            {totalAmount < 599 && (
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-blue-700 text-sm font-medium flex items-center gap-2">
                    <Truck size={15} />
                    Add ₹{Math.ceil(599 - totalAmount)} more for FREE delivery
                  </span>
                  <span className="text-blue-600 text-sm font-bold">
                    {Math.round((totalAmount / 599) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((totalAmount / 599) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Skeleton loader */}
            {isLoading && items.length === 0 && Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border p-4 animate-pulse flex gap-4">
                <div className="w-24 h-28 bg-gray-100 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-4 bg-gray-100 rounded w-1/4 mt-4" />
                </div>
              </div>
            ))}

            {items.map((item) => (
              <div key={item.id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4 hover:shadow-sm transition-shadow">
                <Link to={`/products/${item.product_slug}`}
                  className="flex-shrink-0 w-24 h-28 rounded-xl overflow-hidden bg-gray-50">
                  {item.product_image
                    ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">👙</div>
                  }
                </Link>

                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.product_slug}`}>
                    <h3 className="font-medium text-sm text-gray-900 line-clamp-2 hover:text-pink-600 transition-colors">
                      {item.product_name}
                    </h3>
                  </Link>
                  {item.size && (
                    <p className="text-xs text-gray-500 mt-0.5">Size: <strong>{item.size}</strong></p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-gray-900">₹{item.price.toLocaleString("en-IN")}</span>
                      {item.mrp && item.mrp > item.price && (
                        <span className="text-xs text-gray-400 line-through">₹{item.mrp.toLocaleString("en-IN")}</span>
                      )}
                    </div>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => item.quantity <= 1 ? removeItem(item.id) : updateItem(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <Minus size={13} />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateItem(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      Subtotal: <strong className="text-gray-900">₹{item.subtotal.toLocaleString("en-IN")}</strong>
                    </span>
                    <button onClick={() => removeItem(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary sidebar */}
          <div className="space-y-4">
            {/* Coupon */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Tag size={16} className="text-pink-600" /> Coupon Code
              </h3>

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-green-700 text-sm font-bold">{appliedCoupon.code}</p>
                    <p className="text-green-600 text-xs">{appliedCoupon.message}</p>
                  </div>
                  <button onClick={removeCoupon}>
                    <X size={16} className="text-green-600 hover:text-green-800" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    placeholder="Enter coupon code"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                      focus:outline-none focus:ring-2 focus:ring-pink-300 uppercase tracking-wide"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={isValidating || !couponInput}
                    className="bg-pink-600 text-white text-sm font-semibold px-4 rounded-xl
                      hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed
                      flex items-center gap-1.5"
                  >
                    {isValidating ? <Loader2 size={14} className="animate-spin" /> : null}
                    Apply
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">Try: FIRST10 (10% off)</p>
            </div>

            {/* Order summary */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Order Summary</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({totalItems} items)</span>
                  <span>₹{totalAmount.toLocaleString("en-IN")}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Product savings</span>
                    <span>-₹{savings.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon ({appliedCoupon!.code})</span>
                    <span>-₹{discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span className={shippingCost === 0 ? "text-green-600 font-medium" : ""}>
                    {shippingCost === 0 ? "FREE" : `₹${shippingCost}`}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-xl font-black text-gray-900">
                    ₹{finalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                {(savings + discount) > 0 && (
                  <p className="text-xs text-green-600 text-right mt-1 font-medium">
                    You save ₹{(savings + discount).toLocaleString("en-IN")} 🎉
                  </p>
                )}
              </div>

              <button
                onClick={() => isAuthenticated ? navigate("/checkout") : setShowAuth(true)}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 rounded-xl
                  flex items-center justify-center gap-2 shadow-lg shadow-pink-200 transition-colors"
              >
                Proceed to Checkout
                <ArrowRight size={18} />
              </button>
              <p className="text-center text-xs text-gray-400">Secure checkout · SSL encrypted 🔒</p>
            </div>
          </div>
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
