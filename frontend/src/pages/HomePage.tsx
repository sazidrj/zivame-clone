// src/pages/HomePage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronLeft, Heart } from "lucide-react";
import { ProductCard } from "../components/product/ProductCard";
import { AuthModal } from "../components/auth/AuthModal";
import api from "../services/api";
import { PaginatedProducts } from "../types";

// ─── helpers ──────────────────────────────────────────────────────────────────
function Img({
  src, alt, className = "", fallback = "bg-gray-100", style,
}: { src: string; alt: string; className?: string; fallback?: string; style?: React.CSSProperties }) {
  const [err, setErr] = useState(false);
  if (err) return (
    <div className={`${fallback} ${className} flex items-center justify-center`} style={style}>
      <span className="text-xs text-gray-400">{alt}</span>
    </div>
  );
  return <img src={src} alt={alt} className={className} style={style} onError={() => setErr(true)} />;
}

// ─── Hero Slider ──────────────────────────────────────────────────────────────
const HERO_SLIDES = [
  { src: "https://cdn.zivame.com/media/v3/V3MB_desk_flat60_extra20_230326.png", link: "/products?sort=price_asc" },
  { src: "https://cdn.zivame.com/media/v3/V3MB_desk_newarrivals_130326.png",    link: "/products?sort=newest" },
  { src: "https://cdn.zivame.com/media/v3/V3MB_1_upto60_230326.png",           link: "/products" },
  { src: "https://cdn.zivame.com/media/v3/V3MB_desk_act_230326.png",           link: "/products?category=activewear" },
  { src: "https://cdn.zivame.com/media/v3/V3MB_desk_npnw_130326.png",          link: "/products?category=bras" },
  { src: "https://cdn.zivame.com/media/v3/V3MB_desk_brands_130326.png",        link: "/products" },
];

function HeroSlider() {
  const [cur, setCur] = useState(0);
  const go = useCallback((i: number) => setCur((i + HERO_SLIDES.length) % HERO_SLIDES.length), []);

  useEffect(() => {
    const t = setInterval(() => go(cur + 1), 4500);
    return () => clearInterval(t);
  }, [cur, go]);

  return (
    <div className="relative w-full overflow-hidden bg-[#f5f0e8] select-none">
      {HERO_SLIDES.map((s, i) => (
        <div key={i}
          className={`transition-opacity duration-500 ${i === cur ? "opacity-100 relative" : "opacity-0 absolute inset-0 pointer-events-none"}`}
          style={{ zIndex: i === cur ? 10 : 0 }}>
          <img src={s.src} alt={`Banner ${i + 1}`} className="w-full block object-cover" />
          <Link to={s.link} className="absolute inset-0 z-10" aria-label={`Slide ${i + 1}`} />
        </div>
      ))}
      <button onClick={(e) => { e.stopPropagation(); go(cur - 1); }}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 bg-white/80
          hover:bg-white rounded-full shadow-md flex items-center justify-center">
        <ChevronLeft size={18} className="text-gray-700" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); go(cur + 1); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 bg-white/80
          hover:bg-white rounded-full shadow-md flex items-center justify-center">
        <ChevronRight size={18} className="text-gray-700" />
      </button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
        <span className="text-white text-xs font-semibold bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
          {cur + 1}/{HERO_SLIDES.length}
        </span>
        {HERO_SLIDES.map((_, i) => (
          <button key={i} onClick={(e) => { e.stopPropagation(); go(i); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === cur ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
            }`} />
        ))}
      </div>
    </div>
  );
}

// ─── Trending Products Slider ─────────────────────────────────────────────────
function TrendingSlider({ products }: { products: any[] }) {
  const [start, setStart] = useState(0);
  const visible = 5;
  const canPrev = start > 0;
  const canNext = start + visible < products.length;

  return (
    <div className="relative">
      {canPrev && (
        <button onClick={() => setStart(s => Math.max(0, s - 1))}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center border">
          <ChevronLeft size={16} />
        </button>
      )}
      <div className="grid grid-cols-5 gap-3 overflow-hidden">
        {products.slice(start, start + visible).map(p => (
          <Link key={p.id} to={`/products/${p.slug}`}
            className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
            <div className="relative aspect-[3/4] bg-gray-50">
              {p.primary_image_url
                ? <img src={p.primary_image_url} alt={p.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-2xl">👙</div>}
              <button className="absolute top-2 right-2 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Heart size={14} className="text-gray-500" />
              </button>
              <div className="absolute bottom-2 left-2 bg-white text-xs font-bold px-2 py-0.5 rounded">
                ₹{p.price} <span className="text-gray-400 line-through ml-1">₹{p.mrp}</span>
              </div>
            </div>
            <div className="p-2">
              <p className="text-xs text-gray-500">{p.brand}</p>
              <p className="text-xs font-medium text-gray-800 line-clamp-2 mt-0.5">{p.name}</p>
            </div>
          </Link>
        ))}
      </div>
      {canNext && (
        <button onClick={() => setStart(s => Math.min(products.length - visible, s + 1))}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center border">
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [showAuth, setShowAuth] = useState(false);
  const [trendingTab, setTrendingTab] = useState("All");
  const [bestsellersTab, setBestsellersTab] = useState("All");

  const { data: products } = useQuery<PaginatedProducts>({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const { data } = await api.get("/products", { params: { limit: 50, sort: "popularity" } });
      return data;
    },
  });

  const allProducts = products?.items ?? [];
  const TABS = ["All", "Bras", "Panties", "Nightwear", "Activewear", "Shapewear"];

  const filterByTab = (tab: string) => tab === "All"
    ? allProducts
    : allProducts.filter(p =>
        p.name.toLowerCase().includes(tab.toLowerCase()) ||
        (p as any).category?.toLowerCase().includes(tab.toLowerCase()));

  return (
    <main className="bg-white">

      {/* ── 1. Hero Slider ──────────────────────────────────────────── */}
      <HeroSlider />

      {/* ── 2. Budget Deals ─────────────────────────────────────────── */}
      <section className="py-4 px-6 border-b border-gray-100 w-full">
        <div className="flex flex-row items-center justify-between w-full gap-8">
          <h2 className="text-2xl italic text-gray-900 whitespace-nowrap"
            style={{ fontFamily: "Georgia, serif", fontWeight: 400 }}>
            YOUR SPOT FOR BUDGET DEALS
          </h2>
          <div className="flex items-center gap-4">
            {[
              { src: "https://cdn.zivame.com/media/v3/discbkt_des_13_03_04_new1.png", link: "/products?max_price=399" },
              { src: "https://cdn.zivame.com/media/v3/discbkt_des_13_03_05_new1.png", link: "/products?max_price=599" },
              { src: "https://cdn.zivame.com/media/v3/discbkt_des_13_03_06_new1.png", link: "/products?max_price=799" },
              { src: "https://cdn.zivame.com/media/v3/discbkt_des_13_03_07_new1.png", link: "/products?max_price=999" },
            ].map((d, i) => (
              <Link key={i} to={d.link} className="hover:scale-105 transition-transform">
                <img src={d.src} alt={`Budget deal ${i + 1}`}
                  className="w-auto object-contain"
                  style={{ height: 110, aspectRatio: "1.08" }} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. FitCode Strip ────────────────────────────────────────── */}
      <section className="mx-4 md:mx-8 rounded-xl overflow-hidden mb-8 mt-4">
        <div className="bg-[#e8f0e0] border border-[#c5d9b0] py-4 px-8 flex items-center justify-between">
          <p className="italic text-gray-500 text-sm">Bad fit is so last season</p>
          <div className="flex items-center gap-6">
            <p className="font-bold text-gray-900 uppercase tracking-wide text-sm">
              FIND YOUR SHAPE. FIND YOUR SIZE.
            </p>
            <Link to="/products"
              className="border border-gray-800 px-4 py-1.5 text-xs font-bold uppercase hover:bg-gray-900 hover:text-white transition-colors">
              TRY FITCODE &gt;
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. Branding Ad Slider ─────────────────────────────────────── */}
      <section className="mb-8 overflow-hidden" style={{
        backgroundImage: "url(https://cdn.zivame.com/media/v3/1_branding_ad_desk_bg_120326.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}>
        <div className="text-center pt-8 pb-4">
          <img
            src="https://cdn.zivame.com/media/v3/Desk _Brandind_Ad_Header_120226.png"
            alt="Branding Ad"
            className="mx-auto"
            style={{ height: 60, width: "auto" }}
          />
        </div>
        <div className="relative" style={{ padding: "0 10rem 1.5rem" }}>
          <button onClick={() => document.getElementById('branding-slider')?.scrollBy({ left: -310, behavior: 'smooth' })}
            className="absolute left-14 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center">
            <img src="https://cdn.zivame.com/media/home-icons/Left.svg" alt="prev" width={50} height={50} />
          </button>
          <div id="branding-slider" className="flex gap-5 overflow-x-auto scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", padding: "0 50px" } as React.CSSProperties}>
            {[
              { src: "https://cdn.zivame.com/media/v3/1_branding_ad_desk_120326.png", link: "/products?category=bras" },
              { src: "https://cdn.zivame.com/media/v3/2_branding_ad_desk_120326.png", link: "/products?category=nightwear" },
              { src: "https://cdn.zivame.com/media/v3/3_branding_ad_desk_120326.png", link: "/products?category=panties" },
              { src: "https://cdn.zivame.com/media/v3/4_branding_ad_desk_120326.png", link: "/products?category=activewear" },
              { src: "https://cdn.zivame.com/media/v3/5_branding_ad_desk_120326.png", link: "/products?category=shapewear" },
            ].map((card, i) => (
              <Link key={i} to={card.link} className="flex-shrink-0 group" style={{ width: "calc(33.333% - 14px)" }}>
                <img
                  src={card.src}
                  alt={`category-${i + 1}`}
                  width={384} height={320}
                  className="w-full group-hover:scale-[1.03] transition-transform duration-300"
                  style={{ marginBottom: "0.5rem", borderRadius: "0" }}
                />
              </Link>
            ))}
          </div>
          <button onClick={() => document.getElementById('branding-slider')?.scrollBy({ left: 310, behavior: 'smooth' })}
            className="absolute right-14 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center">
            <img src="https://cdn.zivame.com/media/home-icons/Right.svg" alt="next" width={50} height={50} />
          </button>
        </div>
      </section>

      {/* ── 5. Star Brands ───────────────────────────────────────────── */}
      <section className="mb-8 py-8 overflow-hidden"
        style={{
          backgroundImage: "url(https://cdn.zivame.com/media/v3/Parter_brand_bg_new2wdg_desk_130326.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}>
        <div className="text-center mb-6">
          <img
            src="https://cdn.zivame.com/media/v3/Partnerbrandheader_new2wdg_desk_130326.png"
            alt="Meet the Star Brands"
            className="mx-auto"
            style={{ height: 60, width: "auto" }}
          />
        </div>
        <div style={{ overflow: "hidden", width: "100%", padding: "0 10rem" }}>
          <div style={{ display: "flex", animation: "brandScroll 14s linear infinite", width: "max-content" }}>
            {[
              { n: 1, href: "/products?brand=Amante" },
              { n: 2, href: "/products?brand=Triumph" },
              { n: 3, href: "/products?brand=Wacoal" },
              { n: 4, href: "/products?brand=Secrets" },
              { n: 5, href: "/products?brand=Nykd" },
              { n: 1, href: "/products?brand=Amante" },
              { n: 2, href: "/products?brand=Triumph" },
              { n: 3, href: "/products?brand=Wacoal" },
              { n: 4, href: "/products?brand=Secrets" },
              { n: 5, href: "/products?brand=Nykd" },
            ].map((b, i) => (
              <Link key={i} to={b.href} style={{ flexShrink: 0, width: 260, display: "block" }}>
                <img
                  src={`https://cdn.zivame.com/media/v3/${b.n}_partner%20brand_new2wdg_desk_130326.png`}
                  alt={`Brand ${b.n}`}
                  width={200} height={300}
                  style={{ width: 200, height: 300, objectFit: "contain", margin: "0 auto", display: "block" }}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Bra Types ─────────────────────────────────────────────── */}
      <section className="bg-[#fdf8f0] py-10 px-4 mb-8">
        <h2 className="text-center italic text-2xl text-gray-700 mb-6">All things breezy, light & bright</h2>
        <div className="max-w-7xl mx-auto relative">
          <button onClick={() => document.getElementById('bra-slider')?.scrollBy({ left: -280, behavior: 'smooth' })}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-200 hover:shadow-lg transition-shadow">
            <ChevronLeft size={18} className="text-gray-700" />
          </button>
          <div id="bra-slider" className="flex gap-4 overflow-x-auto scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
            {[
              { src: "https://cdn.zivame.com/media/v3/1_Sq_banner_desk_130326.png", label: "PADDED BRAS >",         link: "/products?category=bras" },
              { src: "https://cdn.zivame.com/media/v3/2_Sq_banner_desk_130326.png", label: "NON-PADDED BRAS >",     link: "/products?category=bras" },
              { src: "https://cdn.zivame.com/media/v3/3_Sq_banner_desk_130326.png", label: "PADDED, WIRED BRAS >",  link: "/products?category=bras" },
              { src: "https://cdn.zivame.com/media/v3/6_Sq_banner_desk_130326.png", label: "MINIMIZER BRAS >",      link: "/products?category=bras" },
              { src: "https://cdn.zivame.com/media/v3/4_Sq_banner_desk_130326.png", label: "PADDED NON-WIRED BRAS >", link: "/products?category=bras" },
            ].map((b, i) => (
              <Link key={i} to={b.link}
                className="relative overflow-hidden bg-gray-100 group flex-shrink-0 block"
                style={{ width: "calc(33.333% - 11px)", minWidth: 220 }}>
                <img src={b.src} alt={b.label}
                  className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  style={{ aspectRatio: "408/396" }} />
                <div className="absolute bottom-0 left-0 right-0">
                  <span className="block bg-yellow-400 text-gray-900 text-xs font-bold text-center py-2">{b.label}</span>
                </div>
              </Link>
            ))}
          </div>
          <button onClick={() => document.getElementById('bra-slider')?.scrollBy({ left: 280, behavior: 'smooth' })}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-200 hover:shadow-lg transition-shadow">
            <ChevronRight size={18} className="text-gray-700" />
          </button>
        </div>
      </section>

      {/* ── 7. Trending Now ──────────────────────────────────────────── */}
      <section className="py-8 px-4 max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold text-gray-900">Trending now</h2>
          <span className="text-orange-500">🔥</span>
        </div>
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {TABS.map(t => (
            <button key={t} onClick={() => setTrendingTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                trendingTab === t ? "border-pink-600 text-pink-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t}
            </button>
          ))}
        </div>
        {allProducts.length > 0
          ? <TrendingSlider products={filterByTab(trendingTab)} />
          : <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-gray-100 animate-pulse rounded-xl aspect-[3/4]" />
              ))}
            </div>
        }
      </section>

       {/* ── 7.5 Z Exclusives Banner ──────────────────────────────────── */}
      <section className="mb-8">
        <Link to="/products">
          <img
            src="https://cdn.zivame.com/media/v3/Zexclusivesblocklayout_desk_120326.png"
            alt="Z Exclusives"
            className="w-full block"
            style={{ aspectRatio: "2.74 / 1" }}
          />
        </Link>
      </section>

      {/* ── 8. Z Hot Picks / Rare Style Drop Banner ───────────────────── */}
      <section className="mb-8">
        <Link to="/products?sort=newest">
          <img src="/banners/hotpicks-banner.webp" alt="Z Hot Picks"
            className="w-full object-cover" />
        </Link>
      </section>


      {/* ── 9. Bestsellers ───────────────────────────────────────────── */}
      <section className="py-8 px-4 max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            Bestsellers you can't miss <span>🏆</span>
          </h2>
          <Link to="/products?sort=popularity" className="text-pink-600 text-sm font-medium flex items-center gap-1">
            View All <ChevronRight size={16} />
          </Link>
        </div>
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {TABS.map(t => (
            <button key={t} onClick={() => setBestsellersTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                bestsellersTab === t ? "border-pink-600 text-pink-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t}
            </button>
          ))}
        </div>
        {allProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filterByTab(bestsellersTab).slice(0, 10).map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-gray-100 animate-pulse rounded-xl aspect-[3/4]" />
            ))}
          </div>
        )}
      </section>

      {/* ── 10. Sleepwear Section ─────────────────────────────────────── */}
      <section className="mb-8 py-8"
        style={{
          backgroundImage: "url(https://cdn.zivame.com/media/v3/Sleepwear_branding_ad_bg_desk_120326.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}>
        {/* Header image */}
        <div className="text-center mb-6">
          <img
            src="https://cdn.zivame.com/media/v3/Sleepwear_branding_ad_header_desk_120326.png"
            alt="Hit the cosy meter in cutesy sleepwear"
            className="mx-auto"
            style={{ height: 70, width: "auto" }}
          />
        </div>

        {/* Slider */}
        <div style={{ padding: "0 10rem", position: "relative" }}>
          <div
            id="sleepwear-slider"
            className="flex gap-4 overflow-x-auto scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {[
              { src: "https://cdn.zivame.com/media/v3/1_Sleep%20branding_wd_desk_120326.png", link: "/products?category=nightwear" },
              { src: "https://cdn.zivame.com/media/v3/2_Sleep%20branding_wd_desk_120326.png", link: "/products?category=nightwear" },
              { src: "https://cdn.zivame.com/media/v3/3_Sleep%20branding_wd_desk_120326.png", link: "/products?category=nightwear" },
              { src: "https://cdn.zivame.com/media/v3/4_Sleep%20branding_wd_desk_120326.png", link: "/products?category=nightwear" },
              { src: "https://cdn.zivame.com/media/v3/5_Sleep%20branding_wd_desk_120326.png", link: "/products?category=camisoles" },
            ].map((s, i) => (
              <Link key={i} to={s.link} style={{ flexShrink: 0, width: "calc(33.333% - 16px)" }}>
                <img src={s.src} alt={`Sleepwear ${i + 1}`}
                  width={384} height={320}
                  style={{ width: "100%", display: "block" }} />
              </Link>
            ))}
          </div>

          {/* Arrows */}
          <button
            onClick={() => document.getElementById('sleepwear-slider')?.scrollBy({ left: -300, behavior: 'smooth' })}
            className="absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center"
            style={{ left: "9rem" }}>
            <img src="https://cdn.zivame.com/media/home-icons/Left.svg" alt="<" width={50} height={50} />
          </button>
          <button
            onClick={() => document.getElementById('sleepwear-slider')?.scrollBy({ left: 300, behavior: 'smooth' })}
            className="absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center"
            style={{ right: "9rem" }}>
            <img src="https://cdn.zivame.com/media/home-icons/Right.svg" alt=">" width={50} height={50} />
          </button>
        </div>
      </section>

      {/* ── 11. Activewear Banner ────────────────────────────────────── */}
      <section className="mb-8">
        <Link to="/products?category=activewear">
          <img src="/banners/activewear-banner.webp" alt="Activewear" className="w-full object-cover" />
        </Link>
        <div className="max-w-5xl mx-auto grid grid-cols-6 gap-2 mt-4 px-4">
          {[
            { src: "/banners/act-yoga.webp",    label: "GET YOGA READY >",     link: "/products?category=activewear" },
            { src: "/banners/act-pilates.webp", label: "PILATES, PLEASE >",    link: "/products?category=activewear" },
            { src: "/banners/act-run.webp",     label: "RUN WITHOUT LIMITS >", link: "/products?category=activewear" },
            { src: "/banners/act-hiit.webp",    label: "HIIT YOUR GOALS >",    link: "/products?category=activewear" },
            { src: "/banners/act-smash.webp",   label: "SMASH YOUR GOALS >",   link: "/products?category=activewear" },
            { src: "/banners/act-walk.webp",    label: "WALK IT OUT >",        link: "/products?category=activewear" },
          ].map(a => (
            <Link key={a.label} to={a.link}
              className="relative rounded-xl overflow-hidden aspect-square bg-gray-200 group">
              <Img src={a.src} alt={a.label}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                fallback="bg-gray-200" />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1">
                <p className="text-white text-[9px] font-bold text-center leading-tight">{a.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 12. Panties by Type ───────────────────────────────────────── */}
      <section className="mb-8">
        <div style={{ display: "flex", width: "100%", maxWidth: "100vw" }}>
          {[
            { src: "https://cdn.zivame.com/media/v3/Panties_blocklayout_desk__120326_01.gif", link: "/products?category=panties" },
            { src: "https://cdn.zivame.com/media/v3/Panties_blocklayout_desk__120326_02.gif", link: "/products?category=panties" },
            { src: "https://cdn.zivame.com/media/v3/Panties_blocklayout_desk__120326_03.gif", link: "/products?category=panties" },
            { src: "https://cdn.zivame.com/media/v3/Panties_blocklayout_desk__120326_04.gif", link: "/products?category=panties" },
          ].map((p, i) => (
            <Link key={i} to={p.link}
              style={{ display: "inline-block", width: "25%", aspectRatio: "0.69", flexShrink: 0 }}>
              <img src={p.src} alt={`Panties ${i + 1}`}
                style={{ width: "100%", aspectRatio: "0.69 / 1", display: "block" }} />
            </Link>
          ))}
        </div>
      </section>

      {/* ── 13. Character Shop Banner ─────────────────────────────────── */}
      <section className="mb-8">
        <Link to="/products?sort=newest">
          <img src="/banners/character-shop.webp" alt="The Character Shop" className="w-full object-cover" />
        </Link>
      </section>

      {/* ── 14. Shapewear OOTD Banner ─────────────────────────────────── */}
      <section className="mb-8">
        <Link to="/products?category=shapewear">
          <img src="/banners/shapewear-banner.webp" alt="Shapewear" className="w-full object-cover" />
        </Link>
      </section>

      {/* ── 15. Bridal Collection ─────────────────────────────────────── */}
      <section className="py-10 mb-8 bg-[#fdf6ed]">
        <h2 className="text-center italic text-xl text-gray-700 mb-6 px-4">
          For the blushing bride &amp; her crew, raise a toast to new beginnings
        </h2>
        <div style={{ display: "flex", width: "100%" }}>
          {[
            { src: "https://cdn.zivame.com/media/v3/Bride_blocklayout_desk_130326_01.jpg", link: "/products?category=bras" },
            { src: "https://cdn.zivame.com/media/v3/Bride_blocklayout_desk_130326_02.jpg", link: "/products?category=bras" },
            { src: "https://cdn.zivame.com/media/v3/Bride_blocklayout_desk_130326_03.jpg", link: "/products?category=bras" },
            { src: "https://cdn.zivame.com/media/v3/Bride_blocklayout_desk_130326_04.jpg", link: "/products?category=bras" },
            { src: "https://cdn.zivame.com/media/v3/Bride_blocklayout_desk_130326_05.jpg", link: "/products?category=nightwear" },
          ].map((b, i) => (
            <Link key={i} to={b.link}
              style={{ display: "inline-block", width: "20%", aspectRatio: "0.63", flexShrink: 0 }}>
              <img src={b.src} alt={`Bridal ${i + 1}`}
                style={{ width: "100%", aspectRatio: "0.63 / 1", display: "block" }} />
            </Link>
          ))}
        </div>
      </section>


       {/* ── 16. Shoppers Talk ────────────────────────────────────────── */}
      <section className="bg-white py-8 mb-8">
        <div style={{ padding: "0 10rem" }}>
          <p className="text-xl font-bold text-gray-900 mb-1">Shoppers Talk</p>
          <div className="flex gap-0.5 mb-6">
            <div className="h-0.5 w-16 bg-gray-900" />
            <div className="h-0.5 w-3 bg-gray-900" />
          </div>
          <div
            id="shoppers-slider"
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", padding: "0 50px" } as React.CSSProperties}
          >
            {[
              { src: "https://cdn.zivame.com/media/v3/tshirtbra_ur.png",      link: "/products?category=bras" },
              { src: "https://cdn.zivame.com/media/v3/hipster_ur.png",         link: "/products?category=panties" },
              { src: "https://cdn.zivame.com/media/v3/sareeshapewear_ur.png",  link: "/products?category=shapewear" },
              { src: "https://cdn.zivame.com/media/v3/loungewearset1_ur.png",  link: "/products?category=nightwear" },
              { src: "https://cdn.zivame.com/media/v3/straplessbra_ur.png",    link: "/products?category=bras" },
            ].map((s, i) => (
              <Link key={i} to={s.link} style={{ flexShrink: 0, width: 182 }}>
                <img src={s.src} alt={`Shopper ${i + 1}`}
                  width={300} height={190}
                  style={{ width: "100%", borderRadius: "1.5rem", marginBottom: "0.5rem", display: "block" }} />
              </Link>
            ))}
          </div>
          <div className="flex justify-center items-center gap-2 mt-4">
            <button onClick={() => document.getElementById('shoppers-slider')?.scrollBy({ left: -200, behavior: 'smooth' })}>
              <img src="https://cdn.zivame.com/media/home-icons/Left.svg" alt="<" width={40} height={40} />
            </button>
            <button onClick={() => document.getElementById('shoppers-slider')?.scrollBy({ left: 200, behavior: 'smooth' })}>
              <img src="https://cdn.zivame.com/media/home-icons/Right.svg" alt=">" width={40} height={40} />
            </button>
          </div>
        </div>
      </section>


      {/* ── 17. Zivame Blogs ─────────────────────────────────────────── */}
      <section className="bg-white py-8 mb-8">
        <div style={{ padding: "0 10rem" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xl font-bold text-gray-900">
              Zivame blogs
              <a href="https://www.zivame.com/blog/v1/" target="_blank" rel="noreferrer"
                className="text-gray-700 ml-2">&gt;</a>
            </p>
          </div>
          <div className="flex gap-0.5 mb-6">
            <div className="h-0.5 w-16 bg-gray-900" />
            <div className="h-0.5 w-3 bg-gray-900" />
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              {
                img: "https://cdn.zivame.com/media/v3/desktopcoverimage_4_260925.jpg",
                tag: "Fashion",
                title: "How to Style Bralette as Outerwear for the Festive Season",
                date: "August 7, 2025",
                author: "Tanya Agarwal",
                link: "https://www.zivame.com/blog/v1/bralette/",
              },
              {
                img: "https://cdn.zivame.com/media/v3/desktopcoverimage_240925_1.jpg",
                tag: "Fashion, Fitness, Lifestyle",
                title: "Is Pickleball the New Social Club? Here's How to Dress for the Scene",
                date: "September 1, 2025",
                author: "Ria Bothra",
                link: "https://www.zivame.com/blog/v1/is-pickleball-the-new-social-club-find-the-outfits-the-serve/",
              },
              {
                img: "https://cdn.zivame.com/media/v3/desktopcoverimage_240925_3.jpg",
                tag: "Fashion, Lifestyle",
                title: "This National Wellness Month, Try the OG Wellness Routine, Not Matcha or Coffee",
                date: "September 5, 2025",
                author: "Shriya Supreeth",
                link: "https://www.zivame.com/blog/v1/team-conrad-or-team-jeremiah-style-picks-for-every-crush-ft-belly-iconic/",
              },
            ].map((b, i) => (
              <div key={i} className="flex flex-col">
                <a href={b.link} target="_blank" rel="noreferrer">
                  <img src={b.img} alt={b.title}
                    width={382} height={266}
                    style={{
                      width: "100%", borderRadius: "1.5rem", display: "block",
                      boxShadow: "3px 8px 12px 0px rgba(219,219,219,0.39)",
                      backgroundColor: "rgb(253,251,239)",
                    }} />
                </a>
                <div className="mt-3 mb-2">
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{b.tag}</span>
                </div>
                <a href={b.link} target="_blank" rel="noreferrer">
                  <p className="text-base font-semibold text-gray-900 leading-snug mb-2">{b.title}</p>
                </a>
                <p className="text-xs text-gray-500">{b.date} · By {b.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
 
      {/* ── 18. Top Categories Grid ───────────────────────────────────── */}
      <section className="mb-8">
        {/* Row 1 — full width banner */}
        <a href="/products">
          <img src="https://cdn.zivame.com/media/v3/Topcategories_blocklayout_desk_120326_01.gif"
            alt="Top Categories" className="w-full block"
            style={{ aspectRatio: "12.5 / 1" }} />
        </a>

        {/* Row 2 — 5 equal columns */}
        <div style={{ display: "flex", width: "100%" }}>
          {[
            { src: "https://cdn.zivame.com/media/v3/Topcategories_blocklayout_desk_120326_02.gif", link: "/products?category=bras" },
            { src: "https://cdn.zivame.com/media/v3/Topcategories_blocklayout_desk_120326_03.gif", link: "/products?category=panties" },
            { src: "https://cdn.zivame.com/media/v3/Topcategories_blocklayout_desk_120326_04.gif", link: "/products?category=nightwear" },
            { src: "https://cdn.zivame.com/media/v3/Topcategories_blocklayout_desk_120326_05.gif", link: "/products?category=activewear" },
            { src: "https://cdn.zivame.com/media/v3/Topcategories_blocklayout_desk_120326_06.gif", link: "/products?category=shapewear" },
          ].map((c, i) => (
            <Link key={i} to={c.link} style={{ display: "inline-block", width: "20%", flexShrink: 0 }}>
              <img src={c.src} alt={`Category ${i + 2}`} className="w-full block"
                style={{ aspectRatio: "2.2 / 1" }} />
            </Link>
          ))}
        </div>

        {/* Row 3 — 6 equal columns */}
        <div style={{ display: "flex", width: "100%" }}>
          {[
            { src: "https://cdn.zivame.com/media/v3/Topcategories_blocklayout_desk_120326_07.gif", link: null },
            { src: "https://cdn.zivame.com/media/v3/Topcategories_blocklayout_desk_120326_08.gif", link: "/products" },
            { src: "https://cdn.zivame.com/media/v3/Topcategories_blocklayout_desk_120326_09.gif", link: "/products?sort=popularity" },
            { src: "https://cdn.zivame.com/media/v3/Topcategories_blocklayout_desk_120326_10.gif", link: "/products" },
            { src: "https://cdn.zivame.com/media/v3/Topcategories_blocklayout_desk_120326_11.gif", link: "/products" },
            { src: "https://cdn.zivame.com/media/v3/Topcategories_blocklayout_desk_120326_12.gif", link: null },
          ].map((c, i) => (
            c.link
              ? <Link key={i} to={c.link} style={{ display: "inline-block", width: "16.6667%", flexShrink: 0 }}>
                  <img src={c.src} alt={`Category ${i + 7}`} className="w-full block"
                    style={{ aspectRatio: "1.48 / 1" }} />
                </Link>
              : <div key={i} style={{ display: "inline-block", width: "16.6667%", flexShrink: 0 }}>
                  <img src={c.src} alt="" className="w-full block"
                    style={{ aspectRatio: "1.48 / 1" }} />
                </div>
          ))}
        </div>
      </section>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </main>
  );
}