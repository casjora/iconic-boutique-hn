import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import Navbar from './components/Navbar';

// Import Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Catalog from './pages/Catalog';
import Ofertas from './pages/Ofertas';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Config from './pages/Config';
import Cart from './pages/Cart';
import Barcodes from './pages/Barcodes';
import Dashboard from './pages/Dashboard';
import Favorites from './pages/Favorites';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';

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
  const { fetchProducts, fetchOrders, fetchTelegramConfig, restoreSession, checkingSession } = useStore();

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

  return (
    <Router>
      <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
        
        {/* Navigation bar Header */}
        <Navbar />

        {/* Main Content stage area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
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
            <Route path="/ofertas" element={<Ofertas />} />
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
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest font-mono">
              © {new Date().getFullYear()} Iconic Boutique HN • Tegucigalpa, Honduras
            </p>
            <p className="text-[10px] text-neutral-400 mt-1 max-w-lg mx-auto leading-relaxed">
              Importación directa de fragancias 100% originales sella de las marcas más prestigiosas de diseñador. Cotizaciones automáticas, pedidos mayoristas VIP y facturación profesional en Lempiras (HNL).
            </p>
          </div>
        </footer>

      </div>
    </Router>
  );
}
