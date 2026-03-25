// src/components/layout/Footer.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

export const Footer: React.FC = () => {
  const [seoExpanded, setSeoExpanded] = useState(false);

  return (
    <div className="bg-white">

      {/* ── SEO Section ───────────────────────────────────────────────── */}
      <div
        className="text-center uppercase font-semibold text-sm py-3 px-4 mb-2 cursor-pointer flex items-center justify-center gap-2 border-t border-gray-200"
        onClick={() => setSeoExpanded(!seoExpanded)}
      >
        Learn more about zivame
        <img
          src="https://cdn.zivame.com/media/home-icons/chevron-up.svg"
          alt="^"
          className="w-4 h-4"
          style={{ transform: seoExpanded ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.3s" }}
        />
      </div>

      {seoExpanded && (
        <div className="max-w-6xl mx-auto px-6 pb-6 text-sm text-gray-700 leading-relaxed">
          <h2 className="font-bold text-base mt-4 mb-2">Top Lingerie Brand in India</h2>
          <p className="mb-3">Zivame was founded in 2011 with the vision of helping women shop for ladies inner wear comfortably without any embarrassment. The brand continues to grow and innovate, bringing women a wide selection of comfortable women's lingerie.</p>
          <h2 className="font-bold text-base mt-4 mb-2">Online Shopping For Women's Clothing &amp; Lingerie</h2>
          <p className="mb-3">The women's lingerie collection of Zivame never fails to impress. Choose from bras, panties, plus-size lingerie, maternity wear, sleepwear, lingerie sets, activewear, shapewear, and more.</p>
          <h3 className="font-bold mt-4 mb-2">Bras</h3>
          <p className="mb-3">Say goodbye to bra woes and pick from stylish, comfortable bras on Zivame. Our collection includes sports bras, t-shirt bras, wired bras, non-wired bras, maternity bras, strapless bras, padded, non-padded, bralettes, seamless bras, and more.</p>
          <h3 className="font-bold mt-4 mb-2">Panties</h3>
          <p className="mb-3">A panty is an essential part of a woman's wardrobe. We have a wide range of beautiful panty designs available to fit all shapes and sizes. Available in styles, colors, and fits, you can find the perfect panty to pair with all your outfits.</p>
          <h3 className="font-bold mt-4 mb-2">Nightwear</h3>
          <p className="mb-3">Comfortable nightwear is important for a good night's sleep. We bring you pajama sets, night dresses, babydoll dresses, and loungewear made with soft and classy fabrics like satin, cotton, and lace.</p>
          <h3 className="font-bold mt-4 mb-2">Shapewear</h3>
          <p className="mb-3">On Zivame, you can find a wide collection of shapewear like tummy tuckers, high compression shapewear, thigh shapers, saree shapewear, bodysuits, and more.</p>
          <h3 className="font-bold mt-4 mb-2">Activewear</h3>
          <p className="mb-3">Designed for maximum comfort and support during high-intensity workouts, pick from dry skin-fit pants, sports bras, fitting shorts, tights, tops, and more.</p>
          <h3 className="font-bold mt-4 mb-2">Why Choose Zivame As Your Lingerie Brand?</h3>
          <p className="mb-3">Zivame is your one-stop destination for high-quality lingerie online. With so many different lingerie types available for women, you can never run out of options.</p>
        </div>
      )}

      {/* ── Main Footer ───────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-4 gap-8">

            {/* Brand / About */}
            <div className="col-span-1">
              <Link to="/" className="inline-block mb-3">
                <img src="https://cdn.zivame.com/live/images/zivame-logo-2019.png" alt="Zivame" className="h-8 w-auto" />
              </Link>
              <p className="text-xs text-gray-500 leading-relaxed mb-2">
                Buy Bras, Panties, Nightwear, Swimwear, Sportswear &amp; Apparel from Zivame - The Online Lingerie &amp; Fashion Destination in India
              </p>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                You'll love our beautifully crafted bras, panties, nightwear &amp; accessories. Use our bra size calculator to get your best fit.
              </p>
              {/* Social icons */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { src: "https://cdn.zivame.com/config/fb@3x.png",        href: "https://www.facebook.com/zivame",            alt: "Facebook" },
                  { src: "https://cdn.zivame.com/config/twitter@3x.png",   href: "https://twitter.com/zivame",                 alt: "Twitter" },
                  { src: "https://cdn.zivame.com/config/insta@3x.png",     href: "https://www.instagram.com/officialzivame",   alt: "Instagram" },
                  { src: "https://cdn.zivame.com/config/pintrest@3x.png",  href: "https://in.pinterest.com/zivameofficial",    alt: "Pinterest" },
                  { src: "https://cdn.zivame.com/config/wiki@3x.png",      href: "https://www.zivame.com/blog/v1/",            alt: "Blog" },
                  { src: "https://cdn.zivame.com/config/yt@3x.png",        href: "https://www.youtube.com/user/Zivame",        alt: "YouTube" },
                  { src: "https://cdn.zivame.com/config/linkedin@3x.png",  href: "https://www.linkedin.com/company/2502040",   alt: "LinkedIn" },
                ].map(({ src, href, alt }) => (
                  <a key={alt} href={href} target="_blank" rel="noopener noreferrer">
                    <img src={src} alt={alt} className="w-7 h-7 object-contain" />
                  </a>
                ))}
              </div>
              {/* App store badges */}
              <div className="flex gap-2">
                <a href="https://itunes.apple.com/in/app/zivame/id1065767207" target="_blank" rel="noopener noreferrer">
                  <img src="https://cdn.zivame.com/config/app-store-apple@3x.png" alt="App Store" className="h-8 w-auto" />
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.zivame.consumer" target="_blank" rel="noopener noreferrer">
                  <img src="https://cdn.zivame.com/config/google-play-badge@3x.png" alt="Play Store" className="h-8 w-auto" />
                </a>
              </div>
            </div>

            {/* Top Categories */}
            <div>
              <h4 className="uppercase font-semibold text-xs text-gray-800 mb-4 tracking-wider">Top Categories</h4>
              <ul className="space-y-2">
                {[
                  { label: "New Arrivals",   to: "/products" },
                  { label: "Bras",           to: "/products?category=bras" },
                  { label: "Nightwear",      to: "/products?category=nightwear" },
                  { label: "Activewear",     to: "/products?category=activewear" },
                  { label: "Panties",        to: "/products?category=panties" },
                  { label: "Shapewear",      to: "/products?category=shapewear" },
                  { label: "Camisoles",      to: "/products?category=camisoles" },
                  { label: "Maternity Wear", to: "/products" },
                  { label: "Lingerie Sets",  to: "/products?category=bras&tags=lingerie+set" },
                  { label: "Lingerie Sale",  to: "/products" },
                  { label: "Top Lingerie Brand", to: "/" },
                ].map(({ label, to }) => (
                  <li key={label}>
                    <Link to={to} className="text-xs text-gray-500 hover:text-[#f05a78] transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Help & Discover */}
            <div>
              <h4 className="uppercase font-semibold text-xs text-gray-800 mb-4 tracking-wider">Help &amp; Support</h4>
              <ul className="space-y-2 mb-6">
                {[
                  "Contact Us", "Shipping Policy", "Privacy Policy",
                  "Terms & Conditions", "Returns & Exchange Policy",
                  "Track your Order", "Discreet Packaging",
                  "Payment Policy", "Customer Support",
                ].map((label) => (
                  <li key={label}>
                    <a href="#" className="text-xs text-gray-500 hover:text-[#f05a78] transition-colors">{label}</a>
                  </li>
                ))}
              </ul>

              <h4 className="uppercase font-semibold text-xs text-gray-800 mb-4 tracking-wider">Discover Zivame</h4>
              <ul className="space-y-2">
                {[
                  { label: "About Zivame",         href: "#" },
                  { label: "Blogs",                href: "https://www.zivame.com/blog/v1/" },
                  { label: "Bra Size Calculator",  href: "#" },
                  { label: "Shop By Sizes",        href: "#" },
                  { label: "Shop By Colours",      href: "#" },
                  { label: "Zivame Store Locator", href: "#" },
                  { label: "Sell on Zivame",       href: "#" },
                  { label: "Own A Franchise",      href: "#" },
                  { label: "Careers",              href: "#" },
                  { label: "FAQs",                 href: "#" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-[#f05a78] transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Get in Touch + Payment */}
            <div>
              <h4 className="font-semibold text-xs text-gray-800 mb-4 tracking-wider uppercase">Get in touch</h4>
              <ul className="space-y-1.5 text-xs text-gray-500 mb-6">
                <li className="font-medium text-gray-700">Reliance Retail Limited</li>
                <li>3rd Floor, Court House,</li>
                <li>Lokmanya Tilak Marg,</li>
                <li>Dhobi Talao, Mumbai - 400 002</li>
                <li className="mt-2">
                  Phone:{" "}
                  <a href="tel:08040245577" className="text-[#f05a78]">080-40245577</a>
                  {" / "}
                  <a href="tel:08069305577" className="text-[#f05a78]">080-69305577</a>
                </li>
                <li>
                  Email:{" "}
                  <a href="mailto:feedback@zivame.com" className="text-[#f05a78]">feedback@zivame.com</a>
                </li>
                <li>CIN: U01100MH1999PLC120563</li>
              </ul>

              <h4 className="uppercase font-semibold text-xs text-gray-800 mb-2 tracking-wider">Pay Using</h4>
              <img src="https://cdn.zivame.com/config/bank-cards@3x.png" alt="Payment methods" className="h-8 w-auto mb-4" />

              <p className="text-xs font-semibold text-gray-700 mb-1">100% Secured Payment</p>
              <img src="https://cdn.zivame.com/live/images/pci-2x-01.png" alt="PCI Secured" className="h-8 w-auto" />
            </div>

          </div>
        </div>

        {/* Black copyright bar */}
        <div className="bg-black text-center py-3">
          <p className="text-xs text-gray-400">© Copyright {new Date().getFullYear()} Zivame. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};