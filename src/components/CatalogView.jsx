import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { Link, useLocation } from 'react-router-dom';
import PerfumeCard from './PerfumeCard';
import { Percent, Award, Heart, Sparkles, Search, SlidersHorizontal, RefreshCw, Flame } from 'lucide-react';
import { isProductSet, getProductPromoDiscount } from '../utils/productHelper';

export default function CatalogView({ favoritesOnly = false }) {
  const { products, user, favorites } = useStore();
  const location = useLocation();

  const isClient = user?.role === 'client';
  const hasUser = !!user;

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [showPromoOnly, setShowPromoOnly] = useState(false);
  
  // Lazy loading state
  const [visibleCount, setVisibleCount] = useState(12);

  // Initialize and update filters based on deep category route paths
  useEffect(() => {
    const path = location.pathname;
    if (path === '/category/caballeros') {
      setSelectedCategory('Caballeros');
      setShowPromoOnly(false);
    } else if (path === '/category/damas') {
      setSelectedCategory('Damas');
      setShowPromoOnly(false);
    } else if (path === '/category/unisex') {
      setSelectedCategory('Unisex');
      setShowPromoOnly(false);
    } else if (path === '/category/estuches-dama') {
      setSelectedCategory('Estuches Dama');
      setShowPromoOnly(false);
    } else if (path === '/category/estuches-caballero') {
      setSelectedCategory('Estuches Caballero');
      setShowPromoOnly(false);
    } else if (path === '/category/regalos') {
      setSelectedCategory('Sets / Estuches');
      setShowPromoOnly(false);
    } else {
      setSelectedCategory('Todas');
      setShowPromoOnly(false);
    }
    setVisibleCount(12);
  }, [location.pathname]);

  // Filters base products: guest/public users only see featuredPublic items
  const baseProducts = useMemo(() => {
    let list = products;
    // Only unregistered/guest users should be restricted to featuredPublic items
    if (!user) {
      list = list.filter(p => p.featuredPublic === true);
    }
    if (favoritesOnly) {
      return list.filter(p => favorites.includes(p.id));
    }
    return list;
  }, [products, favorites, favoritesOnly, user]);

  // Extract unique brands for the filter select
  const categoryFilteredProducts = useMemo(() => {
    return baseProducts.filter(p => {
      if (selectedCategory === 'Todas') return true;
      if (selectedCategory === 'Sets / Estuches') return isProductSet(p);
      return p.category?.trim() === selectedCategory;
    });
  }, [baseProducts, selectedCategory]);

  const uniqueBrands = useMemo(() => {
    const brands = categoryFilteredProducts.map(p => p.brand?.trim()).filter(Boolean);
    return ['Todas', ...new Set(brands)].sort((a, b) => a.localeCompare(b));
  }, [categoryFilteredProducts]);

  // Extract unique categories for the filter select, removing Unisex and duplicates
  const uniqueCategories = useMemo(() => {
    return ['Damas', 'Caballeros'];
  }, []);

  // Filter application
  const filteredProducts = useMemo(() => {
    return baseProducts.filter(p => {
      const term = searchTerm.toLowerCase();
      const isSearchForSet = term === 'set' || term === 'sets' || term === 'estuche' || term === 'estuches' || term === 'kit' || term === 'kits' || term === 'pack' || term === 'packs' || term === 'giftset' || term === 'giftsets';
      
      const matchesSearch = !searchTerm.trim() || 
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        (p.size || '').toLowerCase().includes(term) ||
        (isSearchForSet && isProductSet(p));
      
      const matchesBrand = selectedBrand === 'Todas' || p.brand?.trim() === selectedBrand;
      
      const pCat = (p.category || '').trim();
      const matchesCategory = selectedCategory === 'Todas'
        ? true
        : selectedCategory === 'Sets / Estuches'
          ? isProductSet(p)
          : selectedCategory === 'Estuches Dama'
            ? (pCat === 'Damas' || pCat === 'Femenino' || pCat === 'Unisex') && isProductSet(p)
            : selectedCategory === 'Estuches Caballero'
              ? (pCat === 'Caballeros' || pCat === 'Masculino' || pCat === 'Unisex') && isProductSet(p)
              : selectedCategory === 'Damas'
                ? (pCat === 'Damas' || pCat === 'Femenino' || pCat === 'Unisex') && !isProductSet(p)
                : selectedCategory === 'Caballeros'
                  ? (pCat === 'Caballeros' || pCat === 'Masculino' || pCat === 'Unisex') && !isProductSet(p)
                  : pCat === selectedCategory;
      
      const matchesPromo = !showPromoOnly || getProductPromoDiscount(p) > 0;
      
      return matchesSearch && matchesBrand && matchesCategory && matchesPromo;
    });
  }, [baseProducts, searchTerm, selectedBrand, selectedCategory, showPromoOnly]);

  const isFiltering = searchTerm.trim() !== '' || selectedBrand !== 'Todas' || selectedCategory !== 'Todas' || showPromoOnly;
  const isCategoryPage = location.pathname.startsWith('/category/');

  // Apply lazy loading count if user is not filtering
  const displayedProducts = useMemo(() => {
    if (isFiltering) {
      return filteredProducts;
    }
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, isFiltering, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 12);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedBrand('Todas');
    setSelectedCategory('Todas');
    setShowPromoOnly(false);
    setVisibleCount(12);
  };

  // Dynamic titles and subtitles based on active category routes
  const pageHeader = useMemo(() => {
    if (favoritesOnly) {
      return {
        title: 'Mis Perfumes Favoritos',
        subtitle: 'Tus fragancias originales favoritas de Iconic Boutique HN guardadas en Honduras.',
        icon: <Heart className="h-5 w-5 text-rose-600 animate-pulse" />,
        bg: 'bg-rose-50'
      };
    }
    const path = location.pathname;
    if (path === '/category/caballeros') {
      return {
        title: 'Fragancias Para Caballeros',
        subtitle: 'Explora nuestra colección de perfumes masculinos importados 100% originales.',
        icon: <Award className="h-5 w-5 text-indigo-600" />,
        bg: 'bg-indigo-50'
      };
    }
    if (path === '/category/damas') {
      return {
        title: 'Fragancias Para Damas',
        subtitle: 'Déjate seducir por nuestra selección premium de fragancias y perfumes femeninos.',
        icon: <Sparkles className="h-5 w-5 text-pink-600 animate-pulse" />,
        bg: 'bg-pink-50'
      };
    }
    if (path === '/category/regalos') {
      return {
        title: 'Estuches de Regalo y Sets',
        subtitle: 'Los mejores sets de fragancias originales y estuches de diseñador para obsequios especiales.',
        icon: <Sparkles className="h-5 w-5 text-emerald-600" />,
        bg: 'bg-emerald-50'
      };
    }
    if (path === '/category/mas-vendidos') {
      return {
        title: 'Fragancias en Promoción y Oferta',
        subtitle: '¡Descuentos especiales por tiempo limitado! Aprovecha precios exclusivos en perfumería original.',
        icon: <Flame className="h-5 w-5 text-amber-600 animate-pulse" />,
        bg: 'bg-amber-50'
      };
    }
    return {
      title: 'Catálogo de Fragancias Originales',
      subtitle: 'Explora nuestra amplia variedad de perfumes originales de diseñador en Honduras.',
      icon: <Percent className="h-5 w-5 text-neutral-800" />,
      bg: 'bg-neutral-100'
    };
  }, [favoritesOnly, location.pathname]);

  return (
    <div className="space-y-6 fade-in-up max-w-7xl mx-auto">
      
      {/* Dynamic Header */}
      <div className="text-center max-w-xl mx-auto py-4">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${pageHeader.bg} dark:bg-neutral-800 mb-3 shadow-sm`}>
          {pageHeader.icon}
        </div>
        <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight sm:text-3xl">
          {pageHeader.title}
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
          {pageHeader.subtitle}
        </p>
      </div>

      {/* Info status card for visitors (No VIP references) */}
      {!hasUser && (
        <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 max-w-2xl mx-auto text-center space-y-4 shadow-sm">
          <div className="flex justify-center text-amber-500 dark:text-amber-400">
            <Sparkles className="h-8 w-8 animate-pulse" />
          </div>
          <h3 className="font-display font-black text-neutral-900 dark:text-neutral-100 text-lg uppercase tracking-tight">
            ¿Quieres Acceder a Tarifas de Distribuidor?
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-md mx-auto font-medium">
            Registra una cuenta de forma completamente gratuita en segundos para activar descuentos adicionales por volumen y precios especiales en todas tus órdenes.
          </p>
          <div className="flex justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400 dark:text-neutral-950 animate-pulse" />
              Crear Cuenta o Iniciar Sesión
            </Link>
          </div>
        </div>
      )}

      {isClient && (
        <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/10 dark:bg-emerald-950/30 p-6 max-w-2xl mx-auto text-center space-y-2 shadow-sm">
          <div className="flex justify-center text-emerald-600 dark:text-emerald-400">
            <Award className="h-8 w-8 animate-bounce" />
          </div>
          <h3 className="font-display font-bold text-emerald-950 dark:text-emerald-300 text-lg">
            ✓ Tarifa VIP de Distribuidor Activa
          </h3>
          <p className="text-xs text-emerald-800 dark:text-emerald-200/80 max-w-md mx-auto">
            Estás autorizado para comprar al por mayor en Honduras. Se aplicará de forma automática el precio promocional en tu orden final.
          </p>
        </div>
      )}

      {/* Filter and Search Box */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200 font-bold text-xs uppercase tracking-wider">
          <SlidersHorizontal className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
          <span>Búsqueda y Filtros</span>
        </div>

        <div className={`grid gap-4 ${isCategoryPage ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {/* Text Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            </div>
            <input
              type="text"
              placeholder="Buscar perfume o marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Brand Selector */}
          <div>
            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setVisibleCount(12); // Reset count on filter change
              }}
              className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent outline-none transition-all cursor-pointer"
            >
              <option value="Todas">Todas las Marcas</option>
              {uniqueBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          {!isCategoryPage && (
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setVisibleCount(12); // Reset count on filter change
                }}
                className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent outline-none transition-all cursor-pointer"
              >
                <option value="Todas">Todas las Categorías</option>
                <option value="Sets / Estuches">Estuches y Sets 🎁</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isFiltering && (
          <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
              Mostrando <strong className="text-neutral-800 dark:text-neutral-200">{filteredProducts.length}</strong> resultados filtrados de <strong className="text-neutral-800 dark:text-neutral-200">{baseProducts.length}</strong> perfumes totales.
            </span>
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Grid of Offers */}
      <div>
        {displayedProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-12 text-center space-y-4">
            <span className="text-3xl block">🧴</span>
            <h3 className="font-display font-bold text-neutral-800 dark:text-neutral-200 text-sm uppercase tracking-wider font-mono">
              No se encontraron fragancias
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
              Prueba cambiando los criterios de búsqueda o limpiando los filtros activos para ver todo el catálogo.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-neutral-900 dark:bg-amber-400 text-white dark:text-neutral-950 rounded-xl text-xs font-bold transition-all hover:bg-neutral-800 dark:hover:bg-amber-300 active:scale-95 cursor-pointer"
            >
              Ver todo
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {displayedProducts.map((p) => (
                <PerfumeCard key={p.id} product={p} />
              ))}
            </div>

            {/* Lazy Load Button - only shows if we are not filtering and there are more items to load */}
            {!isFiltering && filteredProducts.length > visibleCount && (
              <div className="flex flex-col items-center justify-center pt-4 space-y-2">
                <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">
                  Mostrando {displayedProducts.length} de {filteredProducts.length} fragancias
                </p>
                <button
                  onClick={handleLoadMore}
                  className="px-5 py-2.5 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-extrabold border border-neutral-200 rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer"
                >
                  Ver más fragancias
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
