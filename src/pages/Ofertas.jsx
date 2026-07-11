import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import PerfumeCard from '../components/PerfumeCard';
import { Percent, Award, ShieldAlert, Sparkles, Search, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { isProductSet } from '../utils/productHelper';

export default function OfertasView() {
  const { products, user } = useStore();

  const isClient = user?.role === 'client';
  const hasUser = !!user;

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  
  // Lazy loading state
  const [visibleCount, setVisibleCount] = useState(12);

  // Filters only products where pricePromotional < pricePublic
  const promoProducts = useMemo(() => {
    return products.filter(p => p.pricePromotional < p.pricePublic);
  }, [products]);

  // Extract unique brands for the filter select
  const uniqueBrands = useMemo(() => {
    const brands = promoProducts.map(p => p.brand?.trim()).filter(Boolean);
    return ['Todas', ...new Set(brands)].sort((a, b) => a.localeCompare(b));
  }, [promoProducts]);

  // Extract unique categories for the filter select, removing any duplicate "Todas" or "Todas las Categorías"
  const uniqueCategories = useMemo(() => {
    const categories = promoProducts
      .map(p => p.category?.trim())
      .filter(Boolean)
      .filter(cat => cat.toLowerCase() !== 'todas' && cat.toLowerCase() !== 'todas las categorías');
    return [...new Set(categories)].sort((a, b) => a.localeCompare(b));
  }, [promoProducts]);

  // Filter application
  const filteredProducts = useMemo(() => {
    return promoProducts.filter(p => {
      const term = searchTerm.toLowerCase();
      const isSearchForSet = term === 'set' || term === 'sets' || term === 'estuche' || term === 'estuches' || term === 'kit' || term === 'kits' || term === 'pack' || term === 'packs' || term === 'giftset' || term === 'giftsets';
      
      const matchesSearch = !searchTerm.trim() || 
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        (p.size || '').toLowerCase().includes(term) ||
        (isSearchForSet && isProductSet(p));
      
      const matchesBrand = selectedBrand === 'Todas' || p.brand?.trim() === selectedBrand;
      
      const matchesCategory = selectedCategory === 'Todas'
        ? true
        : selectedCategory === 'Sets / Estuches'
          ? isProductSet(p)
          : p.category?.trim() === selectedCategory;
      
      return matchesSearch && matchesBrand && matchesCategory;
    });
  }, [promoProducts, searchTerm, selectedBrand, selectedCategory]);

  const isFiltering = searchTerm.trim() !== '' || selectedBrand !== 'Todas' || selectedCategory !== 'Todas';

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
    setVisibleCount(12);
  };

  return (
    <div className="space-y-6 fade-in-up max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="text-center max-w-xl mx-auto py-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-3 shadow-sm">
          <Percent className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl font-bold text-neutral-900 tracking-tight sm:text-3xl">
          Ofertas Especiales y Precios VIP
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          Fragancias originales seleccionadas con tarifas promocionales exclusivas para nuestros socios y distribuidores en Honduras.
        </p>
      </div>

      {/* Info status card */}
      {!hasUser && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/20 p-6 max-w-2xl mx-auto text-center space-y-4 shadow-sm">
          <div className="flex justify-center text-amber-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h3 className="font-display font-bold text-neutral-900 text-lg">
            ¡Acceso Restringido a Tarifas VIP!
          </h3>
          <p className="text-xs text-neutral-600 leading-relaxed max-w-md mx-auto">
            Actualmente puedes visualizar el catálogo de ofertas y comparar precios, pero debes registrarte o iniciar sesión para aplicar de forma automática estas tarifas VIP en tu cotización.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              Ingresar / Registrarme gratis
            </Link>
          </div>
        </div>
      )}

      {isClient && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/10 p-6 max-w-2xl mx-auto text-center space-y-2 shadow-sm">
          <div className="flex justify-center text-emerald-600">
            <Award className="h-8 w-8 animate-bounce" />
          </div>
          <h3 className="font-display font-bold text-emerald-950 text-lg">
            ✓ Tarifa VIP de Distribuidor Activa
          </h3>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">
            Estás autorizado para comprar al por mayor en Honduras. Se aplicará de forma automática el precio promocional en tu orden final.
          </p>
        </div>
      )}

      {/* Filter and Search Box */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-neutral-800 font-bold text-xs uppercase tracking-wider">
          <SlidersHorizontal className="h-4 w-4 text-neutral-500" />
          <span>Búsqueda y Filtros de Ofertas</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Text Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar perfume..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
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
              className="block w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
            >
              <option value="Todas">Todas las Marcas</option>
              {uniqueBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setVisibleCount(12); // Reset count on filter change
              }}
              className="block w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all cursor-pointer"
            >
              <option value="Todas">Todas las Categorías</option>
              <option value="Sets / Estuches">Estuches y Sets 🎁</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {isFiltering && (
          <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
            <span className="text-[10px] text-neutral-500 font-medium">
              Mostrando <strong className="text-neutral-800">{filteredProducts.length}</strong> resultados filtrados de <strong className="text-neutral-800">{promoProducts.length}</strong> ofertas totales.
            </span>
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-bold text-neutral-600 hover:text-neutral-950 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Grid of Offers */}
      <div>
        {displayedProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-200 bg-white p-12 text-center space-y-4">
            <span className="text-3xl block">🧴</span>
            <h3 className="font-display font-bold text-neutral-800 text-sm uppercase tracking-wider font-mono">
              No se encontraron ofertas
            </h3>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
              Prueba cambiando los criterios de búsqueda o limpiando los filtros activos para ver todo el catálogo VIP.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold transition-all hover:bg-neutral-800 active:scale-95 cursor-pointer"
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
                  Mostrando {displayedProducts.length} de {filteredProducts.length} ofertas
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
