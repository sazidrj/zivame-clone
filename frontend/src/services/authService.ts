// src/services/authService.ts
import api from "./api";
import {
  OTPChannel,
  OTPPurpose,
  OTPSentResponse,
  TokenResponse,
  UpdateProfileRequest,
  User,
} from "../types";

interface UpdateProfileRequest {
  full_name: string;
  email?: string;
}

export const authService = {
  sendOTP: async (
    identifier: string,
    channel: OTPChannel,
    purpose: OTPPurpose
  ): Promise<OTPSentResponse> => {
    const { data } = await api.post("/auth/send-otp", {
      identifier,
      channel,
      purpose,
    });
    return data;
  },

  verifyOTP: async (
    identifier: string,
    otp: string,
    channel: OTPChannel,
    purpose: OTPPurpose
  ): Promise<TokenResponse> => {
    const { data } = await api.post("/auth/verify-otp", {
      identifier,
      otp,
      channel,
      purpose,
    });
    return data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await api.get("/auth/me");
    return data;
  },

  updateProfile: async (payload: UpdateProfileRequest): Promise<User> => {
    const { data } = await api.patch("/auth/me", payload);
    return data;
  },
};
