// src/components/product/SizeGuide.tsx
import React, { useState } from "react";
import { X, Ruler } from "lucide-react";

interface SizeGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const BRA_SIZES = [
  { band: "32", cups: ["A", "B", "C", "D", "DD"], underbust: "73–78", overbust: { A: "83–85", B: "85–87", C: "87–90", D: "90–92", DD: "92–95" } },
  { band: "34", cups: ["A", "B", "C", "D", "DD"], underbust: "78–83", overbust: { A: "88–90", B: "90–92", C: "92–95", D: "95–97", DD: "97–100" } },
  { band: "36", cups: ["A", "B", "C", "D", "DD"], underbust: "83–88", overbust: { A: "93–95", B: "95–97", C: "97–100", D: "100–103", DD: "103–106" } },
  { band: "38", cups: ["A", "B", "C", "D"],       underbust: "88–93", overbust: { A: "98–101", B: "101–104", C: "104–107", D: "107–110", DD: "–" } },
  { band: "40", cups: ["B", "C", "D"],             underbust: "93–98", overbust: { A: "–", B: "106–109", C: "109–112", D: "112–115", DD: "–" } },
];

const PANTY_SIZES = [
  { size: "XS", waist: "58–62", hip: "84–88" },
  { size: "S",  waist: "62–68", hip: "88–92" },
  { size: "M",  waist: "68–74", hip: "92–96" },
  { size: "L",  waist: "74–80", hip: "96–102" },
  { size: "XL", waist: "80–88", hip: "102–108" },
  { size: "2XL",waist: "88–96", hip: "108–116" },
];

export const SizeGuide: React.FC<SizeGuideProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<"bra" | "panty">("bra");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl 
          max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Ruler size={20} className="text-pink-600" />
            <h2 className="text-lg font-black text-gray-900">Size Guide</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {(["bra", "panty"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 px-1 mr-6 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-pink-600 text-pink-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "bra" ? "Bra Sizes" : "Panty / Bottom Sizes"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {/* Measurement instructions */}
          <div className="bg-pink-50 rounded-xl p-4 mb-5">
            <h3 className="font-semibold text-pink-900 text-sm mb-2">How to measure</h3>
            {tab === "bra" ? (
              <ul className="text-sm text-pink-800 space-y-1.5">
                <li><strong>Underbust (band size):</strong> Measure snugly just below your bust, parallel to the ground.</li>
                <li><strong>Overbust (cup size):</strong> Measure loosely across the fullest part of your bust.</li>
                <li><strong>Cup size</strong> = Overbust − Underbust (every 2–2.5 cm = one cup size).</li>
              </ul>
            ) : (
              <ul className="text-sm text-pink-800 space-y-1.5">
                <li><strong>Waist:</strong> Measure around your natural waistline (narrowest point).</li>
                <li><strong>Hip:</strong> Measure around the widest part of your hips/seat.</li>
              </ul>
            )}
          </div>

          {/* Bra size table */}
          {tab === "bra" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold rounded-l-xl">Band</th>
                    <th className="text-left py-3 px-3 text-gray-700 font-semibold">Underbust (cm)</th>
                    <th className="text-left py-3 px-3 text-gray-700 font-semibold">Cup A</th>
                    <th className="text-left py-3 px-3 text-gray-700 font-semibold">Cup B</th>
                    <th className="text-left py-3 px-3 text-gray-700 font-semibold">Cup C</th>
                    <th className="text-left py-3 px-3 text-gray-700 font-semibold">Cup D</th>
                    <th className="text-left py-3 px-3 text-gray-700 font-semibold rounded-r-xl">Cup DD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {BRA_SIZES.map((row) => (
                    <tr key={row.band} className="hover:bg-pink-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-pink-600">{row.band}</td>
                      <td className="py-3 px-3 text-gray-600">{row.underbust}</td>
                      {(["A", "B", "C", "D", "DD"] as const).map((cup) => (
                        <td key={cup} className={`py-3 px-3 ${row.cups.includes(cup) ? "text-gray-700" : "text-gray-300"}`}>
                          {row.overbust[cup] || "–"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-3">All measurements in centimetres (cm).</p>
            </div>
          )}

          {/* Panty size table */}
          {tab === "panty" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold rounded-l-xl">Size</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Waist (cm)</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold rounded-r-xl">Hip (cm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {PANTY_SIZES.map((row) => (
                    <tr key={row.size} className="hover:bg-pink-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-pink-600">{row.size}</td>
                      <td className="py-3 px-4 text-gray-700">{row.waist}</td>
                      <td className="py-3 px-4 text-gray-700">{row.hip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-3">All measurements in centimetres (cm).</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
