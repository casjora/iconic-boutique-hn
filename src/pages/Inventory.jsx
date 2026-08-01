import { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { 
  Plus, Edit2, Trash2, FileUp, Loader2, RefreshCw, 
  Search, AlertTriangle, PlayCircle, 
  AlertCircle, Check, Percent, Download, Share2,
  FileDown, FileSpreadsheet, FileText, X
} from 'lucide-react';
import { isProductSet, getProductPromoDiscount, cleanProductDescription, getProductPromoDetalle, getProductPromoMayorista, setProductPromotions, getProductPrices } from '../utils/productHelper';
import { generateBarcodeSVG } from '../utils/barcode';

export default function Inventory() {
  const { 
    products, addProduct, updateProduct, deleteProduct, 
    uploadPdf, saveProductsBulk, applyBulkDiscount, loading, error, setError,
    user
  } = useStore();

  const isOwner = user?.role === 'owner' || user?.role === 'dueño';
  const isVendedor = user?.role === 'vendedor';

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  // Slide-over or Modal states for single product CRUD
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formSize, setFormSize] = useState('100 ml');
  const [formCost, setFormCost] = useState('');
  const [formPricePublic, setFormPricePublic] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formCategory, setFormCategory] = useState('Damas');
  const [formBarcode, setFormBarcode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formPromoDetalle, setFormPromoDetalle] = useState('');
  const [formPromoMayorista, setFormPromoMayorista] = useState('');

  // AI PDF upload flow states
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBase64, setPdfBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [aiModel, setAiModel] = useState('gemini-3.6-flash');
  
  // Progress & State trackers for AI uploading
  const [isParsing, setIsParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState('');
  const [parsedProducts, setParsedProducts] = useState([]);
  const [isDrafting, setIsDrafting] = useState(false);
  
  // Retry / Fail states for fallback mechanics
  const [parsingFailed, setParsingFailed] = useState(false);
  const [failedPageIdx, setFailedPageIdx] = useState(0);
  const [pagesText, setPagesText] = useState(null);
  const [accumulatedProducts, setAccumulatedProducts] = useState([]);
  const [failedError, setFailedError] = useState('');

  const abortControllerRef = useRef(null);

  // Client Catalog Export States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportRange, setExportRange] = useState('filtered');
  const [includeVIP, setIncludeVIP] = useState(true);
  const [includeDiscount, setIncludeDiscount] = useState(true);
  const [additionalDiscount, setAdditionalDiscount] = useState(0);
  const [groupByBrand, setGroupByBrand] = useState(true);
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [includeImages, setIncludeImages] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const enrichAndSetParsedProducts = (rawItems) => {
    if (!rawItems || !Array.isArray(rawItems)) {
      setParsedProducts([]);
      return;
    }
    const enriched = rawItems.map(item => {
      const dName = (item.name || '').toLowerCase().trim();
      const dBrand = (item.brand || '').toLowerCase().trim();
      const dSize = (item.size || '').toLowerCase().trim();

      let matched = products.find(p => 
        (p.brand || '').toLowerCase().trim() === dBrand &&
        (p.name || '').toLowerCase().trim() === dName &&
        (p.size || '').toLowerCase().trim() === dSize
      );
      
      let matchType = 'none';
      if (matched) {
        matchType = 'exact';
      } else {
        matched = products.find(p => 
          (p.brand || '').toLowerCase().trim() === dBrand &&
          (p.name || '').toLowerCase().trim() === dName
        );
        if (matched) {
          matchType = 'name-only';
        } else {
          matched = products.find(p => {
            const pName = (p.name || '').toLowerCase().trim();
            const pBrand = (p.brand || '').toLowerCase().trim();
            if (pBrand !== dBrand) return false;
            return pName.includes(dName) || dName.includes(pName);
          });
          if (matched) {
            matchType = 'fuzzy';
          }
        }
      }

      let localCategory = item.category || 'Damas';
      if (matched) {
        if (matched.category === 'Masculino') localCategory = 'Caballeros';
        else if (matched.category === 'Unisex') localCategory = 'Unisex';
        else localCategory = 'Damas';
      }

      return {
        ...item,
        matchedProductId: matched ? matched.id : 'new',
        matchType: matchType,
        cost: item.cost || (matched ? matched.cost : 0),
        pricePublic: item.pricePublic || (matched ? matched.pricePublic : 0),
        pricePromotional: item.pricePromotional || (matched ? matched.pricePromotional : 0),
        category: localCategory
      };
    });

    setParsedProducts(enriched);
  };

  const handleCancelAiAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsParsing(false);
      setParsingProgress('');
      setError('Análisis de IA cancelado por el usuario.');
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm.trim() ||
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        (p.barcode || '').toLowerCase().includes(term);

      const matchesBrand = selectedBrand === 'Todas' || p.brand?.trim() === selectedBrand;
      const pCat = p.category?.trim();
      const matchesCategory = selectedCategory === 'Todas'
        ? true
        : selectedCategory === 'Damas'
          ? (pCat === 'Damas' || pCat === 'Femenino' || pCat === 'Unisex')
          : selectedCategory === 'Caballeros'
            ? (pCat === 'Caballeros' || pCat === 'Masculino' || pCat === 'Unisex')
            : pCat === selectedCategory;

      return matchesSearch && matchesBrand && matchesCategory;
    });
  }, [products, searchTerm, selectedBrand, selectedCategory]);

  const uniqueBrands = useMemo(() => {
    const brands = products.map(p => p.brand?.trim()).filter(Boolean);
    return ['Todas', ...new Set(brands)].sort((a, b) => a.localeCompare(b));
  }, [products]);

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
      setError('El archivo está vacío o no contiene filas legibles.');
      setIsParsing(false);
      return;
    }

    try {
      const parsed = [];
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

        const finalSize = convertOzToMl(size);

        parsed.push({
          brand,
          name,
          size: finalSize,
          cost: pCost,
          pricePromotional: pVip,
          pricePublic: pRetail,
          stock: pStock,
          category
        });
      }

      if (parsed.length === 0) {
        setError('No se pudieron extraer productos. Asegúrate de que el archivo CSV/Excel contenga registros estructurados.');
        setIsParsing(false);
        return;
      }

      enrichAndSetParsedProducts(parsed);
      setIsDrafting(true);
      setError(null);
    } catch (err) {
      setError('Error al procesar los datos extraídos: ' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setPdfFile(file);
    setFileName(file.name);
    setParsingFailed(false);
    setPagesText(null);
    setAccumulatedProducts([]);
    setFailedError('');

    if (file.name.endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64String = evt.target?.result?.toString().split(',')[1] || '';
        setPdfBase64(base64String);
      };
      reader.readAsDataURL(file);
    } else if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      setIsParsing(true);
      setParsingProgress('Leyendo archivo de inventario local...');
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        try {
          if (file.name.endsWith('.csv')) {
            Papa.parse(bstr, {
              header: false,
              skipEmptyLines: true,
              complete: (results) => {
                processExtractedDataArrays(results.data);
              },
              error: (err) => {
                setError('Error al analizar el archivo CSV: ' + err.message);
                setIsParsing(false);
              }
            });
          } else {
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
            processExtractedDataArrays(rawData);
          }
        } catch (err) {
          setError('Error al leer el archivo de Excel: ' + err.message);
          setIsParsing(false);
        }
      };

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    }
  };

  const handleUploadPdf = async (resume = false, selectedModelOverride = null) => {
    setError(null);
    setIsParsing(true);
    setParsingProgress('Iniciando procesamiento con Inteligencia Artificial...');
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const activeModel = selectedModelOverride || aiModel;
    const startPageNum = resume ? failedPageIdx : 0;
    const existingList = resume ? accumulatedProducts : [];
    const sourceTexts = resume ? pagesText : null;
    const base64ToSend = resume ? null : pdfBase64;

    setParsingProgress(`Analizando página ${startPageNum + 1}... Modelo: ${activeModel === 'deepseek-v4-pro' ? 'DeepSeek v4' : 'Gemini'}`);

    try {
      const res = await uploadPdf(
        base64ToSend, 
        fileName, 
        activeModel, 
        startPageNum, 
        existingList, 
        sourceTexts,
        controller.signal
      );

      if (res && res.success) {
        enrichAndSetParsedProducts(res.products || []);
        setIsDrafting(true);
        setParsingFailed(false);
        setFailedError('');
      } else if (res && res.cancelled) {
        console.log('AI parsing cancelled by user.');
      } else {
        setParsingFailed(true);
        const failedIdx = res?.failedPageIndex ?? startPageNum;
        setFailedPageIdx(failedIdx);
        setPagesText(res?.pagesText || sourceTexts);
        setAccumulatedProducts(res?.productsParsedSoFar || existingList);
        setFailedError(res?.error || 'Fallo desconocido en la carga de la página.');
        setError(`Error de procesamiento en la página ${typeof failedIdx === 'number' ? (failedIdx + 1) : 'actual'}.`);
      }
    } catch (err) {
      setParsingFailed(true);
      setFailedError(err.message || 'Error grave al conectar con el servidor.');
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsParsing(false);
    }
  };

  const handleSaveDraft = async () => {
    setError(null);
    
    const inserts = [];
    const updates = [];

    for (const draft of parsedProducts) {
      if (draft.matchedProductId && draft.matchedProductId !== 'new') {
        const existing = products.find(p => p.id === draft.matchedProductId);
        if (existing) {
          updates.push({
            id: existing.id,
            name: draft.name,
            brand: draft.brand,
            size: draft.size,
            stock: existing.stock + draft.stock,
            cost: draft.cost,
            pricePublic: draft.pricePublic,
            pricePromotional: draft.pricePromotional,
            category: draft.category
          });
        } else {
          inserts.push(draft);
        }
      } else {
        inserts.push(draft);
      }
    }

    const res = await saveProductsBulk(inserts, updates);
    if (res.success) {
      setParsedProducts([]);
      setIsDrafting(false);
      setPdfFile(null);
      setPdfBase64('');
      setFileName('');
      setParsingProgress('');
      alert(`¡Carga masiva finalizada con éxito! ${res.countNew} nuevos perfumes agregados y ${res.countUpdated} registros existentes actualizados.`);
    }
  };

  const handleUpdateDraftField = (index, field, value) => {
    setParsedProducts(prev => prev.map((item, idx) => {
      if (idx === index) {
        let normalizedVal = value;
        if (field === 'cost' || field === 'pricePublic' || field === 'pricePromotional' || field === 'stock') {
          normalizedVal = Number(value) || 0;
        }
        return { ...item, [field]: normalizedVal };
      }
      return item;
    }));
  };

  const handleRemoveDraftItem = (index) => {
    setParsedProducts(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleOpenAdd = () => {
    setError(null);
    setIsEditing(false);
    setEditingId(null);
    setFormName('');
    setFormBrand('');
    setFormSize('100 ml');
    setFormCost('');
    setFormPricePublic('');
    setFormStock('');
    setFormCategory('Damas');
    setFormBarcode('');
    setFormDescription('');
    setFormImageUrl('');
    setFormPromoDetalle('');
    setFormPromoMayorista('');
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setIsEditing(false);
    setEditingId(null);
    setError(null);
  };

  const handleOpenEdit = (product) => {
    setError(null);
    setIsEditing(true);
    setEditingId(product.id);
    setFormName(product.name);
    setFormBrand(product.brand);
    setFormSize(product.size);
    setFormCost(product.cost);
    setFormPricePublic(product.pricePublic);
    setFormStock(product.stock);
    setFormCategory(product.category);
    setFormBarcode(product.barcode || '');
    
    const promoDetalle = getProductPromoDetalle(product) || '';
    const promoMayorista = getProductPromoMayorista(product) || '';
    setFormPromoDetalle(promoDetalle);
    setFormPromoMayorista(promoMayorista);
    setFormDescription(cleanProductDescription(product.description || ''));
    setFormImageUrl(product.image_url || '');
    setIsFormModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setError(null);

    const finalDescription = setProductPromotions(formDescription, formPromoDetalle, formPromoMayorista);

    const data = {
      name: formName.trim(),
      brand: formBrand.trim(),
      size: formSize.trim(),
      cost: Number(formCost) || 0,
      pricePublic: Number(formPricePublic) || 0,
      pricePromotional: Math.round((Number(formPricePublic) || 0) * 0.75),
      stock: Number(formStock) || 0,
      category: formCategory,
      barcode: formBarcode.trim(),
      description: finalDescription,
      image_url: formImageUrl.trim()
    };

    const ok = isEditing 
      ? await updateProduct(editingId, data)
      : await addProduct(data);

    if (ok) {
      setIsFormModalOpen(false);
      setIsEditing(false);
      setEditingId(null);
      setFormName('');
      setFormBrand('');
      setFormSize('100 ml');
      setFormCost('');
      setFormPricePublic('');
      setFormStock('');
      setFormCategory('Damas');
      setFormBarcode('');
      setFormDescription('');
      setFormImageUrl('');
      setFormPromoDetalle('');
      setFormPromoMayorista('');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás absolutamente seguro de eliminar esta fragancia del inventario? Esta acción es irreversible.')) {
      await deleteProduct(id);
    }
  };

  const handleApplyBulkDiscount = async (discountPercent) => {
    if (filteredProducts.length === 0) {
      alert('No hay productos filtrados para aplicar el descuento.');
      return;
    }
    
    const message = discountPercent === 0 
      ? `¿Estás seguro de quitar el descuento promocional a los ${filteredProducts.length} perfumes que coinciden con los filtros activos?`
      : `¿Estás seguro de aplicar un ${discountPercent}% de descuento promocional masivo a los ${filteredProducts.length} perfumes que coinciden con los filtros activos?`;
      
    if (confirm(message)) {
      setError(null);
      const productIds = filteredProducts.map(p => p.id);
      const ok = await applyBulkDiscount(productIds, discountPercent);
      if (ok) {
        alert('¡Descuento masivo aplicado exitosamente!');
      } else {
        alert('Fallo al aplicar el descuento masivo.');
      }
    }
  };

  const handleExportExcelCsv = (format) => {
    const listToExport = exportRange === 'filtered' ? filteredProducts : products;
    let items = onlyInStock ? listToExport.filter(p => p.stock > 0) : listToExport;
    
    if (items.length === 0) {
      alert('No hay perfumes para exportar con la configuración seleccionada.');
      return;
    }
    
    if (groupByBrand) {
      items = [...items].sort((a, b) => {
        const brandCompare = (a.brand || '').localeCompare(b.brand || '');
        if (brandCompare !== 0) return brandCompare;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else {
      items = [...items].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    
    const exportData = items.map(p => {
      const origPublicPrice = p.pricePublic || 0;
      const activePromoDiscount = getProductPromoDiscount(p) || 0;
      const finalDiscountPercent = Math.min(100, Math.max(0, activePromoDiscount + Number(additionalDiscount || 0)));
      const discountedPrice = finalDiscountPercent > 0 
        ? Math.round(origPublicPrice * (1 - finalDiscountPercent / 100))
        : origPublicPrice;
        
      const record = {
        'Marca': (p.brand || 'Genérico').toUpperCase(),
        'Fragancia': p.name || 'Sin nombre',
        'Presentación': p.size || '100 ml',
        'Precio Detalle (HNL)': origPublicPrice,
      };
      
      if (includeDiscount) {
        record['Descuento Aplicado %'] = finalDiscountPercent;
        record['Precio con Descuento (HNL)'] = discountedPrice;
      }
      
      if (includeVIP) {
        record['Precio VIP / Mayorista (HNL)'] = p.pricePromotional || 0;
      }
      
      record['Stock Disponible'] = p.stock > 0 ? `${p.stock} unidades` : 'Agotado';
      record['Categoría'] = p.category === 'Masculino' ? 'Caballeros' : p.category === 'Unisex' ? 'Unisex' : 'Damas';
      
      return record;
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catálogo');
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Catalogo_Perfumes_Clientes_${timestamp}.${format}`;
    
    if (format === 'xlsx') {
      XLSX.writeFile(wb, filename);
    } else {
      XLSX.writeFile(wb, filename, { bookType: 'csv' });
    }
    
    setIsExportModalOpen(false);
  };

  const loadImageBase64 = (url) => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 200;
          canvas.height = img.naturalHeight || 200;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataURL);
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const handleExportPDF = async () => {
    const listToExport = exportRange === 'filtered' ? filteredProducts : products;
    let items = onlyInStock ? listToExport.filter(p => p.stock > 0) : listToExport;
    
    if (items.length === 0) {
      alert('No hay perfumes para exportar con la configuración seleccionada.');
      return;
    }
    
    if (groupByBrand) {
      items = [...items].sort((a, b) => {
        const brandCompare = (a.brand || '').localeCompare(b.brand || '');
        if (brandCompare !== 0) return brandCompare;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else {
      items = [...items].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    setIsExportingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const drawHeader = () => {
        doc.setFillColor(17, 24, 39);
        doc.rect(0, 0, pageWidth, 14, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('INVENTARIO DE PERFUMERÍA', 12, 9);
        
        const today = new Date().toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.text(today.toUpperCase(), pageWidth - 12, 9, { align: 'right' });
      };
      
      const drawFooter = (pageNum) => {
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setFont('Helvetica', 'normal');
        doc.text(`Catálogo Comercial de Fragancias  |  Pág. ${pageNum}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      };

      if (includeImages) {
        const loadedImages = await Promise.all(
          items.map(p => p.image_url ? loadImageBase64(p.image_url) : Promise.resolve(null))
        );

        let currentPage = 1;
        drawHeader(currentPage);

        items.forEach((p, idx) => {
          const posOnPage = idx % 9;
          if (idx > 0 && posOnPage === 0) {
            drawFooter(currentPage);
            doc.addPage();
            currentPage++;
            drawHeader(currentPage);
          }

          const col = posOnPage % 3;
          const row = Math.floor(posOnPage / 3);

          const cardW = 58;
          const cardH = 78;
          const gapX = 6;
          const gapY = 6;
          const startX = 12 + col * (cardW + gapX);
          const startY = 22 + row * (cardH + gapY);

          doc.setDrawColor(229, 231, 235);
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(startX, startY, cardW, cardH, 2.5, 2.5, 'FD');

          const imgW = 46;
          const imgH = 34;
          const imgX = startX + (cardW - imgW) / 2;
          const imgY = startY + 3;

          const base64Img = loadedImages[idx];
          if (base64Img) {
            try {
              doc.addImage(base64Img, 'JPEG', imgX, imgY, imgW, imgH);
            } catch (e) {
              doc.setFillColor(243, 244, 246);
              doc.rect(imgX, imgY, imgW, imgH, 'F');
              doc.setTextColor(156, 163, 175);
              doc.setFontSize(7);
              doc.text('Perfumería', imgX + imgW / 2, imgY + imgH / 2, { align: 'center' });
            }
          } else {
            doc.setFillColor(243, 244, 246);
            doc.rect(imgX, imgY, imgW, imgH, 'F');
            doc.setTextColor(156, 163, 175);
            doc.setFontSize(7);
            doc.text('Perfumería', imgX + imgW / 2, imgY + imgH / 2, { align: 'center' });
          }

          doc.setTextColor(156, 163, 175);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(6.5);
          const brandTxt = (p.brand || 'GENÉRICO').toUpperCase();
          doc.text(brandTxt.substring(0, 26), startX + 4, startY + 41);

          doc.setTextColor(17, 24, 39);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(7.5);
          const fullName = `${p.name || ''}${p.size ? ' (' + p.size + ')' : ''}`;
          const splitName = doc.splitTextToSize(fullName, cardW - 8);
          const nameLines = splitName.slice(0, 2);
          doc.text(nameLines, startX + 4, startY + 45.5);

          const priceY = startY + 56;
          doc.setFontSize(7);

          const origPublicPrice = p.pricePublic || 0;
          const activePromoDiscount = getProductPromoDiscount(p) || 0;
          const finalDiscountPercent = Math.min(100, Math.max(0, activePromoDiscount + Number(additionalDiscount || 0)));

          if (includeDiscount && finalDiscountPercent > 0) {
            const discountedPrice = Math.round(origPublicPrice * (1 - finalDiscountPercent / 100));
            
            doc.setTextColor(156, 163, 175);
            doc.setFont('Helvetica', 'normal');
            doc.text(`Reg: L. ${origPublicPrice.toLocaleString()}`, startX + 4, priceY);

            doc.setTextColor(225, 29, 72);
            doc.setFont('Helvetica', 'bold');
            doc.text(`Oferta: L. ${discountedPrice.toLocaleString()} (-${finalDiscountPercent}%)`, startX + 4, priceY + 4);
          } else {
            doc.setTextColor(31, 41, 55);
            doc.setFont('Helvetica', 'bold');
            doc.text(`Precio: L. ${origPublicPrice.toLocaleString()}`, startX + 4, priceY);
          }

          if (includeVIP) {
            const vipPrice = p.pricePromotional || 0;
            doc.setTextColor(5, 150, 105);
            doc.setFont('Helvetica', 'bold');
            doc.text(`Precio Mayorista: L. ${vipPrice.toLocaleString()}`, startX + 4, priceY + (includeDiscount && finalDiscountPercent > 0 ? 8 : 4));
          }

          doc.setTextColor(107, 114, 128);
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(6);
          const catLabel = p.category === 'Masculino' ? 'Caballeros' : p.category === 'Unisex' ? 'Unisex' : 'Damas';
          doc.text(`Categoría: ${catLabel}`, startX + 4, startY + 74);

          const stockTxt = p.stock > 0 ? `Stock: ${p.stock} u.` : 'Agotado';
          doc.setFont('Helvetica', 'bold');
          if (p.stock > 0) {
            doc.setTextColor(31, 41, 55);
          } else {
            doc.setTextColor(220, 38, 38);
          }
          doc.text(stockTxt, startX + cardW - 4, startY + 74, { align: 'right' });
        });

        drawFooter(currentPage);
      } else {
        let y = 20;
        let pageNum = 1;
        drawHeader(pageNum);

        doc.setTextColor(17, 24, 39);
        doc.setFontSize(14);
        doc.setFont('Helvetica', 'bold');
        doc.text('CATÁLOGO DE FRAGANCIAS EXCLUSIVAS', 15, y);
        y += 5;

        doc.setTextColor(107, 114, 128);
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'normal');
        doc.text('Precios vigentes al público y precios mayoristas disponibles.', 15, y);
        y += 10;

        const colX = {
          brand: 15,
          name: groupByBrand ? 15 : 45,
          publicPrice: 115,
          discount: 140,
          vipPrice: 165,
          stock: 188
        };

        const drawTableHeaders = () => {
          doc.setFillColor(243, 244, 246);
          doc.rect(15, y - 4, pageWidth - 30, 6, 'F');
          doc.setDrawColor(229, 231, 235);
          doc.line(15, y + 2, pageWidth - 15, y + 2);

          doc.setTextColor(107, 114, 128);
          doc.setFontSize(7);
          doc.setFont('Helvetica', 'bold');

          if (!groupByBrand) {
            doc.text('MARCA', colX.brand, y);
          }
          doc.text('FRAGANCIA', colX.name, y);
          doc.text('DETALLE', colX.publicPrice, y);
          if (includeDiscount) {
            doc.text('OFERTA', colX.discount, y);
          }
          if (includeVIP) {
            doc.text('PRECIO MAYORISTA', colX.vipPrice, y);
          }
          doc.text('STOCK', colX.stock, y);
          y += 7;
        };

        drawTableHeaders();

        let lastBrand = '';

        items.forEach((p) => {
          if (y > pageHeight - 22) {
            drawFooter(pageNum);
            doc.addPage();
            pageNum++;
            drawHeader(pageNum);
            drawTableHeaders();
          }

          if (groupByBrand && p.brand !== lastBrand) {
            if (y > pageHeight - 32) {
              drawFooter(pageNum);
              doc.addPage();
              pageNum++;
              drawHeader(pageNum);
              drawTableHeaders();
            }

            lastBrand = p.brand;
            doc.setFillColor(249, 250, 251);
            doc.rect(15, y - 3, pageWidth - 30, 5, 'F');
            doc.setTextColor(17, 24, 39);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8);
            doc.text((p.brand || 'GENÉRICO').toUpperCase(), 17, y);
            y += 5.5;
          }

          doc.setTextColor(55, 65, 81);
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);

          if (!groupByBrand) {
            doc.text((p.brand || '').substring(0, 16), colX.brand, y);
          }

          const fullProdName = `${p.name || ''}${p.size ? ' (' + p.size + ')' : ''}`;
          doc.setFont('Helvetica', 'bold');
          const maxNameWidth = groupByBrand ? 95 : 65;
          const splitName = doc.splitTextToSize(fullProdName, maxNameWidth);
          doc.text(splitName[0], colX.name, y);

          doc.setFont('Helvetica', 'normal');
          const origPublicPrice = p.pricePublic || 0;
          doc.text(`L. ${origPublicPrice.toLocaleString()}`, colX.publicPrice, y);

          if (includeDiscount) {
            const activePromoDiscount = getProductPromoDiscount(p) || 0;
            const finalDiscountPercent = Math.min(100, Math.max(0, activePromoDiscount + Number(additionalDiscount || 0)));
            if (finalDiscountPercent > 0) {
              const discountedPrice = Math.round(origPublicPrice * (1 - finalDiscountPercent / 100));
              doc.setFont('Helvetica', 'bold');
              doc.setTextColor(220, 38, 38);
              doc.text(`L. ${discountedPrice.toLocaleString()} (-${finalDiscountPercent}%)`, colX.discount, y);
              doc.setFont('Helvetica', 'normal');
              doc.setTextColor(55, 65, 81);
            } else {
              doc.text('-', colX.discount, y);
            }
          }

          if (includeVIP) {
            const vipPrice = p.pricePromotional || 0;
            doc.text(`L. ${vipPrice.toLocaleString()}`, colX.vipPrice, y);
          }

          const stockStr = p.stock > 0 ? `${p.stock} u` : 'Agotado';
          doc.text(stockStr, colX.stock, y);

          doc.setDrawColor(243, 244, 246);
          doc.line(15, y + 1.2, pageWidth - 15, y + 1.2);

          y += (splitName.length > 1 ? 7 : 5);
        });

        drawFooter(pageNum);
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      doc.save(`Inventario_de_Perfumer_${timestamp}.pdf`);
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Hubo un inconveniente al generar el PDF: ' + err.message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExecuteExport = () => {
    if (exportFormat === 'pdf') {
      handleExportPDF();
    } else {
      handleExportExcelCsv(exportFormat);
    }
  };

  return (
    <div className="space-y-6 fade-in-up max-w-7xl mx-auto w-full">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
            Gestión de Inventario y Perfumes
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Administra de forma manual tu stock, sube archivos CSV/Excel o carga facturas en PDF escaneadas con inteligencia artificial.
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" /> Nuevo Perfume
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-start justify-between gap-2.5 relative">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 font-extrabold cursor-pointer">✕</button>
        </div>
      )}

      {/* AI Parsing draft overview screen */}
      {isDrafting ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2 border border-emerald-200 dark:border-emerald-800">
                ✓ Extracción Completa con IA
              </span>
              <h3 className="font-display font-black text-neutral-900 dark:text-neutral-100 text-lg">
                Revisión de Perfumes Detectados en Factura
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Revisa y edita los valores extraídos antes de registrarlos o sumarlos al inventario de Honduras.
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setParsedProducts([]);
                  setIsDrafting(false);
                }}
                className="px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
              >
                Cancelar Carga
              </button>
              <button
                onClick={handleSaveDraft}
                className="px-5 py-2.5 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                Guardar en Inventario
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-2xl">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              <thead className="bg-neutral-50 dark:bg-neutral-800/70 text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest font-mono">
                <tr>
                  <th className="px-4 py-3">Marca</th>
                  <th className="px-4 py-3">Nombre Fragancia</th>
                  <th className="px-4 py-3">Vinculación (Inventario)</th>
                  <th className="px-4 py-3">Presentación</th>
                  <th className="px-4 py-3">Costo Unit. (HNL)</th>
                  <th className="px-4 py-3">Precio Público (HNL)</th>
                  <th className="px-4 py-3">Precio VIP (HNL)</th>
                  <th className="px-4 py-3">Stock Facturado</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {parsedProducts.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.brand}
                        onChange={(e) => handleUpdateDraftField(idx, 'brand', e.target.value)}
                        className="w-24 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs text-neutral-900 dark:text-neutral-100"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateDraftField(idx, 'name', e.target.value)}
                        className="w-44 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs text-neutral-900 dark:text-neutral-100"
                      />
                    </td>
                    <td className="px-4 py-2">
                      {(() => {
                        const sameBrandProducts = products.filter(p => 
                          (p.brand || '').toLowerCase().trim() === (item.brand || '').toLowerCase().trim()
                        );

                        return (
                          <div className="flex flex-col gap-1 min-w-[200px]">
                            <select
                              value={item.matchedProductId || 'new'}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleUpdateDraftField(idx, 'matchedProductId', val);
                                if (val !== 'new') {
                                  const matchedProd = products.find(p => p.id === val);
                                  if (matchedProd) {
                                    handleUpdateDraftField(idx, 'pricePublic', matchedProd.pricePublic);
                                    handleUpdateDraftField(idx, 'pricePromotional', matchedProd.pricePromotional);
                                    let localCat = 'Damas';
                                    if (matchedProd.category === 'Masculino') localCat = 'Caballeros';
                                    else if (matchedProd.category === 'Unisex') localCat = 'Unisex';
                                    handleUpdateDraftField(idx, 'category', localCat);
                                    if (matchedProd.cost) {
                                      handleUpdateDraftField(idx, 'cost', matchedProd.cost);
                                    }
                                  }
                                }
                              }}
                              className={`px-2 py-1 border rounded text-xs font-semibold outline-none transition-colors ${
                                item.matchedProductId && item.matchedProductId !== 'new'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 focus:ring-1 focus:ring-emerald-400'
                                  : 'bg-indigo-50/50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 focus:ring-1 focus:ring-indigo-300'
                              }`}
                            >
                              <option value="new" className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">➕ Crear como Nuevo Perfume</option>
                              {sameBrandProducts.length > 0 && (
                                <optgroup label={`Existentes de ${item.brand}`}>
                                  {sameBrandProducts.map(p => (
                                    <option key={p.id} value={p.id} className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
                                      🔗 {p.name} ({p.size || 'N/A'}) - Stock: {p.stock}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              <optgroup label="Otros de todo el Inventario">
                                {products
                                  .filter(p => (p.brand || '').toLowerCase().trim() !== (item.brand || '').toLowerCase().trim())
                                  .slice(0, 100)
                                  .map(p => (
                                    <option key={p.id} value={p.id} className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
                                      🔗 {p.brand} - {p.name} ({p.size || 'N/A'})
                                    </option>
                                  ))
                                }
                              </optgroup>
                            </select>
                            
                            {item.matchedProductId && item.matchedProductId !== 'new' ? (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Sumará +{item.stock} al stock existente
                              </span>
                            ) : (
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                                <Plus className="h-3 w-3 text-indigo-500 dark:text-indigo-400" /> Se registrará como nuevo
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.size}
                        onChange={(e) => handleUpdateDraftField(idx, 'size', e.target.value)}
                        className="w-20 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs text-neutral-900 dark:text-neutral-100"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.cost}
                        onChange={(e) => handleUpdateDraftField(idx, 'cost', e.target.value)}
                        className="w-20 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs font-mono text-neutral-900 dark:text-neutral-100"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.pricePublic}
                        onChange={(e) => handleUpdateDraftField(idx, 'pricePublic', e.target.value)}
                        className="w-20 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs font-mono text-neutral-900 dark:text-neutral-100"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.pricePromotional}
                        onChange={(e) => handleUpdateDraftField(idx, 'pricePromotional', e.target.value)}
                        className="w-20 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs font-mono text-neutral-900 dark:text-neutral-100"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.stock}
                        onChange={(e) => handleUpdateDraftField(idx, 'stock', e.target.value)}
                        className="w-16 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs font-mono text-neutral-900 dark:text-neutral-100"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={item.category}
                        onChange={(e) => handleUpdateDraftField(idx, 'category', e.target.value)}
                        className="px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs text-neutral-900 dark:text-neutral-100"
                      >
                        <option value="Damas" className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">Damas</option>
                        <option value="Caballeros" className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">Caballeros</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleRemoveDraftItem(idx)}
                        className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-rose-400 rounded cursor-pointer"
                        title="Eliminar de la lista de carga"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* PDF AI Parser block */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-6">
          <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-display font-bold text-neutral-900 dark:text-neutral-100 text-sm sm:text-base flex items-center gap-1.5">
              <FileUp className="h-5 w-5 text-indigo-500 animate-bounce flex-shrink-0" /> Importador Inteligente (Facturas PDF por IA, CSV o Excel)
            </h3>
            
            {/* Model Selector */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <label htmlFor="ai-model-picker" className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Modelo:</label>
              <select
                id="ai-model-picker"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-[11px] font-bold text-neutral-700 dark:text-neutral-200 outline-none cursor-pointer"
              >
                <option value="gemini-3.6-flash">Gemini (Rápido)</option>
                <option value="deepseek-v4-pro">DeepSeek v4 (Soporte)</option>
              </select>
            </div>
          </div>

          {/* Error panel showing failure with fallback / retry / resume options */}
          {parsingFailed && (
            <div className="border border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/40 rounded-2xl p-5 space-y-4">
              <div className="flex gap-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl h-fit">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-rose-950 dark:text-rose-200 uppercase tracking-wider">
                    Error al Procesar la Página {failedPageIdx + 1}
                  </h4>
                  <p className="text-[11px] text-rose-800 dark:text-rose-300 font-medium leading-relaxed">
                    {failedError}
                  </p>
                  {accumulatedProducts.length > 0 && (
                    <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold mt-1">
                      ✓ Se extrajeron exitosamente {accumulatedProducts.length} perfumes de las páginas anteriores.
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons inside Error frame */}
              <div className="bg-white dark:bg-neutral-900 border border-rose-100 dark:border-rose-900/50 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-left">
                  <span className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase block">Modelo de Reintento</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUploadPdf(true, 'deepseek-v4-pro')}
                      disabled={isParsing}
                      className="px-3 py-1.5 bg-neutral-950 dark:bg-amber-400 text-white dark:text-neutral-950 hover:bg-neutral-800 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" /> Reintentar Página {failedPageIdx + 1} con DeepSeek
                    </button>
                    <button
                      onClick={() => handleUploadPdf(true, 'gemini-2.5-flash')}
                      disabled={isParsing}
                      className="px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Reintentar con Gemini
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('¿Deseas guardar los perfumes que se lograron parsear correctamente antes de que fallara la factura?')) {
                        enrichAndSetParsedProducts(accumulatedProducts);
                        setIsDrafting(true);
                        setParsingFailed(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold rounded-lg cursor-pointer transition-all"
                  >
                    Guardar hasta aquí ({accumulatedProducts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUploadPdf(false)}
                    className="px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                  >
                    Empezar de nuevo (Pág. 1)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Normal Drag Drop Area */}
          {!isParsing ? (
            <div className="space-y-4">
              <label 
                className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-3xl bg-neutral-50/50 dark:bg-neutral-800/40 p-8 text-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group relative min-h-[160px]"
              >
                <input
                  type="file"
                  accept="application/pdf, .csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📄</span>
                {fileName ? (
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 block font-mono">{fileName}</span>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block font-semibold">Haz clic o arrastra para cambiar de archivo</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="font-extrabold text-xs text-neutral-800 dark:text-neutral-200 block">Cargar Factura (PDF) o Inventario (CSV / Excel)</span>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block font-semibold">Soporta facturas escaneadas (IA), archivos CSV y hojas de cálculo XLS/XLSX</span>
                  </div>
                )}
              </label>

              {pdfFile && pdfFile.name.endsWith('.pdf') && !parsingFailed && (
                <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/70 p-4 border border-neutral-200 dark:border-neutral-700 rounded-2xl">
                  <div className="text-left space-y-0.5">
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono">Listo para procesar</span>
                    <span className="block text-xs font-extrabold text-neutral-800 dark:text-neutral-200 truncate max-w-sm">{fileName}</span>
                  </div>
                  
                  <button
                    onClick={() => handleUploadPdf(false)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-sm"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Iniciar Procesamiento por IA
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400" />
              <div className="space-y-1">
                <span className="font-display font-black text-neutral-900 dark:text-neutral-100 text-base uppercase tracking-wider animate-pulse">Procesando Factura con IA</span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono font-semibold max-w-sm leading-relaxed">{parsingProgress}</p>
              </div>
              <button
                type="button"
                onClick={handleCancelAiAnalysis}
                className="mt-2 px-4 py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                Cancelar Análisis
              </button>
            </div>
          )}
        </div>

      {/* Interactive Inventory List table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-display font-black text-neutral-900 dark:text-neutral-100 text-sm sm:text-base">
            Listado de Fragancias en Stock
          </h3>
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Download className="h-4 w-4" /> Exportar Catálogo Clientes
          </button>
        </div>

        {/* Filter and Search Box */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="sm:col-span-2 relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              </div>
              <input
                type="text"
                placeholder="Buscar perfume, marca o código de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="block w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent outline-none transition-all cursor-pointer"
              >
                <option value="Todas" className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">Todas las Marcas</option>
                {uniqueBrands.map(brand => (
                  <option key={brand} value={brand} className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">{brand}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Promotions Panel */}
        {(user?.role === 'owner' || user?.role === 'vendedor' || user?.role === 'dueño') && (
          <div className="bg-amber-50/40 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-0.5 text-left">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <Percent className="h-2.5 w-2.5" /> Descuento Masivo (Bulk)
                </span>
                <h4 className="font-display font-bold text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm uppercase tracking-tight">
                  Aplicar Oferta a Lista Filtrada ({filteredProducts.length} perfumes)
                </h4>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium leading-normal max-w-xl">
                  Aplica o remueve un descuento promocional masivo a los perfumes de la vista actual. El descuento se aplica sobre el precio Público.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-x-auto shadow-sm h-10 px-1.5 gap-1 max-w-full">
                  {[0, 10, 20, 30, 40].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleApplyBulkDiscount(pct)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 whitespace-nowrap"
                    >
                      {pct === 0 ? 'Quitar' : `${pct}%`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Otro %"
                    id="custom-bulk-pct"
                    className="w-16 h-10 px-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-center text-xs font-black outline-none font-mono text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const customInput = document.getElementById('custom-bulk-pct');
                      const val = Number(customInput?.value);
                      if (val >= 0 && val <= 100) {
                        handleApplyBulkDiscount(val);
                      } else {
                        alert('Por favor introduce un porcentaje de descuento válido entre 0 y 100.');
                      }
                    }}
                    className="px-3 h-10 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95 shadow-sm"
                  >
                    Ok
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory list Table */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              <thead className="bg-neutral-50 dark:bg-neutral-800/70 text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest font-mono whitespace-nowrap">
                <tr>
                  <th className="px-3 sm:px-6 py-3.5">Fragancia</th>
                  <th className="px-3 sm:px-6 py-3.5">Presentación</th>
                  {isOwner && <th className="px-3 sm:px-6 py-3.5">Costo (HNL)</th>}
                  <th className="px-3 sm:px-6 py-3.5">Precio Público (HNL)</th>
                  <th className="px-3 sm:px-6 py-3.5">Precio Mayorista (HNL)</th>
                  <th className="px-3 sm:px-6 py-3.5">Stock</th>
                  <th className="px-3 sm:px-6 py-3.5">Código / Barcode</th>
                  <th className="px-3 sm:px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={isOwner ? "8" : "7"} className="px-6 py-12 text-center text-neutral-400 dark:text-neutral-500">
                      <span>No se encontraron perfumes registrados.</span>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isSet = isProductSet(p);
                    
                    return (
                      <tr key={p.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="px-3 sm:px-6 py-3.5 space-y-1 min-w-[140px]">
                          <span className="font-mono text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">{p.brand}</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm leading-tight">
                              {p.name}
                            </span>
                            {isSet && (
                              <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 text-[8px] font-extrabold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider border border-indigo-100 dark:border-indigo-800">
                                Set
                              </span>
                            )}
                            {getProductPromoDetalle(p) && (
                              <span className="inline-flex items-center rounded-full bg-rose-50 dark:bg-rose-950/80 px-1.5 py-0.5 text-[8px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider border border-rose-100 dark:border-rose-800">
                                Detalle: {getProductPromoDetalle(p)}
                              </span>
                            )}
                            {getProductPromoMayorista(p) && (
                              <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/80 px-1.5 py-0.5 text-[8px] font-black text-amber-700 dark:text-amber-600 uppercase tracking-wider border border-amber-100 dark:border-amber-800">
                                Mayoreo: {getProductPromoMayorista(p)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3.5 text-neutral-500 dark:text-neutral-400 font-semibold whitespace-nowrap">{p.size}</td>
                        {isOwner && <td className="px-3 sm:px-6 py-3.5 font-mono text-neutral-950 dark:text-neutral-100 font-bold whitespace-nowrap">L. {p.cost.toLocaleString()}</td>}
                        <td className="px-3 sm:px-6 py-3.5 font-mono text-neutral-950 dark:text-neutral-100 font-bold whitespace-nowrap">
                          <div>L. {getProductPrices(p).finalDetalle.toLocaleString()}</div>
                          {getProductPrices(p).hasDetallePromo && (
                            <div className="text-[10px] text-red-500 line-through font-normal">
                              L. {getProductPrices(p).pricePublic.toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3.5 font-mono text-neutral-950 dark:text-neutral-100 font-bold whitespace-nowrap">
                          <div>L. {getProductPrices(p).finalWholesale.toLocaleString()}</div>
                          <div className="text-[10px] text-neutral-400 font-normal">
                            Base: L. {getProductPrices(p).baseWholesale.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3.5 whitespace-nowrap">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-mono font-black ${
                            p.stock <= 0
                              ? 'bg-red-50 dark:bg-rose-950/80 text-red-700 dark:text-rose-300'
                              : p.stock <= 3
                                ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-bold'
                          }`}>
                            {p.stock} u
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3.5 space-y-1 min-w-[100px]">
                          <span className="font-mono text-neutral-500 dark:text-neutral-400 text-[10px] block truncate">{p.barcode}</span>
                          <div 
                            className="w-16 h-4 opacity-50 dark:invert overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(p.barcode || p.id).replace('height="70"', 'height="10"').replace('style="background:white; padding:10px; border-radius:4px;"', 'style="background:transparent; padding:0;"') }}
                          />
                        </td>
                        <td className="px-3 sm:px-6 py-3.5 text-right whitespace-nowrap space-x-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-neutral-400 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors"
                            title="Editar perfume"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-neutral-400 dark:text-neutral-400 hover:text-red-600 dark:hover:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                            title="Eliminar perfume"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Client Catalog Export Modal */}
      {isExportModalOpen && createPortal(
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-6">
            
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                  <Share2 className="h-3.5 w-3.5" /> Compartir con Clientes
                </span>
                <h3 className="font-display font-black text-neutral-900 dark:text-neutral-100 text-lg">
                  Exportar Catálogo de Perfumes
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                  Genera una versión personalizada para compartir sin revelar los costos de compra.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-2">
                  Formato de Descarga
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      exportFormat === 'pdf'
                        ? 'border-neutral-900 dark:border-amber-400 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-amber-300 font-bold'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    <FileText className="h-5 w-5 text-rose-500" />
                    <span className="text-[11px] font-bold">PDF Listo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('xlsx')}
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      exportFormat === 'xlsx'
                        ? 'border-neutral-900 dark:border-amber-400 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-amber-300 font-bold'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                    <span className="text-[11px] font-bold">Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      exportFormat === 'csv'
                        ? 'border-neutral-900 dark:border-amber-400 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-amber-300 font-bold'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    <FileDown className="h-5 w-5 text-indigo-500" />
                    <span className="text-[11px] font-bold">CSV (.csv)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-2">
                  Rango de Productos
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                    <input
                      type="radio"
                      name="exportRange"
                      checked={exportRange === 'filtered'}
                      onChange={() => setExportRange('filtered')}
                      className="accent-neutral-950 dark:accent-amber-400"
                    />
                    <span>Solo los filtrados actualmente ({filteredProducts.length})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                    <input
                      type="radio"
                      name="exportRange"
                      checked={exportRange === 'all'}
                      onChange={() => setExportRange('all')}
                      className="accent-neutral-950 dark:accent-amber-400"
                    />
                    <span>Todo el inventario ({products.length})</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl p-4 border border-neutral-100 dark:border-neutral-800">
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1">
                  Configuración de Columnas y Precios
                </span>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    <input
                      type="checkbox"
                      checked={includeImages}
                      onChange={(e) => setIncludeImages(e.target.checked)}
                      className="rounded accent-neutral-950 dark:accent-amber-400 h-4 w-4"
                    />
                    <span>Incluir imágenes (Catálogo 9 por pág.)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    <input
                      type="checkbox"
                      checked={includeVIP}
                      onChange={(e) => setIncludeVIP(e.target.checked)}
                      className="rounded accent-neutral-950 dark:accent-amber-400 h-4 w-4"
                    />
                    <span>Incluir Precio Mayorista</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    <input
                      type="checkbox"
                      checked={includeDiscount}
                      onChange={(e) => setIncludeDiscount(e.target.checked)}
                      className="rounded accent-neutral-950 dark:accent-amber-400 h-4 w-4"
                    />
                    <span>Incluir descuentos activos</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    <input
                      type="checkbox"
                      checked={groupByBrand}
                      onChange={(e) => setGroupByBrand(e.target.checked)}
                      className="rounded accent-neutral-950 dark:accent-amber-400 h-4 w-4"
                    />
                    <span>Agrupar por marcas</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    <input
                      type="checkbox"
                      checked={onlyInStock}
                      onChange={(e) => setOnlyInStock(e.target.checked)}
                      className="rounded accent-neutral-950 dark:accent-amber-400 h-4 w-4"
                    />
                    <span>Ocultar agotados (Stock 0)</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="export-add-discount" className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Descuento Adicional para Cliente (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="export-add-discount"
                    type="number"
                    min="0"
                    max="100"
                    value={additionalDiscount}
                    onChange={(e) => setAdditionalDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-24 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent outline-none transition-all font-mono"
                    placeholder="Ej. 10"
                  />
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                    Se sumará a los descuentos promocionales activos en los perfumes.
                  </span>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800 pt-4">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                disabled={isExportingPdf}
                className="px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold rounded-xl cursor-pointer transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteExport}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-bold rounded-xl shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Procesando PDF con imágenes...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Generar y Descargar</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Manual Add / Edit Modal Overlay */}
      {isFormModalOpen && createPortal(
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-6">
            
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                  <Plus className="h-3.5 w-3.5" /> {isEditing ? 'Actualizar Fragancia' : 'Registrar Fragancia'}
                </span>
                <h3 className="font-display font-black text-neutral-900 dark:text-neutral-100 text-lg">
                  {isEditing ? 'Editar Perfume' : 'Agregar Perfume Manual'}
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                  Completa los detalles de la fragancia para actualizar el inventario general.
                </p>
              </div>
              <button 
                type="button"
                onClick={handleCloseFormModal}
                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label htmlFor="prod-brand" className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1.5">
                    Marca / Diseñador
                  </label>
                  <input
                    id="prod-brand"
                    type="text"
                    required
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent transition-all outline-none"
                    placeholder="Ej. Carolina Herrera"
                  />
                </div>

                <div>
                  <label htmlFor="prod-name" className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1.5">
                    Nombre de la Fragancia
                  </label>
                  <input
                    id="prod-name"
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent transition-all outline-none"
                    placeholder="Ej. Good Girl"
                  />
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label htmlFor="prod-size" className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1.5">
                    Presentación
                  </label>
                  <input
                    id="prod-size"
                    type="text"
                    required
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value)}
                    className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent transition-all outline-none"
                    placeholder="Ej. 100 ml"
                  />
                </div>
                <div>
                  <label htmlFor="prod-category" className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1.5">
                    Categoría
                  </label>
                  <select
                    id="prod-category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent transition-all outline-none cursor-pointer"
                  >
                    <option value="Damas" className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">Damas</option>
                    <option value="Caballeros" className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">Caballeros</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                {isOwner && (
                  <div>
                    <label htmlFor="prod-cost" className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1.5">
                      Costo (HNL)
                    </label>
                    <input
                      id="prod-cost"
                      type="number"
                      required={isOwner}
                      value={formCost}
                      onChange={(e) => setFormCost(e.target.value)}
                      className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent transition-all outline-none font-mono"
                      placeholder="0"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="prod-public" className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                    <span>Precio Detalle (HNL)</span>
                    {isVendedor && <span className="text-[9px] text-neutral-400 font-normal">(Solo lectura)</span>}
                  </label>
                  <input
                    id="prod-public"
                    type="number"
                    required
                    disabled={isVendedor}
                    readOnly={isVendedor}
                    value={formPricePublic}
                    onChange={(e) => setFormPricePublic(e.target.value)}
                    className={`block w-full px-3 py-2 border rounded-xl text-xs font-semibold font-mono transition-all outline-none ${
                      isVendedor
                        ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500 border-neutral-200 dark:border-neutral-800 cursor-not-allowed select-none'
                        : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400'
                    }`}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1.5">
                    <span>Precio Mayorista Base (-25%)</span>
                  </label>
                  <div className="block w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold font-mono text-neutral-500 dark:text-neutral-400 select-none">
                    L. {Math.round((Number(formPricePublic) || 0) * 0.75).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label htmlFor="prod-stock" className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1.5">
                    Stock Inicial / Físico
                  </label>
                  <input
                    id="prod-stock"
                    type="number"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent transition-all outline-none font-mono"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label htmlFor="prod-barcode" className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1.5">
                    Código de Barras
                  </label>
                  <input
                    id="prod-barcode"
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent transition-all outline-none font-mono"
                    placeholder="Vacío para generar"
                  />
                </div>
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 bg-neutral-50 dark:bg-neutral-905 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <div>
                  <label htmlFor="prod-promo-detalle" className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                    🏷️ Oferta Clientes Detalle
                  </label>
                  <input
                    id="prod-promo-detalle"
                    type="text"
                    value={formPromoDetalle}
                    onChange={(e) => setFormPromoDetalle(e.target.value)}
                    className="block w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 transition-all outline-none font-mono"
                    placeholder="Eje: 20% o 100"
                  />
                  <span className="text-[9px] text-neutral-400 block mt-1">Escribe un porcentaje (ej: <b>20%</b>) o un monto fijo (ej: <b>150</b>).</span>
                </div>

                <div>
                  <label htmlFor="prod-promo-mayorista" className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                    📦 Oferta Clientes Mayoristas
                  </label>
                  <input
                    id="prod-promo-mayorista"
                    type="text"
                    value={formPromoMayorista}
                    onChange={(e) => setFormPromoMayorista(e.target.value)}
                    className="block w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 transition-all outline-none font-mono"
                    placeholder="Eje: 10% o 50"
                  />
                  <span className="text-[9px] text-neutral-400 block mt-1">Escribe un porcentaje (ej: <b>10%</b>) o un monto fijo (ej: <b>50</b>).</span>
                </div>
              </div>

              <div>
                <label htmlFor="prod-image" className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1.5">
                  URL de la Imagen
                </label>
                <input
                  id="prod-image"
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent transition-all outline-none"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                <button
                  type="button"
                  onClick={handleCloseFormModal}
                  className="px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold rounded-xl cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !formName || !formBrand || (isOwner && !formCost) || !formPricePublic || formStock === ''}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-bold rounded-xl shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    isEditing ? 'Actualizar Producto' : 'Guardar Producto'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}