import React, { useState } from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { isProductSet } from '.././utils/porductHelper';
import PerfumeCard from '../components/PerfumeCard';
import { 
  Search, 
  Sparkles, 
  Award, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  X,
  FileCheck2
} from 'lucide-react';

export default function CatalogView() {
  const { 
    products, 
    user, 
    setView,
    searchTerm, 
    setSearchTerm, 
    categoryFilter, 
    setCategoryFilter,
    brandFilter,
    setBrandFilter
  } = useStore();

  const [showPrintModal, setShowPrintModal] = useState(false);

  const isClient = user?.role === 'client';
  const isEmployee = user?.role === 'owner' || user?.role === 'vendedor';

  // Extract unique brands present in the stock database for filters
  const uniqueBrands = ['Todas', ...Array.from(new Set(products.map(p => p.brand)))];

  // Filters logic
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm);
    
    const matchesCategory = 
      categoryFilter === 'Todos' || 
      (categoryFilter === 'Sets 🎁' ? isProductSet(product) : product.category === categoryFilter);
      
    const matchesBrand = brandFilter === 'Todas' || product.brand === brandFilter;

    return matchesSearch && matchesCategory && matchesBrand;
  });

  // Export 3-column Catalog to Excel / CSV
  const downloadCSV = () => {
    const headers = ['Fragancia (Marca y Nombre)', 'Tamaño', 'Precio de Mayoreo (VIP)', 'Precio de Detalle (Publico)'];
    const rows = products.map(p => [
      `"${p.brand} - ${p.name}${isProductSet(p) ? ' 🎁 [SET]' : ''}"`,
      `"${p.size}"`,
      p.pricePromotional,
      p.pricePublic
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Catalogo_Iconic_Boutique_HN.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable catalog triggered via beautiful print overlay modal
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Promo Banner / Auth Status Banner */}
      {isClient ? (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-emerald-900 text-lg">
                ¡Bienvenido a tu Tarifa VIP de Honduras!
              </h3>
              <p className="text-xs text-emerald-700">
                Tu sesión como Distribuidor/Cliente está activa. Estás visualizando los precios de distribuidor con descuentos ya aplicados.
              </p>
            </div>
          </div>
          <div className="font-mono text-xs font-bold text-emerald-800 bg-white border border-emerald-200 px-4 py-2 rounded-xl">
            Descuento Activo
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-amber-100 bg-amber-50/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600 text-white rounded-2xl">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-amber-900 text-lg">
                ¿Vendes Perfumes o Compras en Cantidad?
              </h3>
              <p className="text-xs text-amber-700">
                Inicia sesión o regístrate para activar la tarifa promocional de Distribuidor VIP y ahorra más de L. 500 por frasco.
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            Obtener Tarifa VIP
          </Link>
        </div>
      )}

      {/* Catalog & Filter Tools Bar */}
      <div className="bg-white rounded-3xl border border-neutral-200 p-5 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="grid gap-3 sm:grid-cols-3 flex-1">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute top-2.5 left-3.5 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar perfume, marca o código..."
                className="w-full rounded-xl border border-neutral-200 pl-10 pr-4 py-2 text-xs focus:border-neutral-900 focus:outline-none"
              />
            </div>

            {/* Gender Filters */}
            <div className="flex gap-1.5 overflow-x-auto">
              {['Todos', 'Masculino', 'Femenino', 'Unisex', 'Sets 🎁'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-neutral-900 text-white shadow-sm'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Brands Filter */}
            <div className="relative">
              <span className="absolute top-2 left-3 text-[10px] font-bold text-neutral-400">Marca:</span>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 pl-12 pr-4 py-1.5 text-xs focus:border-neutral-900 focus:outline-none bg-white font-semibold text-neutral-800"
              >
                {uniqueBrands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Export and Print Buttons (Excluding Cost Column) */}
          <div className="flex flex-wrap gap-2 pt-2 md:pt-0">
            <button
              onClick={downloadCSV}
              className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              title="Descargar catálogo compatible con Microsoft Excel"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Exportar Excel (3 col.)</span>
            </button>
            <button
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              title="Ver catálogo listo para guardar en PDF"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Perfume List Grid */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 print:hidden">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-neutral-200 bg-white p-12 text-center text-neutral-400 font-medium">
            No se encontraron perfumes que coincidan con los filtros seleccionados. Intenta de nuevo con otros términos de búsqueda.
          </div>
        ) : (
          filteredProducts.map((p) => (
            <PerfumeCard key={p.id} product={p} />
          ))
        )}
      </div>

      {/* Print View Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0">
          <div className="bg-white rounded-3xl border border-neutral-200 w-full max-w-4xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-8 print:border-0 print:shadow-none print:my-0">
            
            {/* Modal Actions */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-emerald-600" />
                <h3 className="font-display font-bold text-neutral-900 text-lg">Catálogo de Clientes (HNL)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> Imprimir o Guardar PDF
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="bg-neutral-100 hover:bg-neutral-200 p-2 rounded-full text-neutral-600 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Area content */}
            <div className="space-y-6 font-sans">
              <div className="text-center pb-4 border-b-2 border-neutral-900">
                <h1 className="font-display text-3xl font-black text-neutral-900 tracking-tight uppercase">Iconic Boutique HN</h1>
                <p className="text-xs text-neutral-500 font-medium mt-1">Perfumería de Alta Gama Originales e Importados • WhatsApp: +504 9830-9309</p>
                <p className="text-[10px] text-neutral-400 font-mono mt-0.5 uppercase tracking-wide">Tegucigalpa, Honduras • Lista de Precios Oficial</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-neutral-300 bg-neutral-50 text-neutral-700 font-bold font-mono">
                      <th className="py-2.5 px-2">Fragancia / Marca y Nombre</th>
                      <th className="py-2.5 px-2 text-center">Tamaño</th>
                      <th className="py-2.5 px-2 text-right">Precio de Mayoreo (VIP)</th>
                      <th className="py-2.5 px-2 text-right">Precio de Detalle (Público)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, index) => {
                      const isSet = isProductSet(p);
                      return (
                        <tr key={p.id} className={`border-b border-neutral-100 hover:bg-neutral-50/50 ${index % 2 === 0 ? 'bg-neutral-50/20' : ''} ${isSet ? 'bg-indigo-50/20' : ''}`}>
                          <td className="py-2 px-2 text-neutral-900 font-semibold">
                            <span className="text-neutral-400 font-mono text-[10px] mr-1">{(index + 1).toString().padStart(2, '0')}</span>
                            {isSet && <span className="mr-1">🎁</span>}
                            {p.brand} - {p.name}
                          </td>
                          <td className="py-2 px-2 text-center text-neutral-600 font-mono">{p.size}</td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-neutral-800">L. {p.pricePromotional.toLocaleString()}</td>
                          <td className="py-2 px-2 text-right font-mono font-extrabold text-emerald-600">L. {p.pricePublic.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="text-center pt-6 border-t border-neutral-200 text-[10px] text-neutral-400 font-medium space-y-1">
                <p>⚠️ Precios válidos y sujetos a disponibilidad de inventario. Excluye costos de envío externos.</p>
                <p>© {new Date().getFullYear()} Iconic Boutique HN. Catálogo Exclusivo para Clientes y Revendedores.</p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
