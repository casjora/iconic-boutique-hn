import { useMemo, useState } from 'react';
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
  Tags,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trophy,
  Crown,
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { isProductSet } from '../utils/productHelper';

export default function Dashboard() {
  const { products, orders, fetchProducts, fetchOrders, user } = useStore();
  
  // Active timeframe for sales analysis
  const [timeframe, setTimeframe] = useState('all'); // 'all', 'month', 'last30', 'last90', 'year'
  
  // Detailed brand expander state: stores the name of the brand currently expanded
  const [expandedBrand, setExpandedBrand] = useState(null);
  
  // Collapsible year performance state
  const [isYearlyOpen, setIsYearlyOpen] = useState(false);

  const handleRefresh = () => {
    fetchProducts();
    fetchOrders();
  };

  // 1. Reactive Sales & Orders filtering based on selected timeframe
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(o => {
      if (timeframe === 'all') return true;

      const orderDate = new Date(o.createdAt);
      if (timeframe === 'month') {
        // Current calendar month
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }
      if (timeframe === 'last30') {
        // Last 30 days
        const limit = new Date();
        limit.setDate(now.getDate() - 30);
        return orderDate >= limit;
      }
      if (timeframe === 'last90') {
        // Last 90 days
        const limit = new Date();
        limit.setDate(now.getDate() - 90);
        return orderDate >= limit;
      }
      if (timeframe === 'year') {
        // Current year
        return orderDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [orders, timeframe]);

  // 2. Sales and pipeline figures for the selected timeframe
  const salesStats = useMemo(() => {
    const completed = filteredOrders.filter(o => o.status === 'entregado');
    const pending = filteredOrders.filter(o => o.status === 'pendiente');
    
    const completedRevenue = completed.reduce((acc, o) => acc + o.total, 0);
    const pendingRevenue = pending.reduce((acc, o) => acc + o.total, 0);
    const pipelineRevenue = completedRevenue + pendingRevenue;
    const aov = completed.length > 0 ? completedRevenue / completed.length : 0;
    
    let completedCost = 0;
    completed.forEach(o => {
      o.items.forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        const itemCost = p ? (p.cost || 0) : 0;
        completedCost += itemCost * item.quantity;
      });
    });

    const completedProfit = completedRevenue - completedCost;
    
    return {
      completedRevenue,
      pendingRevenue,
      pipelineRevenue,
      completedCount: completed.length,
      pendingCount: pending.length,
      aov,
      completedCost,
      completedProfit
    };
  }, [filteredOrders, products]);

  // 3. Select "Cliente del Mes" (Customer of the Month) based on total units purchased in selected period
  const clienteDelMes = useMemo(() => {
    const customers = {}; // name -> { name, phone, totalQty, totalSpent, orderCount }
    const completedOrders = filteredOrders.filter(o => o.status === 'entregado');
    
    completedOrders.forEach(o => {
      const name = o.clientName?.trim() || 'Cliente Sin Nombre';
      const phone = o.clientPhone || 'Sin Contacto';
      if (!customers[name]) {
        customers[name] = { name, phone, totalQty: 0, totalSpent: 0, orderCount: 0 };
      }
      const orderQty = o.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      customers[name].totalQty += orderQty;
      customers[name].totalSpent += o.total;
      customers[name].orderCount += 1;
    });
    
    // Sort by totalQty descending
    const sorted = Object.values(customers).sort((a, b) => b.totalQty - a.totalQty);
    return sorted[0] || null;
  }, [filteredOrders]);

  // 4. Monthly sales breakdown of the year, showing only months with available data
  const monthlyPerformance = useMemo(() => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const data = {}; // "YYYY-MM" -> { key, monthName, year, totalSales, count, totalQty }
    
    orders.filter(o => o.status === 'entregado').forEach(o => {
      const date = new Date(o.createdAt);
      const year = date.getFullYear();
      const monthIdx = date.getMonth();
      const key = `${year}-${String(monthIdx).padStart(2, '0')}`;
      
      if (!data[key]) {
        data[key] = {
          key,
          monthName: months[monthIdx],
          year,
          totalSales: 0,
          count: 0,
          totalQty: 0
        };
      }
      
      data[key].totalSales += o.total;
      data[key].count += 1;
      const orderQty = o.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      data[key].totalQty += orderQty;
    });
    
    // Chronological order descending
    return Object.values(data).sort((a, b) => b.key.localeCompare(a.key));
  }, [orders]);

  // 5. Best wholesale customers in selected timeframe
  const topCustomers = useMemo(() => {
    const customers = {};
    filteredOrders.filter(o => o.status === 'entregado').forEach(o => {
      const name = o.clientName?.trim() || 'Cliente Sin Nombre';
      const phone = o.clientPhone || 'Sin Contacto';
      if (!customers[name]) {
        customers[name] = { name, phone, ordersCount: 0, totalSpent: 0 };
      }
      customers[name].ordersCount += 1;
      customers[name].totalSpent += o.total;
    });
    return Object.values(customers)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5); // top 5
  }, [filteredOrders]);

  // 6. Product categories sales performance inside timeframe
  const categorySalesBreakdown = useMemo(() => {
    const sales = {};
    filteredOrders.filter(o => o.status === 'entregado').forEach(o => {
      o.items.forEach(item => {
        let category = item.category || 'N/A';
        if (category === 'N/A') {
          const p = products.find(prod => prod.id === item.productId);
          if (p && p.category) category = p.category;
        }
        category = category.trim();
        if (!sales[category]) {
          sales[category] = { category, quantity: 0, revenue: 0 };
        }
        sales[category].quantity += item.quantity;
        sales[category].revenue += item.quantity * item.pricePaid;
      });
    });
    return Object.values(sales).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, products]);

  // 7. Set vs Individual Sales Breakdown inside timeframe
  const setVsIndividualSales = useMemo(() => {
    let setsRevenue = 0;
    let individualRevenue = 0;
    let setsQty = 0;
    let individualQty = 0;
    
    filteredOrders.filter(o => o.status === 'entregado').forEach(o => {
      o.items.forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        const isSet = isProductSet(item) || (p && isProductSet(p));
        const itemRevenue = item.quantity * item.pricePaid;
        
        if (isSet) {
          setsRevenue += itemRevenue;
          setsQty += item.quantity;
        } else {
          individualRevenue += itemRevenue;
          individualQty += item.quantity;
        }
      });
    });
    
    const totalRevenue = setsRevenue + individualRevenue;
    return {
      setsRevenue,
      individualRevenue,
      setsQty,
      individualQty,
      setsPercent: totalRevenue > 0 ? Math.round((setsRevenue / totalRevenue) * 100) : 0,
      individualPercent: totalRevenue > 0 ? Math.round((individualRevenue / totalRevenue) * 100) : 0
    };
  }, [filteredOrders, products]);

  // 8. Top-selling products in timeframe
  const topSellingProducts = useMemo(() => {
    const counts = {}; // productId -> { item, quantity, revenue }
    filteredOrders.filter(o => o.status === 'entregado').forEach(o => {
      o.items.forEach(item => {
        if (!counts[item.productId]) {
          counts[item.productId] = {
            productId: item.productId,
            brand: item.brand,
            name: item.name,
            size: item.size,
            quantity: 0,
            revenue: 0
          };
        }
        counts[item.productId].quantity += item.quantity;
        counts[item.productId].revenue += item.quantity * item.pricePaid;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5); // top 5
  }, [filteredOrders]);


  // ==================== INVENTORY STATIC STATISTICS ====================
  // Current active physical stocks and metrics
  const inventoryStats = useMemo(() => {
    const totalInventoryValue = products.reduce((acc, p) => acc + (p.pricePublic * p.stock), 0);
    const totalInventoryCost = products.reduce((acc, p) => acc + (p.cost * p.stock), 0);
    const expectedProfit = totalInventoryValue - totalInventoryCost;
    const totalUnitsInStock = products.reduce((acc, p) => acc + p.stock, 0);
    const uniqueFragrances = products.length;
    const totalSets = products.filter(isProductSet).length;

    return {
      totalInventoryValue,
      totalInventoryCost,
      expectedProfit,
      totalUnitsInStock,
      uniqueFragrances,
      totalSets
    };
  }, [products]);

  // Brand sales/stock status breakdown
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

  // Category sales/stock status breakdown
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

  // Detailed Brand to Perfume structure: Stock and sold numbers per brand/perfume
  const brandDetailedBreakdown = useMemo(() => {
    const brands = {};
    
    // Initialize with current product physical stock
    products.forEach(p => {
      const brand = p.brand?.trim() || 'Otras Marcas';
      if (!brands[brand]) {
        brands[brand] = {
          brandName: brand,
          totalStock: 0,
          totalValue: 0,
          totalCost: 0,
          soldQty: 0,
          soldRevenue: 0,
          perfumes: {}
        };
      }
      
      brands[brand].totalStock += p.stock;
      brands[brand].totalValue += p.pricePublic * p.stock;
      brands[brand].totalCost += p.cost * p.stock;
      
      if (!brands[brand].perfumes[p.id]) {
        brands[brand].perfumes[p.id] = {
          id: p.id,
          name: p.name,
          size: p.size || 'N/A',
          stock: p.stock,
          price: p.pricePublic,
          soldQty: 0,
          soldRevenue: 0
        };
      } else {
        brands[brand].perfumes[p.id].stock += p.stock;
      }
    });
    
    // Supercharge with sold numbers inside the selected timeframe
    filteredOrders.filter(o => o.status === 'entregado').forEach(o => {
      o.items.forEach(item => {
        let brandName = item.brand?.trim();
        if (!brandName) {
          const p = products.find(prod => prod.id === item.productId);
          if (p && p.brand) brandName = p.brand.trim();
        }
        brandName = brandName || 'Otras Marcas';
        
        if (!brands[brandName]) {
          brands[brandName] = {
            brandName,
            totalStock: 0,
            totalValue: 0,
            totalCost: 0,
            soldQty: 0,
            soldRevenue: 0,
            perfumes: {}
          };
        }
        
        const itemRevenue = item.quantity * item.pricePaid;
        brands[brandName].soldQty += item.quantity;
        brands[brandName].soldRevenue += itemRevenue;
        
        if (!brands[brandName].perfumes[item.productId]) {
          brands[brandName].perfumes[item.productId] = {
            id: item.productId,
            name: item.name,
            size: item.size || 'N/A',
            stock: 0,
            price: item.pricePaid,
            soldQty: 0,
            soldRevenue: 0
          };
        }
        
        brands[brandName].perfumes[item.productId].soldQty += item.quantity;
        brands[brandName].perfumes[item.productId].soldRevenue += itemRevenue;
      });
    });
    
    // Sort brands by sales (soldQty) or current stock, newest and strongest first
    return Object.values(brands)
      .map(b => ({
        ...b,
        perfumes: Object.values(b.perfumes).sort((a, b) => b.soldQty - a.soldQty || b.stock - a.stock)
      }))
      .sort((a, b) => b.soldQty - a.soldQty || b.totalStock - a.totalStock);
  }, [products, filteredOrders]);

  return (
    <div className="space-y-10 fade-in-up pb-10">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
        <div>
          <h2 className="font-display text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-600 animate-pulse" /> Panel de Control y Análisis Comercial
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Análisis dinámico del flujo de caja, rotación e inventarios físicos de Iconic Boutique HN.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Timeframe Selector with Calendar Icon */}
          <div className="flex items-center gap-1.5 bg-white border border-neutral-200 px-3 py-2 rounded-xl shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-transparent text-xs font-bold text-neutral-700 focus:outline-none outline-none cursor-pointer"
            >
              <option value="all">Todo el Historial</option>
              <option value="month">Este Mes (Calendario)</option>
              <option value="last30">Últimos 30 días</option>
              <option value="last90">Últimos 90 días</option>
              <option value="year">Este Año (2026)</option>
            </select>
          </div>

          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sincronizar
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. VENTAS Y RENDIMIENTO COMERCIAL (SECCIÓN ARRIBA)        */}
      {/* ========================================================= */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider font-mono border-l-4 border-emerald-500 pl-3">
            Ventas y Resultados Financieros del Período
          </h3>
          <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100 uppercase font-mono">
            Filtrado: {timeframe === 'all' ? 'Todo' : timeframe === 'month' ? 'Este Mes' : timeframe === 'last30' ? 'Últimos 30 días' : timeframe === 'last90' ? 'Últimos 90 días' : 'Este Año'}
          </span>
        </div>

        {/* Key metrics counters grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Sales closed (Entregado) */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Ventas Cerradas</span>
              <span className="block text-2xl font-black text-neutral-950 font-mono">
                L. {salesStats.completedRevenue.toLocaleString()}
              </span>
              <span className="block text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {salesStats.completedCount} cotizaciones entregadas
              </span>
            </div>
          </div>

          {/* Ticket Promedio (AOV) */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono font-sans">Ticket Promedio (AOV)</span>
              <span className="block text-2xl font-black text-neutral-950 font-mono">
                L. {Math.round(salesStats.aov).toLocaleString()}
              </span>
              <span className="block text-[10px] font-semibold text-amber-800">
                Valor promedio por orden
              </span>
            </div>
          </div>

          {/* Owner Profit / Cost */}
          {user?.role === 'owner' && (
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex items-start gap-4 ring-2 ring-emerald-500/20">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest font-mono font-sans">Ganancia Neta</span>
                <span className="block text-2xl font-black text-emerald-700 font-mono">
                  L. {Math.round(salesStats.completedProfit).toLocaleString()}
                </span>
                <span className="block text-[10px] font-semibold text-neutral-500">
                  Costo: L. {Math.round(salesStats.completedCost).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Flujo Pipeline Pendiente */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Clock className="h-6 w-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Ventas Pendientes</span>
              <span className="block text-2xl font-black text-indigo-950 font-mono">
                L. {salesStats.pendingRevenue.toLocaleString()}
              </span>
              <span className="block text-[10px] font-semibold text-indigo-700 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {salesStats.pendingCount} órdenes por verificar/cobrar
              </span>
            </div>
          </div>

          {/* CLIENTE DEL MES (CHOSEN BASED ON UNITS BOUGHT) */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 shadow-sm flex items-start gap-4 relative overflow-hidden">
            <div className="absolute right-[-10px] bottom-[-10px] text-amber-200/40 opacity-40">
              <Trophy className="h-24 w-24" />
            </div>
            <div className="p-3 bg-amber-400 text-white rounded-2xl shadow-sm z-10">
              <Crown className="h-6 w-6 animate-bounce" />
            </div>
            <div className="space-y-1 z-10">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest font-mono flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Cliente Destacado
              </span>
              {clienteDelMes ? (
                <>
                  <span className="block text-sm font-black text-neutral-900 truncate max-w-[150px]">
                    {clienteDelMes.name}
                  </span>
                  <span className="block text-[10px] font-semibold text-amber-900">
                    Compró <strong className="font-extrabold text-neutral-950 font-mono">{clienteDelMes.totalQty} u.</strong> en {clienteDelMes.orderCount} {clienteDelMes.orderCount === 1 ? 'pedido' : 'pedidos'} (L. {clienteDelMes.totalSpent.toLocaleString()})
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-sm font-black text-neutral-600">
                    Sin Datos
                  </span>
                  <span className="block text-[10px] font-medium text-neutral-500">
                    No hay ventas cerradas en este período.
                  </span>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Breakdown details charts / meters */}
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Pipeline value tracker card */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono block">Embudo y Pipeline de Ingresos</span>
              <h4 className="font-display font-bold text-neutral-800 text-xs">Distribución del Flujo de Caja</h4>
            </div>
            
            <div className="space-y-2.5 font-mono">
              <div className="flex justify-between text-xs border-b border-neutral-100 pb-2">
                <span className="text-neutral-500 font-sans">Entregado (Realizado):</span>
                <span className="font-bold text-emerald-600">L. {salesStats.completedRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-neutral-100 pb-2">
                <span className="text-neutral-500 font-sans">En Espera (Pendiente):</span>
                <span className="font-bold text-indigo-600">L. {salesStats.pendingRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs pt-0.5">
                <span className="text-neutral-900 font-sans font-bold">Pipeline Total:</span>
                <span className="font-black text-neutral-950">L. {salesStats.pipelineRevenue.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-neutral-400 font-mono">
                <span>CERRADO ({salesStats.pipelineRevenue > 0 ? Math.round((salesStats.completedRevenue / salesStats.pipelineRevenue) * 100) : 100}%)</span>
                <span>PENDIENTE ({salesStats.pipelineRevenue > 0 ? Math.round((salesStats.pendingRevenue / salesStats.pipelineRevenue) * 100) : 0}%)</span>
              </div>
              <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-emerald-500" 
                  style={{ width: `${salesStats.pipelineRevenue > 0 ? (salesStats.completedRevenue / salesStats.pipelineRevenue) * 100 : 100}%` }}
                />
                <div 
                  className="h-full bg-indigo-500" 
                  style={{ width: `${salesStats.pipelineRevenue > 0 ? (salesStats.pendingRevenue / salesStats.pipelineRevenue) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-neutral-500 font-sans leading-relaxed mt-2">
                * Hay <strong className="text-indigo-700">{salesStats.pendingCount} cotizaciones pendientes</strong> por verificar para consolidar caja.
              </p>
            </div>
          </div>

          {/* Sets vs Perfumes Single Bottle revenue breakdown */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono block">Rendimiento por Formato</span>
              <h4 className="font-display font-bold text-neutral-800 text-xs">Sets/Estuches vs Fragancia Individual</h4>
            </div>

            <div className="space-y-2.5 font-mono">
              <div className="flex justify-between text-xs border-b border-neutral-100 pb-2">
                <span className="text-neutral-500 font-sans">Fragancias Individuales:</span>
                <span className="font-bold text-neutral-800">L. {setVsIndividualSales.individualRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-neutral-100 pb-2">
                <span className="text-neutral-500 font-sans">Estuches y Sets:</span>
                <span className="font-bold text-indigo-600">L. {setVsIndividualSales.setsRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs pt-0.5">
                <span className="text-neutral-900 font-sans font-bold">Unidades Totales Vendidas:</span>
                <span className="font-semibold text-neutral-700 font-mono">{setVsIndividualSales.individualQty + setVsIndividualSales.setsQty} u.</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-neutral-400 font-mono">
                <span>INDIVIDUAL ({setVsIndividualSales.individualPercent}%)</span>
                <span>SETS ({setVsIndividualSales.setsPercent}%)</span>
              </div>
              <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-neutral-800" 
                  style={{ width: `${setVsIndividualSales.individualPercent}%` }}
                />
                <div 
                  className="h-full bg-indigo-500" 
                  style={{ width: `${setVsIndividualSales.setsPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-neutral-500 font-sans leading-relaxed mt-2">
                🎁 Los sets representan el <strong className="text-indigo-700 font-bold">{setVsIndividualSales.setsPercent}%</strong> del dinero ingresado en este período.
              </p>
            </div>
          </div>

          {/* Actual Sales Category Performance card */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono block">Rendimiento por Categoría</span>
              <h4 className="font-display font-bold text-neutral-800 text-xs">Ventas Reales del Período</h4>
            </div>

            <div className="space-y-2">
              {categorySalesBreakdown.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4 font-sans">No se registran ventas para clasificar categorías.</p>
              ) : (
                categorySalesBreakdown.slice(0, 3).map((item, idx) => {
                  const totalCategoryRevenue = categorySalesBreakdown.reduce((sum, c) => sum + c.revenue, 0);
                  const percentage = totalCategoryRevenue > 0 ? Math.round((item.revenue / totalCategoryRevenue) * 100) : 0;
                  
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-neutral-700">{item.category}</span>
                        <span className="text-neutral-500 font-mono">L. {item.revenue.toLocaleString()} ({item.quantity} u.)</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <p className="text-[10px] text-neutral-500 font-sans leading-relaxed">
              * Ayuda a identificar qué géneros tienen mayor rotación comercial en el mercado.
            </p>
          </div>

        </div>

        {/* COLLAPSIBLE SECTION: VER CÓMO VAN EN EL AÑO (Months breakdown) */}
        <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
          <button 
            onClick={() => setIsYearlyOpen(!isYearlyOpen)}
            className="w-full px-6 py-4 bg-neutral-50 hover:bg-neutral-100/60 border-b border-neutral-100 flex items-center justify-between transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-bold text-neutral-900 font-display">Histórico Mensual del Año (Desglose de Caja)</span>
              <span className="text-[10px] text-neutral-400 bg-white border border-neutral-200 px-2 py-0.5 rounded-lg font-mono">
                {monthlyPerformance.length} meses con ventas
              </span>
            </div>
            <div className="text-neutral-500">
              {isYearlyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>
          
          {isYearlyOpen && (
            <div className="p-6 divide-y divide-neutral-100">
              {monthlyPerformance.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4">Aún no se registran datos históricos mensuales.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-neutral-100">
                    <thead className="bg-neutral-50 text-neutral-500 font-bold font-mono text-[10px]">
                      <tr>
                        <th className="p-3">Período / Mes</th>
                        <th className="p-3 text-center">Órdenes Entregadas</th>
                        <th className="p-3 text-center">Unidades Compradas</th>
                        <th className="p-3 text-right">Monto Recaudado (HNL)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {monthlyPerformance.map((item, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50/20">
                          <td className="p-3 font-bold text-neutral-900 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            {item.monthName} {item.year}
                          </td>
                          <td className="p-3 text-center font-semibold text-neutral-700 font-mono">
                            {item.count} orders
                          </td>
                          <td className="p-3 text-center font-medium text-neutral-600 font-mono">
                            {item.totalQty} u.
                          </td>
                          <td className="p-3 text-right font-black text-emerald-600 font-mono">
                            L. {item.totalSales.toLocaleString()} HNL
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row of detailed lists for current timeframe */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Top 5 Wholesale buyers / loyalty list */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-neutral-900 text-sm border-b border-neutral-100 pb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" /> Top Distribuidores del Período
            </h3>

            {topCustomers.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-6">
                No se registran clientes recurrentes con órdenes entregadas en este período.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-neutral-100">
                  <thead className="bg-neutral-50 text-neutral-500 font-bold">
                    <tr>
                      <th className="p-3 text-left">Socio Mayorista</th>
                      <th className="p-3 text-center">Órdenes</th>
                      <th className="p-3 text-right">Volumen Comprado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {topCustomers.map((cust, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/30">
                        <td className="p-3 font-bold text-neutral-900 flex items-center gap-1.5">
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 text-white text-[8px] font-mono font-bold">
                            {idx + 1}
                          </span>
                          <span className="truncate max-w-[150px]">{cust.name}</span>
                        </td>
                        <td className="p-3 text-center font-bold text-neutral-600 font-mono">
                          {cust.ordersCount}
                        </td>
                        <td className="p-3 text-right font-black font-mono text-emerald-600">
                          L. {cust.totalSpent.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Selling Products rotation */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-neutral-900 text-sm border-b border-neutral-100 pb-3 flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-emerald-600" /> Rotación de Perfumes (Más Vendidos)
            </h3>

            {topSellingProducts.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-6">
                No se registran ventas para el período seleccionado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-neutral-100">
                  <thead className="bg-neutral-50 text-neutral-500 font-bold">
                    <tr>
                      <th className="p-3">Perfume</th>
                      <th className="p-3 text-center">Unidades</th>
                      <th className="p-3 text-right">Recaudado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {topSellingProducts.map((item, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/30">
                        <td className="p-3">
                          <span className="block text-[8px] font-bold text-neutral-400 uppercase font-mono">{item.brand}</span>
                          <span className="font-bold text-neutral-900 truncate max-w-[150px] block">{item.name}</span>
                        </td>
                        <td className="p-3 text-center font-black font-mono text-neutral-900">
                          <span className="inline-block bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded-lg border border-emerald-100 text-[10px]">
                            {item.quantity} u.
                          </span>
                        </td>
                        <td className="p-3 text-right font-black font-mono text-emerald-600">
                          L. {item.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* 3. INVENTARIO FÍSICO Y CAPITAL EN STOCK (SECCIÓN ABAJO)  */}
      {/* ========================================================= */}
      <div className="space-y-6 pt-5 border-t border-neutral-200">
        <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider font-mono border-l-4 border-amber-500 pl-3">
          Inventario Físico y Costos en Stock (Estadísticas en Tiempo Real)
        </h3>

        {/* Static inventory metrics counters */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Public active retail value of stock */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-neutral-950 text-amber-400 rounded-2xl">
              <Package className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Valor Público en Stock</span>
              <span className="block text-2xl font-black text-neutral-950 font-mono">
                L. {inventoryStats.totalInventoryValue.toLocaleString()}
              </span>
              <span className="block text-[10px] font-medium text-neutral-500">
                Valor estimado al por menor
              </span>
            </div>
          </div>

          {/* Investment Capital (FOB/CIF total) */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-neutral-900 text-amber-500 rounded-2xl">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Costo Inversión de Stock</span>
              <span className="block text-2xl font-black text-neutral-950 font-mono">
                L. {inventoryStats.totalInventoryCost.toLocaleString()}
              </span>
              <span className="block text-[10px] font-semibold text-neutral-500">
                FOB/CIF total invertido en aduana
              </span>
            </div>
          </div>

          {/* Expected gross profit on stock */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Ganancia Estimada Stock</span>
              <span className="block text-2xl font-black text-purple-950 font-mono">
                L. {inventoryStats.expectedProfit.toLocaleString()}
              </span>
              <span className="block text-[10px] font-semibold text-purple-700">
                Margen bruto en stock actual
              </span>
            </div>
          </div>

          {/* Total units & unique brands stats card */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="space-y-0.5">
                <span className="block text-base font-black text-neutral-950 font-mono">{inventoryStats.uniqueFragrances}</span>
                <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">Fragancias</span>
              </div>
              <div className="space-y-0.5 border-x border-neutral-200">
                <span className="block text-base font-black text-neutral-950 font-mono">{inventoryStats.totalUnitsInStock}</span>
                <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">Unidades</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-base font-black text-neutral-950 font-mono">{inventoryStats.totalSets}</span>
                <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">Sets/Combos</span>
              </div>
            </div>
            <div className="text-center border-t border-neutral-100 pt-3 mt-3">
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono">Costo Unitario Promedio:</span>
              <strong className="block text-xs text-neutral-800 font-mono">
                L. {inventoryStats.totalUnitsInStock > 0 ? Math.round(inventoryStats.totalInventoryCost / inventoryStats.totalUnitsInStock).toLocaleString() : 0} HNL
              </strong>
            </div>
          </div>

        </div>

        {/* Brand & Stock Category distribution volume grids */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Top 5 Brands in Stock volume list */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-neutral-900 text-sm border-b border-neutral-100 pb-3 flex items-center gap-1.5">
              <Tags className="h-4 w-4 text-indigo-500" /> Marcas con Mayor Volumen en Stock
            </h3>

            <div className="space-y-3">
              {brandStatsBreakdown.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4">No hay productos en inventario.</p>
              ) : (
                brandStatsBreakdown.map((item, idx) => {
                  const percentage = inventoryStats.totalUnitsInStock > 0 
                    ? Math.round((item.stock / inventoryStats.totalUnitsInStock) * 100)
                    : 0;
                  
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-neutral-800">{item.brand}</span>
                        <span className="text-neutral-500 font-mono">{item.stock} u. ({percentage}%)</span>
                      </div>
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

          {/* Category distribution in stock */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-neutral-900 text-sm border-b border-neutral-100 pb-3 flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-amber-500" /> Distribución de Stock por Categoría
            </h3>

            <div className="space-y-3">
              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4">No hay categorías configuradas.</p>
              ) : (
                categoryBreakdown.map((item, idx) => {
                  const percentage = inventoryStats.totalUnitsInStock > 0 
                    ? Math.round((item.stock / inventoryStats.totalUnitsInStock) * 100)
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

        {/* DETAILED BRAND TO PERFUME ACCORDION BREAKDOWN METRIC (NEW REQUEST) */}
        <div className="bg-white border border-neutral-200 rounded-3xl shadow-sm overflow-hidden p-6 space-y-4">
          <div>
            <h3 className="font-display font-bold text-neutral-900 text-sm flex items-center gap-1.5 border-b border-neutral-100 pb-3">
              <Tags className="h-4 w-4 text-emerald-600" /> Catálogo Detallado de Marcas (Desglose hasta Perfume)
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
              <p className="text-[10px] text-neutral-500">
                Haz clic en cualquier marca para desglosar la lista completa de perfumes, stock físico y rentabilidad.
              </p>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-100 px-2.5 py-1 rounded-md">
                Ordenado por unidades vendidas
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {brandDetailedBreakdown.map((brandInfo, index) => {
              const isExpanded = expandedBrand === brandInfo.brandName;
              return (
                <div 
                  key={index} 
                  className="border border-neutral-200 rounded-2xl overflow-hidden transition-all duration-200"
                >
                  {/* Brand Row Trigger */}
                  <button
                    onClick={() => setExpandedBrand(isExpanded ? null : brandInfo.brandName)}
                    className="w-full px-5 py-3.5 bg-neutral-50 hover:bg-neutral-100/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-black text-neutral-900 font-mono tracking-wider uppercase">
                        {brandInfo.brandName}
                      </span>
                      <div className="flex items-center gap-3 text-[10px] text-neutral-500 mt-0.5 font-mono">
                        <span>Stock: <strong className="text-neutral-800">{brandInfo.totalStock} u.</strong></span>
                        <span>•</span>
                        <span>Vendido: <strong className="text-emerald-700">{brandInfo.soldQty} u.</strong></span>
                        {brandInfo.soldRevenue > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 font-bold">L. {brandInfo.soldRevenue.toLocaleString()} HNL</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-[9px] font-extrabold uppercase text-neutral-400 px-2 py-0.5 bg-white border border-neutral-200 rounded-md">
                        {brandInfo.perfumes.length} {brandInfo.perfumes.length === 1 ? 'Perfume' : 'Perfumes'}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-neutral-500" /> : <ChevronDown className="h-4 w-4 text-neutral-500" />}
                    </div>
                  </button>

                  {/* Perfumes Sub-Table Expanded Section */}
                  {isExpanded && (
                    <div className="p-4 bg-white border-t border-neutral-100 overflow-x-auto">
                      <table className="w-full text-left text-xs divide-y divide-neutral-100">
                        <thead className="bg-neutral-50 text-neutral-500 font-bold font-mono text-[9px] uppercase">
                          <tr>
                            <th className="p-2.5">Perfume / Variante</th>
                            <th className="p-2.5 text-center">Presentación</th>
                            <th className="p-2.5 text-center">Stock Físico</th>
                            <th className="p-2.5 text-right">Precio de Venta</th>
                            <th className="p-2.5 text-center bg-emerald-50/40 text-emerald-800">U. Vendidas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 text-neutral-800">
                          {brandInfo.perfumes.map((perfume) => (
                            <tr key={perfume.id} className="hover:bg-neutral-50/40">
                              <td className="p-2.5 font-semibold text-neutral-900">
                                {perfume.name}
                              </td>
                              <td className="p-2.5 text-center text-neutral-500 font-mono">
                                {perfume.size}
                              </td>
                              <td className="p-2.5 text-center font-bold">
                                {perfume.stock <= 0 ? (
                                  <span className="text-red-500 font-bold font-mono">Agotado (0)</span>
                                ) : (
                                  <span className="font-mono">{perfume.stock} u.</span>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-bold text-neutral-700 font-mono">
                                L. {perfume.price.toLocaleString()}
                              </td>
                              <td className="p-2.5 text-center font-black font-mono bg-emerald-50/10">
                                {perfume.soldQty > 0 ? (
                                  <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-100 px-1.5 py-0.5 rounded-md text-[10px]">
                                    {perfume.soldQty} u.
                                  </span>
                                ) : (
                                  <span className="text-neutral-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
