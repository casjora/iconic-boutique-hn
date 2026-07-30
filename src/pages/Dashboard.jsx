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
  Clock,
  AlertTriangle,
  Flame
} from 'lucide-react';
import { isProductSet } from '../utils/productHelper';

export default function Dashboard() {
  const { products, orders, fetchProducts, fetchOrders, user } = useStore();
  const isOwner = user?.role === 'owner';
  
  // Active timeframe for sales analysis
  const [timeframe, setTimeframe] = useState('all'); // 'all', 'month', 'last30', 'last90', 'year'
  
  // Detailed brand expander state
  const [expandedBrand, setExpandedBrand] = useState(null);
  
  // Collapsible year performance state
  const [isYearlyOpen, setIsYearlyOpen] = useState(false);

  // Collapsible non-moving items state
  const [isNoMovementOpen, setIsNoMovementOpen] = useState(false);

  const handleRefresh = () => {
    fetchProducts();
    fetchOrders();
  };

  // 1. Reactive Sales & Orders filtering based on selected timeframe
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(o => {
      if (timeframe === 'all') return true;

      const orderDate = o.createdAt ? new Date(o.createdAt) : new Date(o.date);
      if (isNaN(orderDate.getTime())) return true;

      if (timeframe === 'month') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }
      if (timeframe === 'last30') {
        const limit = new Date();
        limit.setDate(now.getDate() - 30);
        return orderDate >= limit;
      }
      if (timeframe === 'last90') {
        const limit = new Date();
        limit.setDate(now.getDate() - 90);
        return orderDate >= limit;
      }
      if (timeframe === 'year') {
        return orderDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [orders, timeframe]);

  // 2. Sales and pipeline figures for the selected timeframe
  const salesStats = useMemo(() => {
    const completed = filteredOrders.filter(o => o.status === 'entregado');
    const pending = filteredOrders.filter(o => o.status === 'pendiente');
    
    const completedRevenue = completed.reduce((acc, o) => acc + Number(o.total || 0), 0);
    const pendingRevenue = pending.reduce((acc, o) => acc + Number(o.total || 0), 0);
    const pipelineRevenue = completedRevenue + pendingRevenue;
    const aov = completed.length > 0 ? completedRevenue / completed.length : 0;
    
    let completedCost = 0;
    completed.forEach(o => {
      (o.items || []).forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        const itemCost = p ? Number(p.cost || 0) : 0;
        completedCost += itemCost * Number(item.quantity || 1);
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

  // 3. Customer of the Month / Period (Highest volume)
  const clienteDelMes = useMemo(() => {
    const customers = {};
    const completedOrders = filteredOrders.filter(o => o.status === 'entregado');
    
    completedOrders.forEach(o => {
      const name = o.clientName?.trim() || 'Cliente Sin Nombre';
      const phone = o.clientPhone || 'Sin Contacto';
      if (!customers[name]) {
        customers[name] = { name, phone, totalQty: 0, totalSpent: 0, orderCount: 0 };
      }
      const orderQty = (o.items || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);
      customers[name].totalQty += orderQty;
      customers[name].totalSpent += Number(o.total || 0);
      customers[name].orderCount += 1;
    });
    
    const sorted = Object.values(customers).sort((a, b) => b.totalQty - a.totalQty);
    return sorted[0] || null;
  }, [filteredOrders]);

  // 4. Monthly performance breakdown
  const monthlyPerformance = useMemo(() => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const data = {};
    
    orders.filter(o => o.status === 'entregado').forEach(o => {
      const date = o.createdAt ? new Date(o.createdAt) : new Date(o.date);
      if (isNaN(date.getTime())) return;

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
      
      data[key].totalSales += Number(o.total || 0);
      data[key].count += 1;
      const orderQty = (o.items || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);
      data[key].totalQty += orderQty;
    });
    
    return Object.values(data).sort((a, b) => b.key.localeCompare(a.key));
  }, [orders]);

  // 5. Best buyers in timeframe
  const topCustomers = useMemo(() => {
    const customers = {};
    filteredOrders.filter(o => o.status === 'entregado').forEach(o => {
      const name = o.clientName?.trim() || 'Cliente Sin Nombre';
      const phone = o.clientPhone || 'Sin Contacto';
      if (!customers[name]) {
        customers[name] = { name, phone, ordersCount: 0, totalSpent: 0, totalQty: 0 };
      }
      customers[name].ordersCount += 1;
      customers[name].totalSpent += Number(o.total || 0);
      customers[name].totalQty += (o.items || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    });
    return Object.values(customers)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 6);
  }, [filteredOrders]);

  // 6. Product categories sales breakdown in timeframe
  const categorySalesBreakdown = useMemo(() => {
    const sales = {};
    filteredOrders.filter(o => o.status === 'entregado').forEach(o => {
      (o.items || []).forEach(item => {
        let category = item.category || 'Sin Categoría';
        if (category === 'Sin Categoría' || category === 'N/A') {
          const p = products.find(prod => prod.id === item.productId);
          if (p && p.category) category = p.category;
        }
        category = category.trim();
        if (!sales[category]) {
          sales[category] = { category, quantity: 0, revenue: 0 };
        }
        const qty = Number(item.quantity || 1);
        const price = Number(item.pricePaid || 0);
        sales[category].quantity += qty;
        sales[category].revenue += qty * price;
      });
    });
    return Object.values(sales).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, products]);

  // 7. Sets vs Individual Sales Breakdown
  const setVsIndividualSales = useMemo(() => {
    let setsRevenue = 0;
    let individualRevenue = 0;
    let setsQty = 0;
    let individualQty = 0;
    
    filteredOrders.filter(o => o.status === 'entregado').forEach(o => {
      (o.items || []).forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        const isSet = isProductSet(item) || (p && isProductSet(p));
        const qty = Number(item.quantity || 1);
        const price = Number(item.pricePaid || 0);
        const itemRevenue = qty * price;
        
        if (isSet) {
          setsRevenue += itemRevenue;
          setsQty += qty;
        } else {
          individualRevenue += itemRevenue;
          individualQty += qty;
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
    const counts = {};
    filteredOrders.filter(o => o.status === 'entregado').forEach(o => {
      (o.items || []).forEach(item => {
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
        const qty = Number(item.quantity || 1);
        const price = Number(item.pricePaid || 0);
        counts[item.productId].quantity += qty;
        counts[item.productId].revenue += qty * price;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);
  }, [filteredOrders]);

  // 9. NO-MOVEMENT & LOW-STOCK INVENTORY ANALYSIS
  const inventoryAlerts = useMemo(() => {
    const soldInPeriod = {};
    filteredOrders.filter(o => o.status === 'entregado').forEach(o => {
      (o.items || []).forEach(item => {
        soldInPeriod[item.productId] = (soldInPeriod[item.productId] || 0) + Number(item.quantity || 1);
      });
    });

    const noMovement = products.filter(p => p.stock > 0 && (!soldInPeriod[p.id] || soldInPeriod[p.id] === 0));
    
    const tiedUpCapitalCost = noMovement.reduce((acc, p) => acc + (Number(p.cost || 0) * p.stock), 0);
    const tiedUpCapitalValue = noMovement.reduce((acc, p) => acc + (Number(p.pricePublic || 0) * p.stock), 0);

    const lowStock = products.filter(p => p.stock > 0 && p.stock <= 3);

    return {
      noMovement,
      noMovementCount: noMovement.length,
      tiedUpCapitalCost,
      tiedUpCapitalValue,
      lowStock,
      lowStockCount: lowStock.length
    };
  }, [products, filteredOrders]);

  // Static physical inventory statistics
  const inventoryStats = useMemo(() => {
    const totalInventoryValue = products.reduce((acc, p) => acc + (Number(p.pricePublic || 0) * p.stock), 0);
    const totalInventoryCost = products.reduce((acc, p) => acc + (Number(p.cost || 0) * p.stock), 0);
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
      .slice(0, 5);
  }, [products]);

  // Category stock breakdown
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

  // Detailed Brand to Perfume structure
  const brandDetailedBreakdown = useMemo(() => {
    const brands = {};
    
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
      brands[brand].totalValue += Number(p.pricePublic || 0) * p.stock;
      brands[brand].totalCost += Number(p.cost || 0) * p.stock;
      
      if (!brands[brand].perfumes[p.id]) {
        brands[brand].perfumes[p.id] = {
          id: p.id,
          name: p.name,
          size: p.size || 'N/A',
          stock: p.stock,
          price: Number(p.pricePublic || 0),
          soldQty: 0,
          soldRevenue: 0
        };
      } else {
        brands[brand].perfumes[p.id].stock += p.stock;
      }
    });
    
    filteredOrders.filter(o => o.status === 'entregado').forEach(o => {
      (o.items || []).forEach(item => {
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
        
        const qty = Number(item.quantity || 1);
        const price = Number(item.pricePaid || 0);
        const itemRevenue = qty * price;
        brands[brandName].soldQty += qty;
        brands[brandName].soldRevenue += itemRevenue;
        
        if (!brands[brandName].perfumes[item.productId]) {
          brands[brandName].perfumes[item.productId] = {
            id: item.productId,
            name: item.name,
            size: item.size || 'N/A',
            stock: 0,
            price: price,
            soldQty: 0,
            soldRevenue: 0
          };
        }
        
        brands[brandName].perfumes[item.productId].soldQty += qty;
        brands[brandName].perfumes[item.productId].soldRevenue += itemRevenue;
      });
    });
    
    return Object.values(brands)
      .map(b => ({
        ...b,
        perfumes: Object.values(b.perfumes).sort((a, b) => b.soldQty - a.soldQty || b.stock - a.stock)
      }))
      .sort((a, b) => b.soldQty - a.soldQty || b.totalStock - a.totalStock);
  }, [products, filteredOrders]);

  return (
    <div className="space-y-6 sm:space-y-8 fade-in-up pb-10 max-w-7xl mx-auto w-full px-2 sm:px-4">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-5">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400 animate-pulse shrink-0" />
            <span>Panel de Control e Inteligencia Comercial</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Análisis de ventas, rotación de marcas, clientes destacados y capital en riesgo en inventarios.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          
          {/* Timeframe Selector */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-2 rounded-xl shadow-sm w-full sm:w-auto">
            <div className="flex items-center gap-1.5 min-w-0 w-full">
              <Calendar className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-transparent text-xs font-bold text-neutral-700 dark:text-neutral-200 focus:outline-none cursor-pointer w-full"
              >
                <option value="all" className="dark:bg-neutral-800">Todo el Historial</option>
                <option value="month" className="dark:bg-neutral-800">Este Mes (Calendario)</option>
                <option value="last30" className="dark:bg-neutral-800">Últimos 30 días</option>
                <option value="last90" className="dark:bg-neutral-800">Últimos 90 días</option>
                <option value="year" className="dark:bg-neutral-800">Este Año (2026)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 w-full sm:w-auto"
          >
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            <span>Sincronizar</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. VENTAS Y RENDIMIENTO COMERCIAL                          */}
      {/* ========================================================= */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-mono border-l-4 border-emerald-500 pl-2.5 sm:pl-3">
            Ventas y Resultados Financieros del Período
          </h3>
          <span className="self-start sm:self-auto text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800 uppercase font-mono">
            Filtrado: {timeframe === 'all' ? 'Todo' : timeframe === 'month' ? 'Este Mes' : timeframe === 'last30' ? 'Últimos 30 días' : timeframe === 'last90' ? 'Últimos 90 días' : 'Este Año'}
          </span>
        </div>

        {/* Key metrics counters grid */}
        <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Sales closed */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex items-center sm:items-start gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl sm:rounded-2xl shrink-0">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono block truncate">Ventas Cerradas</span>
              <span className="block text-xl sm:text-2xl font-black text-neutral-950 dark:text-neutral-100 font-mono truncate">
                L. {salesStats.completedRevenue.toLocaleString()}
              </span>
              <span className="block text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 truncate">
                <CheckCircle2 className="h-3 w-3 shrink-0" /> {salesStats.completedCount} cotizaciones entregadas
              </span>
            </div>
          </div>

          {/* Ticket Promedio (AOV) */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex items-center sm:items-start gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl sm:rounded-2xl shrink-0">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono block truncate">Ticket Promedio (AOV)</span>
              <span className="block text-xl sm:text-2xl font-black text-neutral-950 dark:text-neutral-100 font-mono truncate">
                L. {Math.round(salesStats.aov).toLocaleString()}
              </span>
              <span className="block text-[10px] font-semibold text-amber-800 dark:text-amber-300 truncate">
                Valor promedio por orden
              </span>
            </div>
          </div>

          {/* Owner Profit / Cost */}
          {isOwner && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex items-center sm:items-start gap-3 sm:gap-4 ring-2 ring-emerald-500/20">
              <div className="p-2.5 sm:p-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-xl sm:rounded-2xl shrink-0">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest font-mono block truncate">Ganancia Neta</span>
                <span className="block text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono truncate">
                  L. {Math.round(salesStats.completedProfit).toLocaleString()}
                </span>
                <span className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 truncate">
                  Costo: L. {Math.round(salesStats.completedCost).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Pending Pipeline */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex items-center sm:items-start gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl sm:rounded-2xl shrink-0">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
            </div>
            <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono block truncate">Ventas Pendientes</span>
              <span className="block text-xl sm:text-2xl font-black text-indigo-950 dark:text-indigo-300 font-mono truncate">
                L. {salesStats.pendingRevenue.toLocaleString()}
              </span>
              <span className="block text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1 truncate">
                <Clock className="h-3 w-3 shrink-0" /> {salesStats.pendingCount} órdenes por verificar/cobrar
              </span>
            </div>
          </div>

          {/* CLIENTE DESTACADO / DEL MES */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex items-center sm:items-start gap-3 sm:gap-4 relative overflow-hidden sm:col-span-2 lg:col-span-1">
            <div className="absolute right-[-10px] bottom-[-10px] text-amber-200/40 dark:text-amber-500/10 opacity-40">
              <Trophy className="h-20 w-20 sm:h-24 sm:w-24" />
            </div>
            <div className="p-2.5 sm:p-3 bg-amber-400 text-white dark:text-neutral-950 rounded-xl sm:rounded-2xl shadow-sm z-10 shrink-0">
              <Crown className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="space-y-0.5 sm:space-y-1 z-10 min-w-0 flex-1">
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-widest font-mono flex items-center gap-1 truncate">
                <Sparkles className="h-3 w-3 shrink-0" /> Cliente Destacado
              </span>
              {clienteDelMes ? (
                <>
                  <span className="block text-xs sm:text-sm font-black text-neutral-900 dark:text-neutral-100 truncate">
                    {clienteDelMes.name}
                  </span>
                  <span className="block text-[10px] font-semibold text-amber-900 dark:text-amber-200 leading-tight">
                    Compró <strong className="font-extrabold text-neutral-950 dark:text-amber-400 font-mono">{clienteDelMes.totalQty} u.</strong> en {clienteDelMes.orderCount} {clienteDelMes.orderCount === 1 ? 'pedido' : 'pedidos'} (L. {clienteDelMes.totalSpent.toLocaleString()})
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-xs sm:text-sm font-black text-neutral-600 dark:text-neutral-400">
                    Sin Datos
                  </span>
                  <span className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                    No hay ventas cerradas en este período.
                  </span>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Strategic Inventory & Business Alerts Section */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          
          {/* Inventory Alert: Sin Movimiento (Tied-up Capital) */}
          <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-widest font-mono flex items-center gap-1 truncate">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" /> Alerta de Inventario Sin Movimiento
                </span>
                <h4 className="font-display font-bold text-neutral-900 dark:text-neutral-100 text-xs leading-snug">
                  Productos con Stock Físico sin Ventas en este Período
                </h4>
              </div>
              <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 font-mono font-black text-[11px] sm:text-xs px-2.5 py-1 rounded-xl shrink-0">
                {inventoryAlerts.noMovementCount} frascos
              </span>
            </div>

            <div className="bg-white/80 dark:bg-neutral-900/80 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-3 sm:p-4 space-y-2">
              {isOwner && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs gap-0.5">
                  <span className="text-neutral-600 dark:text-neutral-400 font-semibold">Capital atrapado (Costo Inversión):</span>
                  <span className="font-mono font-black text-amber-900 dark:text-amber-300">L. {inventoryAlerts.tiedUpCapitalCost.toLocaleString()} HNL</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs border-t border-amber-100 dark:border-amber-900/40 pt-1.5 gap-0.5">
                <span className="text-neutral-600 dark:text-neutral-400 font-semibold">Valor potencial de Venta Pública:</span>
                <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">L. {inventoryAlerts.tiedUpCapitalValue.toLocaleString()} HNL</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setIsNoMovementOpen(!isNoMovementOpen)}
                className="w-full text-left text-xs font-bold text-amber-900 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-200 flex items-center justify-between bg-amber-100/60 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <span>Ver lista de fragancias estancadas ({inventoryAlerts.noMovementCount})</span>
                {isNoMovementOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
              </button>

              {isNoMovementOpen && (
                <div className="bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-3 max-h-48 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 text-xs space-y-1">
                  {inventoryAlerts.noMovement.length === 0 ? (
                    <p className="text-neutral-500 dark:text-neutral-400 text-center py-2">¡Excelente! Todos los productos han tenido rotación.</p>
                  ) : (
                    inventoryAlerts.noMovement.map((p) => (
                      <div key={p.id} className="py-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-neutral-900 dark:text-neutral-100 block truncate">{p.brand} - {p.name} ({p.size || 'N/A'})</span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                            {isOwner ? `Costo: L. ${p.cost} | ` : ''}Venta: L. {p.pricePublic}
                          </span>
                        </div>
                        <span className="self-start sm:self-auto bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono font-black text-[10px] px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 shrink-0">
                          {p.stock} u. en stock
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Low Stock & High Demand Indicators */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest font-mono flex items-center gap-1 truncate">
                  <Flame className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400 animate-bounce shrink-0" /> Alerta de Reabastecimiento
                </span>
                <h4 className="font-display font-bold text-neutral-900 dark:text-neutral-100 text-xs leading-snug">
                  Fragancias por Agotarse (Stock ≤ 3 unidades)
                </h4>
              </div>
              <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900 font-mono font-black text-[11px] sm:text-xs px-2.5 py-1 rounded-xl shrink-0">
                {inventoryAlerts.lowStockCount} items
              </span>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-44 pr-1">
              {inventoryAlerts.lowStock.length === 0 ? (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-6">No hay fragancias críticas por agotarse.</p>
              ) : (
                inventoryAlerts.lowStock.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex justify-between items-center text-xs p-2.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-800 gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 block truncate">{p.brand} - {p.name}</span>
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block truncate">{p.size || 'N/A'}</span>
                    </div>
                    <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-mono font-black px-2 py-0.5 rounded-md text-[10px] shrink-0">
                      ¡Quedan {p.stock} u.!
                    </span>
                  </div>
                ))
              )}
            </div>

            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed pt-1 border-t border-neutral-100 dark:border-neutral-800">
              💡 Priorizar la compra de estas fragancias de alta rotación en la próxima importación.
            </p>
          </div>

        </div>

        {/* Breakdown details charts / meters */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
          
          {/* Pipeline value tracker card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono block">Embudo y Pipeline de Ingresos</span>
              <h4 className="font-display font-bold text-neutral-800 dark:text-neutral-200 text-xs">Distribución del Flujo de Caja</h4>
            </div>
            
            <div className="space-y-2 font-mono">
              <div className="flex justify-between text-xs border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span className="text-neutral-500 dark:text-neutral-400 font-sans">Entregado (Realizado):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">L. {salesStats.completedRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span className="text-neutral-500 dark:text-neutral-400 font-sans">En Espera (Pendiente):</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">L. {salesStats.pendingRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs pt-0.5">
                <span className="text-neutral-900 dark:text-neutral-100 font-sans font-bold">Pipeline Total:</span>
                <span className="font-black text-neutral-950 dark:text-neutral-100">L. {salesStats.pipelineRevenue.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-neutral-400 dark:text-neutral-500 font-mono">
                <span>CERRADO ({salesStats.pipelineRevenue > 0 ? Math.round((salesStats.completedRevenue / salesStats.pipelineRevenue) * 100) : 100}%)</span>
                <span>PENDIENTE ({salesStats.pipelineRevenue > 0 ? Math.round((salesStats.pendingRevenue / salesStats.pipelineRevenue) * 100) : 0}%)</span>
              </div>
              <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-emerald-500" 
                  style={{ width: `${salesStats.pipelineRevenue > 0 ? (salesStats.completedRevenue / salesStats.pipelineRevenue) * 100 : 100}%` }}
                />
                <div 
                  className="h-full bg-indigo-500" 
                  style={{ width: `${salesStats.pipelineRevenue > 0 ? (salesStats.pendingRevenue / salesStats.pipelineRevenue) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-sans leading-relaxed mt-2">
                * Hay <strong className="text-indigo-700 dark:text-indigo-300">{salesStats.pendingCount} cotizaciones pendientes</strong> por verificar para consolidar caja.
              </p>
            </div>
          </div>

          {/* Sets vs Perfumes Single Bottle revenue breakdown */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono block">Rendimiento por Formato</span>
              <h4 className="font-display font-bold text-neutral-800 dark:text-neutral-200 text-xs">Sets/Estuches vs Fragancia Individual</h4>
            </div>

            <div className="space-y-2 font-mono">
              <div className="flex justify-between text-xs border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span className="text-neutral-500 dark:text-neutral-400 font-sans">Fragancias Individuales:</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200">L. {setVsIndividualSales.individualRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <span className="text-neutral-500 dark:text-neutral-400 font-sans">Estuches y Sets:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">L. {setVsIndividualSales.setsRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs pt-0.5">
                <span className="text-neutral-900 dark:text-neutral-100 font-bold font-sans">Unidades Totales Vendidas:</span>
                <span className="font-semibold text-neutral-700 dark:text-neutral-300 font-mono">{setVsIndividualSales.individualQty + setVsIndividualSales.setsQty} u.</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-neutral-400 dark:text-neutral-500 font-mono">
                <span>INDIVIDUAL ({setVsIndividualSales.individualPercent}%)</span>
                <span>SETS ({setVsIndividualSales.setsPercent}%)</span>
              </div>
              <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-neutral-800 dark:bg-amber-400" 
                  style={{ width: `${setVsIndividualSales.individualPercent}%` }}
                />
                <div 
                  className="h-full bg-indigo-500" 
                  style={{ width: `${setVsIndividualSales.setsPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-sans leading-relaxed mt-2">
                🎁 Los sets representan el <strong className="text-indigo-700 dark:text-indigo-300 font-bold">{setVsIndividualSales.setsPercent}%</strong> del dinero ingresado en este período.
              </p>
            </div>
          </div>

          {/* Actual Sales Category Performance card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono block">Rendimiento por Categoría</span>
              <h4 className="font-display font-bold text-neutral-800 dark:text-neutral-200 text-xs">Ventas Reales del Período</h4>
            </div>

            <div className="space-y-2.5">
              {categorySalesBreakdown.length === 0 ? (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-4 font-sans">No se registran ventas para clasificar categorías.</p>
              ) : (
                categorySalesBreakdown.slice(0, 3).map((item, idx) => {
                  const totalCategoryRevenue = categorySalesBreakdown.reduce((sum, c) => sum + c.revenue, 0);
                  const percentage = totalCategoryRevenue > 0 ? Math.round((item.revenue / totalCategoryRevenue) * 100) : 0;
                  
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold gap-2">
                        <span className="text-neutral-700 dark:text-neutral-200 truncate">{item.category}</span>
                        <span className="text-neutral-500 dark:text-neutral-400 font-mono shrink-0">L. {item.revenue.toLocaleString()} ({item.quantity} u.)</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
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

            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-sans leading-relaxed">
              * Ayuda a identificar qué géneros tienen mayor rotación comercial en el mercado.
            </p>
          </div>

        </div>

        {/* COLLAPSIBLE SECTION: VER CÓMO VAN EN EL AÑO (Months breakdown) */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
          <button 
            onClick={() => setIsYearlyOpen(!isYearlyOpen)}
            className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-neutral-50 hover:bg-neutral-100/60 dark:bg-neutral-800/50 dark:hover:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between transition-colors cursor-pointer text-left"
          >
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 font-display">Histórico Mensual del Año (Desglose de Caja)</span>
              <span className="text-[9px] sm:text-[10px] text-neutral-400 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 rounded-lg font-mono shrink-0">
                {monthlyPerformance.length} meses con ventas
              </span>
            </div>
            <div className="text-neutral-500 dark:text-neutral-400 shrink-0 ml-2">
              {isYearlyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>
          
          {isYearlyOpen && (
            <div className="p-3 sm:p-6">
              {monthlyPerformance.length === 0 ? (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-4">Aún no se registran datos históricos mensuales.</p>
              ) : (
                <>
                  {/* Vista de Tarjetas para Móvil */}
                  <div className="block sm:hidden space-y-2.5">
                    {monthlyPerformance.map((item, idx) => (
                      <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between items-center font-bold text-neutral-900 dark:text-neutral-100">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            {item.monthName} {item.year}
                          </span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                            L. {item.totalSales.toLocaleString()} HNL
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-neutral-500 dark:text-neutral-400 font-mono pt-1 border-t border-neutral-200/50 dark:border-neutral-700/50">
                          <span>Órdenes: <strong className="text-neutral-700 dark:text-neutral-300">{item.count}</strong></span>
                          <span>Unidades: <strong className="text-neutral-700 dark:text-neutral-300">{item.totalQty} u.</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Vista de Tabla para Escritorio */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs divide-y divide-neutral-100 dark:divide-neutral-800">
                      <thead className="bg-neutral-50 dark:bg-neutral-800/70 text-neutral-500 dark:text-neutral-400 font-bold font-mono text-[10px]">
                        <tr>
                          <th className="p-3">Período / Mes</th>
                          <th className="p-3 text-center">Órdenes Entregadas</th>
                          <th className="p-3 text-center">Unidades Compradas</th>
                          <th className="p-3 text-right">Monto Recaudado (HNL)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {monthlyPerformance.map((item, idx) => (
                          <tr key={idx} className="hover:bg-neutral-50/20 dark:hover:bg-neutral-800/30">
                            <td className="p-3 font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                              {item.monthName} {item.year}
                            </td>
                            <td className="p-3 text-center font-semibold text-neutral-700 dark:text-neutral-300 font-mono">
                              {item.count} órdenes
                            </td>
                            <td className="p-3 text-center font-medium text-neutral-600 dark:text-neutral-400 font-mono">
                              {item.totalQty} u.
                            </td>
                            <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">
                              L. {item.totalSales.toLocaleString()} HNL
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Row of detailed lists for current timeframe */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          
          {/* Top Wholesale buyers / loyalty list */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> Top Clientes del Período
            </h3>

            {topCustomers.length === 0 ? (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-6">
                No se registran clientes con órdenes entregadas en este período.
              </p>
            ) : (
              <div className="space-y-2">
                {topCustomers.map((cust, idx) => (
                  <div key={idx} className="p-2.5 sm:p-3 bg-neutral-50/50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 dark:bg-amber-400 text-white dark:text-neutral-950 text-[9px] font-mono font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 truncate">{cust.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block font-black font-mono text-emerald-600 dark:text-emerald-400 text-xs">L. {cust.totalSpent.toLocaleString()}</span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">{cust.ordersCount} ped. ({cust.totalQty} u)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Selling Products rotation */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> Rotación de Perfumes (Más Vendidos)
            </h3>

            {topSellingProducts.length === 0 ? (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-6">
                No se registran ventas para el período seleccionado.
              </p>
            ) : (
              <div className="space-y-2">
                {topSellingProducts.map((item, idx) => (
                  <div key={idx} className="p-2.5 sm:p-3 bg-neutral-50/50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="block text-[8px] font-bold text-neutral-400 dark:text-neutral-500 uppercase font-mono">{item.brand}</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 truncate block">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono font-black text-[10px] px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800">
                        {item.quantity} u.
                      </span>
                      <span className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-xs">
                        L. {item.revenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* 3. INVENTARIO FÍSICO Y CAPITAL EN STOCK                   */}
      {/* ========================================================= */}
      <div className="space-y-4 sm:space-y-6 pt-5 border-t border-neutral-200 dark:border-neutral-800">
        <h3 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-mono border-l-4 border-amber-500 pl-2.5 sm:pl-3">
          Inventario Físico y Costos en Stock (Estadísticas en Tiempo Real)
        </h3>

        {/* Static inventory metrics counters */}
        <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Public active retail value of stock */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex items-center sm:items-start gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-neutral-950 dark:bg-neutral-800 text-amber-400 rounded-xl sm:rounded-2xl shrink-0">
              <Package className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono block truncate">Valor Público en Stock</span>
              <span className="block text-xl sm:text-2xl font-black text-neutral-950 dark:text-neutral-100 font-mono truncate">
                L. {inventoryStats.totalInventoryValue.toLocaleString()}
              </span>
              <span className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 truncate">
                Valor estimado al por menor
              </span>
            </div>
          </div>

          {/* Investment Capital (FOB/CIF total) */}
          {isOwner && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex items-center sm:items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-neutral-900 dark:bg-neutral-800 text-amber-500 dark:text-amber-400 rounded-xl sm:rounded-2xl shrink-0">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono block truncate">Costo Inversión de Stock</span>
                <span className="block text-xl sm:text-2xl font-black text-neutral-950 dark:text-neutral-100 font-mono truncate">
                  L. {inventoryStats.totalInventoryCost.toLocaleString()}
                </span>
                <span className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 truncate">
                  FOB/CIF total invertido en aduana
                </span>
              </div>
            </div>
          )}

          {/* Expected gross profit on stock */}
          {isOwner && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex items-center sm:items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl sm:rounded-2xl shrink-0">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono block truncate">Ganancia Estimada Stock</span>
                <span className="block text-xl sm:text-2xl font-black text-purple-950 dark:text-purple-300 font-mono truncate">
                  L. {inventoryStats.expectedProfit.toLocaleString()}
                </span>
                <span className="block text-[10px] font-semibold text-purple-700 dark:text-purple-400 truncate">
                  Margen bruto en stock actual
                </span>
              </div>
            </div>
          )}

          {/* Total units & unique brands stats card */}
          <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="space-y-0.5">
                <span className="block text-sm sm:text-base font-black text-neutral-950 dark:text-neutral-100 font-mono">{inventoryStats.uniqueFragrances}</span>
                <span className="text-[8px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono block">Fragancias</span>
              </div>
              <div className="space-y-0.5 border-x border-neutral-200 dark:border-neutral-800">
                <span className="block text-sm sm:text-base font-black text-neutral-950 dark:text-neutral-100 font-mono">{inventoryStats.totalUnitsInStock}</span>
                <span className="text-[8px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono block">Unidades</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-sm sm:text-base font-black text-neutral-950 dark:text-neutral-100 font-mono">{inventoryStats.totalSets}</span>
                <span className="text-[8px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono block">Sets/Combos</span>
              </div>
            </div>
            {isOwner && (
              <div className="text-center border-t border-neutral-100 dark:border-neutral-800 pt-2 sm:pt-3 mt-2 sm:mt-3">
                <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono">Costo Unitario Promedio:</span>
                <strong className="block text-xs text-neutral-800 dark:text-neutral-200 font-mono">
                  L. {inventoryStats.totalUnitsInStock > 0 ? Math.round(inventoryStats.totalInventoryCost / inventoryStats.totalUnitsInStock).toLocaleString() : 0} HNL
                </strong>
              </div>
            )}
          </div>

        </div>

        {/* Brand & Stock Category distribution volume grids */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          
          {/* Top 5 Brands in Stock volume list */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center gap-1.5">
              <Tags className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" /> Marcas con Mayor Volumen en Stock
            </h3>

            <div className="space-y-3">
              {brandStatsBreakdown.length === 0 ? (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-4">No hay productos en inventario.</p>
              ) : (
                brandStatsBreakdown.map((item, idx) => {
                  const percentage = inventoryStats.totalUnitsInStock > 0 
                    ? Math.round((item.stock / inventoryStats.totalUnitsInStock) * 100)
                    : 0;
                  
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold gap-2">
                        <span className="text-neutral-800 dark:text-neutral-200 truncate">{item.brand}</span>
                        <span className="text-neutral-500 dark:text-neutral-400 font-mono shrink-0">{item.stock} u. ({percentage}%)</span>
                      </div>
                      <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-neutral-900 dark:bg-amber-400 rounded-full" 
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
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" /> Distribución de Stock por Categoría
            </h3>

            <div className="space-y-3">
              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-4">No hay categorías configuradas.</p>
              ) : (
                categoryBreakdown.map((item, idx) => {
                  const percentage = inventoryStats.totalUnitsInStock > 0 
                    ? Math.round((item.stock / inventoryStats.totalUnitsInStock) * 100)
                    : 0;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold gap-2">
                        <span className="text-neutral-800 dark:text-neutral-200 truncate">{item.category}</span>
                        <span className="text-neutral-500 dark:text-neutral-400 font-mono shrink-0">{item.stock} u. ({percentage}%)</span>
                      </div>
                      <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full" 
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

        {/* DETAILED BRAND TO PERFUME ACCORDION BREAKDOWN METRIC */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden p-4 sm:p-6 space-y-4">
          <div>
            <h3 className="font-display font-bold text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm flex items-center gap-1.5 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <Tags className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> Catálogo Detallado de Marcas (Desglose hasta Perfume)
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mt-2">
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                Haz clic en cualquier marca para desglosar la lista completa de perfumes, stock físico y ventas.
              </p>
              <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-400 uppercase tracking-widest bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md self-start sm:self-auto">
                Ordenado por unidades vendidas
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {brandDetailedBreakdown.map((brandInfo, index) => {
              const isExpanded = expandedBrand === brandInfo.brandName;
              return (
                <div 
                  key={index} 
                  className="border border-neutral-200 dark:border-neutral-800 rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-200"
                >
                  {/* Brand Row Trigger */}
                  <button
                    onClick={() => setExpandedBrand(isExpanded ? null : brandInfo.brandName)}
                    className="w-full px-3.5 sm:px-5 py-3 bg-neutral-50 hover:bg-neutral-100/60 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-black text-neutral-900 dark:text-neutral-100 font-mono tracking-wider uppercase block truncate">
                        {brandInfo.brandName}
                      </span>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
                        <span>Stock: <strong className="text-neutral-800 dark:text-neutral-200">{brandInfo.totalStock} u.</strong></span>
                        <span>•</span>
                        <span>Vendido: <strong className="text-emerald-700 dark:text-emerald-400">{brandInfo.soldQty} u.</strong></span>
                        {brandInfo.soldRevenue > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">L. {brandInfo.soldRevenue.toLocaleString()} HNL</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-0 border-neutral-200/50 dark:border-neutral-700/50">
                      <span className="text-[9px] font-extrabold uppercase text-neutral-400 dark:text-neutral-400 px-2 py-0.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md">
                        {brandInfo.perfumes.length} {brandInfo.perfumes.length === 1 ? 'Perfume' : 'Perfumes'}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-neutral-500 dark:text-neutral-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-neutral-500 dark:text-neutral-400 shrink-0" />}
                    </div>
                  </button>

                  {/* Perfumes Sub-Table / Mobile Cards Expanded Section */}
                  {isExpanded && (
                    <div className="p-2 sm:p-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800">
                      {/* Vista Móvil (Tarjetas de Fragancias) */}
                      <div className="block sm:hidden space-y-2">
                        {brandInfo.perfumes.map((perfume) => (
                          <div key={perfume.id} className="p-2.5 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 rounded-xl space-y-1 text-xs">
                            <div className="font-bold text-neutral-900 dark:text-neutral-100">
                              {perfume.name}
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono">
                              <span>Presentación: {perfume.size}</span>
                              <span className="font-bold text-neutral-700 dark:text-neutral-300">L. {perfume.price.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60 text-[10px]">
                              <span>
                                Stock: {perfume.stock <= 0 ? (
                                  <strong className="text-red-500">Agotado (0)</strong>
                                ) : (
                                  <strong className="text-neutral-900 dark:text-neutral-100">{perfume.stock} u.</strong>
                                )}
                              </span>
                              <span>
                                Vendidas: {perfume.soldQty > 0 ? (
                                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{perfume.soldQty} u.</strong>
                                ) : (
                                  <span className="text-neutral-400">-</span>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Vista Escritorio (Tabla limpia) */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left text-xs divide-y divide-neutral-100 dark:divide-neutral-800">
                          <thead className="bg-neutral-50 dark:bg-neutral-800/70 text-neutral-500 dark:text-neutral-400 font-bold font-mono text-[9px] uppercase">
                            <tr>
                              <th className="p-2.5">Perfume / Variante</th>
                              <th className="p-2.5 text-center">Presentación</th>
                              <th className="p-2.5 text-center">Stock Físico</th>
                              <th className="p-2.5 text-right">Precio de Venta</th>
                              <th className="p-2.5 text-center bg-emerald-50/40 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">U. Vendidas</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
                            {brandInfo.perfumes.map((perfume) => (
                              <tr key={perfume.id} className="hover:bg-neutral-50/40 dark:hover:bg-neutral-800/40">
                                <td className="p-2.5 font-semibold text-neutral-900 dark:text-neutral-100">
                                  {perfume.name}
                                </td>
                                <td className="p-2.5 text-center text-neutral-500 dark:text-neutral-400 font-mono">
                                  {perfume.size}
                                </td>
                                <td className="p-2.5 text-center font-bold">
                                  {perfume.stock <= 0 ? (
                                    <span className="text-red-500 dark:text-rose-400 font-bold font-mono">Agotado (0)</span>
                                  ) : (
                                    <span className="font-mono text-neutral-900 dark:text-neutral-100">{perfume.stock} u.</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-right font-bold text-neutral-700 dark:text-neutral-300 font-mono">
                                  L. {perfume.price.toLocaleString()}
                                </td>
                                <td className="p-2.5 text-center font-black font-mono bg-emerald-50/10 dark:bg-emerald-950/10">
                                  {perfume.soldQty > 0 ? (
                                    <span className="inline-block bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 px-1.5 py-0.5 rounded-md text-[10px]">
                                      {perfume.soldQty} u.
                                    </span>
                                  ) : (
                                    <span className="text-neutral-400 dark:text-neutral-600">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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