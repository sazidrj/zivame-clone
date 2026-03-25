// src/pages/ProductDetailPage.tsx
import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart, Star, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, RefreshCw, Truck, ThumbsUp } from "lucide-react";
import api from "../services/api";
import { ProductDetail, PaginatedProducts } from "../types";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import { AuthModal } from "../components/auth/AuthModal";
import toast from "react-hot-toast";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [wishlisted, setWishlisted] = useState(false);
  const [pincode, setPincode] = useState("");
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [thumbStart, setThumbStart] = useState(0);
  const [colorScroll, setColorScroll] = useState(0);
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);

  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  const getColorHex = (colorName: string): string => {
    const c = (colorName || "").toLowerCase();
    if (c.includes("black"))  return "#1a1a1a";
    if (c.includes("white") || c.includes("snow")) return "#f5f5f5";
    if (c.includes("raspberry")) return "#c0392b";
    if (c.includes("red") || c.includes("claret") || c.includes("wine")) return "#c0392b";
    if (c.includes("navy") || c.includes("scooter")) return "#2c3e87";
    if (c.includes("blue") && !c.includes("argan")) return "#3182ce";
    if (c.includes("pink") || c.includes("blossom") || c.includes("dogwood")) return "#f48fb1";
    if (c.includes("skin") || c.includes("nude") || c.includes("beige") || c.includes("almond")) return "#e8b89a";
    if (c.includes("grey") || c.includes("gray") || c.includes("anthracite")) return "#9e9e9e";
    if (c.includes("green") || c.includes("sage")) return "#38a169";
    if (c.includes("purple") || c.includes("violet") || c.includes("elder")) return "#6d2b6d";
    if (c.includes("brown") || c.includes("nutmeg") || c.includes("roebuck")) return "#8d5524";
    if (c.includes("argan")) return "#c8956c";
    if (c.includes("aqua") || c.includes("teal")) return "#00bcd4";
    if (c.includes("orange") || c.includes("coral")) return "#e67e22";
    return "#f5b8a0";
  };

  const { data: product, isLoading } = useQuery<ProductDetail>({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await api.get(`/products/${slug}`);
      return data;
    },
    enabled: !!slug,
  });

  // When color changes, update displayed images — must be after product query
  const activeVariant = product?.color_variants?.[selectedColorIdx];
  const variantImages = activeVariant?.images?.map((url: string, i: number) => ({ url, is_primary: i === 0 }))
    || product?.images || [];

  const { data: similar } = useQuery<PaginatedProducts>({
    queryKey: ["similar", product?.category?.slug],
    queryFn: async () => {
      const { data } = await api.get("/products", {
        params: { category_slug: product!.category?.slug, limit: 6 },
      });
      return data;
    },
    enabled: !!product?.category?.slug,
  });

  const handleAddToCart = () => {
    if (!isAuthenticated) { setShowAuth(true); return; }
    if (!selectedSize) { toast.error("Please select a size"); return; }
    if (!product) return;
    addItem({
      id: product.id, name: product.name, slug: product.slug,
      brand: product.brand, price: product.price, mrp: product.mrp,
      discount_percent: product.discount_percent, avg_rating: product.avg_rating,
      review_count: product.review_count,
      primary_image_url: product.images?.[0]?.url,
      color: product.color,
    }, selectedSize);
    toast.success("Added to cart!");
  };

  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="aspect-square bg-gray-100 animate-pulse rounded-xl" />
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
          ))}
        </div>
      </div>
    </div>
  );

  if (!product) return <div className="text-center py-20 text-gray-500">Product not found.</div>;

  const images = variantImages;
  const primaryImg = images[selectedImage]?.url || images[0]?.url;
  const sizes = product.sizes ? Object.keys(product.sizes) : [];
  const discountPct = product.discount_percent ? Math.round(product.discount_percent) : 0;
  const descLines = (product.description || "").split("\n").filter(l => l.trim());

  // Feature tags
  const featureTags = [
    ...(product.tags || []).slice(0, 5),
    product.material,
  ].filter(Boolean) as string[];

  // Thumbnail scroll
  const thumbVisible = 6;
  const canScrollUp = thumbStart > 0;
  const canScrollDown = thumbStart + thumbVisible < images.length;

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-1 text-xs text-gray-500">
        <Link to="/" className="hover:text-pink-600">Home</Link>
        <ChevronRight size={12} />
        <Link to="/products" className="hover:text-pink-600">Bra</Link>
        <ChevronRight size={12} />
        <Link to={`/products?category=${product.category?.slug}`} className="hover:text-pink-600">
          {product.category?.name || "Bras"}
        </Link>
        <span className="ml-auto text-[#f05a78] font-medium">Bras From Zivame</span>
      </div>

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-6 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">

          {/* ── Left: Images ─────────────────────────────────────── */}
          <div className="flex gap-3">
            {/* Thumbnail strip with scroll arrows */}
            {images.length > 1 && (
              <div className="flex flex-col items-center gap-1 w-16 flex-shrink-0">
                <button onClick={() => setThumbStart(s => Math.max(0, s - 1))}
                  disabled={!canScrollUp}
                  className={`w-7 h-7 flex items-center justify-center rounded-full border transition-all
                    ${canScrollUp ? "border-gray-300 hover:border-gray-500" : "border-gray-100 opacity-30"}`}>
                  <ChevronUp size={14} />
                </button>
                {images.slice(thumbStart, thumbStart + thumbVisible).map((img, i) => (
                  <button key={thumbStart + i}
                    onClick={() => setSelectedImage(thumbStart + i)}
                    className={`w-16 h-16 rounded border-2 overflow-hidden flex-shrink-0 transition-all
                      ${selectedImage === thumbStart + i ? "border-[#f05a78]" : "border-gray-200 hover:border-gray-400"}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
                <button onClick={() => setThumbStart(s => Math.min(images.length - thumbVisible, s + 1))}
                  disabled={!canScrollDown}
                  className={`w-7 h-7 flex items-center justify-center rounded-full border transition-all
                    ${canScrollDown ? "border-gray-300 hover:border-gray-500" : "border-gray-100 opacity-30"}`}>
                  <ChevronDown size={14} />
                </button>
              </div>
            )}

            {/* Main image */}
            <div className="flex-1">
              <div className="sticky top-20 relative rounded-xl overflow-hidden bg-gray-50">
                <img src={primaryImg} alt={product.name}
                  className="w-full object-cover"
                  style={{ aspectRatio: "3/4" }} />
                {discountPct > 0 && (
                  <div className="absolute top-3 left-3 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                    {discountPct}% OFF
                  </div>
                )}
                <button onClick={() => setWishlisted(!wishlisted)}
                  className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full shadow flex items-center justify-center">
                  <Heart size={18} className={wishlisted ? "fill-pink-600 text-pink-600" : "text-gray-400"} />
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-1 py-1">
                  SKU: {product.slug?.slice(0, 20)}
                </p>
              </div>
            </div>
          </div>

          {/* ── Right: Details ───────────────────────────────────── */}
          <div className="space-y-5">

            {/* Title */}
            <h1 className="text-xl font-semibold text-gray-900 leading-snug">{product.name}</h1>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-gray-900">₹{product.price}</span>
              {product.mrp && product.mrp > product.price && (
                <>
                  <span className="text-base text-gray-400 line-through">₹{product.mrp}</span>
                  <span className="text-sm font-semibold text-green-600">({discountPct}% OFF)</span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-400 -mt-3">Inclusive of all taxes</p>

            {/* Rating */}
            {product.avg_rating > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                  <Star size={10} fill="white" />
                  {product.avg_rating.toFixed(1)}
                </div>
                <span className="text-sm text-gray-500">({product.review_count} Reviews)</span>
              </div>
            )}

            {/* Feature tags */}
            {featureTags.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Product Features</p>
                <div className="flex flex-wrap gap-2 items-center">
                  {featureTags.map((tag, i) => (
                    <span key={i}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium
                        ${i === 0 ? "bg-[#f05a78] text-white border-[#f05a78]" : "border-gray-300 text-gray-600"}`}>
                      {tag}
                    </span>
                  ))}
                  <button className="text-gray-400 hover:text-gray-600">
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="mt-3 bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">{descLines[0] || "Medium padded cups for fine shaping & nipple coverage"}</p>
                  <div className="flex gap-3 mt-2">
                    <button className="text-xs text-[#f05a78] font-medium hover:underline">Learn More</button>
                    <button className="text-xs text-[#f05a78] font-medium hover:underline">See Matching Products</button>
                  </div>
                </div>
              </div>
            )}

            {/* Colors */}
            {(product.color_variants?.length || product.color) && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Colors</p>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full border-2 border-[#f05a78] shadow-sm"
                    style={{ background: activeVariant?.hex || getColorHex(product.color || "") }} />
                  <span className="text-sm text-gray-700 font-medium">
                    {activeVariant?.color || product.color}
                  </span>
                  <span className="text-xs text-gray-400">
                    | All Shades ({product.color_variants?.length || 1})
                  </span>
                </div>

                {/* Scrollable color swatch row */}
                {product.color_variants && product.color_variants.length > 0 && (
                  <div className="relative px-5">
                    <button
                      onClick={() => setColorScroll(s => Math.max(0, s - 1))}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow">
                      <ChevronLeft size={14} className="text-gray-600" />
                    </button>

                    <div className="flex gap-3 overflow-hidden py-1">
                      {product.color_variants.slice(colorScroll, colorScroll + 8).map((v: any, i: number) => {
                        const idx = i + colorScroll;
                        return (
                          <button key={idx}
                            onClick={() => {
                              setSelectedColorIdx(idx);
                              setSelectedImage(0); // reset to first image of new color
                            }}
                            className={`relative w-11 h-11 rounded-full border-2 flex-shrink-0 transition-all
                              ${selectedColorIdx === idx
                                ? "border-gray-800 scale-110 shadow-md"
                                : "border-gray-200 hover:border-gray-500"}`}
                            style={{ background: v.hex || getColorHex(v.color) }}
                            title={v.color}>
                            {selectedColorIdx === idx && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="w-2.5 h-2.5 rounded-full bg-white/90 shadow-sm" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setColorScroll(s => Math.min((product.color_variants?.length || 0) - 8, s + 1))}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow">
                      <ChevronRight size={14} className="text-gray-600" />
                    </button>

                    {/* Hover tooltip */}
                    {product.color_variants[colorScroll + Math.min(7, (product.color_variants.length - colorScroll - 1))] && (
                      <div className="mt-1 h-px bg-gray-200" />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sizes */}
            {sizes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sizes</p>
                  <div className="flex gap-3 text-xs">
                    <span className="text-gray-400">Not sure about your size?</span>
                    <button className="text-[#f05a78] font-medium hover:underline">Size Chart</button>
                    <span className="text-gray-300">|</span>
                    <button className="text-[#f05a78] font-medium hover:underline">Find your fit</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => {
                    const stock = (product.sizes as Record<string, number>)[size] || 0;
                    const outOfStock = stock === 0;
                    return (
                      <button key={size} onClick={() => !outOfStock && setSelectedSize(size)}
                        disabled={outOfStock}
                        className={`min-w-[52px] h-10 px-4 rounded-full border-2 text-sm font-medium transition-all
                          ${selectedSize === size
                            ? "border-[#f05a78] text-[#f05a78] bg-pink-50"
                            : outOfStock
                              ? "border-gray-200 text-gray-300 cursor-not-allowed line-through"
                              : "border-gray-300 text-gray-700 hover:border-gray-500"}`}>
                        {size}
                      </button>
                    );
                  })}
                  <button className="text-xs text-gray-400 font-medium self-center">+2 Sizes Out Of Stock</button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Note: The model (Height 5'10" | OverBust 33" | UnderBust 28") is wearing size 34B
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setWishlisted(!wishlisted)}
                className="w-12 h-12 border-2 border-gray-300 rounded-full flex items-center justify-center hover:border-pink-300 transition-colors flex-shrink-0">
                <Heart size={18} className={wishlisted ? "fill-pink-600 text-pink-600" : "text-gray-500"} />
              </button>
              <button onClick={handleAddToCart}
                className="flex-1 bg-[#f05a78] text-white font-bold py-3.5 rounded-full
                  hover:bg-[#d94a68] transition-colors text-sm uppercase tracking-wide">
                ADD TO CART
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                <Truck size={16} className="text-gray-500 flex-shrink-0" />
                <span className="text-xs text-gray-600">COD is available</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                <RefreshCw size={16} className="text-gray-500 flex-shrink-0" />
                <span className="text-xs text-gray-600">15 days Easy Returns &amp; Exchanges</span>
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Description</p>
              <ul className="space-y-1.5">
                {descLines.slice(0, showFullDesc ? undefined : 5).map((line, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-gray-400 flex-shrink-0">•</span>
                    <span>{line.replace(/^[-•*]\s*/, "")}</span>
                  </li>
                ))}
              </ul>
              {descLines.length > 5 && (
                <button onClick={() => setShowFullDesc(!showFullDesc)}
                  className="text-xs text-[#f05a78] font-medium mt-2 hover:underline">
                  {showFullDesc ? "...less" : "...more"}
                </button>
              )}
            </div>

            {/* Delivery check */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Check Delivery Time</p>
              <div className="flex gap-2">
                <input value={pincode} onChange={e => setPincode(e.target.value)}
                  placeholder="PINCODE" maxLength={6}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-400" />
                <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-400">
                  Check
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">Dispatch in 24 hours</p>
            </div>

            {/* Reviews */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Reviews</p>
              <div className="flex items-start gap-6">
                <div>
                  <p className="text-4xl font-black text-gray-900">{product.avg_rating.toFixed(1)}</p>
                  <div className="flex gap-0.5 mt-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14}
                        className={s <= Math.round(product.avg_rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">({product.review_count} Reviews)</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5,4,3,2,1].map(star => {
                    const pct = star === 5 ? 80 : star === 4 ? 20 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-10">{star} Stars</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#f05a78] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-8">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-4 mt-4">
                {[
                  { name: "Namita Choksi", time: "2 month ago", text: "Very nice material and very comfortable.", rating: 5 },
                  { name: "Vanitha",       time: "2 month ago", text: "Material is so soft. Size fits me perfectly.", rating: 5 },
                ].map((r, i) => (
                  <div key={i} className="border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={12}
                            className={s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"} />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{r.name}</span>
                      <span className="text-xs text-gray-400">{r.time}</span>
                    </div>
                    <p className="text-sm text-gray-600">{r.text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">Helpful?</span>
                      <button className="flex items-center gap-1 border border-gray-200 rounded px-2 py-0.5 text-xs text-gray-500 hover:border-gray-400">
                        <ThumbsUp size={10} /> 0
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="text-sm text-[#f05a78] font-bold uppercase tracking-wide mt-3 hover:underline">
                SEE ALL REVIEWS
              </button>
            </div>

            {/* Seller info */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Seller Information</p>
              <div className="space-y-1 text-xs text-gray-600">
                <p><span className="font-medium">Manufacture Country:</span> India</p>
                <p><span className="font-medium">Generic Name:</span> {product.category?.name || "T-Shirt Bras"}</p>
                <p><span className="font-medium">Material:</span> {product.material || "Polyamide"}</p>
                <p><span className="font-medium">Sold By:</span> Select size to get seller name</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* You May Also Like */}
      {similar && similar.items.length > 0 && (
        <div className="border-t border-gray-100 py-10 px-6 max-w-7xl mx-auto">
          <h2 className="text-lg font-bold text-gray-900 text-center mb-6 uppercase tracking-wide">
            YOU MAY ALSO LIKE
          </h2>
          <div className="flex gap-3 justify-center mb-6">
            {["Similar Products", "More Padded Bras", "More Wirefree Bras"].map((tab, i) => (
              <button key={tab}
                className={`text-sm px-4 py-1.5 rounded-full border transition-all
                  ${i === 0 ? "border-[#f05a78] text-[#f05a78]" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {similar.items.slice(0, 5).map(p => (
              <Link key={p.id} to={`/products/${p.slug}`}
                className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                <div className="relative aspect-[3/4] bg-gray-50">
                  {p.primary_image_url
                    ? <img src={p.primary_image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">👙</div>}
                </div>
                <div className="p-2">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">{p.brand}</p>
                  <p className="text-xs text-gray-800 line-clamp-2 mt-0.5">{p.name}</p>
                  <div className="flex gap-1.5 items-baseline mt-1">
                    <span className="text-sm font-bold text-gray-900">₹{p.price}</span>
                    {p.mrp && p.mrp > p.price && (
                      <span className="text-xs text-gray-400 line-through">₹{p.mrp}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}