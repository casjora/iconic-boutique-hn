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

// Auth Guard Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useStore();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
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
  const { fetchProducts, fetchOrders, fetchTelegramConfig } = useStore();

  useEffect(() => {
    // Initial fetch from backend APIs
    fetchProducts();
    fetchTelegramConfig();
    fetchOrders();
  }, []);

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
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/ofertas" element={<Ofertas />} />
            <Route path="/cart" element={<Cart />} />
            
            {/* Employee Protected Routes */}
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
                <ProtectedRoute allowedRoles={['owner', 'vendedor']}>
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
