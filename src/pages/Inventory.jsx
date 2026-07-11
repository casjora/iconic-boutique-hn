import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { 
  Plus, 
  Trash2, 
  Edit, 
  RefreshCw, 
  Sparkles, 
   
  UploadCloud, 
  Loader2, 
  CheckCircle, 
  
  DollarSign,
  Package,
  FileSpreadsheet
} from 'lucide-react';
import ImageGuide from '../components/ImageGuide';

export default function Inventory() {
  const { 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    uploadPdf,
    fetchProducts,
    user
  } = useStore();

  const [loadingLocal, setLoadingLocal] = useState(false);

  // Edit / Add modal form state
  const [editingId, setEditingId] = useState(null); // null means "creating", else product id
  const [showFormModal, setShowFormModal] = useState(false);

  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formSize, setFormSize] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formPricePublic, setFormPricePublic] = useState('');
  const [formPricePromotional, setFormPricePromotional] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formCategory, setFormCategory] = useState('Damas');
  const [formBarcode, setFormBarcode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');

  // PDF Upload panel states
  const [pdfFile, setPdfFile] = useState(null);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [parsedProducts, setParsedProducts] = useState([]);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // Text / CSV Importer states
  const [showImporter, setShowImporter] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResults, setImportResults] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');

  // Filter local list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = searchTerm === '' || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [products, searchTerm]);

  const handleRefresh = async () => {
    setLoadingLocal(true);
    await fetchProducts();
    setLoadingLocal(false);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormName('');
    setFormBrand('');
    setFormSize('100 ml');
    setFormCost('');
    setFormPricePublic('');
    setFormPricePromotional('');
    setFormStock('1');
    setFormCategory('Damas');
    setFormBarcode('');
    setFormDescription('');
    setFormImageUrl('');
    setShowFormModal(true);
  };

  const openEditModal = (p) => {
    setEditingId(p.id);
    setFormName(p.name);
    setFormBrand(p.brand);
    setFormSize(p.size);
    setFormCost(p.cost.toString());
    setFormPricePublic(p.pricePublic.toString());
    setFormPricePromotional(p.pricePromotional.toString());
    setFormStock(p.stock.toString());
    setFormCategory(p.category || 'Damas');
    setFormBarcode(p.barcode || '');
    setFormDescription(p.description || '');
    setFormImageUrl(p.image_url || '');
    setShowFormModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formName || !formBrand) return;

    const data = {
      name: formName.trim(),
      brand: formBrand.trim(),
      size: formSize.trim(),
      cost: user?.role === 'owner' ? Number(formCost || 0) : (editingId ? (products.find(p => p.id === editingId)?.cost || 0) : 0),
      pricePublic: Number(formPricePublic || 0),
      pricePromotional: Number(formPricePromotional || 0),
      stock: Number(formStock || 0),
      category: formCategory,
      barcode: formBarcode.trim() || null,
      description: formDescription.trim(),
      image_url: formImageUrl.trim()
    };

    let ok;
    if (editingId) {
      ok = await updateProduct(editingId, data);
    } else {
      ok = await addProduct(data);
    }

    if (ok) {
      setShowFormModal(false);
      // reload inventory
      fetchProducts();
    }
  };

  const handleDelete = async (id, name) => {
    if (confirm(`¿Estás seguro de eliminar permanentemente el perfume: "${name}"?`)) {
      await deleteProduct(id);
    }
  };

  // Convert PDF file to base64 and invoke API
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPdfFile(file);
    setParsingPdf(true);
    setPdfSuccess(false);
    setParsedProducts([]);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      const parsed = await uploadPdf(base64, file.name);
      
      setParsingPdf(false);
      if (parsed && parsed.length > 0) {
        setParsedProducts(parsed);
        setPdfSuccess(true);
      } else {
        alert('No se pudieron extraer productos del PDF. Asegúrate de que es una factura válida y nítida.');
      }
    };
  };

  // Bulk save the scanned perfumes
  const handleSaveScanned = async () => {
    setLoadingLocal(true);
    let countNew = 0;
    let countUpdated = 0;
    for (const p of parsedProducts) {
      const existing = products.find(prod => 
        prod.name.toLowerCase().trim() === p.name.toLowerCase().trim() && 
        (prod.size || '').toLowerCase().trim() === (p.size || '').toLowerCase().trim()
      );

      if (existing) {
        const ok = await updateProduct(existing.id, {
          stock: existing.stock + Number(p.stock || 0)
        });
        if (ok) countUpdated++;
      } else {
        const ok = await addProduct({
          name: p.name,
          brand: p.brand,
          size: p.size,
          cost: p.cost,
          pricePublic: p.pricePublic,
          pricePromotional: p.pricePromotional,
          stock: p.stock,
          category: p.category || 'Damas',
          barcode: p.barcode || '',
          description: p.description || '',
          image_url: ''
        });
        if (ok) countNew++;
      }
    }
    setLoadingLocal(false);
    alert(`Se agregaron ${countNew} perfumes nuevos y se actualizaron ${countUpdated} existentes.`);
    setParsedProducts([]);
    setPdfSuccess(false);
    setPdfFile(null);
    fetchProducts();
  };

  // Bulk Import from text/CSV
  const handleTextImport = async (e) => {
    e.preventDefault();
    if (!importText.trim()) return;

    const lines = importText.split('\n');
    let successCount = 0;
    let updateCount = 0;
    let failedCount = 0;

    setLoadingLocal(true);
    setImportResults('Importando...');

    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Matches tab or semicolon or pipe delimiter
      const parts = line.split(/[;\t|]/);
      if (parts.length < 2) {
        failedCount++;
        continue;
      }

      // Column ordering map: Brand | Name | Size | Cost | PublicPrice | PromoPrice | Stock | Category
      const brand = parts[0]?.trim();
      const name = parts[1]?.trim();
      const size = parts[2]?.trim() || '100 ml';
      const cost = Number(parts[3]?.trim() || 0);
      const pricePublic = Number(parts[4]?.trim() || 0);
      const pricePromotional = Number(parts[5]?.trim() || 0);
      const stock = Number(parts[6]?.trim() || 1);
      const category = parts[7]?.trim() || 'Damas';

      if (!brand || !name) {
        failedCount++;
        continue;
      }

      const existing = products.find(prod => 
        prod.name.toLowerCase().trim() === name.toLowerCase() && 
        (prod.size || '').toLowerCase().trim() === size.toLowerCase()
      );

      if (existing) {
        const ok = await updateProduct(existing.id, {
          stock: existing.stock + stock
        });
        if (ok) updateCount++;
        else failedCount++;
      } else {
        const ok = await addProduct({
          name,
          brand,
          size,
          cost,
          pricePublic,
          pricePromotional,
          stock,
          category,
          barcode: '',
          description: '',
          image_url: ''
        });
        if (ok) successCount++;
        else failedCount++;
      }
    }

    setLoadingLocal(false);
    setImportResults(`Sincronización completada: ${successCount} nuevos, ${updateCount} actualizados. ${failedCount} líneas ignoradas.`);
    setImportText('');
    fetchProducts();
  };

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6" /> Administración de Inventario
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Agrega perfumes manuales, importa archivos de texto tabulado o utiliza el escáner inteligente de facturas PDF con IA.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowImporter(!showImporter)}
            className="inline-flex items-center gap-1 px-3.5 py-2 bg-white border border-neutral-200 text-neutral-700 text-xs font-bold rounded-xl hover:bg-neutral-50 cursor-pointer shadow-sm transition-all active:scale-95"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            {showImporter ? 'Cerrar Importador' : 'Importador Rápido CSV'}
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1 px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm hover:bg-neutral-800 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" /> Nuevo Perfume
          </button>
        </div>
      </div>

      {/* Quick Importer Panel */}
      {showImporter && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-display font-bold text-neutral-900 text-base border-b border-neutral-100 pb-2">
            Importador Masivo de Catálogo por Texto / CSV
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Pega múltiples líneas de perfumes separadas por tabuladores, punto y coma (;) o barra vertical (|). El formato debe ser estrictamente: <br />
            <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-800 font-mono font-bold">Marca;Nombre;Tamaño;Costo;Precio Público;Precio Promo;Stock;Categoría</code>
          </p>

          <form onSubmit={handleTextImport} className="space-y-3">
            <textarea
              rows={4}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all outline-none"
              placeholder={`Carolina Herrera;Good Girl;80 ml;1250;2400;1950;3;Damas&#10;Paco Rabanne;One Million;100 ml;1350;2600;2100;5;Caballeros`}
            />

            <div className="flex items-center justify-between">
              {importResults && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                  {importResults}
                </span>
              )}
              
              <button
                type="submit"
                disabled={loadingLocal || !importText.trim()}
                className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {loadingLocal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sincronizar Lote'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PDF Invoice intelligent AI Scan Widget */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-display font-bold text-neutral-900 text-base border-b border-neutral-100 pb-2 flex items-center gap-1.5">
          <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
          Escáner de Facturas PDF por Inteligencia Artificial (Gemini)
        </h3>
        
        <p className="text-xs text-neutral-500 leading-relaxed">
          Sube tu factura de importación o cotización en formato PDF. La Inteligencia Artificial de <strong>Gemini</strong> analizará el archivo en segundos, extraerá marcas, fragancias, tamaños, calculará el costo real unitario en Honduras y te generará de forma sugerida los precios óptimos en Lempiras (HNL).
        </p>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="file"
              id="invoice-pdf"
              accept=".pdf"
              onChange={handlePdfUpload}
              className="hidden"
              disabled={parsingPdf}
            />
            <label
              htmlFor="invoice-pdf"
              className="inline-flex items-center gap-2 px-5 py-3 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-bold rounded-2xl cursor-pointer transition-colors"
            >
              <UploadCloud className="h-5 w-5 text-indigo-500" />
              {pdfFile ? pdfFile.name : 'Subir Factura PDF'}
            </label>
          </div>

          {parsingPdf && (
            <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1.5">
              <Loader2 className="h-4 w-4 animate-spin" />
              La Inteligencia Artificial está escaneando tu PDF...
            </span>
          )}

          {pdfSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
              <CheckCircle className="h-4.5 w-4.5" />
              ✓ Lectura finalizada con éxito.
            </span>
          )}
        </div>

        {/* Render parsed perfumes list if any */}
        {parsedProducts.length > 0 && (
          <div className="mt-4 border border-indigo-100 bg-indigo-50/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-neutral-900 text-sm">
                Fragancias Detectadas Sugeridas ({parsedProducts.length})
              </h4>
              <button
                onClick={handleSaveScanned}
                disabled={loadingLocal}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95 disabled:opacity-50"
              >
                Confirmar y Agregar todo al Inventario
              </button>
            </div>

            <div className="overflow-x-auto border border-neutral-100 rounded-xl bg-white">
              <table className="w-full text-left text-xs divide-y divide-neutral-100">
                <thead className="bg-neutral-50 text-neutral-500 font-bold">
                  <tr>
                    <th className="p-3">Marca</th>
                    <th className="p-3">Perfume</th>
                    <th className="p-3">Tamaño</th>
                    <th className="p-3">Costo Unitario</th>
                    <th className="p-3">Precio Público (Sugerido)</th>
                    <th className="p-3">Precio VIP (Sugerido)</th>
                    <th className="p-3">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {parsedProducts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/50">
                      <td className="p-3 font-semibold text-neutral-900">{p.brand}</td>
                      <td className="p-3">{p.name}</td>
                      <td className="p-3 font-semibold text-neutral-500">{p.size}</td>
                      <td className="p-3 font-mono font-semibold text-neutral-700">L. {p.cost.toLocaleString()}</td>
                      <td className="p-3 font-mono font-bold text-neutral-900">L. {p.pricePublic.toLocaleString()}</td>
                      <td className="p-3 font-mono font-bold text-emerald-600">L. {p.pricePromotional.toLocaleString()}</td>
                      <td className="p-3 font-semibold text-neutral-600">{p.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Grid of existing products & table search */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-neutral-100">
          <h3 className="font-display font-bold text-neutral-900 text-base">Mis Productos en Inventario ({filteredProducts.length})</h3>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Buscar por marca, perfume o barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-neutral-900 w-full sm:w-64"
            />
            <button
              onClick={handleRefresh}
              className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition-all cursor-pointer"
              title="Recargar inventario"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-neutral-100 rounded-2xl bg-white">
          {filteredProducts.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-8">No se encontraron productos.</p>
          ) : (
            <table className="w-full text-left text-xs divide-y divide-neutral-100">
              <thead className="bg-neutral-50 text-neutral-500 font-bold">
                <tr>
                  <th className="p-3.5">Detalles</th>
                  <th className="p-3.5">Tamaño</th>
                  <th className="p-3.5">Categoría</th>
                  {user?.role === 'owner' && <th className="p-3.5">Costo Unitario</th>}
                  <th className="p-3.5">Público HNL</th>
                  <th className="p-3.5">Promo HNL</th>
                  <th className="p-3.5">Stock</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredProducts.map((p) => {
                  
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/50">
                      <td className="p-3.5">
                        <span className="block text-[9px] font-bold text-neutral-400 uppercase font-mono">{p.brand}</span>
                        <span className="font-bold text-neutral-900 block mt-0.5">{p.name}</span>
                        {p.barcode && <span className="text-[10px] text-neutral-400 font-mono">🔍 {p.barcode}</span>}
                      </td>
                      <td className="p-3.5 font-semibold text-neutral-600">{p.size}</td>
                      <td className="p-3.5">
                        <span className="inline-block bg-neutral-100 px-2 py-0.5 rounded text-neutral-700 font-semibold">{p.category}</span>
                      </td>
                      {user?.role === 'owner' && (
                        <td className="p-3.5 font-mono font-semibold text-neutral-700">L. {p.cost.toLocaleString()}</td>
                      )}
                      <td className="p-3.5 font-mono font-bold text-neutral-900">L. {p.pricePublic.toLocaleString()}</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-600">L. {p.pricePromotional.toLocaleString()}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          p.stock <= 0 
                            ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                          title="Editar perfume"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar perfume"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Manual Add / Edit Modal Overlay */}
      {showFormModal && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h3 className="font-display font-bold text-neutral-900 text-lg">
                {editingId ? 'Editar Perfume' : 'Agregar Nuevo Perfume'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-neutral-400 hover:text-neutral-900 font-bold text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">Marca *</label>
                  <input
                    type="text"
                    required
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                    placeholder="Ej. Carolina Herrera"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">Nombre del Perfume *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                    placeholder="Ej. Good Girl"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">Tamaño</label>
                  <input
                    type="text"
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value)}
                    className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                    placeholder="Ej. 100 ml o 3.4 oz"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">Categoría</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="block w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                  >
                    <option value="Damas">Damas</option>
                    <option value="Caballeros">Caballeros</option>
                    <option value="Unisex">Unisex</option>
                    <option value="Niños">Niños</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">Stock Físico</label>
                  <input
                    type="number"
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono"
                    placeholder="Ej. 5"
                  />
                </div>
              </div>

              <div className={`grid gap-4 ${user?.role === 'owner' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                {user?.role === 'owner' && (
                  <div>
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2  flex items-center gap-0.5">
                      <DollarSign className="h-3.5 w-3.5 text-neutral-400" /> Costo (HNL)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formCost}
                      onChange={(e) => setFormCost(e.target.value)}
                      className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono"
                      placeholder="L. Costo CIF"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 flex items-center gap-0.5">
                    <DollarSign className="h-3.5 w-3.5 text-neutral-400" /> Público (HNL)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formPricePublic}
                    onChange={(e) => setFormPricePublic(e.target.value)}
                    className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono"
                    placeholder="L. Venta al detal"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2  flex items-center gap-0.5">
                    <DollarSign className="h-3.5 w-3.5 text-neutral-400" /> Promo/VIP (HNL)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formPricePromotional}
                    onChange={(e) => setFormPricePromotional(e.target.value)}
                    className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono"
                    placeholder="L. Mayorista VIP"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">Código de Barras / UPC</label>
                <input
                  type="text"
                  value={formBarcode}
                  onChange={(e) => setFormBarcode(e.target.value)}
                  className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono"
                  placeholder="Ej. 8411061811727"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">URL de la Imagen</label>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                  placeholder="https://ejemplo.com/perfume.jpg"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  * Ver la guía técnica de optimización de imágenes debajo para cargarlas de forma gratuita en Supabase Storage.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">Descripción Detallada / Notas</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="block w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Image Guide Panel */}
      <ImageGuide />

    </div>
  );
}
