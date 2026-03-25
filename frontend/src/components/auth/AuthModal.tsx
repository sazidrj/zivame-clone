// src/components/auth/AuthModal.tsx
import React, { useState, useEffect, useRef } from "react";
import { X, Phone, Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { authService } from "../../services/authService";
import { useAuthStore } from "../../store/authStore";
import { OTPChannel, OTPPurpose } from "../../types";
import toast from "react-hot-toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPurpose?: OTPPurpose;
}

type Step = "identifier" | "otp" | "profile";

const RESEND_COOLDOWN = 30;

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultPurpose = "login",
}) => {
  const { login } = useAuthStore();

  // Form state
  const [step, setStep] = useState<Step>("identifier");
  const [channel, setChannel] = useState<OTPChannel>("mobile");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isNewUser, setIsNewUser] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  // Resend countdown
  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setInterval(() => {
        setResendTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [resendTimer]);

  const resetModal = () => {
    setStep("identifier");
    setIdentifier("");
    setOtp(["", "", "", "", "", ""]);
    setFullName("");
    setResendTimer(0);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // ── Step 1: Send OTP ─────────────────────────────────────────────────────
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setIsLoading(true);
    try {
      await authService.sendOTP(identifier.trim(), channel, defaultPurpose);
      setStep("otp");
      setResendTimer(RESEND_COOLDOWN);
      toast.success("OTP sent successfully!");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // ── OTP Input Handling ────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];

    if (value.length > 1) {
      // Handle paste
      const digits = value.slice(0, 6).split("");
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      otpRefs.current[Math.min(index + digits.length, 5)]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) return;

    setIsLoading(true);
    try {
      const tokens = await authService.verifyOTP(
        identifier,
        otpString,
        channel,
        defaultPurpose
      );

      if (tokens.is_new_user) {
        setIsNewUser(true);
        setStep("profile");
        // Still store tokens so profile update works
        await login(tokens);
      } else {
        await login(tokens);
        toast.success("Welcome back!");
        handleClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid OTP");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 3: Profile completion (new users) ────────────────────────────────
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setIsLoading(true);
    try {
      await authService.updateProfile({ full_name: fullName.trim() });
      toast.success("Welcome! 🎉");
      handleClose();
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-pink-600 to-rose-500 px-6 py-8 text-white">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>

          {step !== "identifier" && (
            <button
              onClick={() => {
                if (step === "otp") setStep("identifier");
                if (step === "profile") setStep("otp");
              }}
              className="absolute top-4 left-4 p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <div className="mt-2">
            <h2 className="text-2xl font-bold">
              {step === "identifier" && "Sign In / Sign Up"}
              {step === "otp" && "Enter OTP"}
              {step === "profile" && "Complete Profile"}
            </h2>
            <p className="text-pink-100 text-sm mt-1">
              {step === "identifier" && "Continue with your mobile or email"}
              {step === "otp" &&
                `Sent to ${identifier}`}
              {step === "profile" && "Just one more step!"}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-8">
          {/* ── Step 1: Enter identifier ────────────────────────────────── */}
          {step === "identifier" && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              {/* Channel Toggle */}
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                <button
                  type="button"
                  onClick={() => setChannel("mobile")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    channel === "mobile"
                      ? "bg-pink-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Phone size={16} />
                  Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("email")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    channel === "email"
                      ? "bg-pink-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Mail size={16} />
                  Email
                </button>
              </div>

              {/* Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {channel === "mobile" ? "Mobile Number" : "Email Address"}
                </label>
                <div className="relative">
                  {channel === "mobile" && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                      +91
                    </span>
                  )}
                  <input
                    type={channel === "mobile" ? "tel" : "email"}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      channel === "mobile"
                        ? "10-digit mobile number"
                        : "you@example.com"
                    }
                    className={`w-full border border-gray-300 rounded-xl py-3 pr-4 text-gray-900 
                      placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 
                      focus:border-transparent transition-shadow ${
                        channel === "mobile" ? "pl-12" : "pl-4"
                      }`}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !identifier.trim()}
                className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 
                  disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl
                  transition-all duration-200 flex items-center justify-center gap-2
                  shadow-lg shadow-pink-200"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : null}
                {isLoading ? "Sending OTP..." : "Get OTP"}
              </button>

              <p className="text-center text-xs text-gray-500">
                By continuing, you agree to our{" "}
                <a href="/terms" className="text-pink-600 underline">
                  Terms
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-pink-600 underline">
                  Privacy Policy
                </a>
              </p>
            </form>
          )}

          {/* ── Step 2: OTP Entry ───────────────────────────────────────── */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
                  Enter 6-digit OTP
                </label>
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl
                        focus:outline-none focus:border-pink-500 transition-colors
                        ${digit ? "border-pink-500 bg-pink-50" : "border-gray-300"}`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.join("").length !== 6}
                className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 
                  disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl
                  transition-all duration-200 flex items-center justify-center gap-2
                  shadow-lg shadow-pink-200"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : null}
                {isLoading ? "Verifying..." : "Verify & Continue"}
              </button>

              <p className="text-center text-sm text-gray-600">
                Didn't receive OTP?{" "}
                {resendTimer > 0 ? (
                  <span className="text-gray-400">Resend in {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    className="text-pink-600 font-medium hover:underline"
                  >
                    Resend OTP
                  </button>
                )}
              </p>

              {import.meta.env.DEV && (
                <p className="text-center text-xs text-amber-600 bg-amber-50 
                  rounded-xl px-3 py-2 border border-amber-100">
                  🛠 Dev mode: check server logs for OTP
                  <br />
                  <code className="font-mono">docker compose logs -f backend</code>
                </p>
              )}
            </form>
          )}

          {/* ── Step 3: Profile Completion ──────────────────────────────── */}
          {step === "profile" && (
            <form onSubmit={handleCompleteProfile} className="space-y-5">
              <div className="flex justify-center mb-2">
                <CheckCircle size={48} className="text-green-500" />
              </div>
              <p className="text-center text-gray-600 text-sm mb-4">
                Account created! Tell us your name to personalise your experience.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full border border-gray-300 rounded-xl py-3 px-4 text-gray-900 
                    placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 
                    focus:border-transparent transition-shadow"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !fullName.trim()}
                className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 
                  disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl
                  transition-all duration-200 flex items-center justify-center gap-2
                  shadow-lg shadow-pink-200"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                {isLoading ? "Saving..." : "Start Shopping →"}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full text-gray-500 text-sm hover:text-gray-700 py-2"
              >
                Skip for now
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
