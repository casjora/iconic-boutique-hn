import React, { useState } from 'react';
import { useStore } from '../store';
import { generateBarcodeSVG } from '../utils/barcode';
import { Printer, Tags, Grid, Eye, Check, Square, CheckSquare } from 'lucide-react';

export default function BarcodeLabels() {
  const { products } = useStore();
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p.id));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedProducts = products.filter(p => selectedIds.includes(p.id));

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Print Instructions */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            width: 60mm;
            height: 40mm;
            padding: 3mm;
            border: 1px solid #000;
            margin: 5mm;
            display: inline-flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            page-break-inside: avoid;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-900 tracking-tight">
            Generador de Etiquetas con Código de Barra
          </h2>
          <p className="text-xs text-neutral-500">
            Imprime etiquetas térmicas de estantería (60x40mm) para tus perfumes con códigos escaneables y precios en Lempiras.
          </p>
        </div>

        <button
          onClick={handlePrint}
          disabled={selectedIds.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 cursor-pointer disabled:opacity-40 shadow-sm transition-all"
        >
          <Printer className="h-4 w-4" />
          Imprimir Etiquetas ({selectedIds.length})
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3 no-print">
        
        {/* Left column: Selection panel (Col span 2) */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <span className="text-xs font-bold text-neutral-700">Seleccionar Perfumes para Imprimir</span>
              <button
                onClick={selectAll}
                className="text-xs text-neutral-600 hover:text-neutral-900 font-semibold flex items-center gap-1.5"
              >
                {selectedIds.length === products.length ? (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    Deseleccionar Todos
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4" />
                    Seleccionar Todos ({products.length})
                  </>
                )}
              </button>
            </div>

            <ul className="divide-y divide-neutral-100 text-xs">
              {products.map(p => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <li 
                    key={p.id}
                    onClick={() => toggleSelect(p.id)}
                    className="p-4 flex items-center justify-between hover:bg-neutral-50/30 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-neutral-900 border-neutral-900 text-white' : 'border-neutral-300'
                      }`}>
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <span className="block font-bold text-neutral-900">{p.name}</span>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 leading-none">{p.brand} ({p.size})</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="block text-xs font-bold text-neutral-800">L. {p.pricePublic.toLocaleString()}</span>
                      <span className="block text-[10px] text-amber-600 font-bold">L. {p.pricePromotional.toLocaleString()} VIP</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Right column: Label Template Preview */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-neutral-200 p-6 shadow-sm">
            <h3 className="font-display font-bold text-neutral-900 text-sm mb-3 flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-neutral-500" />
              Vista Previa de Impresión
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed mb-4">
              Usa hojas de etiquetas térmicas de 60x40mm. Al pulsar imprimir se formateará de forma automática para impresoras térmicas (Zebra, Munbyn, Xprinter).
            </p>

            {selectedProducts.length === 0 ? (
              <div className="border border-dashed border-neutral-200 rounded-2xl p-8 text-center text-neutral-400 font-medium">
                Selecciona al menos un perfume para ver el diseño de la etiqueta.
              </div>
            ) : (
              <div className="space-y-4 bg-neutral-100 p-4 rounded-2xl overflow-y-auto max-h-96">
                {selectedProducts.map(p => (
                  <div key={p.id} className="mx-auto bg-white border border-neutral-300 p-3 flex flex-col items-center justify-between text-black rounded shadow-sm w-[60mm] h-[40mm]">
                    <div className="w-full text-center">
                      <span className="block text-[9px] uppercase font-bold tracking-tight text-neutral-500 leading-none">Brother's Perfumes</span>
                      <span className="block text-[11px] font-black tracking-tight text-neutral-900 line-clamp-1">{p.name}</span>
                      <span className="block text-[9px] text-neutral-400 font-bold leading-none uppercase font-mono">{p.brand} - {p.size}</span>
                    </div>
                    
                    {/* Real vector barcode */}
                    <div 
                      className="w-full h-14 overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(p.barcode) }}
                    />

                    <div className="w-full flex justify-between items-center px-1 font-mono text-[9px] border-t border-neutral-100 pt-1">
                      <span>Púb: <strong>L.{p.pricePublic.toLocaleString()}</strong></span>
                      <span className="text-amber-700">VIP: <strong>L.{p.pricePromotional.toLocaleString()}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Actual Hidden Area targeted by print media stylesheet */}
      <div id="print-area" className="hidden media-print:block">
        {selectedProducts.map(p => (
          <div key={p.id} className="print-card">
            <div style={{ textAlign: 'center', width: '100%' }}>
              <span style={{ display: 'block', fontSize: '8px', textTransform: 'uppercase', fontWeight: 'bold', color: '#555', letterSpacing: '1px', lineHeight: '1' }}>Brother's Perfumes</span>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: '900', color: '#000', margin: '1px 0' }}>{p.name}</span>
              <span style={{ display: 'block', fontSize: '8px', color: '#444', textTransform: 'uppercase', fontFamily: 'monospace' }}>{p.brand} - {p.size}</span>
            </div>
            
            <div 
              style={{ width: '100%', height: '55px', overflow: 'hidden' }}
              dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(p.barcode) }}
            />

            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '9px', borderTop: '1px solid #ddd', paddingTop: '2px' }}>
              <span>Púb: <strong>L.{p.pricePublic.toLocaleString()}</strong></span>
              <span>VIP: <strong>L.{p.pricePromotional.toLocaleString()}</strong></span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
