// src/pages/AdminPage.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Users, Package, ShoppingBag, TrendingUp, Clock, CheckCircle,
  AlertCircle, Plus, Pencil, Trash2, X, Search, Eye, EyeOff,
  ChevronLeft, ChevronRight, Save, Image as ImageIcon,
} from "lucide-react";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Stats {
  total_users: number;
  total_products: number;
  total_orders: number;
  revenue_total: number;
  orders_pending: number;
  orders_today: number;
}

interface Category { id: number; name: string; slug: string; }

interface ProductForm {
  name: string;
  description: string;
  brand: string;
  price: string;
  mrp: string;
  category_id: string;
  color: string;
  material: string;
  care_instructions: string;
  tags: string;
  stock_quantity: string;
  images: string;
  sizes: string;
  is_active: boolean;
}

const EMPTY_FORM: ProductForm = {
  name: "", description: "", brand: "Zivame", price: "", mrp: "",
  category_id: "", color: "", material: "", care_instructions: "",
  tags: "", stock_quantity: "100", images: "", sizes: "", is_active: true,
};

// ── Product Modal ─────────────────────────────────────────────────────────────
function ProductModal({
  product, categories, onClose, onSave,
}: {
  product: any | null;
  categories: Category[];
  onClose: () => void;
  onSave: (data: any, id?: number) => void;
}) {
  const [form, setForm] = useState<ProductForm>(product ? {
    name: product.name || "",
    description: product.description || "",
    brand: product.brand || "Zivame",
    price: String(product.price || ""),
    mrp: String(product.mrp || ""),
    category_id: String(product.category?.id || ""),
    color: product.color || "",
    material: product.material || "",
    care_instructions: product.care_instructions || "",
    tags: (product.tags || []).join(", "),
    stock_quantity: String(product.stock_quantity || 100),
    images: (product.images || []).map((i: any) => i.url).join("\n"),
    sizes: product.sizes ? JSON.stringify(product.sizes, null, 2) : "",
    is_active: product.is_active ?? true,
  } : EMPTY_FORM);

  const set = (k: keyof ProductForm, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.price || isNaN(Number(form.price))) { toast.error("Valid price is required"); return; }

    let sizes: Record<string, number> | undefined;
    if (form.sizes.trim()) {
      try { sizes = JSON.parse(form.sizes); }
      catch { toast.error("Sizes must be valid JSON e.g. {\"34B\": 10}"); return; }
    }

    const payload: any = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      brand: form.brand.trim() || undefined,
      price: Number(form.price),
      mrp: form.mrp ? Number(form.mrp) : undefined,
      category_id: form.category_id ? Number(form.category_id) : undefined,
      color: form.color.trim() || undefined,
      material: form.material.trim() || undefined,
      care_instructions: form.care_instructions.trim() || undefined,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
      stock_quantity: Number(form.stock_quantity) || 0,
      images: form.images ? form.images.split("\n").map(u => u.trim()).filter(Boolean) : [],
      sizes,
      is_active: form.is_active,
    };

    onSave(payload, product?.id);
  };

  const field = (label: string, key: keyof ProductForm, opts?: { type?: string; placeholder?: string; multiline?: boolean }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {opts?.multiline
        ? <textarea value={form[key] as string} onChange={e => set(key, e.target.value)}
            placeholder={opts.placeholder} rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-400 resize-none" />
        : <input type={opts?.type || "text"} value={form[key] as string}
            onChange={e => set(key, e.target.value)}
            placeholder={opts?.placeholder}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-400" />
      }
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {product ? "Edit Product" : "Add New Product"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field("Product Name *", "name", { placeholder: "Zivame Padded Wired Bra..." })}
            {field("Brand", "brand", { placeholder: "Zivame" })}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {field("Price (₹) *", "price", { type: "number", placeholder: "699" })}
            {field("MRP (₹)", "mrp", { type: "number", placeholder: "999" })}
            {field("Stock Quantity", "stock_quantity", { type: "number", placeholder: "100" })}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
              <select value={form.category_id} onChange={e => set("category_id", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-400">
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {field("Color", "color", { placeholder: "Black Floral" })}
            {field("Material", "material", { placeholder: "Polyamide Elastane" })}
          </div>

          {field("Description", "description", { multiline: true, placeholder: "Product description..." })}

          <div className="grid grid-cols-2 gap-4">
            {field("Tags (comma separated)", "tags", { placeholder: "padded, wired, t-shirt bra" })}
            {field("Care Instructions", "care_instructions", { placeholder: "Hand wash only..." })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Sizes (JSON format)
            </label>
            <textarea value={form.sizes} onChange={e => set("sizes", e.target.value)}
              placeholder={'{"32B": 10, "34B": 15, "34C": 12}'} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-400 resize-none font-mono" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <ImageIcon size={13} /> Image URLs (one per line)
            </label>
            <textarea value={form.images} onChange={e => set("images", e.target.value)}
              placeholder={"https://cdn.zivame.com/...\nhttps://cdn.zivame.com/..."} rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-400 resize-none font-mono" />
            <p className="text-xs text-gray-400 mt-1">First URL will be the primary image</p>
          </div>

          {product && (
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-600">Active</label>
              <button onClick={() => set("is_active", !form.is_active)}
                className={`w-10 h-5 rounded-full transition-colors relative ${form.is_active ? "bg-green-500" : "bg-gray-300"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <span className="text-xs text-gray-500">{form.is_active ? "Visible on site" : "Hidden from site"}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit}
            className="px-5 py-2 bg-[#f05a78] text-white rounded-lg text-sm font-bold hover:bg-[#d94a68] flex items-center gap-2">
            <Save size={15} /> {product ? "Update Product" : "Create Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"dashboard" | "products">("dashboard");
  const [modal, setModal] = useState<{ open: boolean; product: any | null }>({ open: false, product: null });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [loadingEdit, setLoadingEdit] = useState<number | null>(null);

  const handleEdit = async (p: any) => {
    setLoadingEdit(p.id);
    try {
      const { data } = await api.get(`/products/${p.slug}`);
      setModal({ open: true, product: data });
    } catch {
      // Fallback to list item data if detail fetch fails
      setModal({ open: true, product: p });
    } finally {
      setLoadingEdit(null);
    }
  };
  const limit = 20;

  if (user?.role !== "admin") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500">You need admin privileges to view this page.</p>
      </div>
    );
  }

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: stats } = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: async () => { const { data } = await api.get("/admin/stats"); return data; },
    enabled: user?.role === "admin",
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => { const { data } = await api.get("/products/categories"); return data; },
  });

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["admin-products", page, search],
    queryFn: async () => {
      const { data } = await api.get("/products", {
        params: { page, limit, search: search || undefined, sort: "newest" },
      });
      return data;
    },
    enabled: tab === "products",
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post("/admin/products", payload),
    onSuccess: () => {
      toast.success("Product created!");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setModal({ open: false, product: null });
    },
    onError: () => toast.error("Failed to create product"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => api.put(`/admin/products/${id}`, payload),
    onSuccess: () => {
      toast.success("Product updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setModal({ open: false, product: null });
    },
    onError: () => toast.error("Failed to update product"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/products/${id}`),
    onSuccess: () => {
      toast.success("Product deleted!");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setDeleteConfirm(null);
    },
    onError: () => toast.error("Failed to delete product"),
  });

  const handleSave = (payload: any, id?: number) => {
    if (id) updateMutation.mutate({ id, payload });
    else createMutation.mutate(payload);
  };

  const products = productsData?.items || [];
  const totalPages = productsData?.pages || 1;

  const STAT_CARDS = stats ? [
    { label: "Total Users",     value: stats.total_users.toLocaleString("en-IN"),         icon: Users,       color: "bg-blue-50 text-blue-600" },
    { label: "Active Products", value: stats.total_products.toLocaleString("en-IN"),       icon: Package,     color: "bg-pink-50 text-pink-600" },
    { label: "Total Orders",    value: stats.total_orders.toLocaleString("en-IN"),         icon: ShoppingBag, color: "bg-purple-50 text-purple-600" },
    { label: "Revenue",         value: `₹${stats.revenue_total.toLocaleString("en-IN")}`, icon: TrendingUp,  color: "bg-green-50 text-green-600" },
    { label: "Pending Orders",  value: stats.orders_pending.toLocaleString("en-IN"),       icon: Clock,       color: "bg-amber-50 text-amber-600" },
    { label: "Orders Today",    value: stats.orders_today.toLocaleString("en-IN"),         icon: CheckCircle, color: "bg-teal-50 text-teal-600" },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black text-gray-900">Admin Panel</h1>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(["dashboard", "products"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all
                  ${tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Hello, <b>{user?.full_name || "Admin"}</b></span>
          <button onClick={() => navigate("/")}
            className="text-sm text-pink-600 hover:underline flex items-center gap-1">
            <ChevronLeft size={14} /> Back to site
          </button>
        </div>
      </div>

      <div className="px-6 py-6">

        {/* ── Dashboard Tab ─────────────────────────────────────────── */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-800">Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                    <Icon size={20} />
                  </div>
                  <p className="text-2xl font-black text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
              <div className="flex gap-3 flex-wrap">
                <button onClick={() => { setTab("products"); setModal({ open: true, product: null }); }}
                  className="flex items-center gap-2 bg-[#f05a78] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#d94a68]">
                  <Plus size={16} /> Add Product
                </button>
                <button onClick={() => setTab("products")}
                  className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50">
                  <Package size={16} /> Manage Products
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Products Tab ──────────────────────────────────────────── */}
        {tab === "products" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search products..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-pink-400"
                />
              </div>
              <button
                onClick={() => setModal({ open: true, product: null })}
                className="flex items-center gap-2 bg-[#f05a78] text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#d94a68] whitespace-nowrap">
                <Plus size={16} /> Add Product
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 w-16">Image</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Price</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Stock</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loadingProducts ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                        No products found
                      </td>
                    </tr>
                  ) : products.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {p.primary_image_url
                          ? <img src={p.primary_image_url} alt={p.name}
                              className="w-12 h-12 object-cover rounded-lg border border-gray-100" />
                          : <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-lg">👙</div>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 line-clamp-2 max-w-xs">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.brand}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.category?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">₹{p.price}</p>
                        {p.mrp && p.mrp > p.price && (
                          <p className="text-xs text-gray-400 line-through">₹{p.mrp}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.stock_quantity ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                          ${p.is_active !== false ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {p.is_active !== false ? <Eye size={10} /> : <EyeOff size={10} />}
                          {p.is_active !== false ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(p)}
                            disabled={loadingEdit === p.id}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors disabled:opacity-40">
                            {loadingEdit === p.id
                              ? <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                              : <Pencil size={14} />}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(p.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages} · {productsData?.total || 0} products
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium
                          ${p === page ? "bg-[#f05a78] text-white" : "border border-gray-200 hover:bg-gray-50"}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Modal */}
      {modal.open && (
        <ProductModal
          product={modal.product}
          categories={categories}
          onClose={() => setModal({ open: false, product: null })}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Product?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will hide the product from the site. This action can be undone by editing the product.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(deleteConfirm)}
                className="flex-1 bg-red-500 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}