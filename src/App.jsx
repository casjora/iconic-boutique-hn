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
import Customers from './pages/Customers';
import AboutUs from './components/AboutUs';
import { Loader2, ShieldAlert, ShoppingBag, Users, X, ExternalLink } from 'lucide-react';
import ScrollToTop from './components/ScrollToTop';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    currentView, setView, restoreSession, fetchProducts, fetchOrders, 
    fetchTelegramConfig, checkingSession, user, initTheme, initRealtime,
    fetchCustomers, hasNewOrdersAlert, hasNewRegistrationsAlert,
    clearNewOrdersAlert, clearNewRegistrationsAlert,
    orders, customers
  } = useStore();

  // Keep track of the last path we synchronized to prevent infinite routing loops
  const lastPathRef = useRef(null);

  // Consolidated routing and view state synchronization
  useEffect(() => {
    if (checkingSession) return;

    const path = location.pathname.substring(1) || 'home';
    const isCategoryPath = path.startsWith('category/');
    const normalizedPath = isCategoryPath ? 'catalog' : path;

    const validViews = ['home', 'catalog', 'favorites', 'cart', 'login', 'forgot-password', 'update-password', 'dashboard', 'inventory', 'showroom', 'barcodes', 'config', 'orders', 'about-us', 'customers'];
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
    initRealtime();
    const initApp = async () => {
      await restoreSession();
      await fetchProducts();
      await fetchOrders();
      await fetchTelegramConfig();

      const currentUser = useStore.getState().user;
      if (currentUser && (currentUser.role === 'owner' || currentUser.role === 'dueño' || currentUser.role === 'vendedor')) {
        await fetchCustomers();
      }
    };
    initApp();

    // Backup periodic polling (60s) as fallback for WebSockets
    const interval = setInterval(async () => {
      // Only query if the document/tab is active to prevent unneeded database queries
      if (document.hidden) return;

      const currentUser = useStore.getState().user;
      const isStaff = currentUser && (currentUser.role === 'owner' || currentUser.role === 'dueño' || currentUser.role === 'vendedor');

      // Standard clients and guests don't need active polling on a minute interval.
      // They rely on WebSockets, and can manually refresh or rely on initial load.
      if (!isStaff) return;

      await fetchProducts();
      await fetchOrders();
      await fetchCustomers();
    }, 60000); // Poll every 60s as background sync fallback for managing staff

    return () => clearInterval(interval);
  }, [restoreSession, fetchProducts, fetchOrders, fetchTelegramConfig, initRealtime, fetchCustomers]);

  // Handle page component routing
  const renderView = () => {
    const isOwnerOrVendedor = user && (user.role === 'owner' || user.role === 'dueño' || user.role === 'vendedor');
    const isOwner = user && (user.role === 'owner' || user.role === 'dueño');

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
        if (!isOwnerOrVendedor) {
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
        if (!isOwnerOrVendedor) {
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
        if (!isOwnerOrVendedor) {
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
        if (!isOwnerOrVendedor) {
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
        if (!isOwnerOrVendedor) {
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
        if (!isOwner) {
          return (
            <div className="max-w-md mx-auto text-center py-16 space-y-4">
              <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
              <h2 className="font-display text-xl font-bold text-neutral-900 uppercase">Acceso Denegado</h2>
              <p className="text-xs text-neutral-500 leading-relaxed">Solo el dueño de la boutique puede modificar los parámetros del bot de Telegram.</p>
            </div>
          );
        }
        return <Config />;
      case 'customers':
        if (!isOwnerOrVendedor) {
          return (
            <div className="max-w-md mx-auto text-center py-16 space-y-4">
              <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
              <h2 className="font-display text-xl font-bold text-neutral-900 uppercase">Acceso Denegado</h2>
              <p className="text-xs text-neutral-500 leading-relaxed">No tienes los permisos necesarios para gestionar los perfiles de clientes.</p>
            </div>
          );
        }
        return <Customers />;
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

  const isStaff = user && (user.role === 'owner' || user.role === 'vendedor');
  const pendingOrdersCount = (orders || []).filter(o => o.status === 'pendiente').length;
  const pendingRegistrationsCount = (customers || []).filter(c => !c.role || c.role === 'pendiente' || c.role === 'usuario' || c.role === 'cliente').length;

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

      {/* Floating Notifications Toast Stack */}
      {isStaff && (hasNewOrdersAlert || hasNewRegistrationsAlert) && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-[90vw] sm:w-full animate-bounce-short">
          
          {/* Order Toast */}
          {hasNewOrdersAlert && pendingOrdersCount > 0 && (
            <div className="bg-white dark:bg-neutral-900 border-l-4 border-rose-500 rounded-lg shadow-[0_10px_30px_rgba(244,63,94,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-4 border border-neutral-100 dark:border-neutral-800 transition-all duration-300 relative overflow-hidden group">
              {/* Glowing Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent pointer-events-none" />
              
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-20"></span>
                    <ShoppingBag className="h-5 w-5 animate-pulse" />
                  </span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                      Nuevo Pedido Recibido
                    </h4>
                    <button 
                      onClick={clearNewOrdersAlert} 
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                      title="Cerrar notificación"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 leading-snug">
                    Se ha registrado una nueva orden. Hay <span className="text-rose-600 dark:text-rose-400 font-black font-mono text-sm">{pendingOrdersCount}</span> pedido(s) en espera de aprobación.
                  </p>
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setView('orders');
                        clearNewOrdersAlert();
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-md transition-all flex items-center gap-1 shadow-sm"
                    >
                      Revisar Pedidos
                      <ExternalLink className="h-3 w-3" />
                    </button>
                    <button
                      onClick={clearNewOrdersAlert}
                      className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 font-bold text-[10px] uppercase tracking-wider px-2 py-1.5 rounded-md transition-all"
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Registration Toast */}
          {hasNewRegistrationsAlert && pendingRegistrationsCount > 0 && (
            <div className="bg-white dark:bg-neutral-900 border-l-4 border-amber-500 rounded-lg shadow-[0_10px_30px_rgba(245,158,11,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-4 border border-neutral-100 dark:border-neutral-800 transition-all duration-300 relative overflow-hidden group">
              {/* Glowing Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
              
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-20"></span>
                    <Users className="h-5 w-5 animate-pulse" />
                  </span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      Nuevo Registro
                    </h4>
                    <button 
                      onClick={clearNewRegistrationsAlert} 
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                      title="Cerrar notificación"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 leading-snug">
                    Un nuevo cliente se ha registrado. Hay <span className="text-amber-600 dark:text-amber-400 font-black font-mono text-sm">{pendingRegistrationsCount}</span> perfil(es) en espera de asignación de tarifa.
                  </p>
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setView('customers');
                        clearNewRegistrationsAlert();
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-md transition-all flex items-center gap-1 shadow-sm"
                    >
                      Asignar Tarifas
                      <ExternalLink className="h-3 w-3" />
                    </button>
                    <button
                      onClick={clearNewRegistrationsAlert}
                      className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 font-bold text-[10px] uppercase tracking-wider px-2 py-1.5 rounded-md transition-all"
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Footer */}
      <footer className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 py-8 print:hidden transition-colors duration-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-widest">
            Iconic Boutique HN
          </p>

          {/* Enlaces a Redes Sociales */}
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            <a
              href="https://www.facebook.com/profile.php?id=61557724910199&ref=NONE_xav_ig_profile_page_web#"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors flex items-center gap-1"
            >
              Facebook
            </a>
            <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline">
              •
            </span>
            <a
              href="https://www.instagram.com/iconicboutiquehn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors flex items-center gap-1"
            >
              Instagram
            </a>
            <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline">
              •
            </span>
            <a
              href="https://wa.me/50498309309"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 font-bold transition-colors flex items-center gap-1"
            >
              WhatsApp (+504 9830-9309)
            </a>
          </div>

          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-semibold max-w-md mx-auto leading-relaxed">
            Distribuidores de perfumería y fragancias 100% originales de
            diseñador en Honduras. Ubicados en Torre Metrópolis, Tegucigalpa.
          </p>

          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 text-[10px] text-neutral-400 dark:text-neutral-500 font-semibold font-mono">
            &copy; {new Date().getFullYear()} Iconic Boutique. Todos los
            derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
