// src/components/common/FindYourFit.tsx
import React, { useState } from "react";
import { X, ChevronDown, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = ["About Your Bra", "Band Fit", "Cups Fit", "Result"];

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="px-5 py-4 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-3 left-3 right-3 h-0.5 bg-gray-200 z-0" />
        <div className="absolute top-3 left-3 h-0.5 bg-[#f05a78] z-0 transition-all duration-500"
          style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-col items-center z-10" style={{ minWidth: 60 }}>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold
              ${i <= step ? "bg-[#f05a78] border-[#f05a78] text-white" : "bg-white border-gray-300 text-gray-400"}`}>
              {i < step ? "✓" : ""}
            </div>
            <span className={`text-[9px] text-center mt-1 leading-tight
              ${i <= step ? "text-[#f05a78] font-semibold" : "text-gray-400"}`}>
              {s}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple SVG body silhouettes
function ClosedSetSVG() {
  return (
    <svg viewBox="0 0 120 130" className="w-full h-28 mx-auto" fill="none">
      <ellipse cx="60" cy="48" rx="18" ry="20" fill="#f5b8a0"/>
      <ellipse cx="38" cy="82" rx="20" ry="24" fill="#f5b8a0"/>
      <ellipse cx="82" cy="82" rx="20" ry="24" fill="#f5b8a0"/>
      <line x1="60" y1="66" x2="60" y2="112" stroke="#555" strokeWidth="1.5" strokeDasharray="3,2"/>
      <text x="60" y="126" textAnchor="middle" fontSize="9" fill="#666">gap &lt; 1 finger</text>
    </svg>
  );
}
function WideSetSVG() {
  return (
    <svg viewBox="0 0 120 130" className="w-full h-28 mx-auto" fill="none">
      <ellipse cx="60" cy="48" rx="18" ry="20" fill="#f5b8a0"/>
      <ellipse cx="30" cy="84" rx="22" ry="24" fill="#f5b8a0"/>
      <ellipse cx="90" cy="84" rx="22" ry="24" fill="#f5b8a0"/>
      <line x1="52" y1="72" x2="52" y2="112" stroke="#555" strokeWidth="1" strokeDasharray="3,2"/>
      <line x1="68" y1="72" x2="68" y2="112" stroke="#555" strokeWidth="1" strokeDasharray="3,2"/>
      <text x="60" y="126" textAnchor="middle" fontSize="9" fill="#666">gap 2+ fingers</text>
    </svg>
  );
}
function FullBreastSVG() {
  return (
    <svg viewBox="0 0 80 120" className="w-20 h-28 mx-auto" fill="none">
      <ellipse cx="40" cy="42" rx="12" ry="13" fill="#f5b8a0"/>
      <path d="M30 55 Q14 72 18 98 Q26 118 50 116 Q66 112 66 92 Q68 68 54 56 Z" fill="#f5b8a0"/>
      <path d="M54 58 Q68 70 66 92" stroke="#aaa" strokeWidth="1" strokeDasharray="3,2"/>
    </svg>
  );
}
function ShallowBreastSVG() {
  return (
    <svg viewBox="0 0 80 120" className="w-20 h-28 mx-auto" fill="none">
      <ellipse cx="40" cy="42" rx="12" ry="13" fill="#f5b8a0"/>
      <path d="M30 55 Q18 76 22 100 Q30 116 50 114 Q62 110 62 93 Q62 74 54 58 Z" fill="#f5b8a0"/>
      <path d="M54 58 Q62 74 62 93" stroke="#aaa" strokeWidth="1" strokeDasharray="3,2"/>
    </svg>
  );
}
function FirmBreastSVG() {
  return (
    <svg viewBox="0 0 80 120" className="w-20 h-28 mx-auto" fill="none">
      <ellipse cx="40" cy="42" rx="12" ry="13" fill="#f5b8a0"/>
      <path d="M28 56 Q16 70 20 94 Q28 116 52 113 Q66 108 65 88 Q66 66 55 56 Z" fill="#f5b8a0"/>
      <line x1="55" y1="73" x2="66" y2="73" stroke="#aaa" strokeWidth="1.5" strokeDasharray="3,2"/>
    </svg>
  );
}
function SaggingBreastSVG() {
  return (
    <svg viewBox="0 0 80 120" className="w-20 h-28 mx-auto" fill="none">
      <ellipse cx="40" cy="42" rx="12" ry="13" fill="#f5b8a0"/>
      <path d="M30 56 Q16 76 16 104 Q22 122 48 120 Q64 118 64 100 Q66 78 54 60 Z" fill="#f5b8a0"/>
      <line x1="54" y1="86" x2="66" y2="89" stroke="#aaa" strokeWidth="1.5" strokeDasharray="3,2"/>
    </svg>
  );
}

// Image placeholder component — shows a grey box with label until real image is uploaded
function ImgPlaceholder({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="w-full h-28 bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-xs text-gray-400 text-center px-2">{alt}</span>
      </div>
    );
  }
  return (
    <img src={src} alt={alt} onError={() => setErr(true)}
      className="w-full h-28 object-contain rounded-lg" />
  );
}

// To add real images, save them to frontend/public/fitquiz/ and update the imgSrc paths below
const QUESTIONS = [
  {
    step: 1,
    heading: "Now let's talk about how your bra fits",
    question: "How does the band of your bra fit?",
    key: "band_fit",
    options: [
      { value: "digging",      label: "Band is digging in",           desc: "It leaves marks or too tight to slide a finger under the band", imgSrc: "/FindYourFit/band-tight.webp" },
      { value: "rides_up",     label: "Band rides up",                desc: "It rides up in the back or moves when I raise my arms",        imgSrc: "/FindYourFit/Band-riding-up.webp" },
      { value: "spills_below", label: "Breasts spill below the band", desc: "Breasts are spilling out from below the band when I move",     imgSrc: "/FindYourFit/Spilling-bottom_1.webp" },
      { value: "fits",         label: "Band fits fine",               desc: "It sits in place and feels comfortable",                       imgSrc: "/FindYourFit/Band-fine.webp" },
    ],
  },
  {
    step: 1,
    heading: "",
    question: "How do the wires of your bra fit?",
    key: "wire_fit",
    options: [
      { value: "poke_sides",    label: "Wires poke into the breasts tissue on the sides", desc: "", imgSrc: "/FindYourFit/wire-pressing.webp" },
      { value: "poke_underarms",label: "Wires poke into the skin under my arms",          desc: "", imgSrc: "/FindYourFit/wire-digging-up_1.webp" },
      { value: "crossing",      label: "Wires are crossing each other in the middle",     desc: "", imgSrc: "/FindYourFit/wires-crossing_1.webp" },
      { value: "fits",          label: "Wires fit fine",                                  desc: "They follow the breast root perfectly", imgSrc: "/FindYourFit/Cups-fine.webp" },
    ],
  },
  {
    step: 2,
    heading: "",
    question: "How does the cup of your bra fit?",
    key: "cup_fit",
    options: [
      { value: "spilling_top",   label: "Spilling from the top",   desc: "Breasts spill out from the top of the bra",                   imgSrc: "/FindYourFit/Cup-spillage.webp" },
      { value: "spilling_sides", label: "Spilling from the sides", desc: "Breasts spill out from the sides of the bra",                 imgSrc: "/FindYourFit/side-spillage.webp" },
      { value: "gaping_top",     label: "Gaping at the top",       desc: "There are gaps between the breast and the cup",               imgSrc: "/FindYourFit/Cup-gaping.webp" },
      { value: "wrinkling",      label: "Cup is wrinkling",        desc: "The cup fabric is loose and wrinkling",                       imgSrc: "/FindYourFit/Fabric-wrinkling_1.webp" },
      { value: "fits",           label: "Cups fit fine",           desc: "Cups completely fit my breasts with no spillage or gaping",   imgSrc: "/FindYourFit/Cups-fine.webp" },
    ],
  },
  {
    step: 2,
    heading: "Now let's talk about your breast shape.",
    subheading: "The shape of your breasts can tell you which bra style is best suited for you.",
    question: "",
    key: "breast_shape_intro",
    isInfo: true,
  },
  {
    step: 2,
    heading: "(Choose the closest answer)",
    question: "How firm are your breasts?",
    key: "breast_firmness",
    options: [
      { value: "firm",    label: "Firm",    desc: "My breasts are firm. They don't sag", imgSrc: "/FindYourFit/firm_profile_1.webp"  },
      { value: "sagging", label: "Sagging", desc: "My breasts are not firm. They sag",    imgSrc: "/FindYourFit/settled_profile_1.webp",
        tip: "Tip: Most women have sagging breasts. If you are one of them, a bra with some lift is a must-have!" },
    ],
  },
  {
    step: 2,
    heading: "(Choose the closest answer)",
    question: "Are your breasts full at the top?",
    key: "breast_fullness",
    options: [
      { value: "full",    label: "Full",    desc: "Breasts are full at the top and the bottom",                        imgSrc: "/FindYourFit/full_profile.webp" },
      { value: "shallow", label: "Shallow", desc: "Breasts are not full at the top. They are full only at the bottom", imgSrc: "/FindYourFit/shallow_profile_1.webp" },
    ],
  },
  {
    step: 2,
    heading: "(Choose the closest answer)",
    question: "How much gap is there between your breasts?",
    key: "breast_gap",
    options: [
      { value: "close", label: "Close set", desc: "I have a gap of one finger or less",  imgSrc: "/FindYourFit/closeset_profile.webp" },
      { value: "wide",  label: "Wide set",  desc: "I have a gap of two fingers or more", imgSrc: "/FindYourFit/separated_profile.webp" },
    ],
  },
];

export const FindYourFit: React.FC<Props> = ({ isOpen, onClose }) => {
  const [phase, setPhase] = useState<"intro" | "quiz" | "result">("intro");
  const [step, setStep] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string>("");
  const [bandSize, setBandSize] = useState("34");
  const [cupSize, setCupSize] = useState("D");
  const [brand, setBrand] = useState("");
  const [underwire, setUnderwire] = useState("");
  const [strapFit, setStrapFit] = useState("");

  const BAND_SIZES = ["28","30","32","34","36","38","40","42","44","46"];
  const CUP_SIZES  = ["A","B","C","D","DD","E","F","G"];
  const BRANDS     = ["Amante","Enamor","Jockey","Lovable","Triumph","Zivame","Other"];

  const currentQ = QUESTIONS[questionIndex];

  function getRecommendation() {
    const recs: string[] = [];
    if (answers.band_fit === "digging")      recs.push("Try a bigger band size (e.g. go from 34 to 36)");
    if (answers.band_fit === "rides_up")     recs.push("Try a smaller band size for a firmer fit");
    if (answers.wire_fit === "poke_sides")   recs.push("Try a non-wired bra for more comfort");
    if (answers.cup_fit === "spilling_top" || answers.cup_fit === "spilling_sides") recs.push("Try a bigger cup size");
    if (answers.cup_fit === "gaping_top")   recs.push("Try a smaller cup size");
    if (answers.breast_fullness === "shallow") recs.push("Demi-cup or balconette bras work great for you");
    if (answers.breast_firmness === "sagging") recs.push("Look for full-coverage or sag-lift bras");
    if (answers.breast_gap === "wide")       recs.push("Bras with a wider centre gore are ideal for you");
    if (recs.length === 0)                   recs.push("Your current bra size seems to fit perfectly!");
    return recs;
  }

  const handleNext = () => {
    if (selected) setAnswers(prev => ({ ...prev, [currentQ.key]: selected }));
    setSelected("");
    if (questionIndex < QUESTIONS.length - 1) {
      const next = QUESTIONS[questionIndex + 1];
      setStep(next.step);
      setQuestionIndex(questionIndex + 1);
    } else {
      setStep(3);
      setPhase("result");
    }
  };

  const handleBack = () => {
    if (questionIndex > 0) {
      const prev = QUESTIONS[questionIndex - 1];
      setStep(prev.step);
      setQuestionIndex(questionIndex - 1);
      setSelected("");
    } else {
      setPhase("intro");
      setStep(0);
    }
  };

  const handleReset = () => {
    setPhase("intro"); setStep(0); setQuestionIndex(0);
    setAnswers({}); setSelected(""); setBandSize("34");
    setCupSize("D"); setBrand(""); setUnderwire(""); setStrapFit("");
  };

  function renderSVG(svgType?: string) {
    switch (svgType) {
      case "close":   return <ClosedSetSVG />;
      case "wide":    return <WideSetSVG />;
      case "full":    return <FullBreastSVG />;
      case "shallow": return <ShallowBreastSVG />;
      case "firm":    return <FirmBreastSVG />;
      case "sagging": return <SaggingBreastSVG />;
      default:        return null;
    }
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />}

      <div className={`fixed top-0 right-0 h-full w-[360px] bg-white z-50 flex flex-col
        transform transition-transform duration-300 ease-in-out shadow-2xl
        ${isOpen ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-black text-white flex-shrink-0">
          {phase === "quiz"
            ? <button onClick={handleBack} className="text-white hover:text-gray-300"><ChevronLeft size={20} /></button>
            : <div className="w-5" />}
          <span className="font-bold text-xs tracking-widest uppercase">My Zivame Perfect Fit</span>
          <button onClick={onClose} className="text-white hover:text-gray-300"><X size={18} /></button>
        </div>

        {/* ── INTRO ── */}
        {phase === "intro" && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6 bg-[#f05a78]">
            <div>
              <p className="text-white font-light text-3xl italic" style={{ fontFamily: "Georgia, serif" }}>Find Your</p>
              <p className="text-white font-black text-5xl uppercase tracking-tight">PERFECT FIT</p>
              <p className="text-white/90 text-sm font-semibold tracking-widest uppercase mt-3">IN JUST 30 SECONDS</p>
              <p className="text-white/80 text-xs mt-1">(No measuring tape!)</p>
            </div>
            <div className="w-16 h-px bg-white/30" />
            <div>
              <p className="text-white font-light text-3xl italic" style={{ fontFamily: "Georgia, serif" }}>Find Your</p>
              <p className="text-white font-black text-5xl uppercase tracking-tight">PERFECT FIT</p>
            </div>
            <button onClick={() => { setPhase("quiz"); setStep(0); setQuestionIndex(0); }}
              className="mt-2 w-full bg-white text-gray-900 font-bold text-sm uppercase tracking-widest py-4 rounded-full hover:bg-gray-100 transition-colors">
              LET'S START &gt;
            </button>
          </div>
        )}

        {/* ── QUIZ ── */}
        {phase === "quiz" && (
          <>
            <ProgressBar step={step} />
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Step 0: About Your Bra */}
              {step === 0 && (
                <>
                  <p className="text-sm font-semibold text-gray-800">Tell us about your best fitting bra</p>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-medium text-gray-700">What size is it?</p>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <select value={bandSize} onChange={e => setBandSize(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm appearance-none bg-white focus:outline-none focus:border-pink-400">
                          {BAND_SIZES.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
                      </div>
                      <div className="relative flex-1">
                        <select value={cupSize} onChange={e => setCupSize(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm appearance-none bg-white focus:outline-none focus:border-pink-400">
                          {CUP_SIZES.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Don't know your size?</p>
                    <button className="text-xs text-[#f05a78] font-medium">Use a measuring tape instead &gt;</button>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-medium text-gray-700">What brand is your bra?</p>
                    <div className="relative">
                      <select value={brand} onChange={e => setBrand(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm appearance-none bg-white focus:outline-none focus:border-pink-400">
                        <option value="" disabled>Select brand</option>{BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Does your bra have underwires?</p>
                    {["Yes", "No", "I Don't Know"].map(opt => (
                      <button key={opt} onClick={() => setUnderwire(opt)}
                        className={`w-full py-2.5 rounded-full border-2 text-sm font-medium transition-all
                          ${underwire === opt ? "border-[#f05a78] bg-pink-50 text-[#f05a78]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        {opt}
                      </button>
                    ))}
                  </div>

                  {/* Strap fit — shown inline on step 0, same as original */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">How do your straps fit?</p>
                    {[
                      { value: "digging",  label: "They dig in",   desc: "I often have marks on my shoulders",        imgSrc: "/FindYourFit/Straps-digging.webp" },
                      { value: "slip_off", label: "They slip off", desc: "I have to adjust them often",               imgSrc: "/FindYourFit/Straps-falling.webp" },
                      { value: "fits",     label: "They fit fine", desc: "My straps fit comfortably on my shoulders", imgSrc: "/FindYourFit/Straps-fine.webp" },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => setStrapFit(opt.value)}
                        className={`w-full border-2 rounded-xl overflow-hidden text-left transition-all
                          ${strapFit === opt.value ? "border-[#f05a78] bg-pink-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                        <div className="px-4 pt-3">
                          <ImgPlaceholder src={opt.imgSrc} alt={opt.label} />
                        </div>
                        <div className="px-4 pb-3 pt-2 text-center">
                          <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Info screen */}
            {step > 0 && currentQ?.isInfo && (
            <div className="space-y-4">
                <p className="text-base font-bold text-gray-900">{currentQ.heading}</p>
                <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">{currentQ.subheading}</p>
                </div>
                <div className="flex flex-col items-center py-2">
                <ImgPlaceholder src="/FindYourFit/camigirl.webp" alt="Stand in front of a mirror" />
                <p className="text-xs text-gray-500 text-center mt-3">
                    Note: For best results, wear a cami / slip without a bra. Stand in front of a mirror.
                </p>
                </div>
            </div>
            )}

              {/* Regular question */}
              {step > 0 && !currentQ?.isInfo && (
                <div className="space-y-3">
                  {currentQ?.heading && <p className="text-xs text-gray-500 font-medium">{currentQ.heading}</p>}
                  <p className="text-sm font-semibold text-gray-800">{currentQ?.question}</p>
                  <div className="space-y-3">
                    {currentQ?.options?.map((opt: any) => (
                      <button key={opt.value} onClick={() => setSelected(opt.value)}
                        className={`w-full border-2 rounded-xl overflow-hidden text-left transition-all
                          ${selected === opt.value ? "border-[#f05a78] bg-pink-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                        {opt.svgType ? (
                          <div className="px-4 pt-4">{renderSVG(opt.svgType)}</div>
                        ) : (
                          <div className="px-4 pt-3">
                            <ImgPlaceholder src={opt.imgSrc || ""} alt={opt.label} />
                          </div>
                        )}
                        <div className="px-4 pb-3 pt-2 text-center">
                          <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
                          {opt.desc && <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>}
                          {opt.tip && <p className="text-xs text-gray-400 mt-2 italic">{opt.tip}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Next button */}
            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
              {step === 0 ? (
                <button onClick={() => { setStep(1); setQuestionIndex(0); }}
                  className="w-full bg-[#f05a78] text-white font-bold py-3.5 rounded-full hover:bg-[#d94a68] transition-colors text-sm uppercase tracking-wide">
                  Next
                </button>
              ) : currentQ?.isInfo ? (
                <button onClick={handleNext}
                  className="w-full bg-[#f05a78] text-white font-bold py-3.5 rounded-full hover:bg-[#d94a68] transition-colors text-sm uppercase tracking-wide">
                  Next
                </button>
              ) : (
                <button onClick={handleNext} disabled={!selected}
                  className={`w-full font-bold py-3.5 rounded-full transition-colors text-sm uppercase tracking-wide
                    ${selected ? "bg-[#f05a78] text-white hover:bg-[#d94a68]" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                  Next
                </button>
              )}
            </div>
          </>
        )}

        {/* ── RESULT ── */}
        {phase === "result" && (
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-xl font-black text-gray-900">Your Perfect Fit</h2>
              <p className="text-sm text-gray-500 mt-1">Based on your answers</p>
            </div>
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Recommended Size</p>
              <p className="text-3xl font-black text-[#f05a78]">{bandSize}{cupSize}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-gray-800">Our suggestions for you:</p>
              {getRecommendation().map((r, i) => (
                <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
                  <span className="text-[#f05a78] font-bold text-sm">✓</span>
                  <p className="text-sm text-gray-700">{r}</p>
                </div>
              ))}
            </div>
            <Link to="/products?category=bras" onClick={onClose}
              className="block w-full bg-[#f05a78] text-white font-bold py-4 rounded-full text-center text-sm uppercase tracking-wide hover:bg-[#d94a68] transition-colors">
              Shop Your Perfect Fit
            </Link>
            <button onClick={handleReset} className="w-full text-gray-500 text-sm underline text-center py-2">
              Retake Quiz
            </button>
          </div>
        )}
      </div>
    </>
  );
};