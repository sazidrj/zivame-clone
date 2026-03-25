// src/App.tsx
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { AIAssistant } from "./components/ai/AIAssistant";
import { useAuthStore } from "./store/authStore";
import { useCartStore } from "./store/cartStore";

const HomePage          = React.lazy(() => import("./pages/HomePage"));
const ProductListPage   = React.lazy(() => import("./pages/ProductListPage"));
const ProductDetailPage = React.lazy(() => import("./pages/ProductDetailPage"));
const SearchPage        = React.lazy(() => import("./pages/SearchPage"));
const CartPage          = React.lazy(() => import("./pages/CartPage"));
const CheckoutPage      = React.lazy(() => import("./pages/CheckoutPage"));
const WishlistPage      = React.lazy(() => import("./pages/WishlistPage"));
const ProfilePage       = React.lazy(() => import("./pages/ProfilePage"));
const OrdersPage        = React.lazy(() => import("./pages/OrdersPage"));
const OrderDetailPage   = React.lazy(() => import("./pages/OrderDetailPage"));
const AdminPage         = React.lazy(() => import("./pages/AdminPage"));
const NotFoundPage      = React.lazy(() => import("./pages/NotFoundPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex justify-center items-center min-h-[60vh]">
    <div className="w-8 h-8 border-[3px] border-pink-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/?auth=1" replace />;
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { fetchMe, isAuthenticated } = useAuthStore();
  const { fetchCart } = useCartStore();

  useEffect(() => { fetchMe(); }, []);
  useEffect(() => { if (isAuthenticated) fetchCart(); }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <React.Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/"                 element={<HomePage />} />
            <Route path="/products"         element={<ProductListPage />} />
            <Route path="/products/:slug"   element={<ProductDetailPage />} />
            <Route path="/search"           element={<SearchPage />} />
            <Route path="/cart"             element={<CartPage />} />
            <Route path="/wishlist"         element={<WishlistPage />} />

            {/* Protected */}
            <Route path="/checkout"         element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
            <Route path="/profile"          element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/orders"           element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
            <Route path="/orders/:id"       element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin"            element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*"                 element={<NotFoundPage />} />
          </Routes>
        </React.Suspense>
      </main>

      <Footer />
      <AIAssistant />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: "12px", fontSize: "14px" },
          success: { iconTheme: { primary: "#ec4899", secondary: "white" } },
        }}
      />
    </div>
  );
};

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
