import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Heart, User, LogOut, Settings, Barcode, 
  TrendingUp, ClipboardList, Package, Sparkles, Home, Menu, X, Info,
  Sun, Moon, Eye
} from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { 
    user, cart, logout, currentView, setView, theme, toggleTheme,
    hasNewRegistrationsAlert, hasNewOrdersAlert,
    clearNewRegistrationsAlert, clearNewOrdersAlert,
    customers, orders
  } = useStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  const isOwner = user?.role === 'owner';
  const isVendedor = user?.role === 'vendedor';

  const pendingRegistrationsCount = (customers || []).filter(c => !c.role || c.role === 'pendiente' || c.role === 'usuario' || c.role === 'cliente').length;
  const pendingOrdersCount = (orders || []).filter(o => o.status === 'pendiente').length;

  const handleNav = (view) => {
    navigate('/' + view);
    setMobileMenuOpen(false);
    if (view === 'customers') clearNewRegistrationsAlert();
    if (view === 'orders') clearNewOrdersAlert();
  };

  const navItemClass = (view) => {
    const base = "inline-flex items-center gap-1 px-2 xl:px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 whitespace-nowrap ";
    if (currentView === view) {
      return base + "bg-neutral-900 text-white dark:bg-amber-400 dark:text-neutral-950 shadow-sm";
    }
    return base + "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800";
  };

  const mobileNavItemClass = (view) => {
    const base = "flex items-center gap-2.5 px-4 py-3 text-sm font-bold rounded-xl transition-all cursor-pointer ";
    if (currentView === view) {
      return base + "bg-neutral-900 text-white dark:bg-amber-400 dark:text-neutral-950 shadow";
    }
    return base + "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800";
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-200">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2">
          
          {/* Logo / Title Area */}
          <div className="flex items-center gap-3 xl:gap-6 min-w-0">
            <button 
              onClick={() => handleNav('home')} 
              className="flex items-center gap-2.5 cursor-pointer outline-none group text-left mr-2 xl:mr-6 shrink-0"
            >
              <img 
                className="h-9 w-9 bg-neutral-950 dark:bg-amber-400 text-white dark:text-neutral-950 rounded-xl flex items-center justify-center font-display font-black text-sm tracking-tighter group-hover:scale-105 transition-transform shadow-md object-cover" 
                src="https://nsubmnvkojsmoykfcjgl.supabase.co/storage/v1/object/public/miscelaneas/iconic-icon.jpg" 
                alt="iconic-icon" 
              />
              <div className="leading-none">
                <h1 className="font-['Montserrat',sans-serif] font-black text-sm text-neutral-900 dark:text-neutral-100 uppercase tracking-widest leading-none">
                  ICONIC
                </h1>
                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest leading-none mt-0.5 block">BOUTIQUE</span>
              </div>
            </button>

            {/* Desktop main navigation links */}
            <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
              <button onClick={() => handleNav('home')} className={navItemClass('home')}>
                <Home className="h-3.5 w-3.5" /> Inicio
              </button>
              
              <button onClick={() => handleNav('catalog')} className={navItemClass('catalog')}>
                <Package className="h-3.5 w-3.5" /> Catálogo
              </button>

              <button onClick={() => handleNav('about-us')} className={navItemClass('about-us')}>
                <Info className="h-3.5 w-3.5" /> Nosotros
              </button>

              {user && (
                <button onClick={() => handleNav('favorites')} className={navItemClass('favorites')}>
                  <Heart className="h-3.5 w-3.5" /> Favoritos
                </button>
              )}

              {/* Owner and Seller restricted links */}
              {(isOwner || isVendedor) && (
                <>
                  {isOwner && (
                    <button onClick={() => handleNav('dashboard')} className={navItemClass('dashboard')}>
                      <TrendingUp className="h-3.5 w-3.5" /> Analítica
                    </button>
                  )}

                  <button 
                    onClick={() => handleNav('orders')} 
                    className={`${navItemClass('orders')} relative`}
                  >
                    <ClipboardList className="h-3.5 w-3.5" /> 
                    <span>Pedidos</span>
                    {pendingOrdersCount > 0 && (
                      <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-black tracking-tight ${hasNewOrdersAlert ? 'bg-rose-600 text-white animate-bounce ring-4 ring-rose-500/20 dark:ring-rose-500/40 scale-110 shadow-md' : 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200'}`}>
                        {pendingOrdersCount}
                      </span>
                    )}
                    {hasNewOrdersAlert && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600"></span>
                      </span>
                    )}
                  </button>

                  <button 
                    onClick={() => handleNav('customers')} 
                    className={`${navItemClass('customers')} relative`}
                  >
                    <User className="h-3.5 w-3.5" /> 
                    <span>Clientes</span>
                    {pendingRegistrationsCount > 0 && (
                      <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-black tracking-tight ${hasNewRegistrationsAlert ? 'bg-rose-600 text-white animate-bounce ring-4 ring-rose-500/20 dark:ring-rose-500/40 scale-110 shadow-md' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'}`}>
                        {pendingRegistrationsCount}
                      </span>
                    )}
                    {hasNewRegistrationsAlert && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600"></span>
                      </span>
                    )}
                  </button>

                  <button onClick={() => handleNav('showroom')} className={navItemClass('showroom')}>
                    <Eye className="h-3.5 w-3.5 text-amber-500" /> Plan Público
                  </button>

                  <button onClick={() => handleNav('inventory')} className={navItemClass('inventory')}>
                    <Settings className="h-3.5 w-3.5" /> Inventario
                  </button>

                  <button onClick={() => handleNav('barcodes')} className={navItemClass('barcodes')}>
                    <Barcode className="h-3.5 w-3.5" /> Código Barras
                  </button>

                  {isOwner && (
                    <button onClick={() => handleNav('config')} className={navItemClass('config')}>
                      <Settings className="h-3.5 w-3.5" /> Telegram
                    </button>
                  )}
                </>
              )}
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-400 transition-all cursor-pointer outline-none active:scale-95 shadow-xs"
              aria-label="Cambiar tema"
              title={theme === 'dark' ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
            >
              {theme === 'dark' ? (
                <Sun className="h-4.5 w-4.5 text-amber-400 animate-spin-slow" />
              ) : (
                <Moon className="h-4.5 w-4.5 text-neutral-600" />
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={() => handleNav('cart')}
              className={`relative p-2.5 rounded-xl border transition-all cursor-pointer outline-none ${
                currentView === 'cart'
                  ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-amber-400 dark:border-amber-400 dark:text-neutral-950 shadow-sm'
                  : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
              aria-label="Ver carrito"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-neutral-950 font-mono shadow border-2 border-white dark:border-neutral-900 ring-1 ring-amber-500/20">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Login / user action area */}
            {user ? (
              <div className="hidden sm:flex items-center gap-2 border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 rounded-xl px-2.5 py-1.5">
                <div className="text-left leading-none">
                  <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 block uppercase tracking-widest leading-none">
                    {user.role === "owner"
                      ? "👑 Dueño"
                      : user.role === "vendedor"
                        ? "💼 Vendedor"
                        : user.role=== "mayorista"
                        ?"🏷️ Mayorista"
                        :"🛒 Detalle"}
                  </span>
                  <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 block truncate max-w-[5rem] leading-none mt-0.5">
                    {user.name}
                  </span>
                </div>
                <button
                  onClick={logout}
                  aria-label="Cerrar sesión"
                  className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title="Cerrar Sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNav('login')}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400 dark:text-neutral-950 animate-pulse" />
                Ingresar
              </button>
            )}

            {/* Mobile Menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-xl lg:hidden cursor-pointer active:scale-95 transition-transform"
              aria-label="Menú móvil"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile drawer selection */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3 shadow-lg max-h-[85vh] overflow-y-auto">
          <nav className="flex flex-col gap-1">
            <button onClick={() => handleNav('home')} className={mobileNavItemClass('home')}>
              <Home className="h-4 w-4" /> Inicio
            </button>

            <button onClick={() => handleNav('catalog')} className={mobileNavItemClass('catalog')}>
              <Package className="h-4 w-4" /> Catálogo de Fragancias
            </button>

            <button onClick={() => handleNav('about-us')} className={mobileNavItemClass('about-us')}>
              <Info className="h-4 w-4" /> Nosotros
            </button>

            {user && (
              <button onClick={() => handleNav('favorites')} className={mobileNavItemClass('favorites')}>
                <Heart className="h-4 w-4" /> Mis Favoritos
              </button>
            )}

            {(isOwner || isVendedor) && (
              <div className="border-t border-neutral-100 dark:border-neutral-800 my-2 pt-2 space-y-1">
                <span className="px-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono block mb-1">
                  Panel Administrativo
                </span>
                
                {isOwner && (
                  <button onClick={() => handleNav('dashboard')} className={mobileNavItemClass('dashboard')}>
                    <TrendingUp className="h-4 w-4" /> Analítica
                  </button>
                )}

                <button 
                  onClick={() => handleNav('orders')} 
                  className={`${mobileNavItemClass('orders')} relative w-full text-left flex items-center justify-between`}
                >
                  <span className="flex items-center gap-2.5">
                    <ClipboardList className="h-4 w-4" /> Pedidos y Ventas
                  </span>
                  {pendingOrdersCount > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${hasNewOrdersAlert ? 'bg-rose-600 text-white animate-bounce ring-4 ring-rose-500/20' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}>
                      {pendingOrdersCount}
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => handleNav('customers')} 
                  className={`${mobileNavItemClass('customers')} relative w-full text-left flex items-center justify-between`}
                >
                  <span className="flex items-center gap-2.5">
                    <User className="h-4 w-4" /> Gestión Clientes
                  </span>
                  {pendingRegistrationsCount > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${hasNewRegistrationsAlert ? 'bg-rose-600 text-white animate-bounce ring-4 ring-rose-500/20' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}>
                      {pendingRegistrationsCount}
                    </span>
                  )}
                </button>

                <button onClick={() => handleNav('showroom')} className={mobileNavItemClass('showroom')}>
                  <Eye className="h-4 w-4 text-amber-500" /> Plan Público
                </button>

                <button onClick={() => handleNav('inventory')} className={mobileNavItemClass('inventory')}>
                  <Settings className="h-4 w-4" /> Gestión Inventario
                </button>

                <button onClick={() => handleNav('barcodes')} className={mobileNavItemClass('barcodes')}>
                  <Barcode className="h-4 w-4" /> Códigos de Barra
                </button>

                {isOwner && (
                  <button onClick={() => handleNav('config')} className={mobileNavItemClass('config')}>
                    <Settings className="h-4 w-4" /> Telegram Bot
                  </button>
                )}
              </div>
            )}
          </nav>

          {/* Mobile Login / Theme / User footer actions */}
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 flex flex-col gap-2">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 text-xs font-bold"
            >
              <span className="flex items-center gap-2">
                {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-neutral-600" />}
                Modo {theme === 'dark' ? 'Oscuro Activado' : 'Claro Activado'}
              </span>
              <span className="text-[10px] font-mono text-neutral-400">Cambiar</span>
            </button>

            {user ? (
              <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 border border-neutral-200 dark:border-neutral-800">
                <div className="text-left">
                  <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 block uppercase tracking-widest leading-none">
                    {user.role === 'owner' ? '👑 Dueño' : (user.role === 'vendedor' ? '💼 Vendedor' : (user.role === 'mayorista' ? '🏷️ Mayorista' :'🛒 Detalle'))}
                  </span>
                  <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block mt-0.5">
                    {user.name}
                  </span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" /> Salir
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNav('login')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-neutral-900 dark:bg-amber-400 text-white dark:text-neutral-950 text-xs font-bold rounded-xl cursor-pointer shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400 dark:text-neutral-950 animate-pulse" />
                Iniciar Sesión
              </button>
            )}
          </div>
        </div>
      )}

    </header>
  );
}
