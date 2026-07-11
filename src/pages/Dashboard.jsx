import React, { useMemo } from 'react';
import { useStore } from '../store';
import { 
  TrendingUp, 
  ShoppingBag, 
  Package, 
  Users, 
  DollarSign, 
  BarChart3, 
  FileSpreadsheet, 
  RefreshCw,
  Tags
} from 'lucide-react';
import { isProductSet } from '../utils/productHelper';

export default function Dashboard() {
  const { products, orders, fetchProducts, fetchOrders } = useStore();

  const handleRefresh = () => {
    fetchProducts();
    fetchOrders();
  };

  // Financial Stats
  const stats = useMemo(() => {
    // 1. Total stock value at retail price
    const totalInventoryValue = products.reduce((acc, p) => acc + (p.pricePublic * p.stock), 0);
    // 2. Total cost value of inventory
    const totalInventoryCost = products.reduce((acc, p) => acc + (p.cost * p.stock), 0);
    // 3. Expected profit
    const expectedProfit = totalInventoryValue - totalInventoryCost;
    
    // 4. Closed Sales (Status = 'entregado')
    const completedOrders = orders.filter(o => o.status === 'entregado');
    const totalSalesRevenue = completedOrders.reduce((acc, o) => acc + o.total, 0);

    // 5. Total items count
    const totalUnitsInStock = products.reduce((acc, p) => acc + p.stock, 0);
    const uniqueFragrances = products.length;

    // 6. Set / Combo products count
    const totalSets = products.filter(isProductSet).length;

    return {
      totalInventoryValue,
      totalInventoryCost,
      expectedProfit,
      totalSalesRevenue,
      totalUnitsInStock,
      uniqueFragrances,
      totalSets,
      salesCount: completedOrders.length
    };
  }, [products, orders]);

  // Brand sales stats breakdown
  const brandStatsBreakdown = useMemo(() => {
    const counts = {};
    products.forEach(p => {
      if (p.brand) {
        counts[p.brand] = (counts[p.brand] || 0) + p.stock;
      }
    });
    return Object.entries(counts)
      .map(([brand, stock]) => ({ brand, stock }))
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 5); // top 5
  }, [products]);

  // Category sales stats breakdown
  const categoryBreakdown = useMemo(() => {
    const counts = {};
    products.forEach(p => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + p.stock;
      }
    });
    return Object.entries(counts)
      .map(([category, stock]) => ({ category, stock }))
      .sort((a, b) => b.stock - a.stock);
  }, [products]);

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6" /> Panel de Negocios e Indicadores
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Revisa la salud financiera de Iconic Boutique HN, el valor del inventario activo y el flujo de cotizaciones.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          Sincronizar Panel
        </button>
      </div>

      {/* Main stats counters grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Sales revenue */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <DollarSign className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Ventas Cerradas</span>
            <span className="block text-2xl font-black text-neutral-950 font-mono">
              L. {stats.totalSalesRevenue.toLocaleString()}
            </span>
            <span className="block text-[10px] font-semibold text-emerald-700">
              {stats.salesCount} cotizaciones entregadas
            </span>
          </div>
        </div>

        {/* Total inventory retail value */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Package className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Valor Público Inventario</span>
            <span className="block text-2xl font-black text-neutral-950 font-mono">
              L. {stats.totalInventoryValue.toLocaleString()}
            </span>
            <span className="block text-[10px] font-semibold text-neutral-500">
              Valor de venta al por menor
            </span>
          </div>
        </div>

        {/* Total Cost Inventory */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-neutral-900 text-amber-400 rounded-2xl">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Costo Total FOB/CIF</span>
            <span className="block text-2xl font-black text-neutral-950 font-mono">
              L. {stats.totalInventoryCost.toLocaleString()}
            </span>
            <span className="block text-[10px] font-semibold text-neutral-500">
              Inversión total en stock
            </span>
          </div>
        </div>

        {/* Total Expected Profit */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <Users className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Ganancia Proyectada</span>
            <span className="block text-2xl font-black text-purple-950 font-mono">
              L. {stats.expectedProfit.toLocaleString()}
            </span>
            <span className="block text-[10px] font-semibold text-purple-700">
              Margen bruto estimado
            </span>
          </div>
        </div>

      </div>

      {/* Breakdowns and lists row */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Top 5 Brands breakdown */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-display font-bold text-neutral-900 text-base border-b border-neutral-100 pb-3 flex items-center gap-1.5">
            <Tags className="h-5 w-5 text-indigo-500" /> Marcas Más Fuertes en Stock
          </h3>

          <div className="space-y-3">
            {brandStatsBreakdown.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-4">No hay productos en inventario.</p>
            ) : (
              brandStatsBreakdown.map((item, idx) => {
                const percentage = stats.totalUnitsInStock > 0 
                  ? Math.round((item.stock / stats.totalUnitsInStock) * 100)
                  : 0;
                
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-neutral-800">{item.brand}</span>
                      <span className="text-neutral-500 font-mono">{item.stock} u. ({percentage}%)</span>
                    </div>
                    {/* Visual bar */}
                    <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-neutral-900 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Category breakdown & details */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-display font-bold text-neutral-900 text-base border-b border-neutral-100 pb-3 flex items-center gap-1.5">
            <FileSpreadsheet className="h-5 w-5 text-amber-500" /> Distribución por Categorías
          </h3>

          <div className="space-y-3">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-4">No hay categorías configuradas.</p>
            ) : (
              categoryBreakdown.map((item, idx) => {
                const percentage = stats.totalUnitsInStock > 0 
                  ? Math.round((item.stock / stats.totalUnitsInStock) * 100)
                  : 0;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-neutral-800">{item.category}</span>
                      <span className="text-neutral-500 font-mono">{item.stock} u. ({percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Summary report statistics */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-display font-bold text-neutral-900 text-base border-b border-neutral-100 pb-2">
          Estadísticas Generales del Negocio
        </h3>
        
        <div className="grid gap-4 sm:grid-cols-4 text-center">
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
            <span className="block text-2xl font-black text-neutral-950 font-mono">{stats.uniqueFragrances}</span>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Fragancias Únicas</span>
          </div>
          
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
            <span className="block text-2xl font-black text-neutral-950 font-mono">{stats.totalUnitsInStock}</span>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Unidades Físicas</span>
          </div>

          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
            <span className="block text-2xl font-black text-neutral-950 font-mono">{stats.totalSets}</span>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Estuches / Sets</span>
          </div>

          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
            <span className="block text-2xl font-black text-neutral-950 font-mono">L. {(stats.totalUnitsInStock > 0 ? Math.round(stats.totalInventoryValue / stats.totalUnitsInStock) : 0).toLocaleString()}</span>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Precio Promedio Unitario</span>
          </div>
        </div>
      </div>

    </div>
  );
}
