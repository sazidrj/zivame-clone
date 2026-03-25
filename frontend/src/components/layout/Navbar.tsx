// src/components/layout/Navbar.tsx
import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Heart, Bell, User, Menu, X, ChevronDown, LogOut } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";
import { AuthModal } from "../auth/AuthModal";
import { FindYourFit } from "../common/FindYourFit";

const TOP_LINKS = [
  { label: "Blogs",              href: "#" },
  { label: "Track/Return Order", href: "/orders" },
  { label: "Contact Us",         href: "#" },
  { label: "Our Stores",         href: "#" },
  { label: "Sell on Zivame",     href: "#" },
  { label: "Own a Franchise",    href: "#" },
];

// ── Mega menu data ────────────────────────────────────────────────────────────
const MEGA_MENUS: Record<string, { heading: string; items: string[] }[]> = {
  Bras: [
    {
      heading: "BY COLLECTION",
      items: ["Innovation","Love Potion","Bridal Bras","Enchanted","Dream Catcher","Lingerie Sets","Miracle Bras","Unbound Bras","La Flamme","Marshmallow Bra","Freeform Bras","@ Work"],
    },
    {
      heading: "BY PREFERENCES",
      items: ["Bra Solutions","Padded Bra","Non Padded Bra","Non Wired Bra","Wired Bra","Front Open Bra","Push Up Bra","Full Coverage Bra","Medium Coverage Bra","Low Coverage Bra","Solid Bra","Printed Bra"],
    },
    {
      heading: "BY STYLE",
      items: ["T-Shirt Bras","Curvy / Super Support","Strapless Bras","Minimiser Bras","Backless Bras / Transparent Bra","Home Bras","Slip On Bra / Bralette","Lace Bra","Maternity Bras","No sag bra","Pretty Back Bras","Teens / Beginner Bra","OH SO SEXY!","Sports Bras","Blouze Bra","Post Surgical / Mastectomy"],
    },
    {
      heading: "BY BRANDS",
      items: ["Zivame","Rosaline By Zivame","Marks & Spencer","Amante","Triumph"],
    },
    {
      heading: "BY OCCASION",
      items: ["Summer","Everyday","Holiday / Vacation","Bridal","Luxe"],
    },
  ],
  Sleepwear: [
    {
      heading: "BY STYLE",
      items: ["Padded Tops","Cotton Nightwear","Nightwear Sets","Nightdresses","Pyjamas","Capris & Shorts","Sleep Top","Nightgown","Nightwear with In-Built Slip-On Bra","Babydolls","Shrugs, Wraps & Robes"],
    },
    {
      heading: "BY SETS",
      items: ["All Sets","Pyjama Sets","Capri Sets","Shorts Sets"],
    },
    {
      heading: "BY COLLECTION",
      items: ["Character Shop","2 Miles","Florals","Satin","Winter"],
    },
    {
      heading: "BY BRANDS",
      items: ["Zivame","Marks & Spencer"],
    },
  ],
  Activewear: [
    {
      heading: "BY CATEGORY",
      items: ["Sports Bras","High Impact Sports Bra","Athleisure","Medium Impact Sports Bra","Tank tops & Tshirts","Leggings","Joggers & Pants","Capri & Shorts","Jackets & Sweatshirts","Plus Size Sports Bra"],
    },
    {
      heading: "BY ACTIVITY",
      items: ["Gym Wear","Dance & Zumba","Yoga","Running & Walking","Cycling","Swim","Travel"],
    },
    {
      heading: "BY COLLECTION",
      items: ["High Intensity","Medium Intensity","Low Intensity","Curvy"],
    },
    {
      heading: "BY BRANDS",
      items: ["Zelocity","Rosaline By Zivame","Triumph"],
    },
  ],
  Panties: [
    {
      heading: "BY PREFERENCES",
      items: ["Tummy Tuckers","No Panty Line","Full Coverage","Mid Waist","Low Waist","Boyshorts","Hipsters","Bikini / Cheekini","Maternity","Cotton Panties","Thong / G Strings"],
    },
    {
      heading: "BY COLLECTION",
      items: ["Antimicrobial Panty","Seamless Panties","Shaper Panties","Period Panties"],
    },
    {
      heading: "PACKS & SETS",
      items: ["Single Panty","Pack of 2","Pack of 3","Pack of 5"],
    },
    {
      heading: "BY BRANDS",
      items: ["Zivame","Rosaline","Marks & Spencer","Triumph"],
    },
  ],
  Shapewear: [
    {
      heading: "BY STYLE",
      items: ["Saree Shapewear","Shaper Panties","Thigh Shapers","Shaping Camis & Slips","Waist Cinchers","Shape Series","Firm Series","Smooth Series","Bodysuits"],
    },
    {
      heading: "BY TARGET AREA",
      items: ["Belly / Love Handles","Lower Abdomen","Thigh Shaping","Rear Shaping"],
    },
    {
      heading: "BY CONTROL LEVEL",
      items: ["Low Control","Medium Control","High Control"],
    },
    {
      heading: "BY BRANDS",
      items: ["Zivame","Rosaline","Triumph"],
    },
  ],
  "Bridal Edit": [
    {
      heading: "BY CATEGORY",
      items: ["Bridal Bras","Bridal Lingerie Sets","Honeymoon Lingerie","Bridal Nightwear"],
    },
  ],
  "Camis & Slips": [
    {
      heading: "BY STYLE",
      items: ["Camisoles","Underskirt and Shorts","Kurti Slips"],
    },
  ],
  Maternity: [
    {
      heading: "BY CATEGORY",
      items: ["Maternity Bras","Maternity Panties","Maternity Nightwear","Nursing Bras"],
    },
  ],
  "Zivame Girls": [
    {
      heading: "BY CATEGORY",
      items: ["Girls Bra","Girls Panty / Shorts","Girls Nightwear","Girls Sportswear","Girl Swimwear","Face Masks"],
    },
  ],
};

const CATEGORIES = [
  { name: "New Arrivals",  slug: "new",        highlight: "orange" },
  { name: "Explore",      slug: "bras",       highlight: "orange" },
  { name: "Bras",         slug: "bras",       highlight: "" },
  { name: "Sleepwear",    slug: "nightwear",  highlight: "" },
  { name: "Activewear",   slug: "activewear", highlight: "" },
  { name: "Panties",      slug: "panties",    highlight: "" },
  { name: "Shapewear",    slug: "shapewear",  highlight: "" },
  { name: "Loungewear",   slug: "loungewear",  highlight: "" },
  { name: "Bridal Edit",  slug: "bras",       highlight: "" },
  { name: "Camis & Slips",slug: "camisoles",  highlight: "" },
  { name: "Maternity",    slug: "bras",       highlight: "" },
  { name: "Sale",         slug: "sale",       highlight: "red" },
  { name: "Zivame Girls", slug: "new",        highlight: "" },
];

// ── Mega Menu Dropdown ────────────────────────────────────────────────────────
function MegaMenu({ name, slug }: { name: string; slug: string }) {
  const sections = MEGA_MENUS[name];
  if (!sections) return null;

  const isWide = sections.length >= 4;

  return (
    <div className={`absolute top-full left-0 bg-white shadow-xl border-t-2 border-[#f05a78] z-50 py-6
      ${isWide ? "w-screen max-w-5xl" : "w-72"}`}
      style={{ left: isWide ? "50%" : undefined, transform: isWide ? "translateX(-50%)" : undefined }}
    >
      <div className={`px-8 grid gap-8 ${isWide ? `grid-cols-${Math.min(sections.length, 5)}` : "grid-cols-1"}`}
        style={{ gridTemplateColumns: isWide ? `repeat(${Math.min(sections.length, 5)}, minmax(0, 1fr))` : undefined }}>
        {sections.map(sec => (
          <div key={sec.heading}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              {sec.heading}
            </p>
            <ul className="space-y-2">
              {sec.items.map(item => (
                <li key={item}>
                  <Link
                    to={`/products?category=${slug}&q=${encodeURIComponent(item)}`}
                    className="text-sm text-gray-600 hover:text-[#f05a78] transition-colors block"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { totalItems } = useCartStore();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [showFit, setShowFit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleMouseEnter = (name: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (MEGA_MENUS[name]) setActiveMenu(name);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveMenu(null), 150);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white shadow-sm">

        {/* Top utility bar */}
        <div className="bg-[#fff5f5] border-b border-gray-100">
          <div className="px-6 flex items-center justify-between py-1.5">
            <span className="text-xs text-gray-500 font-medium">Brands on Zivame</span>
            <div className="flex items-center gap-3">
              {TOP_LINKS.map((l, i) => (
                <React.Fragment key={l.label}>
                  {i > 0 && <span className="text-gray-300 text-xs">|</span>}
                  <Link to={l.href} className="text-xs text-gray-500 hover:text-pink-600 transition-colors whitespace-nowrap">
                    {l.label}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Main header */}
        <div className="px-6">
          <div className="flex items-center h-20 gap-4">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 mr-6">
            <img
              src="/logo/logo.webp"
              alt="Zivame"
              className="h-12 w-auto object-contain"
              style={{ minWidth: 140 }}
            />
          </Link>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 hidden md:flex">
              <div className="relative w-full">
                <input type="search" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search for... Bras"
                  className="w-full pl-5 pr-12 py-2.5 bg-white border border-gray-300 rounded-full
                    text-sm focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-200 transition-all" />
                <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-pink-600">
                  <Search size={18} />
                </button>
              </div>
            </form>

            {/* Right icons */}
            <div className="flex items-center gap-5 ml-2">
              <button onClick={() => setShowFit(true)}
                className="hidden md:block px-5 py-2 bg-[#f05a78] text-white text-sm
                  font-semibold rounded-full hover:bg-[#d94a68] transition-colors whitespace-nowrap">
                Find Your Fit
              </button>

              {/* User */}
              {isAuthenticated ? (
                <div className="relative">
                  <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-1 text-gray-700 hover:text-pink-600 transition-colors">
                    <User size={22} strokeWidth={1.5} />
                    <div className="hidden md:block text-left leading-tight">
                      <p className="text-[10px] text-gray-400">Hey</p>
                      <p className="text-sm font-bold">{user?.full_name?.split(" ")[0] || "Beautiful"}</p>
                    </div>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
                      <div className="px-3 py-2 border-b border-gray-100 mb-1">
                        <p className="font-medium text-sm">{user?.full_name || "My Account"}</p>
                        <p className="text-xs text-gray-500">{user?.phone || user?.email}</p>
                      </div>
                      {[
                        { label: "My Orders",   to: "/orders" },
                        { label: "My Wishlist", to: "/wishlist" },
                        { label: "My Profile",  to: "/profile" },
                      ].map(item => (
                        <Link key={item.to} to={item.to} onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600">
                          {item.label}
                        </Link>
                      ))}
                      <button onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50
                          flex items-center gap-2 border-t border-gray-100 mt-1">
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => setShowAuth(true)}
                  className="flex items-center gap-1 text-gray-700 hover:text-pink-600 transition-colors">
                  <User size={22} strokeWidth={1.5} />
                  <div className="hidden md:block text-left leading-tight">
                    <p className="text-[10px] text-gray-400">Hey</p>
                    <p className="text-sm font-bold">Beautiful</p>
                  </div>
                </button>
              )}

              <Link to="/cart" className="relative text-gray-700 hover:text-pink-600 transition-colors">
                <ShoppingCart size={22} strokeWidth={1.5} />
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-pink-600
                    text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </Link>

              <Link to="/wishlist" className="text-gray-700 hover:text-pink-600 transition-colors">
                <Heart size={22} strokeWidth={1.5} />
              </Link>

              <button className="text-gray-700 hover:text-pink-600 transition-colors hidden md:block">
                <Bell size={22} strokeWidth={1.5} />
              </button>

              <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden">
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {/* Category nav with mega menus */}
          <nav className="hidden md:block border-t border-gray-100 relative" onMouseLeave={handleMouseLeave}>
            <div className="flex items-center gap-0 pb-2.5 pt-2" style={{ scrollbarWidth: "none" }}>
              {CATEGORIES.map((cat, i) => (
                <React.Fragment key={cat.name}>
                  {(i === 0 || i === 1 || i === 2) && (
                    <span className="text-gray-300 mx-1 text-sm select-none">|</span>
                  )}
                  <div onMouseEnter={() => handleMouseEnter(cat.name)}>
                    <Link
                      to={`/products?category=${cat.slug}`}
                      className={`text-sm px-2.5 py-2 whitespace-nowrap transition-colors hover:text-pink-600 block
                        ${cat.highlight === "orange" ? "text-[#f05a78] font-semibold" : ""}
                        ${cat.highlight === "red"    ? "text-red-500 font-semibold" : ""}
                        ${cat.highlight === ""       ? "text-gray-700" : ""}
                        ${activeMenu === cat.name    ? "text-[#f05a78]" : ""}
                      `}
                    >
                      {cat.name}
                    </Link>
                  </div>
                </React.Fragment>
              ))}
            </div>
            {/* Mega menu rendered outside the flex row so it's never clipped */}
            {activeMenu && MEGA_MENUS[activeMenu] && (
              <div
                className="absolute left-0 right-0 top-full bg-white shadow-2xl border-t-2 border-[#f05a78] z-50"
                onMouseEnter={() => handleMouseEnter(activeMenu)}
              >
                <div className="max-w-7xl mx-auto px-8 py-6">
                  <div
                    className="grid gap-8"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(MEGA_MENUS[activeMenu].length, 5)}, minmax(0, 1fr))`
                    }}
                  >
                    {MEGA_MENUS[activeMenu].map(sec => (
                      <div key={sec.heading}>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">
                          {sec.heading}
                        </p>
                        <ul className="space-y-2">
                          {sec.items.map(item => (
                            <li key={item}>
                              <Link
                                to={`/products?category=${CATEGORIES.find(c => c.name === activeMenu)?.slug}&tags=${encodeURIComponent(item)}`}
                                className="text-sm text-gray-600 hover:text-[#f05a78] transition-colors block"
                                onClick={() => setActiveMenu(null)}
                              >
                                {item}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input type="search" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none" />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search size={16} />
                </button>
              </div>
            </form>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <Link key={cat.name} to={`/products?category=${cat.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className={`text-sm py-2 px-3 rounded-lg bg-gray-50 hover:bg-pink-50 transition-colors
                    ${cat.highlight === "orange" ? "text-[#f05a78] font-semibold" : ""}
                    ${cat.highlight === "red"    ? "text-red-500 font-semibold" : ""}
                    ${cat.highlight === ""       ? "text-gray-700" : ""}
                  `}>
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      <FindYourFit isOpen={showFit} onClose={() => setShowFit(false)} />
    </>
  );
};