import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from './store';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Favorites from './pages/Favorites';
import Cart from './pages/Cart';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Barcodes from './pages/Barcodes';
import Config from './pages/Config';
import Orders from './pages/Orders';
import Showroom from './pages/Showroom';
import AboutUs from './components/AboutUs';
import { Loader2, ShieldAlert } from 'lucide-react';
import ScrollToTop from './components/ScrollToTop';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    currentView, setView, restoreSession, fetchProducts, fetchOrders, 
    fetchTelegramConfig, checkingSession, user, initTheme 
  } = useStore();

  // Keep track of the last path we synchronized to prevent infinite routing loops
  const lastPathRef = useRef(null);

  // Consolidated routing and view state synchronization
  useEffect(() => {
    if (checkingSession) return;

    const path = location.pathname.substring(1) || 'home';
    const isCategoryPath = path.startsWith('category/');
    const normalizedPath = isCategoryPath ? 'catalog' : path;

    const validViews = ['home', 'catalog', 'favorites', 'cart', 'login', 'forgot-password', 'update-password', 'dashboard', 'inventory', 'showroom', 'barcodes', 'config', 'orders', 'about-us'];
    const targetView = validViews.includes(normalizedPath) ? normalizedPath : 'home';

    if (location.pathname !== lastPathRef.current) {
      // Scenario 1: Router-driven change (URL changed first)
      lastPathRef.current = location.pathname;
      if (currentView !== targetView) {
        setView(targetView);
      }
    } else {
      // Scenario 2: Store-driven change (Store changed first, e.g. login/logout)
      const isPathMatchingView = isCategoryPath ? (currentView === 'catalog') : (path === currentView);
      if (!isPathMatchingView) {
        navigate('/' + currentView);
        lastPathRef.current = '/' + currentView;
      }
    }
  }, [location.pathname, currentView, checkingSession, setView, navigate]);

  useEffect(() => {
    initTheme();
    const initApp = async () => {
      await restoreSession();
      await fetchProducts();
      await fetchOrders();
      await fetchTelegramConfig();
    };
    initApp();

    // Setup periodic polling of products and orders for real-time inventory updates
    const interval = setInterval(async () => {
      await fetchProducts();
      await fetchOrders();
    }, 45000); // Poll every 45s

    return () => clearInterval(interval);
  }, [restoreSession, fetchProducts, fetchOrders, fetchTelegramConfig]);

  // Handle page component routing
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <Home />;
      case 'about-us':
        return <AboutUs />;
      case 'catalog':
        return <Catalog />;
      case 'favorites':
        return <Favorites />;
      case 'cart':
        return <Cart />;
      case 'login':
        return <Login />;
      case 'forgot-password':
        return <ForgotPassword />;
      case 'update-password':
        return <UpdatePassword />;
      case 'dashboard':
        // Check permission: Owner or Seller (vendedor doesn't see cost metrics)
        if (!user || (user.role !== 'owner' && user.role !== 'vendedor')) {
          return (
            <div className="max-w-md mx-auto text-center py-16 space-y-4">
              <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
              <h2 className="font-display text-xl font-bold text-neutral-900 uppercase">Acceso Denegado</h2>
              <p className="text-xs text-neutral-500 leading-relaxed">No posees los permisos necesarios para ver el panel de control.</p>
            </div>
          );
        }
        return <Dashboard />;
      case 'inventory':
        // Check permission: Owner or Seller
        if (!user || (user.role !== 'owner' && user.role !== 'vendedor')) {
          return (
            <div className="max-w-md mx-auto text-center py-16 space-y-4">
              <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
              <h2 className="font-display text-xl font-bold text-neutral-900 uppercase">Acceso Denegado</h2>
              <p className="text-xs text-neutral-500 leading-relaxed">No posees los permisos necesarios para gestionar el inventario de fragancias.</p>
            </div>
          );
        }
        return <Inventory />;
      case 'showroom':
        if (!user || (user.role !== 'owner' && user.role !== 'vendedor')) {
          return (
            <div className="max-w-md mx-auto text-center py-16 space-y-4">
              <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
              <h2 className="font-display text-xl font-bold text-neutral-900 uppercase">Acceso Denegado</h2>
              <p className="text-xs text-neutral-500 leading-relaxed">No posees los permisos necesarios para modificar la curaduría del plan público.</p>
            </div>
          );
        }
        return <Showroom />;
      case 'orders':
        // Check permission: Owner or Seller
        if (!user || (user.role !== 'owner' && user.role !== 'vendedor')) {
          return (
            <div className="max-w-md mx-auto text-center py-16 space-y-4">
              <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
              <h2 className="font-display text-xl font-bold text-neutral-900 uppercase">Acceso Denegado</h2>
              <p className="text-xs text-neutral-500 leading-relaxed">No posees los permisos necesarios para ver los pedidos.</p>
            </div>
          );
        }
        return <Orders />;
      case 'barcodes':
        if (!user || (user.role !== 'owner' && user.role !== 'vendedor')) {
          return (
            <div className="max-w-md mx-auto text-center py-16 space-y-4">
              <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
              <h2 className="font-display text-xl font-bold text-neutral-900 uppercase">Acceso Denegado</h2>
              <p className="text-xs text-neutral-500 leading-relaxed">No posees los permisos necesarios para generar códigos de barra.</p>
            </div>
          );
        }
        return <Barcodes />;
      case 'config':
        if (!user || user.role !== 'owner') {
          return (
            <div className="max-w-md mx-auto text-center py-16 space-y-4">
              <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
              <h2 className="font-display text-xl font-bold text-neutral-900 uppercase">Acceso Denegado</h2>
              <p className="text-xs text-neutral-500 leading-relaxed">Solo el dueño de la boutique puede modificar los parámetros del bot de Telegram.</p>
            </div>
          );
        }
        return <Config />;
      default:
        return <Home />;
    }
  };

  if (checkingSession) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-neutral-900 dark:text-amber-400" />
        <div className="text-center space-y-1">
          <h2 className="font-display font-black text-xs uppercase tracking-widest text-neutral-800 dark:text-neutral-200">Cargando Iconic Boutique HN</h2>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold">Verificando sesión segura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors duration-200">
      {/* Top sticky Navigation Header */}
      <Navbar />

      {/* Main Container Wrapper */}
      <main id="print-area-wrapper" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {renderView()}
      </main>

      {/* Floating Scroll To Top Button */}
      <ScrollToTop />

      {/* Footer */}
      <footer className="bg-neutral-900 dark:bg-neutral-900 border-t border-neutral-800 py-12 text-white print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-display text-lg font-bold mb-4 tracking-wider">ICONIC BOUTIQUE</h3>
              <p className="text-sm text-neutral-400">Perfumes importados 100% originales. Encuentra las mejores marcas al mejor precio.</p>
            </div>
            <div>
              <h4 className="font-display text-sm font-bold mb-4 tracking-wider uppercase">Categorías</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><button onClick={() => setView('catalog')} className="hover:text-amber-400 cursor-pointer">Damas</button></li>
                <li><button onClick={() => setView('catalog')} className="hover:text-amber-400 cursor-pointer">Caballeros</button></li>
                <li><button onClick={() => setView('catalog')} className="hover:text-amber-400 cursor-pointer">Sets / Estuches</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display text-sm font-bold mb-4 tracking-wider uppercase">Ubicación</h4>
              <p className="text-sm text-neutral-400 mb-2">📍 Torre Metrópolis, Tegucigalpa, Honduras</p>
              <p className="text-sm text-neutral-400">🛍️ Atendiendo con cita previa</p>
            </div>
            <div>
              <h4 className="font-display text-sm font-bold mb-4 tracking-wider uppercase">Contacto Directo</h4>
              <p className="text-sm text-neutral-400 mb-2">💬 WhatsApp: +504 9900-0000</p>
              <p className="text-sm text-neutral-400">📸 Instagram: @iconicboutique.hn</p>
            </div>
          </div>
          <div className="border-t border-neutral-800 mt-12 pt-8 text-center text-xs text-neutral-500">
            &copy; {new Date().getFullYear()} ICONIC BOUTIQUE. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
