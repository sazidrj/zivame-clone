// src/hooks/useCoupon.ts
import { useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

interface CouponResult {
  valid: boolean;
  code: string;
  discount_amount: number;
  message: string;
  discount_type?: string;
  discount_value?: number;
}

export const useCoupon = () => {
  const [applied, setApplied] = useState<CouponResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validate = async (code: string, cartTotal: number): Promise<boolean> => {
    if (!code.trim()) return false;
    setIsValidating(true);
    try {
      const { data } = await api.post<CouponResult>("/coupons/validate", {
        code: code.trim().toUpperCase(),
        cart_total: cartTotal,
      });
      if (data.valid) {
        setApplied(data);
        toast.success(data.message);
        return true;
      } else {
        toast.error(data.message);
        return false;
      }
    } catch (err: any) {
      // Not authenticated yet — apply local demo coupon
      if (code.toUpperCase() === "FIRST10") {
        const local: CouponResult = {
          valid: true,
          code: "FIRST10",
          discount_amount: Math.round(cartTotal * 0.1),
          message: "10% discount applied!",
          discount_type: "percent",
          discount_value: 10,
        };
        setApplied(local);
        toast.success(local.message);
        return true;
      }
      toast.error("Invalid coupon code");
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const remove = () => {
    setApplied(null);
    toast("Coupon removed", { icon: "🗑️" });
  };

  return { applied, isValidating, validate, remove };
};
