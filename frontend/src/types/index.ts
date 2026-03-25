// src/types/index.ts

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  email?: string;
  phone?: string;
  full_name?: string;
  avatar_url?: string;
  is_verified: boolean;
  role: "user" | "admin";
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: number;
  is_new_user: boolean;
}

export interface OTPSentResponse {
  message: string;
  expires_in: number;
}

export type OTPChannel = "mobile" | "email";
export type OTPPurpose = "login" | "signup" | "reset";

// ── Products ──────────────────────────────────────────────────────────────────
export interface ProductImage {
  id: number;
  url: string;
  alt_text?: string;
  is_primary: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  image_url?: string;
}

export interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  brand?: string;
  price: number;
  mrp?: number;
  discount_percent?: number;
  avg_rating: number;
  review_count: number;
  primary_image_url?: string;
  color?: string;
}

export interface ProductDetail extends ProductListItem {
  description?: string;
  sku?: string;
  stock_quantity: number;
  sizes?: Record<string, number>;
  material?: string;
  care_instructions?: string;
  tags?: string[];
  images: ProductImage[];
  category?: Category;
}

export interface PaginatedProducts {
  items: ProductListItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ── Cart ──────────────────────────────────────────────────────────────────────
export interface CartItem {
  id: number;
  product: ProductListItem;
  quantity: number;
  size?: string;
}

// ── Orders ────────────────────────────────────────────────────────────────────
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id: number;
  status: OrderStatus;
  total_amount: number;
  discount_amount: number;
  shipping_amount: number;
  payment_status: string;
  created_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  product: ProductListItem;
  quantity: number;
  size?: string;
  unit_price: number;
  total_price: number;
}

// ── AI ────────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  product_id?: number;
}

export interface ChatResponse {
  reply: string;
}

// ── Filters ───────────────────────────────────────────────────────────────────
export interface ProductFilters {
  category_slug?: string;
  brand?: string;
  min_price?: number;
  max_price?: number;
  sizes?: string;
  color?: string;
  sort?: "popularity" | "price_asc" | "price_desc" | "newest" | "rating";
  page?: number;
  limit?: number;
  search?: string;
  tags?: string; 
}

// ── API ───────────────────────────────────────────────────────────────────────
export interface ApiError {
  detail: string | { msg: string; type: string }[];
}
