import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { 
  Eye, EyeOff, Tag, Save, Search, CheckSquare, Square, 
  Sparkles, Loader2, Filter, AlertCircle, CheckCircle2 
} from 'lucide-react';

export default function Showroom() {
  const { products, updateShowroomCuration, user } = useStore();
  const [activeTab, setActiveTab] = useState('damas');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Local state for edits before saving
  // Map of productId -> { featuredPublic: boolean, publicDiscount: number }
  const [edits, setEdits] = useState(() => {
    const initial = {};
    products.forEach(p => {
      initial[p.id] = {
        featuredPublic: Boolean(p.featuredPublic),
        publicDiscount: p.publicDiscount || 0
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
              featuredPublic: Boolean(p.featuredPublic),
              publicDiscount: p.publicDiscount || 0
            };
            hasChanges = true;
          }
        });
        return hasChanges ? next : prev;
      });
    }
  }, [products]);

  const [bulkDiscountInput, setBulkDiscountInput] = useState('');

  // Helper to categorize sets vs standard perfumes
  const isEstuche = (p) => {
    const text = (p.name + ' ' + p.description + ' ' + p.brand).toLowerCase();
    return text.includes('estuche') || text.includes('set') || text.includes('kit') || text.includes('gift set');
  };

  // Filter products into active tab category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search match
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      const setFlag = isEstuche(p);

      switch (activeTab) {
        case 'damas':
          return (p.category === 'Damas' || p.category === 'Femenino' || p.category === 'Unisex') && !setFlag;
        case 'caballeros':
          return (p.category === 'Caballeros' || p.category === 'Masculino' || p.category === 'Unisex') && !setFlag;
        case 'estuches-dama':
          return (p.category === 'Damas' || p.category === 'Femenino' || p.category === 'Unisex') && setFlag;
        case 'estuches-caballero':
          return (p.category === 'Caballeros' || p.category === 'Masculino' || p.category === 'Unisex') && setFlag;
        default:
          return true;
      }
    });
  }, [products, activeTab, search]);

  const handleToggleProduct = (id) => {
    setEdits(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        featuredPublic: !prev[id]?.featuredPublic
      }
    }));
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

  const handleSelectAllInTab = (selectVal) => {
    setEdits(prev => {
      const next = { ...prev };
      filteredProducts.forEach(p => {
        next[p.id] = {
          ...next[p.id],
          featuredPublic: selectVal
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
    
    // Compare edits with the original products array to only send actual changes
    const payload = [];
    Object.entries(edits).forEach(([id, val]) => {
      const original = products.find(p => p.id === id);
      if (original) {
        const hasFeaturedChanged = Boolean(original.featuredPublic) !== Boolean(val.featuredPublic);
        const hasDiscountChanged = Number(original.publicDiscount || 0) !== Number(val.publicDiscount || 0);
        
        if (hasFeaturedChanged || hasDiscountChanged) {
          payload.push({
            id,
            featuredPublic: val.featuredPublic,
            publicDiscount: val.publicDiscount
          });
        }
      }
    });

    if (payload.length === 0) {
      setSaving(false);
      setSuccessMsg('No hay cambios pendientes por guardar.');
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }

    const ok = await updateShowroomCuration(payload);
    setSaving(false);
    if (ok) {
      setSuccessMsg(`¡Selección de Plan Público guardada exitosamente (${payload.length} productos actualizados)!`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } else {
      setErrorMsg('Error de base de datos (recursión en RLS detectada). Por favor, ejecuta la actualización de seguridad en Supabase para habilitar la curaduría.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-amber-200 dark:border-amber-800/50">
                Plan Público (Vendedores & Dueños)
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
              Curaduría de Productos & Ofertas
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl">
              Selecciona qué fragancias estarán visibles para el <strong className="text-neutral-900 dark:text-neutral-200">público general sin iniciar sesión</strong> y asigna descuentos especiales a la vista.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 font-extrabold text-sm rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Cambios
          </button>
        </div>

        {successMsg && (
          <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 rounded-2xl space-y-2 text-xs text-rose-800 dark:text-rose-300">
            <div className="flex items-center gap-2.5 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Error al guardar cambios de Plan Público</span>
            </div>
            <p className="pl-6 text-[11px] leading-relaxed opacity-90">
              Se ha detectado un error de recursión en las políticas de seguridad (RLS) de Supabase en tu base de datos de producción.
              Para solucionarlo, copia el código SQL de <strong>supabase_schema.sql</strong> y ejecútalo en el editor SQL de tu panel de Supabase.
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        {[
          { id: 'damas', label: 'Damas' },
          { id: 'caballeros', label: 'Caballeros' },
          { id: 'estuches-dama', label: 'Estuches para Dama' },
          { id: 'estuches-caballero', label: 'Estuches para Caballero' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-neutral-900 dark:bg-amber-400 text-white dark:text-neutral-950 shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 border border-neutral-200 dark:border-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar: Search + Bulk Controls */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por marca o nombre..."
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        {/* Bulk controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={() => handleSelectAllInTab(true)}
            className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
            Visibles Todos
          </button>

          <button
            onClick={() => handleSelectAllInTab(false)}
            className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 text-rose-500" />
            Ocultar Todos
          </button>

          <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-200 dark:border-neutral-700">
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Desc %"
              value={bulkDiscountInput}
              onChange={(e) => setBulkDiscountInput(e.target.value)}
              className="w-20 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-bold text-center text-neutral-900 dark:text-neutral-100"
            />
            <button
              onClick={handleApplyBulkDiscount}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-extrabold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Aplicar Desc.
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Items */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8">
          <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">No se encontraron productos en esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(p => {
            const edit = edits[p.id] || { featuredPublic: true, publicDiscount: 0 };
            const isVisible = edit.featuredPublic;
            const discountPct = edit.publicDiscount;
            const finalPrice = discountPct > 0 ? p.pricePublic * (1 - discountPct / 100) : p.pricePublic;

            return (
              <div 
                key={p.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isVisible 
                    ? 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-2xs' 
                    : 'bg-neutral-50/60 dark:bg-neutral-950/40 border-neutral-200/60 dark:border-neutral-800/40 opacity-70'
                }`}
              >
                <div className="flex gap-3">
                  <img
                    src={p.image_url || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&q=80&w=200'}
                    alt={p.name}
                    className="w-16 h-16 rounded-xl object-cover bg-neutral-100 dark:bg-neutral-800 shrink-0 border border-neutral-200 dark:border-neutral-800"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block truncate">
                      {p.brand}
                    </span>
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                      {p.size} • Stock: {p.stock} u.
                    </p>
                    <div className="mt-1 flex items-baseline gap-2 font-mono text-xs">
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        L. {finalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {discountPct > 0 && (
                        <span className="text-[10px] text-neutral-400 line-through">
                          L. {p.pricePublic.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
                  {/* Visibility Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleProduct(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isVisible 
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80' 
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    {isVisible ? <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-neutral-400" />}
                    {isVisible ? 'Público' : 'Oculto'}
                  </button>

                  {/* Discount input */}
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">Desc:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPct}
                      onChange={(e) => handleDiscountChange(p.id, e.target.value)}
                      className="w-14 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-bold text-center text-neutral-900 dark:text-neutral-100 focus:outline-none"
                    />
                    <span className="text-xs font-bold text-neutral-500">%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
