import React, { useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import Navbar from './components/Navbar';

// Use lazy() to defer non-critical JavaScript until the route is visited
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Orders = lazy(() => import('./pages/Orders'));
const Config = lazy(() => import('./pages/Config'));
const Cart = lazy(() => import('./pages/Cart'));
const Favorites = lazy(() => import('./pages/Favorites'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'));

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Barcodes = lazy(() => import('./pages/Barcodes'));

// Auth Guard Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useStore();
  
  console.log('[ProtectedRoute] Checking access for path:', window.location.hash || window.location.pathname, 'User:', user, 'AllowedRoles:', allowedRoles);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Normalize 'dueño' and 'owner' to be completely interchangeable
  const userRole = user.role;
  const normalizedUserRole = userRole === 'dueño' ? 'owner' : userRole;
  const normalizedAllowedRoles = (allowedRoles || []).map(r => r === 'dueño' ? 'owner' : r);

  if (allowedRoles && !normalizedAllowedRoles.includes(normalizedUserRole)) {
    console.warn('[ProtectedRoute] Access Denied! Redirecting to home. Normalized user role:', normalizedUserRole, 'Allowed normalized roles:', normalizedAllowedRoles);
    return <Navigate to="/" replace />;
  }
  return children;
};

// Public Only Wrapper (for Login)
const PublicOnlyRoute = ({ children }) => {
  const { user } = useStore();
  if (user) {
    return <Navigate to="/catalog" replace />;
  }
  return children;
};

export default function App() {
  const { fetchProducts, fetchOrders, fetchTelegramConfig, restoreSession, checkingSession, user, logout, resendVerification, error, setError, loading } = useStore();
  const [resendSuccess, setResendSuccess] = React.useState(false);

  useEffect(() => {
    const init = async () => {
      // First try to restore existing session
      await restoreSession();
      // Fetch backend data
      fetchProducts();
      fetchTelegramConfig();
      fetchOrders();
    };
    init();
  }, []);

  const handleResend = async () => {
    if (!user?.email) return;
    setResendSuccess(false);
    const ok = await resendVerification(user.email);
    if (ok) {
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 10000);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="mt-4 text-xs font-semibold text-neutral-500 uppercase tracking-widest font-mono">
            Iconic Boutique HN
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Cargando sesión...
          </p>
        </div>
      </div>
    );
  }

  if (user && !user.emailConfirmed) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="w-full max-w-md space-y-6 bg-white p-10 rounded-3xl shadow-sm border border-neutral-200 text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
          </div>
          <h2 className="text-2xl font-black font-display text-neutral-900 tracking-tight">Valida tu correo electrónico</h2>
          <p className="text-sm text-neutral-500 font-medium leading-relaxed">
            Hemos enviado un enlace de confirmación a tu dirección de correo:
          </p>
          <p className="font-mono text-xs font-extrabold text-neutral-950 bg-neutral-100 py-3 px-4 rounded-xl border border-neutral-200 break-all select-all">
            {user.email}
          </p>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Por seguridad de nuestra comunidad mayorista, debes validar tu cuenta antes de acceder al catálogo de perfumes, precios mayoristas y realizar cotizaciones en Honduras.
          </p>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start justify-between gap-2.5 relative">
              <span className="text-left">{error}</span>
              <button onClick={() => setError(null)} className="text-rose-500 font-bold ml-1 focus:outline-none cursor-pointer">✕</button>
            </div>
          )}

          {resendSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              ¡Enlace de verificación reenviado! Revisa tu bandeja de entrada y spam.
            </div>
          )}

          <div className="space-y-3 pt-4 border-t border-neutral-100">
            <button
              onClick={handleResend}
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent text-xs font-bold uppercase tracking-wide rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-all disabled:opacity-75 cursor-pointer"
            >
              {loading ? 'Reenviando...' : 'Reenviar Confirmación'}
            </button>

            <button
              onClick={() => logout()}
              className="w-full flex justify-center py-3.5 px-4 border border-neutral-200 text-xs font-bold uppercase tracking-wide rounded-xl text-neutral-600 bg-white hover:bg-neutral-50 transition-all cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
        
        {/* Navigation bar Header */}
        <Navbar />

        {/* Main Content stage area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-24">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
              <p className="mt-4 text-xs font-semibold text-neutral-500 uppercase tracking-widest font-mono">Cargando módulo...</p>
            </div>
          }>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route 
                path="/login" 
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                } 
              />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/cart" element={<Cart />} />
              
              {/* Employee Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['owner', 'vendedor']}>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/inventory" 
                element={
                  <ProtectedRoute allowedRoles={['owner', 'vendedor']}>
                    <Inventory />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/orders" 
                element={
                  <ProtectedRoute allowedRoles={['owner', 'vendedor', 'client']}>
                    <Orders />
                  </ProtectedRoute>
                } 
              />

              {/* Owner Protected Routes */}
              <Route 
                path="/barcodes" 
                element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <Barcodes />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/config" 
                element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <Config />
                  </ProtectedRoute>
                } 
              />

              {/* Fallback Catch-All */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-neutral-200 py-8 text-center no-print space-y-4">
          <div className="flex justify-center gap-6 text-xs font-semibold text-neutral-600">
            <a 
              href="https://www.facebook.com/profile.php?id=61557724910199&ref=NONE_xav_ig_profile_page_web#" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-neutral-900 transition-colors flex items-center gap-1"
            >
              Facebook
            </a>
            <a 
              href="https://www.instagram.com/iconicboutiquehn/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-neutral-900 transition-colors flex items-center gap-1"
            >
              Instagram
            </a>
            <a 
              href="https://wa.me/50498309309" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors flex items-center gap-1"
            >
              WhatsApp Business (+504 9830-9309)
            </a>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-widest font-mono">
              © {new Date().getFullYear()} Iconic Boutique HN • Tegucigalpa, Honduras
            </p>
            <p className="text-[10px] text-neutral-600 mt-1 max-w-lg mx-auto leading-relaxed">
              Importación directa de fragancias 100% originales sella de las marcas más prestigiosas de diseñador. Cotizaciones automáticas, pedidos mayoristas VIP y facturación profesional en Lempiras (HNL).
            </p>
          </div>
        </footer>

      </div>
    </Router>
  );
}
