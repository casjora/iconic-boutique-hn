import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { Link, useLocation } from 'react-router-dom';
import PerfumeCard from './PerfumeCard';
import { Percent, Award, Heart, Sparkles, Search, SlidersHorizontal, RefreshCw, Flame, Download, FileDown, FileSpreadsheet, X, Loader2 } from 'lucide-react';
import { isProductSet, getProductPromoDiscount, getProductPrices, isProductInPublicCategory, getConsolidatedProducts, normalizeCategory } from '../utils/productHelper';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export default function CatalogView({ favoritesOnly = false }) {
  const { products, user, favorites } = useStore();
  const location = useLocation();

  const isStaff = user && (user.role === 'owner' || user.role === 'dueño' || user.role === 'vendedor');
  const isClient = user?.role === 'client';
  const hasUser = !!user;

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [showPromoOnly, setShowPromoOnly] = useState(false);
  
  // Lazy loading state
  const [visibleCount, setVisibleCount] = useState(12);

  // Export states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportIncludeImages, setExportIncludeImages] = useState(true);
  const [exportIncludePrice, setExportIncludePrice] = useState(true);
  const [exportIncludeStock, setExportIncludeStock] = useState(true);
  const [exportFormat, setExportFormat] = useState('pdf'); // 'pdf' or 'xlsx'
  const [exportPriceTier, setExportPriceTier] = useState('detalle');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });

  // Update export price tier dynamically when user changes
  useEffect(() => {
    if (user) {
      const isWholesaleUser = user.role === 'mayorista' || user.role === 'vendedor' || user.role === 'owner';
      setExportPriceTier(isWholesaleUser ? 'mayorista' : 'detalle');
    }
  }, [user]);

  // Robust loadImageBase64 with timeout
  const loadImageBase64 = (url) => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      let resolved = false;
      
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      }, 2000); // 2 second timeout per image

      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
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
        }
      };
      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(null);
        }
      };
      img.src = url;
    });
  };

  const handleExport = async () => {
    // Filter out items with stock 0 (Requirement 3)
    const exportProductsList = filteredProducts.filter(p => p.stock > 0);
    const isMayorista = exportPriceTier === 'mayorista';
    const includeImages = exportFormat === 'pdf' && exportIncludeImages;
    
    setIsExporting(true);
    setExportProgress({ current: 0, total: exportProductsList.length });

    try {
      if (exportProductsList.length === 0) {
        alert('No hay perfumes disponibles con stock mayor a 0 para exportar.');
        setIsExporting(false);
        return;
      }

      if (exportFormat === 'pdf') {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const drawHeader = (pageNum) => {
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
          doc.text(`Inventario de Perfumería  |  Pág. ${pageNum}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        };

        if (includeImages) {
          // Pre-load image URLs in parallel
          const loadedImages = [];
          for (let i = 0; i < exportProductsList.length; i++) {
            const p = exportProductsList[i];
            setExportProgress(prev => ({ ...prev, current: i + 1 }));
            let base64 = null;
            if (p.image_url) {
              base64 = await loadImageBase64(p.image_url);
            }
            loadedImages.push(base64);
          }

          let currentPage = 1;
          drawHeader(currentPage);

          exportProductsList.forEach((p, idx) => {
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

            // Outer card border
            doc.setDrawColor(229, 231, 235);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(startX, startY, cardW, cardH, 2.5, 2.5, 'FD');

            // Image box
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

            // Brand
            doc.setTextColor(156, 163, 175);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(6.5);
            const brandTxt = (p.brand || 'GENÉRICO').toUpperCase();
            doc.text(brandTxt.substring(0, 26), startX + 4, startY + 41);

            // Name & Presentation combined
            doc.setTextColor(17, 24, 39);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(7.5);
            const fullName = `${p.name || ''}${p.size ? ' (' + p.size + ')' : ''}`;
            const splitName = doc.splitTextToSize(fullName, cardW - 8);
            const nameLines = splitName.slice(0, 2);
            doc.text(nameLines, startX + 4, startY + 45.5);

            // Pricing block
            const priceY = startY + 56;
            doc.setFontSize(7);

            if (exportIncludePrice) {
              const prices = getProductPrices(p);
              if (isMayorista) {
                doc.setTextColor(107, 114, 128);
                doc.setFont('Helvetica', 'normal');
                doc.text(`P. Sugerido: L. ${prices.pricePublic.toLocaleString()}`, startX + 4, priceY);

                doc.setTextColor(16, 185, 129); // Emerald
                doc.setFont('Helvetica', 'bold');
                doc.text(`P. Mayoreo: L. ${prices.finalWholesale.toLocaleString()}`, startX + 4, priceY + 4.5);
              } else {
                const hasDiscount = prices.hasDetallePromo;
                if (hasDiscount) {
                  doc.setTextColor(156, 163, 175);
                  doc.setFont('Helvetica', 'normal');
                  doc.text(`Reg: L. ${prices.pricePublic.toLocaleString()}`, startX + 4, priceY);

                  doc.setTextColor(220, 38, 38);
                  doc.setFont('Helvetica', 'bold');
                  doc.text(`Oferta: L. ${prices.finalDetalle.toLocaleString()} (-${prices.effectiveDetallePct}% off)`, startX + 4, priceY + 4.5);
                } else {
                  doc.setTextColor(31, 41, 55);
                  doc.setFont('Helvetica', 'bold');
                  doc.text(`Precio: L. ${prices.pricePublic.toLocaleString()}`, startX + 4, priceY);
                }
              }
            }

            // Category & Stock Label
            doc.setTextColor(107, 114, 128);
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(6);
            const catLabel = normalizeCategory(p.category) || p.category || 'Damas';
            doc.text(`Categoría: ${catLabel}`, startX + 4, startY + 74);

            if (exportIncludeStock) {
              const stockTxt = p.stock > 0 ? `Stock: ${p.stock} u.` : 'Agotado';
              doc.setFont('Helvetica', 'bold');
              if (p.stock > 0) {
                doc.setTextColor(31, 41, 55);
              } else {
                doc.setTextColor(220, 38, 38);
              }
              doc.text(stockTxt, startX + cardW - 4, startY + 74, { align: 'right' });
            }
          });

          drawFooter(currentPage);
        } else {
          // Table View without autoTable
          let y = 25;
          let pageNum = 1;
          drawHeader(pageNum);

          doc.setTextColor(17, 24, 39);
          doc.setFontSize(13);
          doc.setFont('Helvetica', 'bold');
          doc.text('INVENTARIO DE PERFUMERÍA', 12, y);
          y += 5;

          doc.setTextColor(107, 114, 128);
          doc.setFontSize(8);
          doc.setFont('Helvetica', 'normal');
          doc.text(`Inventario de perfumes. Tarifa: ${isMayorista ? 'Mayoreo' : 'Detalle'}`, 12, y);
          y += 10;

          const colX = {
            brand: 12,
            name: 42,
            category: 110,
            stock: 132,
            price1: 148,
            price2: 178
          };

          const drawTableHeaders = () => {
            doc.setFillColor(243, 244, 246);
            doc.rect(12, y - 4, pageWidth - 24, 6, 'F');
            doc.setDrawColor(229, 231, 235);
            doc.line(12, y + 2, pageWidth - 12, y + 2);

            doc.setTextColor(107, 114, 128);
            doc.setFontSize(7);
            doc.setFont('Helvetica', 'bold');

            doc.text('MARCA', colX.brand, y);
            doc.text('FRAGANCIA', colX.name, y);
            doc.text('CATEGORÍA', colX.category, y);
            if (exportIncludeStock) {
              doc.text('STOCK', colX.stock, y);
            }
            if (exportIncludePrice) {
              if (isMayorista) {
                doc.text('P. SUGERIDO', colX.price1, y);
                doc.text('P. MAYOREO', colX.price2, y);
              } else {
                doc.text('PRECIO REG.', colX.price1, y);
                doc.text('OFERTA', colX.price2, y);
              }
            }
            y += 7;
          };

          drawTableHeaders();

          exportProductsList.forEach((p) => {
            if (y > pageHeight - 22) {
              drawFooter(pageNum);
              doc.addPage();
              pageNum++;
              drawHeader(pageNum);
              drawTableHeaders();
            }

            doc.setTextColor(55, 65, 81);
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8);

            // Brand
            doc.text((p.brand || '').substring(0, 15).toUpperCase(), colX.brand, y);

            // Fragancia (Name + Size)
            const fullProdName = `${p.name || ''}${p.size ? ' (' + p.size + ')' : ''}`;
            doc.setFont('Helvetica', 'bold');
            const maxNameWidth = 62;
            const splitName = doc.splitTextToSize(fullProdName, maxNameWidth);
            doc.text(splitName[0], colX.name, y);

            // Category
            doc.setFont('Helvetica', 'normal');
            const catLabel = normalizeCategory(p.category) || p.category || 'Damas';
            doc.text(catLabel, colX.category, y);

            // Stock
            if (exportIncludeStock) {
              const stockStr = p.stock > 0 ? `${p.stock} u` : 'Agotado';
              if (p.stock <= 0) {
                doc.setTextColor(220, 38, 38);
              }
              doc.text(stockStr, colX.stock, y);
              doc.setTextColor(55, 65, 81);
            }

            // Pricing
            if (exportIncludePrice) {
              const prices = getProductPrices(p);
              doc.text(`L. ${prices.pricePublic.toLocaleString()}`, colX.price1, y);

              if (isMayorista) {
                doc.setFont('Helvetica', 'bold');
                doc.setTextColor(16, 185, 129); // Emerald-500
                doc.text(`L. ${prices.finalWholesale.toLocaleString()}`, colX.price2, y);
              } else {
                const hasDiscount = prices.hasDetallePromo;
                if (hasDiscount) {
                  doc.setFont('Helvetica', 'bold');
                  doc.setTextColor(220, 38, 38);
                  doc.text(`L. ${prices.finalDetalle.toLocaleString()}`, colX.price2, y);
                } else {
                  doc.text('-', colX.price2, y);
                }
              }
            }

            doc.setTextColor(55, 65, 81);
            doc.setFont('Helvetica', 'normal');

            doc.setDrawColor(243, 244, 246);
            doc.line(12, y + 1.2, pageWidth - 12, y + 1.2);

            y += (splitName.length > 1 ? 7 : 5);
          });

          drawFooter(pageNum);
        }

        const timestamp = new Date().toISOString().slice(0, 10);
        doc.save(`Inventario_de_Perfumer_${timestamp}.pdf`);
      } else {
        // Excel format
        const exportData = exportProductsList.map(p => {
          const prices = getProductPrices(p);
          const record = {
            'Código/ID': p.id,
            'Marca': p.brand,
            'Perfume': p.name,
            'Tamaño': p.size,
            'Categoría': p.category,
          };
          if (exportIncludeStock) {
            record['Stock'] = p.stock > 0 ? `${p.stock} uds` : 'Agotado';
          }
          if (exportIncludePrice) {
            if (isMayorista) {
              record['Precio Sugerido / Detalle (L.)'] = prices.pricePublic;
              record['Precio Mayorista (L.)'] = prices.finalWholesale;
            } else {
              record['Precio Detalle (L.)'] = prices.pricePublic;
              record['Precio Promocional (L.)'] = prices.hasDetallePromo ? prices.finalDetalle : 'Sin Oferta';
            }
          }
          record['Enlace de Imagen'] = p.image_url || '';
          return record;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
        
        const timestamp = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `Inventario_Perfumes_${selectedCategory.replace(/\s+/g, '_')}_${timestamp}.xlsx`);
      }
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Error exporting catalog:', err);
      alert('Ocurrió un error inesperado al generar el archivo. Por favor inténtalo de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

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

  // Filters base products: guest/public users only see featuredPublic items. Non-staff users (mayoristas, detalle) do not see out-of-stock items.
  const baseProducts = useMemo(() => {
    let list = getConsolidatedProducts(products);
    // Only unregistered/guest users should be restricted to featuredPublic items
    if (!user) {
      list = list.filter(p => p.featuredPublic === true);
    }
    // Non-staff users (wholesale, retail, guests) cannot see out-of-stock products
    if (!isStaff) {
      list = list.filter(p => (p.availableStock !== undefined ? p.availableStock : p.stock) > 0);
    }
    if (favoritesOnly) {
      return list.filter(p => favorites.includes(p.id) || (p.batchIds && p.batchIds.some(id => favorites.includes(id))));
    }
    return list;
  }, [products, favorites, favoritesOnly, user, isStaff]);

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
        (p.barcode || '').toLowerCase().includes(term) ||
        (isSearchForSet && isProductSet(p));
      
      const matchesBrand = selectedBrand === 'Todas' || p.brand?.trim() === selectedBrand;
      
      const pCat = (p.category || '').trim();
      const matchesCategory = selectedCategory === 'Todas'
        ? true
        : selectedCategory === 'Sets / Estuches'
          ? isProductSet(p)
          : selectedCategory === 'Estuches Dama'
            ? isProductInPublicCategory(p, 'estuches-dama')
            : selectedCategory === 'Estuches Caballero'
              ? isProductInPublicCategory(p, 'estuches-caballero')
              : selectedCategory === 'Damas'
                ? isProductInPublicCategory(p, 'damas')
                : selectedCategory === 'Caballeros'
                  ? isProductInPublicCategory(p, 'caballeros')
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
        subtitle: 'Tus fragancias originales favoritas guardadas en Honduras.',
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
            ¿Quieres ver mas?
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-md mx-auto font-medium">
            Registra una cuenta de forma completamente gratuita en segundos para conocer nuestros productos.
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
            ✓ Tarifa Mayorista VIP Activa
          </h3>
          <p className="text-xs text-emerald-800 dark:text-emerald-200/80 max-w-md mx-auto">
            Estás autorizado para comprar al por mayor en Honduras. Se aplicará de forma automática el precio promocional en tu orden final.
          </p>
        </div>
      )}

      {/* Filter and Search Box */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4 text-neutral-800 dark:text-neutral-200 font-bold text-xs uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800/50 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            <span>Búsqueda y Filtros</span>
          </div>
          {hasUser && (
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-[10px] font-black rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 outline-none select-none"
            >
              <Download className="h-3 w-3" />
              Descargar Copia del Inventario
            </button>
          )}
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
              {displayedProducts.map((p, idx) => (
                <PerfumeCard key={p.id} product={p} index={idx} />
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

      {/* Export Catalog / Inventory Modal */}
      {isExportModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-black text-neutral-950 dark:text-neutral-50 text-base uppercase tracking-tight">
                  Descargar Copia de Inventario
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
                  Configura tu copia digital según tu rol y preferencias.
                </p>
              </div>
              <button
                onClick={() => !isExporting && setIsExportModalOpen(false)}
                disabled={isExporting}
                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer disabled:opacity-30 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body / Loading State */}
            {isExporting ? (
              <div className="py-8 text-center space-y-4">
                <div className="flex justify-center">
                  <Loader2 className="h-10 w-10 text-neutral-900 dark:text-amber-400 animate-spin" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-950 dark:text-neutral-100">
                    {exportFormat === 'pdf' && exportIncludeImages 
                      ? 'Procesando Imágenes y PDF...' 
                      : 'Generando archivo de exportación...'}
                  </p>
                  {exportFormat === 'pdf' && exportIncludeImages && (
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                      Fragancia {exportProgress.current} de {exportProgress.total}
                    </p>
                  )}
                </div>
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-neutral-900 dark:bg-amber-400 h-full transition-all duration-300"
                    style={{ width: `${(exportProgress.current / (exportProgress.total || 1)) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 italic">
                  Por favor, mantén esta ventana abierta mientras se genera el archivo.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                
                {/* Info summary */}
                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-150 dark:border-neutral-800 rounded-2xl text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
                  <span className="text-lg">🧴</span>
                  <span>
                    Exportarás <strong className="text-neutral-900 dark:text-neutral-50">{filteredProducts.length}</strong> fragancias en base a tus filtros activos actuales.
                  </span>
                </div>

                {/* Formats Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    Formato de Archivo
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setExportFormat('pdf')}
                      className={`flex flex-col items-center justify-center p-3.5 border rounded-2xl cursor-pointer text-center transition-all ${
                        exportFormat === 'pdf'
                          ? 'border-neutral-900 dark:border-amber-400 bg-neutral-50/50 dark:bg-amber-950/20 text-neutral-950 dark:text-amber-300 font-bold'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-500 hover:border-neutral-300'
                      }`}
                    >
                      <FileDown className="h-5 w-5 mb-1.5" />
                      <span className="text-xs">Catálogo PDF</span>
                    </button>

                    <button
                      onClick={() => setExportFormat('xlsx')}
                      className={`flex flex-col items-center justify-center p-3.5 border rounded-2xl cursor-pointer text-center transition-all ${
                        exportFormat === 'xlsx'
                          ? 'border-neutral-900 dark:border-amber-400 bg-neutral-50/50 dark:bg-amber-950/20 text-neutral-950 dark:text-amber-300 font-bold'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-500 hover:border-neutral-300'
                      }`}
                    >
                      <FileSpreadsheet className="h-5 w-5 mb-1.5" />
                      <span className="text-xs">Libro Excel (XLSX)</span>
                    </button>
                  </div>
                </div>

                {/* Pricing tier selector for staff and wholesale customers */}
                {(user?.role === 'vendedor' || user?.role === 'owner' || user?.role === 'dueño' || user?.role === 'mayorista') && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block">
                      Tarifa a Incluir en el Archivo Exportado
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setExportPriceTier('mayorista')}
                        className={`px-3 py-2 border rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          exportPriceTier === 'mayorista'
                            ? 'bg-neutral-950 dark:bg-amber-400 text-white dark:text-neutral-950 border-transparent shadow-sm'
                            : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800'
                        }`}
                      >
                        🏷️ Incluir Precio Mayoreo
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportPriceTier('detalle')}
                        className={`px-3 py-2 border rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          exportPriceTier === 'detalle'
                            ? 'bg-neutral-950 dark:bg-amber-400 text-white dark:text-neutral-950 border-transparent shadow-sm'
                            : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800'
                        }`}
                      >
                        🛒 Solo Precio al Detalle
                      </button>
                    </div>
                    {user?.role === 'mayorista' && (
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
                        💡 Si deseas compartir este catálogo con tus clientes finales, selecciona "Solo Precio al Detalle" para ocultar tu margen de mayoreo.
                      </p>
                    )}
                  </div>
                )}

                {/* Fixed Pricing Label for Retail Customers */}
                {user?.role !== 'vendedor' && user?.role !== 'owner' && user?.role !== 'dueño' && user?.role !== 'mayorista' && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block">
                      Tarifa Aplicada por tu Rol
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 rounded-lg text-[11px] font-bold text-amber-800 dark:text-amber-300">
                      ✓ Precios al Detalle (y Promocionales)
                    </span>
                  </div>
                )}

                {/* File Options: Price, Stock & Images checklist */}
                <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 rounded-2xl space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">
                    Opciones de Contenido
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="export_price"
                      checked={exportIncludePrice}
                      onChange={(e) => setExportIncludePrice(e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 text-neutral-950 dark:text-amber-400 focus:ring-neutral-900 dark:focus:ring-amber-400 cursor-pointer"
                    />
                    <label htmlFor="export_price" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                      Incluir precios en el archivo
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="export_stock"
                      checked={exportIncludeStock}
                      onChange={(e) => setExportIncludeStock(e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 text-neutral-950 dark:text-amber-400 focus:ring-neutral-900 dark:focus:ring-amber-400 cursor-pointer"
                    />
                    <label htmlFor="export_stock" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                      Incluir existencias (stock) en el archivo
                    </label>
                  </div>

                  {exportFormat === 'pdf' && (
                    <div className="flex items-start gap-2.5 pt-1 border-t border-neutral-200/60 dark:border-neutral-800">
                      <input
                        type="checkbox"
                        id="export_images"
                        checked={exportIncludeImages}
                        onChange={(e) => setExportIncludeImages(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 text-neutral-950 dark:text-amber-400 focus:ring-neutral-900 dark:focus:ring-amber-400 cursor-pointer"
                      />
                      <label htmlFor="export_images" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                        Incluir fotos de productos en el PDF
                        <span className="block text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-normal leading-normal">
                          Las fotos reales se incluirán organizadas en tarjetas legibles que preservan el diseño.
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setIsExportModalOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200 text-xs font-extrabold rounded-xl transition-all cursor-pointer active:scale-95 text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={filteredProducts.length === 0}
                    className="flex-1 px-4 py-2.5 bg-neutral-950 hover:bg-neutral-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-extrabold rounded-xl transition-all cursor-pointer active:scale-95 text-center flex items-center justify-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Generar Copia
                  </button>
                </div>
                
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
