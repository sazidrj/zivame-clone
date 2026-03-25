// src/pages/NotFoundPage.tsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="text-8xl mb-6 select-none">🔍</div>
      <h1 className="text-4xl font-black text-gray-900 mb-3">Page not found</h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        Looks like this page wandered off. Let's get you back to shopping.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="border-2 border-gray-200 text-gray-700 font-semibold px-5 py-2.5
            rounded-xl hover:border-gray-300 transition-colors text-sm"
        >
          ← Go Back
        </button>
        <Link
          to="/"
          className="bg-pink-600 hover:bg-pink-700 text-white font-semibold px-5 py-2.5
            rounded-xl transition-colors text-sm"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
