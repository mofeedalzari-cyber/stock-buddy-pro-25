import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { toast } from "sonner";

// استيراد المزودات (Providers)
import { WarehouseProvider } from "@/contexts/WarehouseContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ArmoryProvider } from "@/contexts/ArmoryContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

// استيراد المكونات والصفحات
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import ProductsPage from "@/pages/ProductsPage";
import CategoriesPage from "@/pages/CategoriesPage";
import WarehousesPage from "@/pages/WarehousesPage";
import SuppliersPage from "@/pages/SuppliersPage";
import ClientsPage from "@/pages/ClientsPage";
import MovementsPage from "@/pages/movements/MovementsPage";
import SettingsPage from "@/pages/SettingsPage";
import ReportsPage from "@/pages/movements/ReportsPage"; // ✅ تم تعديل المسار
import LoginPage from "@/pages/LoginPage";
import NotFound from "./pages/NotFound";
import ArmoryPage from "./pages/ArmoryPage";

const queryClient = new QueryClient();

// مكون إدارة زر الرجوع في أجهزة الأندرويد
const BackButtonManager = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let listener: any;
    CapacitorApp.addListener('backButton', () => {
      if (location.pathname === '/' || location.pathname === '/login') {
        CapacitorApp.exitApp();
      } else {
        navigate(-1);
      }
    }).then(l => { listener = l; });
    return () => { listener?.remove(); };
  }, [location, navigate]);
  return null;
};

// المكون المسؤول عن المسارات المحمية (بعد تسجيل الدخول)
const ProtectedRoutes = () => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <WarehouseProvider>
      <ArmoryProvider>
        <AppLayout>
          <BackButtonManager />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/warehouses" element={<WarehousesPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/movements" element={<MovementsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/armory" element={<ArmoryPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </ArmoryProvider>
    </WarehouseProvider>
  );
};

// مكون مسار تسجيل الدخول
const LoginRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return (
    <>
      <BackButtonManager />
      <LoginPage />
    </>
  );
};

// المكون الرئيسي للتطبيق
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
