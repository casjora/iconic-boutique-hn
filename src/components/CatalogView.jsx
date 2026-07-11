import React, { useMemo } from 'react';
import { useStore } from '../store';
import PerfumeCard from './PerfumeCard';
import { Search, SlidersHorizontal, EyeOff, Tag, Percent, Heart, Sparkles } from 'lucide-react';

export default function CatalogView({ initialShowFavorites = false }) {
  const { 
    products, 
    favorites,
    searchTerm, 
    setSearchTerm, 
    categoryFilter, 
    setCategoryFilter, 
    brandFilter, 
    setBrandFilter,
    user
  } = useStore();

  const isClient = user?.role === 'client';

  // Compute unique brands & categories
  const categories = useMemo(() => {
    const list = new Set(products.map(p => p.category).filter(Boolean));
    return ['Todos', ...Array.from(list)];
  }, [products]);

  const brands = useMemo(() => {
    const list = new Set(products.map(p => p.brand).filter(Boolean));
    return ['Todas', ...Array.from(list)];
  }, [products]);

  // Handle local state filters if any
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(initialShowFavorites);
  const [showOffersOnly, setShowOffersOnly] = React.useState(false);

  // Sync initialShowFavorites if prop changes
  React.useEffect(() => {
    setShowFavoritesOnly(initialShowFavorites);
  }, [initialShowFavorites]);

  // Clean filters
  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('Todos');
    setBrandFilter('Todas');
    setShowFavoritesOnly(false);
    setShowOffersOnly(false);
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Search term (case-insensitive name or brand or category)
      const matchesSearch = searchTerm === '' || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Category
      const matchesCategory = categoryFilter === 'Todos' || p.category === categoryFilter;

      // 3. Brand
      const matchesBrand = brandFilter === 'Todas' || p.brand === brandFilter;

      // 4. Favorites Only
      const matchesFavorites = !showFavoritesOnly || favorites.includes(p.id);

      // 5. Offers Only (promotional price < public price)
      const matchesOffers = !showOffersOnly || (p.pricePromotional < p.pricePublic);

      return matchesSearch && matchesCategory && matchesBrand && matchesFavorites && matchesOffers;
    });
  }, [products, searchTerm, categoryFilter, brandFilter, showFavoritesOnly, showOffersOnly, favorites]);

  return (
    <div className="space-y-6">
      
      {/* Top filter dashboard */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          
          {/* Search bar input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar perfume, marca o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm focus:ring-2 focus:ring-neutral-950 focus:border-transparent transition-all outline-none"
            />
          </div>

          {/* Grid dropdowns */}
          <div className="flex flex-wrap gap-3">
            {/* Category selection */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-2xl">
              <span className="text-[10px] font-bold text-neutral-400 uppercase font-mono">Categoría</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-neutral-700 focus:outline-none cursor-pointer"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Brand selection */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-2xl">
              <span className="text-[10px] font-bold text-neutral-400 uppercase font-mono">Marca</span>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-neutral-700 focus:outline-none cursor-pointer"
              >
                {brands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Filter Pill switches */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100">
          <div className="flex flex-wrap gap-2">
            
            {/* Toggle show favorites */}
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showFavoritesOnly 
                  ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm' 
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              Favoritos ({favorites.length})
            </button>

            {/* Toggle show offers */}
            <button
              onClick={() => setShowOffersOnly(!showOffersOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showOffersOnly 
                  ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' 
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <Percent className="h-3.5 w-3.5" />
              Ofertas Especiales
            </button>

          </div>

          {/* Reset buttons */}
          {(searchTerm || categoryFilter !== 'Todos' || brandFilter !== 'Todas' || showFavoritesOnly || showOffersOnly) && (
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
            >
              Limpiar Filtros ×
            </button>
          )}
        </div>
      </div>

      {/* Catalog Grid */}
      <div>
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-dashed border-neutral-200 rounded-3xl p-16 text-center space-y-4">
            <div className="flex justify-center text-neutral-300">
              <EyeOff className="h-12 w-12" />
            </div>
            <h3 className="font-display font-bold text-neutral-800 text-lg">No se encontraron fragancias</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              No hay ningún perfume en inventario que coincida con tus términos de búsqueda o filtros activos. Intenta restablecer los filtros.
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((p) => (
              <PerfumeCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
