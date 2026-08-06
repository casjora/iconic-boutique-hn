import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { 
  Tag, Save, Search, 
  Loader2, Filter, AlertCircle, CheckCircle2, Info, CheckCheck, XSquare,
  Table, Edit3, RotateCcw
} from 'lucide-react';
import { 
  getProductPublicCategories, 
  setProductPublicCategoriesInDesc, 
  isProductSet 
} from '../utils/productHelper';

const DRAFT_STORAGE_KEY = 'showroom_draft_edits_v2';

export default function Showroom() {
  const { products, updateShowroomCuration } = useStore();
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'saved_table'
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Todas');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [bulkDiscountInput, setBulkDiscountInput] = useState('');
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState(false);

  // Initialize edits state with localStorage fallback
  const [edits, setEdits] = useState(() => {
    let savedDraft = {};
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) savedDraft = JSON.parse(raw);
    } catch (e) {
      console.error('Error reading showroom draft from localStorage:', e);
    }

    const initial = {};
    products.forEach(p => {
      if (savedDraft[p.id]) {
        initial[p.id] = savedDraft[p.id];
      } else {
        initial[p.id] = {
          featuredPublic: p.featuredPublic !== undefined ? Boolean(p.featuredPublic) : true,
          publicDiscount: Number(p.publicDiscount || 0),
          publicCategories: getProductPublicCategories(p)
        };
      }
    });
    return initial;
  });

  // Sync edits to localStorage and detect unsaved changes
  useEffect(() => {
    if (Object.keys(edits).length > 0) {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(edits));
      } catch (e) {
        console.error('Error saving showroom draft to localStorage:', e);
      }
    }

    // Check if any edit differs from current saved DB products
    let isDifferent = false;
    for (const p of products) {
      const edit = edits[p.id];
      if (!edit) continue;
      const origCats = getProductPublicCategories(p);
      const catsChanged = JSON.stringify(origCats.sort()) !== JSON.stringify([...edit.publicCategories].sort());
      const featuredChanged = Boolean(p.featuredPublic) !== Boolean(edit.featuredPublic);
      const discountChanged = Number(p.publicDiscount || 0) !== Number(edit.publicDiscount || 0);

      if (catsChanged || featuredChanged || discountChanged) {
        isDifferent = true;
        break;
      }
    }
    setHasUnsavedDraft(isDifferent);
  }, [edits, products]);

  // Merge new products if added
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

  // Reset draft to database values
  const handleResetDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing localStorage draft:', e);
    }

    const resetEdits = {};
    products.forEach(p => {
      resetEdits[p.id] = {
        featuredPublic: p.featuredPublic !== undefined ? Boolean(p.featuredPublic) : true,
        publicDiscount: Number(p.publicDiscount || 0),
        publicCategories: getProductPublicCategories(p)
      };
    });
    setEdits(resetEdits);
    setHasUnsavedDraft(false);
    setSuccessMsg('Borrador descartado. Se han restaurado los datos originales.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Filter products by search, base category, showroom column, and stock status
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Search term
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || 
        (p.name || '').toLowerCase().includes(q) || 
        (p.brand || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // 2. Draft edit values
      const edit = edits[p.id] || {
        featuredPublic: p.featuredPublic !== undefined ? Boolean(p.featuredPublic) : true,
        publicDiscount: Number(p.publicDiscount || 0),
        publicCategories: getProductPublicCategories(p)
      };

      const activeCats = edit.publicCategories || [];
      const stock = p.availableStock !== undefined ? p.availableStock : p.stock;
      const pCat = (p.category || '').trim();

      // 3. Category & Column Filters
      if (selectedCategoryFilter === 'Todas') return true;

      // Base Categories
      if (selectedCategoryFilter === 'Damas') return pCat === 'Damas' || pCat === 'Femenino' || pCat === 'W';
      if (selectedCategoryFilter === 'Caballeros') return pCat === 'Caballeros' || pCat === 'Masculino' || pCat === 'M';
      if (selectedCategoryFilter === 'Unisex') return pCat === 'Unisex' || pCat === 'U';
      if (selectedCategoryFilter === 'Revisión') return pCat === 'Revisión' || pCat === 'Revision' || pCat === 'Pendiente';

      // Showroom Columns
      if (selectedCategoryFilter === 'col_damas') return activeCats.includes('damas');
      if (selectedCategoryFilter === 'col_caballeros') return activeCats.includes('caballeros');
      if (selectedCategoryFilter === 'col_estuches-dama') return activeCats.includes('estuches-dama');
      if (selectedCategoryFilter === 'col_estuches-caballero') return activeCats.includes('estuches-caballero');

      // Visibility & Stock Status
      if (selectedCategoryFilter === 'visibles') return edit.featuredPublic && activeCats.length > 0;
      if (selectedCategoryFilter === 'ocultos') return !edit.featuredPublic || activeCats.length === 0;
      if (selectedCategoryFilter === 'instock') return stock > 0;
      if (selectedCategoryFilter === 'outstock') return stock <= 0;

      return pCat === selectedCategoryFilter;
    });
  }, [products, search, selectedCategoryFilter, edits]);

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
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (e) {
        console.error('Error clearing localStorage draft after save:', e);
      }
      setHasUnsavedDraft(false);
      setSuccessMsg(`¡Matriz de Plan Público guardada exitosamente (${payload.length} fragancias actualizadas)!`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } else {
      setErrorMsg('Error de base de datos al guardar los cambios en Supabase.');
    }
  };

  // Products currently saved/active in Showroom
  const savedShowroomProducts = useMemo(() => {
    return products.filter(p => {
      const savedCats = getProductPublicCategories(p);
      const isFeatured = p.featuredPublic !== false;
      return isFeatured && savedCats.length > 0;
    });
  }, [products]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-amber-200 dark:border-amber-800/50">
                Plan Público • Matriz de Visibilidad
              </span>
              {hasUnsavedDraft && (
                <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-rose-200 dark:border-rose-800/50 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  Borrador Local Pendiente
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
              Curaduría de Categorías & Ofertas
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-3xl">
              Configura en qué categorías públicas (<strong className="text-neutral-900 dark:text-neutral-200">Damas, Caballeros, Set Damas, Set Caballeros</strong>) estará activo cada perfume. Especialmente útil para fragancias <strong className="text-amber-600 dark:text-amber-400">Unisex</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasUnsavedDraft && (
              <button
                type="button"
                onClick={handleResetDraft}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                title="Descartar borrador y restaurar datos guardados"
              >
                <RotateCcw className="w-4 h-4" />
                Descartar Borrador
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 font-extrabold text-sm rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Cambios
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-colors cursor-pointer shrink-0 ${
              activeTab === 'matrix'
                ? 'bg-amber-500 text-neutral-950 shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Matriz de Edición ({filteredProducts.length})
          </button>

          <button
            onClick={() => setActiveTab('saved_table')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-colors cursor-pointer shrink-0 ${
              activeTab === 'saved_table'
                ? 'bg-amber-500 text-neutral-950 shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            <Table className="w-4 h-4" />
            Tabla de Productos Guardados ({savedShowroomProducts.length})
          </button>
        </div>

        {/* Info Banner */}
        <div className="mt-4 p-3.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl flex items-start sm:items-center gap-3 text-xs text-neutral-600 dark:text-neutral-300">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong>Gestión Persistente:</strong> Los ajustes en la matriz se guardan en tu borrador local automáticamente y persisten aunque recargues la página. Al presionar <strong>"Guardar Cambios"</strong> se sincronizan permanentemente con Supabase.
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

      {/* TAB 1: EDITING MATRIX */}
      {activeTab === 'matrix' && (
        <>
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

              {/* Extended Filter Dropdown (Base Categories + Showroom Columns + Stock) */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer"
                >
                  <optgroup label="Categorías Base">
                    <option value="Todas">Todas las Categorías Base</option>
                    <option value="Damas">Damas / Femenino (W)</option>
                    <option value="Caballeros">Caballeros / Masculino (M)</option>
                    <option value="Unisex">Unisex (U)</option>
                    <option value="Revisión">Revisión Manual</option>
                  </optgroup>
                  <optgroup label="Filtrar por Columna Showroom">
                    <option value="col_damas">🌸 En Columna Damas</option>
                    <option value="col_caballeros">👔 En Columna Caballeros</option>
                    <option value="col_estuches-dama">🎁 En Columna Set Damas</option>
                    <option value="col_estuches-caballero">💼 En Columna Set Caballeros</option>
                  </optgroup>
                  <optgroup label="Estado y Disponibilidad">
                    <option value="visibles">👁️ Visibles en Showroom</option>
                    <option value="ocultos">🙈 Ocultos de Showroom</option>
                    <option value="instock">📦 Con Stock (Mayor a 0 u.)</option>
                    <option value="outstock">⚠️ Agotados (0 u.)</option>
                  </optgroup>
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
                        <span>Perfume / Detalles / Stock</span>
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
                        No se encontraron productos que coincidan con el filtro seleccionado.
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
                      const pStock = p.availableStock !== undefined ? p.availableStock : (p.stock || 0);

                      return (
                        <tr 
                          key={p.id}
                          className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors ${
                            !isVisibleOverall ? 'opacity-50 bg-neutral-50/40 dark:bg-neutral-950/40' : ''
                          }`}
                        >
                          {/* Column 1: Perfume (Thumbnail, Name, Brand, Size, Stock, Base Cat, Price & Discount) */}
                          <td className="py-3 px-3 w-[280px] sm:w-[340px] max-w-[340px]">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={p.image_url || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=200'}
                                alt={p.name}
                                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 shrink-0"
                              />
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider truncate max-w-[90px]">
                                    {p.brand}
                                  </span>

                                  {/* Stock Badge */}
                                  {pStock > 5 ? (
                                    <span className="px-1.5 py-0.2 text-[8px] font-extrabold font-mono rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 shrink-0">
                                      Stock: {pStock} u.
                                    </span>
                                  ) : pStock > 0 ? (
                                    <span className="px-1.5 py-0.2 text-[8px] font-extrabold font-mono rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 shrink-0">
                                      Stock: {pStock} u.
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 text-[8px] font-extrabold font-mono rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 shrink-0">
                                      Agotado
                                    </span>
                                  )}
                                  
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
        </>
      )}

      {/* TAB 2: SAVED SHOWROOM PRODUCTS TABLE */}
      {activeTab === 'saved_table' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-xs overflow-hidden p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Table className="w-5 h-5 text-amber-500" />
                Productos Publicados en Showroom (Guardados en BD)
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Lista oficial de perfumes guardados y actualmente visibles en las secciones del catálogo público.
              </p>
            </div>

            <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs font-extrabold text-amber-800 dark:text-amber-300">
              Total Activos: {savedShowroomProducts.length} perfumes
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-[11px] font-black text-neutral-600 dark:text-neutral-300 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4">Marca / Tamaño</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                  <th className="py-3 px-4 text-right">Precio Público</th>
                  <th className="py-3 px-4 text-center">Descuento (%)</th>
                  <th className="py-3 px-4">Categorías en Showroom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {savedShowroomProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400 font-medium">
                      No hay productos guardados en el Showroom actualmente.
                    </td>
                  </tr>
                ) : (
                  savedShowroomProducts.map(p => {
                    const savedCats = getProductPublicCategories(p);
                    const pStock = p.availableStock !== undefined ? p.availableStock : (p.stock || 0);
                    const disc = Number(p.publicDiscount || 0);

                    return (
                      <tr key={p.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-neutral-900 dark:text-neutral-100">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.image_url || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=200'}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover bg-neutral-100 dark:bg-neutral-800 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">{p.name}</div>
                              <div className="text-[10px] text-neutral-400 font-mono">{p.barcode || 'Sin código'}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                          <span className="font-extrabold text-amber-600 dark:text-amber-400 block text-[11px] uppercase">{p.brand}</span>
                          <span className="text-[11px] font-mono text-neutral-400">{p.size}</span>
                        </td>

                        <td className="py-3 px-4 text-center font-mono">
                          {pStock > 5 ? (
                            <span className="px-2 py-0.5 rounded-md font-extrabold text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              {pStock} u.
                            </span>
                          ) : pStock > 0 ? (
                            <span className="px-2 py-0.5 rounded-md font-extrabold text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                              {pStock} u.
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md font-extrabold text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                              Agotado (0)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                          L. {Number(p.pricePublic || 0).toLocaleString()}
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-extrabold">
                          {disc > 0 ? (
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-md">
                              -{disc}%
                            </span>
                          ) : (
                            <span className="text-neutral-400 font-normal">0%</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {savedCats.includes('damas') && (
                              <span className="px-2 py-0.5 bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 rounded-md text-[10px] font-extrabold">
                                🌸 Damas
                              </span>
                            )}
                            {savedCats.includes('caballeros') && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-md text-[10px] font-extrabold">
                                👔 Caballeros
                              </span>
                            )}
                            {savedCats.includes('estuches-dama') && (
                              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-md text-[10px] font-extrabold">
                                🎁 Set Damas
                              </span>
                            )}
                            {savedCats.includes('estuches-caballero') && (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-md text-[10px] font-extrabold">
                                💼 Set Cab.
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
