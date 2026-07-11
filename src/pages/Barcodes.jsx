import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { generateBarcodeSVG } from '../utils/barcode';
import { Printer, Tags, AlertCircle, RefreshCw } from 'lucide-react';

export default function Barcodes() {
  const { products, fetchProducts } = useStore();

  const [selectedProductId, setSelectedProductId] = useState('');
  const [printQty, setPrintQty] = useState(1);
  const [labelsToPrint, setLabelsToPrint] = useState([]);

  // Compute products that have valid barcodes
  const productsWithBarcodes = useMemo(() => {
    return products.filter(p => !!p.barcode);
  }, [products]);

  const selectedProduct = useMemo(() => {
    return productsWithBarcodes.find(p => p.id === selectedProductId);
  }, [productsWithBarcodes, selectedProductId]);

  const handleAddLabels = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const newLabels = [];
    for (let i = 0; i < Number(printQty); i++) {
      newLabels.push({
        ...selectedProduct,
        labelId: `${selectedProduct.id}_${Date.now()}_${i}_${Math.random()}`
      });
    }

    setLabelsToPrint((prev) => [...prev, ...newLabels]);
    setPrintQty(1);
  };

  const handleClear = () => {
    setLabelsToPrint([]);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="font-display text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <Tags className="h-6 w-6" /> Generador de Etiquetas y Códigos de Barra
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Diseña y genera plantillas de impresión térmica de 60mm x 40mm para tus perfumes importados en Honduras.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchProducts}
            className="p-2.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-xl shadow-sm cursor-pointer transition-colors"
            title="Recargar inventario"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {labelsToPrint.length > 0 && (
            <>
              <button
                onClick={handleClear}
                className="px-3.5 py-2 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-xs font-bold rounded-xl cursor-pointer"
              >
                Limpiar Hoja
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl cursor-pointer shadow hover:bg-neutral-800"
              >
                <Printer className="h-4 w-4" /> Imprimir Etiquetas ({labelsToPrint.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Selector dashboard panel */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm grid gap-6 md:grid-cols-3 no-print">
        
        {/* Step 1: Select a product */}
        <form onSubmit={handleAddLabels} className="md:col-span-2 space-y-4">
          <h3 className="font-display font-bold text-neutral-900 text-base border-b border-neutral-100 pb-2">
            Paso 1: Agregar Perfumes a la Cola de Impresión
          </h3>

          {productsWithBarcodes.length === 0 ? (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong>No hay productos con Códigos de Barra cargados en tu inventario.</strong> <br />
                Por favor, ve al módulo de <strong className="underline">Inventario</strong> y edita o agrega perfumes completando el campo Código de Barras / UPC.
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="select-product-barcode" className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">
                  Selecciona el Perfume
                </label>
                <select
                  id="select-product-barcode"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="">-- Seleccionar fragancia --</option>
                  {productsWithBarcodes.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.brand}] {p.name} ({p.size}) - {p.barcode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="label-quantity" className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">
                  Cantidad a imprimir
                </label>
                <div className="flex gap-2">
                  <input
                    id="label-quantity"
                    type="number"
                    min="1"
                    max="100"
                    value={printQty}
                    onChange={(e) => setPrintQty(e.target.value)}
                    className="block w-16 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono font-bold text-neutral-900 outline-none"
                  />
                  
                  <button
                    type="submit"
                    disabled={!selectedProductId}
                    className="flex-1 py-2 px-3.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Selected preview panel */}
        <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4.5 space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="font-display font-bold text-neutral-900 text-xs uppercase tracking-wider">Vista Previa de la Etiqueta</h4>
            <p className="text-[10px] text-neutral-400 mt-1">Así lucirá el adhesivo final de tu perfume.</p>
          </div>

          {selectedProduct ? (
            <div className="border border-neutral-200 rounded-xl bg-white p-3 shadow-sm flex flex-col items-center justify-center space-y-1 scale-95 origin-center">
              <span className="text-[10px] font-black uppercase font-mono text-neutral-400 leading-none tracking-widest">{selectedProduct.brand}</span>
              <span className="text-xs font-bold text-neutral-900 text-center truncate w-full max-w-[180px]">{selectedProduct.name}</span>
              <span className="text-[9px] font-bold text-neutral-500 leading-none">Cont. Neto: {selectedProduct.size}</span>
              
              {/* Actual barcode vector */}
              <div 
                className="w-full max-w-[180px] h-16"
                dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(selectedProduct.barcode) }}
              />
            </div>
          ) : (
            <div className="border border-dashed border-neutral-200 rounded-xl bg-white p-8 text-center text-[10px] text-neutral-400 font-medium">
              Selecciona un perfume para visualizar la etiqueta.
            </div>
          )}
        </div>

      </div>

      {/* Printing Stage Sheet Board */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-neutral-900 text-base border-b border-neutral-100 pb-2 no-print">
          Paso 2: Cola de Impresión Activa ({labelsToPrint.length} etiquetas)
        </h3>

        {labelsToPrint.length === 0 ? (
          <div className="bg-white border border-dashed border-neutral-200 rounded-3xl p-16 text-center text-xs text-neutral-400 font-semibold no-print">
            La cola de impresión se encuentra vacía. Agrega perfumes desde la barra superior.
          </div>
        ) : (
          <div className="bg-neutral-100 border border-neutral-200 p-8 sm:p-12 rounded-3xl overflow-hidden shadow-inner no-print-bg">
            
            {/* Sheet format flex grid wrapper */}
            <div className="flex flex-wrap gap-4 justify-center print-grid">
              {labelsToPrint.map((label, idx) => {
                
                return (
                  <div 
                    key={label.labelId} 
                    className="barcode-print bg-white p-4 border border-neutral-200 rounded-xl shadow-sm text-center flex flex-col items-center justify-between space-y-1 relative group w-[60mm] h-[40mm] shrink-0"
                  >
                    
                    {/* Delete hover pill */}
                    <button
                      onClick={() => setLabelsToPrint(prev => prev.filter(l => l.labelId !== label.labelId))}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white hover:bg-rose-700 rounded-full text-[9px] font-black w-4 h-4 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity no-print"
                      title="Eliminar de la cola"
                    >
                      ×
                    </button>

                    <div className="text-center w-full">
                      <span className="block text-[8px] font-black uppercase tracking-wider text-neutral-400 leading-none font-mono">{label.brand}</span>
                      <span className="block text-xs font-extrabold text-neutral-900 leading-tight truncate px-2 mt-0.5">{label.name}</span>
                      <span className="block text-[8px] font-bold text-neutral-500 leading-none mt-0.5">CONT: {label.size} | HN</span>
                    </div>

                    <div 
                      className="w-full max-w-[160px] h-12 flex items-center justify-center overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(label.barcode) }}
                    />

                    <div className="text-[8px] font-mono font-semibold text-neutral-400 leading-none border-t border-neutral-100 pt-1 w-full flex justify-between px-2">
                      <span># {idx + 1}</span>
                      <span>ICONIC BOUTIQUE HN</span>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
