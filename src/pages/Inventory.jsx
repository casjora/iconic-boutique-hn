import { useState, useMemo } from 'react';
import { useStore } from '../store';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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
    saveProductsBulk,
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

  const normalizeString = (str) => {
    if (!str) return '';
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
  };

  const isTester = (str) => {
    if (!str) return false;
    const s = str.toLowerCase();
    return s.includes('tester') || s.includes('tstr');
  };

  const convertOzToMl = (sizeStr) => {
    if (!sizeStr) return '';
    let str = sizeStr.toLowerCase().trim();
    if (str.includes('oz')) {
      const match = str.match(/([\d.]+)\s*oz/);
      if (match) {
        const oz = parseFloat(match[1]);
        if (oz === 3.4 || oz === 3.3) return '100 ml';
        if (oz === 1.7 || oz === 1.6) return '50 ml';
        if (oz === 6.8 || oz === 6.7) return '200 ml';
        if (oz === 5.0 || oz === 5.1) return '150 ml';
        if (oz === 1.0 || oz === 1.1) return '30 ml';
        if (oz === 4.2 || oz === 4.0) return '125 ml';
        if (oz === 2.5) return '75 ml';
        return `${Math.round(oz * 30)} ml`;
      }
    }
    return sizeStr.replace(/mls?/g, 'ml').trim();
  };

  const enrichAndMatchProducts = (newProductsList) => {
    return newProductsList.map(p => {
      // Basic normalization
      const pName = normalizeString(p.name);
      const pSize = convertOzToMl(p.size);
      const pIsTester = isTester(pName) || isTester(pSize);

      let bestMatch = null;

      for (const prod of products) {
        const existName = normalizeString(prod.name);
        const existSize = convertOzToMl(prod.size);
        const existIsTester = isTester(existName) || isTester(existSize);

        // Name and tester status must match exactly
        // Example: Acqua di Gio != Acqua di Gio Tester
        if (existName === pName && existIsTester === pIsTester) {
          // If sizes match precisely after conversion
          if (existSize === pSize) {
            bestMatch = prod;
            break;
          }
        }
      }

      if (bestMatch) {
        return {
          ...p,
          size: pSize, // standardized
          matchStatus: 'exact_match',
          existingId: bestMatch.id,
          // Use existing pricing, but allow cost update if it changed
          pricePublic: bestMatch.pricePublic,
          pricePromotional: bestMatch.pricePromotional,
          brand: bestMatch.brand,
          category: bestMatch.category
        };
      } else {
        return {
          ...p,
          size: pSize, // standardized
          matchStatus: 'new'
        };
      }
    });
  };

  // PDF/CSV Upload panel states
  const [pdfFile, setPdfFile] = useState(null);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [parsedProducts, setParsedProducts] = useState([]);
  const [pdfSuccess, setPdfSuccess] = useState(false);

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

  const handleGenerateBarcode = () => {
    const randomBarcode = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    setFormBarcode(randomBarcode);
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
        setParsedProducts(enrichAndMatchProducts(parsed));
        setPdfSuccess(true);
      } else {
        alert('No se pudieron extraer productos del PDF. Asegúrate de que es una factura válida y nítida.');
      }
    };
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPdfFile(file);
    setParsingPdf(true);
    setPdfSuccess(false);
    setParsedProducts([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;

      if (file.name.endsWith('.csv')) {
        Papa.parse(bstr, {
          header: false,
          skipEmptyLines: true,
          complete: (results) => {
             processExtractedDataArrays(results.data);
          }
        });
      } else {
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
        processExtractedDataArrays(rawData);
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const parseProductString = (rawStr) => {
    let name = rawStr.replace(/^\d+\s*/, '').replace(/^"|"$/g, '').trim();
    let size = '100 ml';
    let category = 'Damas';
    let brand = 'Otras Marcas';

    const knownBrands = [
      'Afnan', 'Al Haramain', 'Animale', 'Antonio Banderas', 'Ariana Grande', 'Armaf', 'Azzaro',
      'Benetton', 'Bharara', 'Boucheron', 'Burberry', 'Cacharel', 'Calvin Klein', 'Carolina Herrera',
      'Chloe', 'Christian Dior', 'Clinique', 'Davidoff', 'Dolce & Gabbana', 'Elizabeth Arden',
      'Elizabeth Taylor', 'Emper', 'Fragrance World', 'French Avenue', 'Giorgio Armani', 'Giorgio Valenti',
      'Givenchy', 'Gucci', 'Guess', 'Hugo Boss', 'Issey Miyake', 'Jean Paul Gaultier', 'Jennifer Lopez',
      'Juicy Couture', 'Kenneth Cole', 'Lacoste', 'Lancome', 'Lattafa', 'Liz Claiborne', 'Marc Jacobs',
      'Mont Blanc', 'Moschino', 'Nautica', 'Orientica', 'Paco Rabanne', 'Paris Hilton', 'Patek Maison',
      'Perry Ellis', 'Prada', 'Ralph Lauren', 'Rasasi', 'Salvatore Ferragamo', 'Ted Lapidus', 'Thierry Mugler',
      'Tommy Hilfiger', 'Valentino', 'Versace', 'Yves Saint Laurent', 'Bottega Veneta', 'Rochas'
    ];

    const upperStr = name.toUpperCase();
    for (const b of knownBrands) {
      if (upperStr.includes(b.toUpperCase())) {
        brand = b;
        break;
      }
    }

    const sizeMatch = upperStr.match(/(\d+(?:\.\d+)?)\s*(ML|OZ)/);
    if (sizeMatch) {
      size = `${sizeMatch[1]} ${sizeMatch[2].toLowerCase()}`;
    }

    if (upperStr.includes('MEN') || upperStr.includes('POUR HOMME') || upperStr.includes('CABALLERO') || upperStr.includes('BOY')) {
      category = 'Caballeros';
    } else if (upperStr.includes('UNISEX')) {
      category = 'Unisex';
    }

    return { brand, name, size, category };
  };

  const processExtractedDataArrays = (data) => {
    if (!data || data.length === 0) {
      alert('El archivo está vacío.');
      setParsingPdf(false);
      return;
    }

    const parsed = [];
    
    // Check if the first row looks like headers
    const firstRowStr = data[0].join(' ').toLowerCase();
    const hasHeaders = firstRowStr.includes('marca') || firstRowStr.includes('precio') || firstRowStr.includes('costo') || firstRowStr.includes('perfume');
    
    const startIndex = hasHeaders ? 1 : 0;

    for (let i = startIndex; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      let nameStr = String(row[0] || '').trim();
      if (!nameStr) continue;

      let pStock = 1, pVip = 0, pRetail = 0, pCost = 0;
      
      let fullText = "";
      const numbers = [];
      
      for (const cell of row) {
        if (cell === null || cell === undefined) continue;
        const s = String(cell).trim();
        const num = Number(s.replace(/,/g, ''));
        if (isNaN(num) || s === '') {
           fullText += s + " ";
        } else {
           numbers.push(num);
        }
      }

      if (row.length === 1 && typeof row[0] === 'string') {
        const parts = row[0].split(/[;\t]/);
        if (parts.length > 1) {
          fullText = "";
          numbers.length = 0;
          for (const cell of parts) {
            const s = String(cell).trim();
            const num = Number(s.replace(/,/g, ''));
            if (isNaN(num) || s === '') {
               fullText += s + " ";
            } else {
               numbers.push(num);
            }
          }
        }
      }

      fullText = fullText.trim();
      if (!fullText && numbers.length > 0) {
         continue;
      }
      
      const { brand, name, size, category } = parseProductString(fullText || nameStr);

      if (numbers.length >= 3) {
         const len = numbers.length;
         pStock = numbers[len - 3];
         pVip = numbers[len - 2];
         pRetail = numbers[len - 1];
      } else if (numbers.length === 2) {
         pStock = numbers[0];
         pRetail = numbers[1];
      } else if (numbers.length === 1) {
         pStock = numbers[0];
      }

      parsed.push({
        brand,
        name,
        size,
        cost: pCost,
        pricePromotional: pVip,
        pricePublic: pRetail,
        stock: pStock,
        category
      });
    }

    if (parsed.length === 0) {
      alert('No se pudieron extraer productos. Asegúrate de que las columnas tengan nombres o información válida.');
      setParsingPdf(false);
      setPdfSuccess(false);
      return;
    }

    setParsedProducts(enrichAndMatchProducts(parsed));
    setParsingPdf(false);
    setPdfSuccess(true);
  };

  const handleUpdateParsedStatus = (index, matchStatus, existingId) => {
    const updated = [...parsedProducts];
    updated[index].matchStatus = matchStatus;
    updated[index].existingId = existingId;
    
    if (matchStatus === 'exact_match' && existingId) {
       const bestMatch = products.find(p => p.id === existingId);
       if (bestMatch) {
         updated[index].pricePublic = bestMatch.pricePublic;
         updated[index].pricePromotional = bestMatch.pricePromotional;
       }
    }

    setParsedProducts(updated);
  };

  // Bulk save the scanned perfumes
  const handleSaveScanned = async () => {
    setLoadingLocal(true);
    const inserts = [];
    const updates = [];
    
    for (const p of parsedProducts) {
      if (p.matchStatus === 'exact_match' && p.existingId) {
        const existing = products.find(prod => prod.id === p.existingId);
        if (existing) {
          updates.push({
            id: existing.id,
            stock: existing.stock + Number(p.stock || 0),
            cost: p.cost > 0 ? p.cost : existing.cost
          });
        }
      } else {
        inserts.push({
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
      }
    }
    
    const res = await saveProductsBulk(inserts, updates);
    setLoadingLocal(false);
    
    if (res.success) {
      alert(`Se agregaron ${res.countNew} perfumes nuevos y se actualizaron ${res.countUpdated} existentes.`);
      setParsedProducts([]);
      setPdfSuccess(false);
      setPdfFile(null);
    } else {
      alert('Hubo un error al guardar los productos: ' + res.error);
    }
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
            onClick={openAddModal}
            className="inline-flex items-center gap-1 px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm hover:bg-neutral-800 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" /> Nuevo Perfume
          </button>
        </div>
      </div>

      {/* Import / AI Scan Widget */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-display font-bold text-neutral-900 text-base border-b border-neutral-100 pb-2 flex items-center gap-1.5">
          <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
          Importador Inteligente (Facturas PDF, CSV y Excel)
        </h3>
        
        <p className="text-xs text-neutral-500 leading-relaxed">
          Sube tu inventario desde un archivo CSV/Excel o utiliza una Factura PDF. El sistema detectará automáticamente coincidencias con tu inventario actual para evitar duplicados y unificar existencias. En caso de archivos PDF, se utilizará Inteligencia Artificial para extraer la información.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="file"
              id="inventory-csv"
              accept=".csv, .xlsx, .xls"
              onChange={handleCsvUpload}
              className="hidden"
              disabled={parsingPdf}
            />
            <label
              htmlFor="inventory-csv"
              className="inline-flex items-center gap-2 px-5 py-3 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-bold rounded-2xl cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
              Subir CSV / Excel
            </label>
          </div>

          <span className="text-xs text-neutral-400 font-bold">Ó</span>

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
              Escanear Factura PDF
            </label>
          </div>

          {pdfFile && (
            <span className="text-xs font-bold text-neutral-600 bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200 ml-2">
              Archivo seleccionado: {pdfFile.name}
            </span>
          )}

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h4 className="font-display font-bold text-neutral-900 text-sm">
                Productos Detectados ({parsedProducts.length})
              </h4>
              <button
                onClick={handleSaveScanned}
                disabled={loadingLocal}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95 disabled:opacity-50"
              >
                Confirmar y Agregar al Inventario
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto border border-neutral-100 rounded-xl bg-white">
              <table className="w-full text-left text-[11px] divide-y divide-neutral-100">
                <thead className="bg-neutral-50 text-neutral-500 font-bold">
                  <tr>
                    <th className="p-3">Estado / Acción</th>
                    <th className="p-3">Marca y Perfume</th>
                    <th className="p-3">Presentación</th>
                    <th className="p-3">Costo</th>
                    <th className="p-3">Público Sug.</th>
                    <th className="p-3">VIP Sug.</th>
                    <th className="p-3 text-center">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {parsedProducts.map((p, idx) => (
                    <tr key={idx} className={p.matchStatus === 'exact_match' ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : 'hover:bg-neutral-50/50'}>
                      <td className="p-3 w-64">
                        <select 
                          value={p.matchStatus === 'exact_match' ? p.existingId : 'new'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'new') {
                              handleUpdateParsedStatus(idx, 'new', null);
                            } else {
                              handleUpdateParsedStatus(idx, 'exact_match', val);
                            }
                          }}
                          className={`w-full truncate text-[10px] font-bold px-2 py-1.5 rounded-lg border outline-none ${
                            p.matchStatus === 'exact_match' 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}
                        >
                          <option value="new">+ Crear como Nuevo</option>
                          <optgroup label="Unir a existente:">
                            {products.map(prod => (
                              <option key={prod.id} value={prod.id}>
                                {prod.brand} - {prod.name} ({prod.size})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        <div className="text-[9px] text-neutral-500 mt-1 font-semibold">
                          {p.matchStatus === 'exact_match' ? 'Actualizará stock y costo' : 'Creará nuevo producto'}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="block text-[9px] font-bold text-neutral-400 uppercase font-mono truncate max-w-[120px]">{p.brand}</span>
                        <span className="font-semibold text-neutral-900 block truncate max-w-[150px]">{p.name}</span>
                      </td>
                      <td className="p-3 font-semibold text-neutral-500 whitespace-nowrap">{p.size}</td>
                      <td className="p-3 font-mono font-semibold text-neutral-700 whitespace-nowrap">
                        L. {p.cost.toLocaleString()}
                      </td>
                      <td className="p-3 font-mono font-bold text-neutral-900 whitespace-nowrap">
                        L. {p.pricePublic.toLocaleString()}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-600 whitespace-nowrap">
                        L. {p.pricePromotional.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-block bg-neutral-100 px-2 py-0.5 rounded font-bold text-neutral-700">
                          +{p.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden space-y-3">
              {parsedProducts.map((p, idx) => (
                <div key={idx} className={`border rounded-xl p-4 ${p.matchStatus === 'exact_match' ? 'bg-emerald-50/20 border-emerald-100' : 'bg-white border-neutral-100 shadow-sm'}`}>
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="flex-1 overflow-hidden">
                      <span className="block text-[10px] font-bold text-neutral-400 uppercase font-mono truncate">{p.brand}</span>
                      <span className="font-bold text-neutral-900 text-sm block truncate">{p.name}</span>
                      <span className="text-xs font-semibold text-neutral-500 mt-0.5 block">{p.size} • +{p.stock} Uds</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <select 
                      value={p.matchStatus === 'exact_match' ? p.existingId : 'new'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'new') {
                          handleUpdateParsedStatus(idx, 'new', null);
                        } else {
                          handleUpdateParsedStatus(idx, 'exact_match', val);
                        }
                      }}
                      className={`w-full truncate text-xs font-bold px-3 py-2.5 rounded-lg border outline-none ${
                        p.matchStatus === 'exact_match' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <option value="new">+ Crear como Nuevo</option>
                      <optgroup label="Unir a existente:">
                        {products.map(prod => (
                          <option key={prod.id} value={prod.id}>
                            {prod.brand} - {prod.name} ({prod.size})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <div className="text-[10px] text-neutral-500 mt-1 font-semibold">
                      {p.matchStatus === 'exact_match' ? 'Actualizará stock y costo' : 'Creará nuevo producto'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-neutral-50/80 p-2.5 rounded-lg border border-neutral-100">
                    <div>
                      <span className="block text-[9px] font-bold text-neutral-400 uppercase">Costo</span>
                      <span className="font-mono text-xs font-semibold text-neutral-700">L. {p.cost.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-neutral-400 uppercase">Público</span>
                      <span className="font-mono text-xs font-bold text-neutral-900">L. {p.pricePublic.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-neutral-400 uppercase">VIP</span>
                      <span className="font-mono text-xs font-bold text-emerald-600">L. {p.pricePromotional.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
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

        <div className="border border-neutral-100 rounded-2xl bg-white shadow-sm overflow-hidden">
          {filteredProducts.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-8">No se encontraron productos.</p>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden lg:block overflow-x-auto">
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
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden flex flex-col divide-y divide-neutral-100">
                {filteredProducts.map((p) => (
                  <div key={p.id} className="p-4 hover:bg-neutral-50/50 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase font-mono">{p.brand}</span>
                          <span className="inline-block bg-neutral-100 px-1.5 py-0.5 rounded text-[9px] text-neutral-600 font-bold">{p.category}</span>
                        </div>
                        <span className="font-bold text-neutral-900 text-sm block">{p.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold text-neutral-600">{p.size}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            p.stock <= 0 
                              ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {p.stock} en stock
                          </span>
                        </div>
                        {p.barcode && <span className="text-[10px] text-neutral-400 font-mono mt-1 block">🔍 {p.barcode}</span>}
                      </div>
                      
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-2 bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="p-2 bg-rose-50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-neutral-50/80 p-2.5 rounded-lg border border-neutral-100 mt-1">
                      {user?.role === 'owner' ? (
                        <>
                          <div>
                            <span className="block text-[9px] font-bold text-neutral-400 uppercase">Costo</span>
                            <span className="font-mono text-xs font-semibold text-neutral-700">L. {p.cost.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-neutral-400 uppercase">Público</span>
                            <span className="font-mono text-xs font-bold text-neutral-900">L. {p.pricePublic.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-neutral-400 uppercase">VIP</span>
                            <span className="font-mono text-xs font-bold text-emerald-600">L. {p.pricePromotional.toLocaleString()}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="col-span-1">
                            <span className="block text-[9px] font-bold text-neutral-400 uppercase">Público</span>
                            <span className="font-mono text-xs font-bold text-neutral-900">L. {p.pricePublic.toLocaleString()}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="block text-[9px] font-bold text-neutral-400 uppercase">VIP</span>
                            <span className="font-mono text-xs font-bold text-emerald-600">L. {p.pricePromotional.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
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
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block flex items-center gap-0.5">
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
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block flex items-center gap-0.5">
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
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block flex items-center gap-0.5">
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
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Código de Barras / UPC</label>
                  <button 
                    type="button" 
                    onClick={handleGenerateBarcode}
                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100 transition-colors"
                  >
                    Auto-Generar
                  </button>
                </div>
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
