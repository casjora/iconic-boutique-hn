import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { isProductSet, normalizeCategory, detectProductCategory } from '../utils/productHelper';

// Standard month names in Spanish
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const SHORT_MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

// Curated luxury aesthetic palette for categories
const CATEGORY_COLORS = {
  'Caballeros': '#3b82f6',     // Royal Blue
  'Damas': '#ec4899',          // Rose Pink
  'Unisex': '#f59e0b',         // Amber Gold
  'Sets y Estuches': '#10b981', // Emerald
  'Nicho y Exclusivos': '#8b5cf6', // Violet
  'Otros / General': '#64748b'  // Slate
};

const FALLBACK_COLORS = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

/**
 * Custom Tooltip for Monthly Sales Trend Chart
 */
function MonthlySalesTooltip({ active, payload, isOwner }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-700/80 rounded-2xl p-3.5 shadow-xl min-w-[210px] text-xs font-sans transition-all">
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2 mb-2">
        <span className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-emerald-500" />
          {data.fullMonthName} {data.year}
        </span>
        {data.momGrowth !== null && (
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
              data.momGrowth >= 0
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
            }`}
          >
            {data.momGrowth >= 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {data.momGrowth >= 0 ? `+${data.momGrowth}%` : `${data.momGrowth}%`}
          </span>
        )}
      </div>

      <div className="space-y-1.5 font-mono">
        <div className="flex justify-between items-center text-neutral-700 dark:text-neutral-200">
          <span className="text-neutral-500 dark:text-neutral-400 font-sans">Venta Bruta:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[13px]">
            L. {data.totalSales.toLocaleString()}
          </span>
        </div>

        {isOwner && data.cost > 0 && (
          <>
            <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
              <span className="font-sans">Costo Mercadería:</span>
              <span>L. {Math.round(data.cost).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-300 font-bold border-t border-neutral-100 dark:border-neutral-800 pt-1">
              <span className="font-sans">Ganancia Neta:</span>
              <span>L. {Math.round(data.profit).toLocaleString()} ({data.margin}%)</span>
            </div>
          </>
        )}

        <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-1 text-[11px]">
          <span className="font-sans">Órdenes / Unidades:</span>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
            {data.ordersCount} ped. • {data.totalQty} u.
          </span>
        </div>

        <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400 text-[11px]">
          <span className="font-sans">Ticket Promedio (AOV):</span>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
            L. {Math.round(data.aov).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom Tooltip for Best Selling Categories Chart
 */
function CategoryTooltip({ active, payload, metric }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-700/80 rounded-2xl p-3 shadow-xl min-w-[200px] text-xs font-sans">
      <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-1.5 mb-2">
        <span
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: data.color }}
        />
        <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm truncate">
          {data.name}
        </span>
      </div>

      <div className="space-y-1 font-mono text-[11px]">
        <div className="flex justify-between items-center">
          <span className="text-neutral-500 dark:text-neutral-400 font-sans">Ingresos Totales:</span>
          <span className="font-black text-emerald-600 dark:text-emerald-400">
            L. {data.revenue.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-neutral-500 dark:text-neutral-400 font-sans">Unidades Vendidas:</span>
          <span className="font-bold text-neutral-800 dark:text-neutral-200">
            {data.quantity} u.
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-neutral-100 dark:border-neutral-800 pt-1">
          <span className="text-neutral-500 dark:text-neutral-400 font-sans">Participación:</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            {metric === 'revenue' ? `${data.revenuePercent}% del ingreso` : `${data.qtyPercent}% del volumen`}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SalesAnalyticsCharts({
  orders = [],
  products = [],
  isOwner = false,
  currentTimeframe = 'all'
}) {
  // Chart visual layout mode: 'all' (both charts side-by-side/stacked), 'trends' (only monthly trends), 'categories' (only categories)
  const [activeTab, setActiveTab] = useState('both'); // 'both', 'trends', 'categories'
  
  // Metric toggle for trends chart
  const [trendsMetric, setTrendsMetric] = useState('revenue'); // 'revenue', 'profit', 'units'
  
  // Months range selector for trends
  const [monthsRange, setMonthsRange] = useState('12'); // '6', '12', 'all'
  
  // Category view controls
  const [categoryMetric, setCategoryMetric] = useState('revenue'); // 'revenue', 'units'
  const [categoryChartType, setCategoryChartType] = useState('bar'); // 'bar', 'pie'

  // =========================================================================
  // 1. CHRONOLOGICAL MONTHLY SALES TRENDS DATA
  // =========================================================================
  const monthlyTrendData = useMemo(() => {
    // Only completed / delivered orders represent realized sales
    const completedOrders = orders.filter(o => o.status === 'entregado');
    const monthMap = {};

    completedOrders.forEach(o => {
      const date = o.createdAt ? new Date(o.createdAt) : new Date(o.date);
      if (isNaN(date.getTime())) return;

      const year = date.getFullYear();
      const monthIdx = date.getMonth();
      const sortKey = `${year}-${String(monthIdx).padStart(2, '0')}`;

      if (!monthMap[sortKey]) {
        monthMap[sortKey] = {
          sortKey,
          year,
          monthIdx,
          monthName: SHORT_MONTHS[monthIdx],
          fullMonthName: MONTH_NAMES[monthIdx],
          label: `${SHORT_MONTHS[monthIdx]} ${String(year).slice(-2)}`,
          totalSales: 0,
          totalQty: 0,
          ordersCount: 0,
          cost: 0
        };
      }

      const total = Number(o.total || 0);
      monthMap[sortKey].totalSales += total;
      monthMap[sortKey].ordersCount += 1;

      // Calculate units and cost
      (o.items || []).forEach(item => {
        const qty = Number(item.quantity || 1);
        monthMap[sortKey].totalQty += qty;

        const p = products.find(prod => prod.id === item.productId);
        const itemCost = (item.cost !== undefined && Number(item.cost) > 0)
          ? Number(item.cost)
          : (p ? Number(p.cost || 0) : 0);
        monthMap[sortKey].cost += itemCost * qty;
      });
    });

    // Sort chronologically (oldest to newest for trend visualization)
    const sorted = Object.values(monthMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // Calculate profit, margins, AOV, and Month-over-Month (MoM) growth
    return sorted.map((item, idx) => {
      const profit = item.totalSales - item.cost;
      const margin = item.totalSales > 0 ? Math.round((profit / item.totalSales) * 100) : 0;
      const aov = item.ordersCount > 0 ? item.totalSales / item.ordersCount : 0;
      
      let momGrowth = null;
      if (idx > 0) {
        const prevSales = sorted[idx - 1].totalSales;
        if (prevSales > 0) {
          momGrowth = Math.round(((item.totalSales - prevSales) / prevSales) * 100);
        }
      }

      return {
        ...item,
        profit,
        margin,
        aov,
        momGrowth
      };
    });
  }, [orders, products]);

  // Filtered monthly trend data based on range selector
  const displayTrendsData = useMemo(() => {
    if (!monthlyTrendData.length) return [];
    if (monthsRange === '6') {
      return monthlyTrendData.slice(-6);
    }
    if (monthsRange === '12') {
      return monthlyTrendData.slice(-12);
    }
    return monthlyTrendData;
  }, [monthlyTrendData, monthsRange]);

  // High-level summary metrics from monthly data
  const trendsSummary = useMemo(() => {
    if (!displayTrendsData.length) {
      return { totalRevenue: 0, avgMonthly: 0, bestMonth: null, totalUnits: 0 };
    }
    const totalRevenue = displayTrendsData.reduce((sum, m) => sum + m.totalSales, 0);
    const totalUnits = displayTrendsData.reduce((sum, m) => sum + m.totalQty, 0);
    const avgMonthly = totalRevenue / displayTrendsData.length;
    
    // Find best month
    let best = displayTrendsData[0];
    displayTrendsData.forEach(m => {
      if (m.totalSales > best.totalSales) best = m;
    });

    return { totalRevenue, avgMonthly, bestMonth: best, totalUnits };
  }, [displayTrendsData]);

  // =========================================================================
  // 2. BEST-SELLING CATEGORIES DATA
  // =========================================================================
  const categoryData = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'entregado');
    const categoriesMap = {};

    completedOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        const isSet = isProductSet(item) || (p && isProductSet(p));

        let category;

        if (isSet) {
          category = 'Sets y Estuches';
        } else {
          // Normalize from item or product
          const rawCat = item.category || (p && p.category) || '';
          const normalized = normalizeCategory(rawCat);
          if (normalized) {
            category = normalized;
          } else {
            // Auto detect from name or use raw if present
            const detected = detectProductCategory(item.name || (p && p.name) || '');
            category = detected || 'Otros / General';
          }
        }

        if (!categoriesMap[category]) {
          categoriesMap[category] = {
            name: category,
            revenue: 0,
            quantity: 0,
            orderIds: new Set()
          };
        }

        const qty = Number(item.quantity || 1);
        const price = Number(item.pricePaid || item.price || 0);
        categoriesMap[category].quantity += qty;
        categoriesMap[category].revenue += qty * price;
        if (o.id) categoriesMap[category].orderIds.add(o.id);
      });
    });

    const totalRevenue = Object.values(categoriesMap).reduce((sum, c) => sum + c.revenue, 0);
    const totalQuantity = Object.values(categoriesMap).reduce((sum, c) => sum + c.quantity, 0);

    const result = Object.values(categoriesMap).map((cat, index) => {
      const revenuePercent = totalRevenue > 0 ? Math.round((cat.revenue / totalRevenue) * 100) : 0;
      const qtyPercent = totalQuantity > 0 ? Math.round((cat.quantity / totalQuantity) * 100) : 0;
      const color = CATEGORY_COLORS[cat.name] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];

      return {
        name: cat.name,
        revenue: cat.revenue,
        quantity: cat.quantity,
        ordersCount: cat.orderIds.size,
        revenuePercent,
        qtyPercent,
        color
      };
    });

    // Sort by selected metric
    return result.sort((a, b) => b[categoryMetric] - a[categoryMetric]);
  }, [orders, products, categoryMetric]);

  const topCategory = categoryData[0] || null;

  // Custom Y-Axis tick formatter for HNL currency
  const formatCurrencyAxis = (val) => {
    if (val >= 1000000) return `L. ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `L. ${(val / 1000).toFixed(0)}k`;
    return `L. ${val}`;
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-6 transition-all">
      
      {/* 1. Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base sm:text-lg text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
                <span>Inteligencia Comercial y Tendencias Recharts</span>
                <span className="text-[10px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
                  {currentTimeframe === 'all' ? 'Histórico General' : currentTimeframe === 'month' ? 'Este Mes' : currentTimeframe === 'last30' ? 'Últimos 30d' : currentTimeframe === 'last90' ? 'Últimos 90d' : 'Este Año'}
                </span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Visualización interactiva de volumen histórico de ventas y desglose por categorías de producto.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/60 self-start lg:self-center">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'both'
                ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Vista Completa</span>
          </button>
          
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'trends'
                ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Tendencia Mensual</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'categories'
                ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <PieIcon className="h-3.5 w-3.5" />
            <span>Categorías Top</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Highlight Stat Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-3 sm:p-4">
          <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono block">
            Promedio Mensual
          </span>
          <span className="text-base sm:text-lg font-black text-neutral-900 dark:text-neutral-100 font-mono block mt-0.5">
            L. {Math.round(trendsSummary.avgMonthly).toLocaleString()}
          </span>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
            En base a {displayTrendsData.length} meses analizados
          </span>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-3 sm:p-4">
          <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono block">
            Mes Récord
          </span>
          <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono block mt-0.5 truncate">
            {trendsSummary.bestMonth ? `${trendsSummary.bestMonth.monthName} ${trendsSummary.bestMonth.year}` : 'N/A'}
          </span>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
            {trendsSummary.bestMonth ? `L. ${trendsSummary.bestMonth.totalSales.toLocaleString()}` : 'Sin datos'}
          </span>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-3 sm:p-4">
          <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono block">
            Categoría Líder
          </span>
          <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono block mt-0.5 truncate">
            {topCategory ? topCategory.name : 'N/A'}
          </span>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
            {topCategory ? `${topCategory.revenuePercent}% de facturación total` : 'Sin datos'}
          </span>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-3 sm:p-4">
          <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono block">
            Volumen Analizado
          </span>
          <span className="text-base sm:text-lg font-black text-neutral-900 dark:text-neutral-100 font-mono block mt-0.5">
            {trendsSummary.totalUnits.toLocaleString()} u.
          </span>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
            Unidades físicas entregadas
          </span>
        </div>
      </div>

      {/* 3. Main Chart Sections */}
      <div className={`grid gap-6 ${activeTab === 'both' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
        
        {/* ============================================================== */}
        {/* CHART 1: MONTHLY SALES TRENDS (AreaChart / Smooth Composed)     */}
        {/* ============================================================== */}
        {(activeTab === 'both' || activeTab === 'trends') && (
          <div
            className={`bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-4 sm:p-6 flex flex-col justify-between space-y-4 ${
              activeTab === 'both' ? 'lg:col-span-7' : 'w-full'
            }`}
          >
            {/* Chart 1 Header & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/60 dark:border-neutral-700/60 pb-3">
              <div>
                <h4 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span>Tendencia Histórica Mensual de Ventas</span>
                </h4>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Comportamiento cronológico de facturación neta y pedidos
                </span>
              </div>

              {/* Metric and Range Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Metric Selector */}
                <div className="flex items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-0.5 text-[11px] font-bold">
                  <button
                    onClick={() => setTrendsMetric('revenue')}
                    className={`px-2 py-1 rounded-lg cursor-pointer transition-all ${
                      trendsMetric === 'revenue'
                        ? 'bg-emerald-600 text-white'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    Venta (HNL)
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => setTrendsMetric('profit')}
                      className={`px-2 py-1 rounded-lg cursor-pointer transition-all ${
                        trendsMetric === 'profit'
                          ? 'bg-emerald-600 text-white'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                      }`}
                    >
                      Ganancia
                    </button>
                  )}
                  <button
                    onClick={() => setTrendsMetric('units')}
                    className={`px-2 py-1 rounded-lg cursor-pointer transition-all ${
                      trendsMetric === 'units'
                        ? 'bg-emerald-600 text-white'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    Unidades
                  </button>
                </div>

                {/* Range Selector */}
                <select
                  value={monthsRange}
                  onChange={(e) => setMonthsRange(e.target.value)}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-200 focus:outline-none cursor-pointer"
                >
                  <option value="6">Últimos 6 meses</option>
                  <option value="12">Últimos 12 meses</option>
                  <option value="all">Todo el historial</option>
                </select>
              </div>
            </div>

            {/* Recharts Area Container */}
            <div className="w-full min-w-0 h-[300px] sm:h-[340px] pt-2">
              {displayTrendsData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <Package className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    No se registran ventas entregadas en el período seleccionado.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={displayTrendsData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="currentColor"
                      className="text-neutral-200 dark:text-neutral-800"
                    />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'currentColor', fontSize: 11, fontFamily: 'monospace' }}
                      className="text-neutral-500 dark:text-neutral-400"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={trendsMetric === 'units' ? (v) => `${v}u` : formatCurrencyAxis}
                      tick={{ fill: 'currentColor', fontSize: 10, fontFamily: 'monospace' }}
                      className="text-neutral-400 dark:text-neutral-500"
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      content={<MonthlySalesTooltip isOwner={isOwner} />}
                    />
                    {trendsMetric === 'revenue' && (
                      <Area
                        type="monotone"
                        dataKey="totalSales"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                        name="Venta Bruta (HNL)"
                      />
                    )}
                    {trendsMetric === 'profit' && (
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorProfit)"
                        activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                        name="Ganancia Neta (HNL)"
                      />
                    )}
                    {trendsMetric === 'units' && (
                      <Area
                        type="monotone"
                        dataKey="totalQty"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorUnits)"
                        activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                        name="Unidades Vendidas"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Micro footer hint */}
            <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-emerald-500" />
                Pasa el cursor sobre la gráfica para ver tickets promedio y porcentaje de crecimiento intermensual.
              </span>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CHART 2: BEST-SELLING PRODUCT CATEGORIES (Bar/Pie Recharts)     */}
        {/* ============================================================== */}
        {(activeTab === 'both' || activeTab === 'categories') && (
          <div
            className={`bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-4 sm:p-6 flex flex-col justify-between space-y-4 ${
              activeTab === 'both' ? 'lg:col-span-5' : 'w-full'
            }`}
          >
            {/* Chart 2 Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/60 dark:border-neutral-700/60 pb-3">
              <div>
                <h4 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-indigo-500" />
                  <span>Categorías Más Vendidas</span>
                </h4>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Distribución y ranking por tipo de fragancia
                </span>
              </div>

              {/* Metric & Chart Type Toggle */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                {/* Metric: Revenue vs Units */}
                <div className="flex items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-0.5 text-[11px] font-bold">
                  <button
                    onClick={() => setCategoryMetric('revenue')}
                    className={`px-2 py-1 rounded-lg cursor-pointer transition-all ${
                      categoryMetric === 'revenue'
                        ? 'bg-indigo-600 text-white'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    HNL
                  </button>
                  <button
                    onClick={() => setCategoryMetric('quantity')}
                    className={`px-2 py-1 rounded-lg cursor-pointer transition-all ${
                      categoryMetric === 'quantity'
                        ? 'bg-indigo-600 text-white'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    Unidades
                  </button>
                </div>

                {/* Type: Bar vs Donut */}
                <div className="flex items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-0.5 text-[11px]">
                  <button
                    onClick={() => setCategoryChartType('bar')}
                    className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                      categoryChartType === 'bar'
                        ? 'bg-neutral-900 text-white dark:bg-amber-400 dark:text-neutral-950 shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                    title="Ver en Barras"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setCategoryChartType('pie')}
                    className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                      categoryChartType === 'pie'
                        ? 'bg-neutral-900 text-white dark:bg-amber-400 dark:text-neutral-950 shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                    title="Ver en Dona / Circular"
                  >
                    <PieIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Recharts Container for Categories */}
            <div className="w-full min-w-0 h-[220px] sm:h-[240px] pt-1">
              {categoryData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <ShoppingBag className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    No hay suficientes datos de categorías vendidas para graficar.
                  </p>
                </div>
              ) : categoryChartType === 'bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="currentColor"
                      className="text-neutral-200 dark:text-neutral-800"
                    />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={categoryMetric === 'revenue' ? formatCurrencyAxis : (v) => `${v}u`}
                      tick={{ fill: 'currentColor', fontSize: 10, fontFamily: 'monospace' }}
                      className="text-neutral-400 dark:text-neutral-500"
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={90}
                      tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 'bold' }}
                      className="text-neutral-700 dark:text-neutral-300"
                    />
                    <Tooltip
                      content={<CategoryTooltip metric={categoryMetric} />}
                    />
                    <Bar
                      dataKey={categoryMetric === 'revenue' ? 'revenue' : 'quantity'}
                      radius={[0, 8, 8, 0]}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Tooltip content={<CategoryTooltip metric={categoryMetric} />} />
                    <Pie
                      data={categoryData}
                      dataKey={categoryMetric === 'revenue' ? 'revenue' : 'quantity'}
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-pie-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category breakdown pill list */}
            <div className="space-y-1.5 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
              {categoryData.slice(0, 4).map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {cat.quantity} u.
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">
                      L. {cat.revenue.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold bg-neutral-200/80 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-1.5 py-0.5 rounded-md">
                      {cat.revenuePercent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
