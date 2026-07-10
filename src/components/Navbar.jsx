import React from 'react';
import { useStore } from '../store';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Key, LogOut, Package, FileSpreadsheet, Settings, Percent, Tags, HelpCircle, TrendingUp,Heart } from 'lucide-react';

export default function Navbar() {
  const { user, cart, logout } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const isEmployee = user?.role === 'owner' || user?.role === 'dueño' || user?.role === 'vendedor';
  const isOwner = user?.role === 'owner' || user?.role === 'dueño';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-2 cursor-pointer focus:outline-none"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-950 text-amber-400 font-display font-extrabold text-lg shadow-sm border border-neutral-800">
            I
          </div>
          <div className="text-left">
            <span className="block font-display font-extrabold text-base tracking-tight text-neutral-900 leading-tight">
              Iconic Boutique HN
            </span>
            <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider leading-none">
              Fragancias Originales
            </span>
          </div>
        </Link>

        {/* Central navigation links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/catalog"
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              currentPath === '/catalog' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            Fragancias
          </Link>
          
          <Link
            to="/ofertas"
            className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
              currentPath === '/ofertas' ? 'bg-amber-100 text-amber-900 font-semibold' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Percent className="h-4 w-4 text-amber-600" />
            Ofertas VIP
          </Link>

          {isEmployee && (
            <>
              <Link
                to="/dashboard"
                className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  currentPath === '/dashboard' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                to="/inventory"
                className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  currentPath === '/inventory' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <Package className="h-4 w-4" />
                Inventario
              </Link>
              <Link
                to="/orders"
                className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  currentPath === '/orders' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Órdenes
              </Link>
            </>
          )}

          {user && !isEmployee && (
            <>
              <Link
                to="/favorites"
                className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  currentPath === '/favorites' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <Heart className="h-4 w-4" />
                Mis Favoritos
              </Link>
              <Link
                to="/orders"
                className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  currentPath === '/orders' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Mis Órdenes
              </Link>
            </>
          )}

          {isOwner && (
            <>
              <Link
                to="/barcodes"
                className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  currentPath === '/barcodes' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <Tags className="h-4 w-4" />
                Etiquetas
              </Link>
              <Link
                to="/config"
                className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  currentPath === '/config' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <Settings className="h-4 w-4" />
                Config Bot
              </Link>
            </>
          )}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Guide Helper button */}
          <Link
            to="/"
            title="Guía de Implementación en Honduras"
            className="p-2 text-neutral-500 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors"
          >
            <HelpCircle className="h-5 w-5" />
          </Link>

          {/* Cart Trigger */}
          <Link
            to="/cart"
            className={`relative p-2.5 rounded-full transition-all ${
              currentPath === '/cart' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white animate-bounce">
                {cartCount}
              </span>
            )}
          </Link>

          {/* User authentication info */}
          {user ? (
            <div className="flex items-center gap-2 border-l border-neutral-200 pl-3">
              <div className="hidden sm:block text-right">
                <span className="block text-xs font-semibold text-neutral-900 leading-none">
                  {user.name}
                </span>
                <span className="text-[10px] uppercase tracking-wide font-bold text-neutral-500">
                  {(user.role === 'owner' || user.role === 'dueño') ? 'Dueño' : user.role === 'vendedor' ? 'Vendedor' : 'Cliente VIP'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 text-neutral-500 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-all shadow-sm"
            >
              <Key className="h-4 w-4" />
              Ingresar
            </Link>
          )}
        </div>

      </div>

      {/* Mobile navigation row (scrollable horizontally) */}
      <div className="flex md:hidden border-t border-neutral-100 bg-neutral-50 overflow-x-auto py-2 px-4 gap-2 scrollbar-none">
        <Link
          to="/catalog"
          className={`shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
            currentPath === '/catalog' ? 'bg-neutral-900 text-white font-semibold' : 'bg-white text-neutral-600 border border-neutral-200'
          }`}
        >
          Fragancias
        </Link>
        <Link
          to="/ofertas"
          className={`shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1 ${
            currentPath === '/ofertas' ? 'bg-amber-100 text-amber-900 font-semibold border border-amber-200' : 'bg-white text-neutral-600 border border-neutral-200'
          }`}
        >
          <Percent className="h-3 w-3 text-amber-600" />
          Ofertas VIP
        </Link>
        {isEmployee && (
          <>
            <Link
              to="/dashboard"
              className={`shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                currentPath === '/dashboard' ? 'bg-neutral-900 text-white font-semibold' : 'bg-white text-neutral-600 border border-neutral-200'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/inventory"
              className={`shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                currentPath === '/inventory' ? 'bg-neutral-900 text-white font-semibold' : 'bg-white text-neutral-600 border border-neutral-200'
              }`}
            >
              Inventario
            </Link>
            <Link
              to="/orders"
              className={`shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                currentPath === '/orders' ? 'bg-neutral-900 text-white font-semibold' : 'bg-white text-neutral-600 border border-neutral-200'
              }`}
            >
              Órdenes
            </Link>
          </>
        )}
        {user && !isEmployee && (
          <>
            <Link
              to="/favorites"
              className={`shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                currentPath === '/favorites' ? 'bg-neutral-900 text-white font-semibold' : 'bg-white text-neutral-600 border border-neutral-200'
              }`}
            >
              Mis Favoritos
            </Link>
            <Link
              to="/orders"
              className={`shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                currentPath === '/orders' ? 'bg-neutral-900 text-white font-semibold' : 'bg-white text-neutral-600 border border-neutral-200'
              }`}
            >
              Mis Órdenes
            </Link>
          </>
        )}
        {isOwner && (
          <>
            <Link
              to="/barcodes"
              className={`shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                currentPath === '/barcodes' ? 'bg-neutral-900 text-white font-semibold' : 'bg-white text-neutral-600 border border-neutral-200'
              }`}
            >
              Etiquetas
            </Link>
            <Link
              to="/config"
              className={`shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                currentPath === '/config' ? 'bg-neutral-900 text-white font-semibold' : 'bg-white text-neutral-600 border border-neutral-200'
              }`}
            >
              Config Bot
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
