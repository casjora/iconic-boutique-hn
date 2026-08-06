import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { 
  Tag, Save, Search, 
  Loader2, Filter, AlertCircle, CheckCircle2, Info, CheckCheck, XSquare
} from 'lucide-react';
import { 
  getProductPublicCategories, 
  setProductPublicCategoriesInDesc, 
  isProductSet 
} from '../utils/productHelper';

export default function Showroom() {
  const { products, updateShowroomCuration } = useStore();
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Todas');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [bulkDiscountInput, setBulkDiscountInput] = useState('');

  // Local state for edits before saving
  // Map of productId -> { featuredPublic: boolean, publicDiscount: number, publicCategories: string[] }
  const [edits, setEdits] = useState(() => {
    const initial = {};
    products.forEach(p => {
      initial[p.id] = {
        featuredPublic: p.featuredPublic !== undefined ? Boolean(p.featuredPublic) : true,
        publicDiscount: Number(p.publicDiscount || 0),
        publicCategories: getProductPublicCategories(p)
      };
    });
    return initial;
  });

  useEffect(() => {
    if (products.length > 0) {
      setEdits(prev => {
        const next = { ...prev };
        let hasChanges = false;
        products.forEach(p => {
          if (!next[p.id]) {
            next[p.id] = {
              featuredPublic: p.featuredPublic !== undefined ? Boolean(p.featuredPublic) : true,
              publicDiscount: Number(p.publicDiscount || 0),
              publicCategories: getProductPublicCategories(p)
            };
            hasChanges = true;
          }
        });
        return hasChanges ? next : prev;
      });
    }
  }, [products]);

  // Filter products by search & base category filter
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Search term
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || 
        (p.name || '').toLowerCase().includes(q) || 
        (p.brand || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // 2. Base Category Filter
      const pCat = (p.category || '').trim();
      if (selectedCategoryFilter === 'Todas') return true;
      if (selectedCategoryFilter === 'Damas') return pCat === 'Damas' || pCat === 'Femenino' || pCat === 'W';
      if (selectedCategoryFilter === 'Caballeros') return pCat === 'Caballeros' || pCat === 'Masculino' || pCat === 'M';
      if (selectedCategoryFilter === 'Unisex') return pCat === 'Unisex' || pCat === 'U';
      if (selectedCategoryFilter === 'Revisión') return pCat === 'Revisión' || pCat === 'Revision' || pCat === 'Pendiente';

      return pCat === selectedCategoryFilter;
    });
  }, [products, search, selectedCategoryFilter]);

  // Toggle specific category active state for a product
  const handleToggleCategory = (id, catKey) => {
    setEdits(prev => {
      const origProd = products.find(p => p.id === id);
      const current = prev[id] || {
        featuredPublic: true,
        publicDiscount: 0,
        publicCategories: getProductPublicCategories(origProd)
      };

      const hasCat = current.publicCategories.includes(catKey);
      const updatedCats = hasCat
        ? current.publicCategories.filter(c => c !== catKey)
        : [...current.publicCategories, catKey];

      const isFeatured = updatedCats.length > 0;

      return {
        ...prev,
        [id]: {
          ...current,
          featuredPublic: isFeatured,
          publicCategories: updatedCats
        }
      };
    });
  };

  const handleDiscountChange = (id, value) => {
    const num = Math.max(0, Math.min(100, Number(value) || 0));
    setEdits(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        publicDiscount: num
      }
    }));
  };

  const ALL_COLUMNS = ['damas', 'caballeros', 'estuches-dama', 'estuches-caballero'];

  const handleSelectAllInColumn = (catKey, selectValue) => {
    setEdits(prev => {
      const next = { ...prev };
      filteredProducts.forEach(p => {
        const current = next[p.id] || {
          featuredPublic: true,
          publicDiscount: 0,
          publicCategories: getProductPublicCategories(p)
        };

        let updatedCats = [...current.publicCategories];
        if (selectValue) {
          if (!updatedCats.includes(catKey)) updatedCats.push(catKey);
        } else {
          updatedCats = updatedCats.filter(c => c !== catKey);
        }

        next[p.id] = {
          ...current,
          featuredPublic: updatedCats.length > 0,
          publicCategories: updatedCats
        };
      });
      return next;
    });
  };

  const handleSelectAllEverything = (selectValue) => {
    setEdits(prev => {
      const next = { ...prev };
      filteredProducts.forEach(p => {
        const current = next[p.id] || {
          featuredPublic: true,
          publicDiscount: 0,
          publicCategories: getProductPublicCategories(p)
        };

        const updatedCats = selectValue ? [...ALL_COLUMNS] : [];

        next[p.id] = {
          ...current,
          featuredPublic: updatedCats.length > 0,
          publicCategories: updatedCats
        };
      });
      return next;
    });
  };

  const handleApplyBulkDiscount = () => {
    const disc = Math.max(0, Math.min(100, Number(bulkDiscountInput) || 0));
    setEdits(prev => {
      const next = { ...prev };
      filteredProducts.forEach(p => {
        next[p.id] = {
          ...next[p.id],
          publicDiscount: disc
        };
      });
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    const payload = [];

    Object.entries(edits).forEach(([id, val]) => {
      const original = products.find(p => p.id === id);
      if (original) {
        const origCats = getProductPublicCategories(original);
        const catsChanged = JSON.stringify(origCats.sort()) !== JSON.stringify([...val.publicCategories].sort());
        const featuredChanged = Boolean(original.featuredPublic) !== Boolean(val.featuredPublic);
        const discountChanged = Number(original.publicDiscount || 0) !== Number(val.publicDiscount || 0);

        if (catsChanged || featuredChanged || discountChanged) {
          const newDescription = setProductPublicCategoriesInDesc(original.description, val.publicCategories);

          payload.push({
            id,
            featuredPublic: val.featuredPublic,
            publicDiscount: val.publicDiscount,
            description: newDescription
          });
        }
      }
    });

    if (payload.length === 0) {
      setSaving(false);
      setSuccessMsg('No se detectaron cambios pendientes por guardar.');
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }

    const ok = await updateShowroomCuration(payload);
    setSaving(false);

    if (ok) {
      setSuccessMsg(`¡Matriz de Plan Público guardada exitosamente (${payload.length} fragancias actualizadas)!`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } else {
      setErrorMsg('Error de base de datos al guardar los cambios en Supabase.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-amber-200 dark:border-amber-800/50">
                Plan Público • Matriz de Visibilidad
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
              Curaduría de Categorías & Ofertas
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-3xl">
              Configura en qué categorías públicas (<strong className="text-neutral-900 dark:text-neutral-200">Damas, Caballeros, Set Damas, Set Caballeros</strong>) estará activo cada perfume. Especialmente útil para fragancias <strong className="text-amber-600 dark:text-amber-400">Unisex</strong>.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 font-extrabold text-sm rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Cambios
          </button>
        </div>

        {/* Info Banner */}
        <div className="mt-4 p-3.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl flex items-start sm:items-center gap-3 text-xs text-neutral-600 dark:text-neutral-300">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong>Gestión Unisex:</strong> Puedes marcar que un perfume Unisex aparezca en <em>Caballeros</em>, en <em>Damas</em> o en <em>Ambos</em>. Si desmarcas todas las casillas de una fila, el perfume quedará oculto del catálogo público.
          </span>
        </div>

        {successMsg && (
          <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-rose-800 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Toolbar: Filters, Bulk Discount & Column Selectors */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar perfume por nombre, marca o código..."
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer"
            >
              <option value="Todas">Todas las Categorías Base</option>
              <option value="Damas">Damas / Femenino (W)</option>
              <option value="Caballeros">Caballeros / Masculino (M)</option>
              <option value="Unisex">Unisex (U)</option>
              <option value="Revisión">Revisión Manual</option>
            </select>
          </div>

          {/* Bulk Discount */}
          <div className="flex items-center gap-2 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800 pt-3 md:pt-0">
            <span className="text-xs font-bold text-neutral-500 shrink-0">Desc. Masivo:</span>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="%"
              value={bulkDiscountInput}
              onChange={(e) => setBulkDiscountInput(e.target.value)}
              className="w-16 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-bold text-center text-neutral-900 dark:text-neutral-100 outline-none"
            />
            <button
              onClick={handleApplyBulkDiscount}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-extrabold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Aplicar %
            </button>
          </div>
        </div>

        {/* Master Column Selection Bar */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-neutral-700 dark:text-neutral-300">Acciones de Columnas ({filteredProducts.length} perfumes):</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectAllEverything(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs transition-colors cursor-pointer text-xs"
                title="Selecciona las 4 columnas para todos los perfumes filtrados"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar Todas las Columnas
              </button>
              <button
                type="button"
                onClick={() => handleSelectAllEverything(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-extrabold rounded-xl transition-colors cursor-pointer text-xs"
                title="Deselecciona todas las columnas para todos los perfumes filtrados"
              >
                <XSquare className="w-3.5 h-3.5" />
                Deseleccionar Todas
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-neutral-400 font-medium">Por columna:</span>
            <button
              onClick={() => handleSelectAllInColumn('damas', true)}
              className="px-2 py-1 bg-pink-100 hover:bg-pink-200 dark:bg-pink-950 dark:hover:bg-pink-900 text-pink-700 dark:text-pink-300 rounded-lg font-bold transition-colors"
            >
              + Damas
            </button>
            <button
              onClick={() => handleSelectAllInColumn('caballeros', true)}
              className="px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg font-bold transition-colors"
            >
              + Caballeros
            </button>
            <button
              onClick={() => handleSelectAllInColumn('estuches-dama', true)}
              className="px-2 py-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg font-bold transition-colors"
            >
              + Set Damas
            </button>
            <button
              onClick={() => handleSelectAllInColumn('estuches-caballero', true)}
              className="px-2 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-lg font-bold transition-colors"
            >
              + Set Cab.
            </button>
          </div>
        </div>
      </div>

      {/* Main Matrix Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-180px)] min-h-[400px] relative">
          <table className="w-full text-left border-collapse min-w-[700px] table-fixed">
            <thead className="sticky top-0 z-20 shadow-xs bg-neutral-50 dark:bg-neutral-900">
              <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-[280px] sm:w-[340px] truncate bg-neutral-50 dark:bg-neutral-900 sticky top-0 z-20">
                  <div className="flex items-center justify-between gap-2">
                    <span>Perfume / Detalles</span>
                    <div className="flex items-center gap-1.5 font-normal text-[10px] normal-case">
                      <button 
                        type="button" 
                        onClick={() => handleSelectAllEverything(true)} 
                        className="text-amber-600 dark:text-amber-400 font-extrabold hover:underline cursor-pointer"
                        title="Marcar todas las columnas"
                      >
                        Marcar Todo
                      </button>
                      <span className="text-neutral-300 dark:text-neutral-700">|</span>
                      <button 
                        type="button" 
                        onClick={() => handleSelectAllEverything(false)} 
                        className="text-neutral-400 hover:underline cursor-pointer"
                        title="Desmarcar todas las columnas"
                      >
                        Desmarcar
                      </button>
                    </div>
                  </div>
                </th>
                
                {/* Column 2: Damas */}
                <th className="py-3.5 px-2 text-center w-[100px] sm:w-[110px] bg-pink-100 dark:bg-pink-950 border-l border-neutral-200/60 dark:border-neutral-800/60 sticky top-0 z-20">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-pink-700 dark:text-pink-300 font-extrabold truncate w-full">Damas</span>
                    <div className="flex items-center gap-1 text-[9px] font-normal normal-case">
                      <button onClick={() => handleSelectAllInColumn('damas', true)} className="text-pink-700 dark:text-pink-300 font-extrabold hover:underline cursor-pointer">Todos</button>
                      <span>•</span>
                      <button onClick={() => handleSelectAllInColumn('damas', false)} className="text-neutral-500 dark:text-neutral-400 hover:underline cursor-pointer">Ninguno</button>
                    </div>
                  </div>
                </th>

                {/* Column 3: Caballeros */}
                <th className="py-3.5 px-2 text-center w-[100px] sm:w-[110px] bg-blue-100 dark:bg-blue-950 border-l border-neutral-200/60 dark:border-neutral-800/60 sticky top-0 z-20">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-blue-700 dark:text-blue-300 font-extrabold truncate w-full">Caballeros</span>
                    <div className="flex items-center gap-1 text-[9px] font-normal normal-case">
                      <button onClick={() => handleSelectAllInColumn('caballeros', true)} className="text-blue-700 dark:text-blue-300 font-extrabold hover:underline cursor-pointer">Todos</button>
                      <span>•</span>
                      <button onClick={() => handleSelectAllInColumn('caballeros', false)} className="text-neutral-500 dark:text-neutral-400 hover:underline cursor-pointer">Ninguno</button>
                    </div>
                  </div>
                </th>

                {/* Column 4: Set Damas */}
                <th className="py-3.5 px-2 text-center w-[100px] sm:w-[110px] bg-purple-100 dark:bg-purple-950 border-l border-neutral-200/60 dark:border-neutral-800/60 sticky top-0 z-20">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-purple-700 dark:text-purple-300 font-extrabold truncate w-full">Set Damas</span>
                    <div className="flex items-center gap-1 text-[9px] font-normal normal-case">
                      <button onClick={() => handleSelectAllInColumn('estuches-dama', true)} className="text-purple-700 dark:text-purple-300 font-extrabold hover:underline cursor-pointer">Todos</button>
                      <span>•</span>
                      <button onClick={() => handleSelectAllInColumn('estuches-dama', false)} className="text-neutral-500 dark:text-neutral-400 hover:underline cursor-pointer">Ninguno</button>
                    </div>
                  </div>
                </th>

                {/* Column 5: Set Caballeros */}
                <th className="py-3.5 px-2 text-center w-[100px] sm:w-[110px] bg-amber-100 dark:bg-amber-950 border-l border-neutral-200/60 dark:border-neutral-800/60 sticky top-0 z-20">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-amber-700 dark:text-amber-300 font-extrabold truncate w-full">Set Cab.</span>
                    <div className="flex items-center gap-1 text-[9px] font-normal normal-case">
                      <button onClick={() => handleSelectAllInColumn('estuches-caballero', true)} className="text-amber-700 dark:text-amber-300 font-extrabold hover:underline cursor-pointer">Todos</button>
                      <span>•</span>
                      <button onClick={() => handleSelectAllInColumn('estuches-caballero', false)} className="text-neutral-500 dark:text-neutral-400 hover:underline cursor-pointer">Ninguno</button>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400 font-medium">
                    No se encontraron productos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const edit = edits[p.id] || { 
                    featuredPublic: true, 
                    publicDiscount: 0, 
                    publicCategories: getProductPublicCategories(p) 
                  };

                  const activeCats = edit.publicCategories || [];
                  const isVisibleOverall = edit.featuredPublic;

                  const pCat = (p.category || '').trim();
                  const setFlag = isProductSet(p);

                  return (
                    <tr 
                      key={p.id}
                      className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors ${
                        !isVisibleOverall ? 'opacity-50 bg-neutral-50/40 dark:bg-neutral-950/40' : ''
                      }`}
                    >
                      {/* Column 1: Perfume (Thumbnail, Name, Brand, Size, Base Cat, Price & Discount) */}
                      <td className="py-3 px-3 w-[280px] sm:w-[340px] max-w-[340px]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={p.image_url || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=200'}
                            alt={p.name}
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider truncate max-w-[100px]">
                                {p.brand}
                              </span>
                              
                              {/* Base Category Pill */}
                              {pCat === 'Unisex' || pCat === 'U' ? (
                                <span className="px-1.5 py-0.2 text-[8px] font-extrabold rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 shrink-0">
                                  Unisex
                                </span>
                              ) : pCat === 'Caballeros' || pCat === 'Masculino' || pCat === 'M' ? (
                                <span className="px-1.5 py-0.2 text-[8px] font-extrabold rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shrink-0">
                                  Caballeros
                                </span>
                              ) : pCat === 'Revisión' || pCat === 'Revision' ? (
                                <span className="px-1.5 py-0.2 text-[8px] font-extrabold rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 shrink-0">
                                  Revisión
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 text-[8px] font-extrabold rounded bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 shrink-0">
                                  Damas
                                </span>
                              )}

                              {setFlag && (
                                <span className="px-1.5 py-0.2 text-[8px] font-extrabold rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                                  Set
                                </span>
                              )}
                            </div>

                            <h3 
                              className="font-bold text-neutral-900 dark:text-neutral-100 text-[11px] sm:text-xs truncate block"
                              title={p.name}
                            >
                              {p.name}
                            </h3>
                            
                            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                              <span className="truncate max-w-[60px]">{p.size}</span>
                              <span>•</span>
                              <span className="font-semibold text-neutral-900 dark:text-neutral-200 shrink-0">
                                L. {Number(p.pricePublic || 0).toLocaleString()}
                              </span>
                              
                              {/* Discount Input */}
                              <div className="flex items-center gap-1 ml-auto shrink-0">
                                <Tag className="w-2.5 h-2.5 text-amber-500" />
                                <span className="text-[9px] font-bold hidden sm:inline">Desc%:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={edit.publicDiscount}
                                  onChange={(e) => handleDiscountChange(p.id, e.target.value)}
                                  className="w-10 sm:w-12 px-1 py-0.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-center font-bold text-[10px] sm:text-xs text-neutral-900 dark:text-neutral-100"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Damas */}
                      <td className="py-3 px-3 text-center border-l border-neutral-100 dark:border-neutral-800/60 bg-pink-50/20 dark:bg-pink-950/10">
                        <label className="inline-flex items-center justify-center p-2 rounded-xl cursor-pointer hover:bg-pink-100/50 dark:hover:bg-pink-900/30 transition-colors">
                          <input
                            type="checkbox"
                            checked={activeCats.includes('damas')}
                            onChange={() => handleToggleCategory(p.id, 'damas')}
                            className="w-4 h-4 text-pink-600 rounded border-neutral-300 dark:border-neutral-700 focus:ring-pink-500 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Column 3: Caballeros */}
                      <td className="py-3 px-3 text-center border-l border-neutral-100 dark:border-neutral-800/60 bg-blue-50/20 dark:bg-blue-950/10">
                        <label className="inline-flex items-center justify-center p-2 rounded-xl cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors">
                          <input
                            type="checkbox"
                            checked={activeCats.includes('caballeros')}
                            onChange={() => handleToggleCategory(p.id, 'caballeros')}
                            className="w-4 h-4 text-blue-600 rounded border-neutral-300 dark:border-neutral-700 focus:ring-blue-500 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Column 4: Set Damas */}
                      <td className="py-3 px-3 text-center border-l border-neutral-100 dark:border-neutral-800/60 bg-purple-50/20 dark:bg-purple-950/10">
                        <label className="inline-flex items-center justify-center p-2 rounded-xl cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors">
                          <input
                            type="checkbox"
                            checked={activeCats.includes('estuches-dama')}
                            onChange={() => handleToggleCategory(p.id, 'estuches-dama')}
                            className="w-4 h-4 text-purple-600 rounded border-neutral-300 dark:border-neutral-700 focus:ring-purple-500 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Column 5: Set Caballeros */}
                      <td className="py-3 px-3 text-center border-l border-neutral-100 dark:border-neutral-800/60 bg-amber-50/20 dark:bg-amber-950/10">
                        <label className="inline-flex items-center justify-center p-2 rounded-xl cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors">
                          <input
                            type="checkbox"
                            checked={activeCats.includes('estuches-caballero')}
                            onChange={() => handleToggleCategory(p.id, 'estuches-caballero')}
                            className="w-4 h-4 text-amber-600 rounded border-neutral-300 dark:border-neutral-700 focus:ring-amber-500 cursor-pointer"
                          />
                        </label>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
