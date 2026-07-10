import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Percent, 
  Award, 
  Sparkles, 
  Calendar, 
  User, 
  HelpCircle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Database,
  Eye
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from 'recharts';

const DEMO_PRODUCTS = [
  { id: 'p1', name: 'Sauvage EDP', brand: 'Dior', size: '100 ML', cost: 1600, pricePublic: 2800, pricePromotional: 2500, category: 'Masculino' },
  { id: 'p2', name: 'Good Girl EDP', brand: 'Carolina Herrera', size: '80 ML', cost: 1800, pricePublic: 3100, pricePromotional: 2800, category: 'Femenino' },
  { id: 'p3', name: 'Eros Flame EDP', brand: 'Versace', size: '100 ML', cost: 1400, pricePublic: 2400, pricePromotional: 2100, category: 'Masculino' },
  { id: 'p4', name: 'Yara EDP', brand: 'Lattafa', size: '100 ML', cost: 700, pricePublic: 1300, pricePromotional: 1100, category: 'Femenino' },
  { id: 'p5', name: 'Club de Nuit Intense', brand: 'Armaf', size: '105 ML', cost: 900, pricePublic: 1600, pricePromotional: 1400, category: 'Masculino' },
  { id: 'p6', name: 'Set Sauvage + Travel Spray', brand: 'Dior', size: 'Set', cost: 2200, pricePublic: 3800, pricePromotional: 3400, category: 'Unisex' }
];

const DEMO_ORDERS = [
  {
    id: 'o1',
    date: 'Julio 5, 2026',
    status: 'completado',
    total: 5300,
    items: [
      { productId: 'p1', name: 'Sauvage EDP', brand: 'Dior', size: '100 ML', quantity: 1, pricePaid: 2500 },
      { productId: 'p2', name: 'Good Girl EDP', brand: 'Carolina Herrera', size: '80 ML', quantity: 1, pricePaid: 2800 }
    ]
  },
  {
    id: 'o2',
    date: 'Julio 6, 2026',
    status: 'completado',
    total: 3500,
    items: [
      { productId: 'p3', name: 'Eros Flame EDP', brand: 'Versace', size: '100 ML', quantity: 1, pricePaid: 2100 },
      { productId: 'p5', name: 'Club de Nuit Intense', brand: 'Armaf', size: '105 ML', quantity: 1, pricePaid: 1400 }
    ]
  },
  {
    id: 'o3',
    date: 'Julio 7, 2026',
    status: 'pendiente',
    total: 3800,
    items: [
      { productId: 'p6', name: 'Set Sauvage + Travel Spray', brand: 'Dior', size: 'Set', quantity: 1, pricePaid: 3800 }
    ]
  },
  {
    id: 'o4',
    date: 'Julio 8, 2026',
    status: 'completado',
    total: 2200,
    items: [
      { productId: 'p4', name: 'Yara EDP', brand: 'Lattafa', size: '100 ML', quantity: 2, pricePaid: 1100 }
    ]
  },
  {
    id: 'o5',
    date: 'Julio 9, 2026',
    status: 'completado',
    total: 6200,
    items: [
      { productId: 'p1', name: 'Sauvage EDP', brand: 'Dior', size: '100 ML', quantity: 1, pricePaid: 2500 },
      { productId: 'p2', name: 'Good Girl EDP', brand: 'Carolina Herrera', size: '80 ML', quantity: 1, pricePaid: 2800 },
      { productId: 'p4', name: 'Yara EDP', brand: 'Lattafa', size: '100 ML', quantity: 1, pricePaid: 1100 }
    ]
  }
];

export default function Dashboard() {
  const { orders, products, user } = useStore();
  const isOwner = user?.role === 'owner' || user?.role === 'dueño';
  const isVendedor = user?.role === 'vendedor';

  // State to toggle demo mode
  const [isDemoMode, setIsDemoMode] = useState((orders || []).length === 0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (orders && orders.length > 0) {
      setIsDemoMode(false);
    }
  }, [orders]);

  // Active dataset choice
  const activeOrders = useMemo(() => isDemoMode ? DEMO_ORDERS : (orders || []), [isDemoMode, orders]);
  const activeProducts = useMemo(() => isDemoMode ? DEMO_PRODUCTS : (products || []), [isDemoMode, products]);

  // 1. Filter completed orders for sales metrics
  const completedOrders = useMemo(() => {
    return (activeOrders || []).filter(o => o && o.status === 'completado');
  }, [activeOrders]);

  // 2. Metrics calculation
  const metrics = useMemo(() => {
    const totalSales = (completedOrders || []).reduce((acc, o) => acc + (Number(o?.total) || 0), 0);
    const totalOrdersCount = (activeOrders || []).length;
    const completedOrdersCount = (completedOrders || []).length;
    const pendingOrdersCount = (activeOrders || []).filter(o => o && o.status === 'pendiente').length;
    const pendingSales = (activeOrders || []).filter(o => o && o.status === 'pendiente').reduce((acc, o) => acc + (Number(o?.total) || 0), 0);
    const avgTicket = completedOrdersCount > 0 ? totalSales / completedOrdersCount : 0;

    // Calculate gross profit (ONLY FOR OWNER)
    let totalCost = 0;
    completedOrders.forEach(order => {
      (order?.items || []).forEach(item => {
        // Find product to get cost
        const prod = activeProducts.find(p => p?.id === item?.productId);
        const unitCost = prod ? Number(prod.cost || 0) : 0;
        totalCost += unitCost * (item?.quantity || 1);
      });
    });
    const grossProfit = totalSales - totalCost;

    return {
      totalSales,
      totalOrdersCount,
      completedOrdersCount,
      pendingOrdersCount,
      pendingSales,
      avgTicket,
      grossProfit
    };
  }, [activeOrders, completedOrders, activeProducts]);

  // 3. Sales Trend Data (Grouped by Order Date)
  const salesTrendData = useMemo(() => {
    const dailyData = {};
    // Let's get the last 10 unique order dates or dates with orders
    (activeOrders || []).forEach(o => {
      if (!o) return;
      // o.date comes in format "July 9, 2026, 07:54 AM" or similar. Let's normalize to date portion
      const rawDateStr = o.date || 'Desconocido';
      const datePart = rawDateStr.split(' at ')[0].split(', 202')[0].trim(); // Simple human friendly group
      
      if (!dailyData[datePart]) {
        dailyData[datePart] = { name: datePart, Ventas: 0, Cotizaciones: 0 };
      }
      if (o.status === 'completado') {
        dailyData[datePart].Ventas += Number(o.total) || 0;
      } else if (o.status === 'pendiente') {
        dailyData[datePart].Cotizaciones += Number(o.total) || 0;
      }
    });

    // If demo mode, let's keep order sorted chronologically
    if (isDemoMode) {
      return Object.values(dailyData);
    }
    return Object.values(dailyData).reverse().slice(-7); // Last 7 active days
  }, [activeOrders, isDemoMode]);

  // 4. Top Selling Brands
  const topBrandsData = useMemo(() => {
    const brandCounts = {};
    completedOrders.forEach(o => {
      (o?.items || []).forEach(item => {
        const brand = item?.brand || 'Genérica';
        brandCounts[brand] = (brandCounts[brand] || 0) + (item?.quantity || 1);
      });
    });

    return Object.entries(brandCounts)
      .map(([name, Unidades]) => ({ name, Unidades }))
      .sort((a, b) => b.Unidades - a.Unidades)
      .slice(0, 5); // Top 5 brands
  }, [completedOrders]);

  // 5. Order Status Distribution Chart
  const statusDistributionData = useMemo(() => {
    const counts = { pendiente: 0, completado: 0, cancelado: 0 };
    activeOrders.forEach(o => {
      if (counts[o.status] !== undefined) {
        counts[o.status]++;
      }
    });

    return [
      { name: 'Pendientes', value: counts.pendiente, color: '#f59e0b' },
      { name: 'Completadas', value: counts.completado, color: '#10b981' },
      { name: 'Canceladas', value: counts.cancelado, color: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [activeOrders]);

  // 6. Gender Category Distribution (Masculino, Femenino, Unisex)
  const categoryDistributionData = useMemo(() => {
    const catCounts = { Masculino: 0, Femenino: 0, Unisex: 0 };
    completedOrders.forEach(o => {
      (o?.items || []).forEach(item => {
        // Find product to get actual category
        const prod = activeProducts.find(p => p?.id === item?.productId);
        const cat = prod?.category || 'Unisex';
        if (catCounts[cat] !== undefined) {
          catCounts[cat] += item?.quantity || 1;
        } else {
          catCounts['Unisex'] += item?.quantity || 1;
        }
      });
    });

    return [
      { name: 'Caballeros', value: catCounts.Masculino, color: '#2563eb' },
      { name: 'Damas', value: catCounts.Femenino, color: '#ec4899' },
      { name: 'Unisex / Sets', value: catCounts.Unisex, color: '#8b5cf6' }
    ].filter(item => item.value > 0);
  }, [completedOrders, activeProducts]);

  // 7. Top 5 Products Sold
  const topProducts = useMemo(() => {
    const prodStats = {};
    completedOrders.forEach(o => {
      (o?.items || []).forEach(item => {
        const key = item?.productId;
        if (!key) return;
        if (!prodStats[key]) {
          prodStats[key] = {
            id: key,
            name: item?.name || 'Fragancia',
            brand: item?.brand || '',
            size: item?.size || '',
            qty: 0,
            revenue: 0
          };
        }
        prodStats[key].qty += (item?.quantity || 1);
        prodStats[key].revenue += (item?.quantity || 1) * (Number(item?.pricePaid) || 0);
      });
    });

    return Object.values(prodStats)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [completedOrders]);

  return (
    <div className="space-y-8 fade-in-up">
      {/* Header banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-900 text-white rounded-3xl p-6 md:p-8 shadow-md">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1 bg-neutral-800 text-amber-400 text-xs font-bold px-3 py-1 rounded-full border border-neutral-700">
            <TrendingUp className="h-3.5 w-3.5" />
            Análisis de Negocio en Tiempo Real
          </span>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
            Dashboard de Ventas
          </h1>
          <p className="text-xs text-neutral-300">
            Visualiza el rendimiento financiero, marcas más vendidas e indicadores clave para Iconic Boutique HN.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Real vs Demo Mode Toggle */}
          <div className="bg-neutral-800 border border-neutral-700 p-1 rounded-xl flex items-center">
            <button
              onClick={() => setIsDemoMode(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                !isDemoMode 
                  ? 'bg-neutral-900 text-emerald-400 shadow-sm' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              Datos Reales
            </button>
            <button
              onClick={() => setIsDemoMode(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                isDemoMode 
                  ? 'bg-neutral-900 text-amber-400 shadow-sm' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Datos de Prueba
            </button>
          </div>

          <div className="bg-neutral-800 border border-neutral-700 p-3 rounded-2xl text-left">
            <span className="block text-[10px] text-neutral-400 uppercase font-mono font-bold">Sesión Activa</span>
            <span className="text-xs font-bold text-white flex items-center gap-1">
              <User className="h-3 w-3 text-amber-500" />
              {user?.name} ({isOwner ? 'Propietario' : 'Vendedor'})
            </span>
          </div>
        </div>
      </div>

      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-xs text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <span className="font-bold block text-amber-900">Mostrando Datos de Demostración (Simulados)</span>
              <p className="text-amber-700 mt-0.5">
                {orders.length === 0 
                  ? 'Como aún no has registrado órdenes completadas en la tienda, hemos activado de forma automática este modo demostración para que puedas visualizar la belleza y el potencial de los gráficos interactivos.'
                  : 'Has activado voluntariamente la visualización de prueba para evaluar el rendimiento simulado de la boutique.'}
              </p>
            </div>
          </div>
          {orders.length > 0 && (
            <button
              onClick={() => setIsDemoMode(false)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm transition-all text-xs shrink-0 cursor-pointer self-start sm:self-center"
            >
              Cambiar a Datos Reales ({orders.length} órdenes)
            </button>
          )}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Sales Metric */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Ventas Completadas</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="block text-2xl font-black text-neutral-900 font-mono">
              L. {metrics.totalSales.toLocaleString()}
            </span>
            <span className="block text-[10px] text-neutral-400">
              Sobre {metrics.completedOrdersCount} órdenes completadas
            </span>
          </div>
        </div>

        {/* Average Ticket Metric */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Ticket Promedio</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="block text-2xl font-black text-neutral-900 font-mono">
              L. {Math.round(metrics.avgTicket).toLocaleString()}
            </span>
            <span className="block text-[10px] text-neutral-400">
              Valor de venta promedio por orden
            </span>
          </div>
        </div>

        {/* Pending Sales Metric */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Cotizaciones Pendientes</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="block text-2xl font-black text-amber-600 font-mono">
              L. {metrics.pendingSales.toLocaleString()}
            </span>
            <span className="block text-[10px] text-neutral-400">
              {metrics.pendingOrdersCount} órdenes pendientes de cobro
            </span>
          </div>
        </div>

        {/* Gross Profit Metric (ONLY SHOWN TO OWNER) */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
              {isOwner ? 'Utilidad Bruta Estimada' : 'Total Transacciones'}
            </span>
            <div className={`p-2 rounded-xl ${isOwner ? 'bg-purple-50 text-purple-600' : 'bg-neutral-50 text-neutral-600'}`}>
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            {isOwner ? (
              <>
                <span className="block text-2xl font-black text-purple-600 font-mono">
                  L. {metrics.grossProfit.toLocaleString()}
                </span>
                <span className="block text-[10px] text-neutral-400">
                  Ventas completadas menos costos reales
                </span>
              </>
            ) : (
              <>
                <span className="block text-2xl font-black text-neutral-900 font-mono">
                  {metrics.totalOrdersCount}
                </span>
                <span className="block text-[10px] text-neutral-400">
                  Órdenes totales registradas en sistema
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Sales Trend Chart */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm md:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-neutral-900 text-sm flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-neutral-500" />
              Tendencias de Ventas y Cotizaciones (HNL)
            </h3>
            <span className="text-[10px] text-neutral-400 font-mono">Últimos días activos</span>
          </div>

          <div className="h-72 w-full">
            {salesTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                No hay suficientes datos de ventas para mostrar la tendencia.
              </div>
            ) : (
              mounted && (
                <ResponsiveContainer width="100%" height="100%" debounce={1}>
                  <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorQuotes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#a3a3a3" fontSize={10} tickLine={false} />
                    <YAxis stroke="#a3a3a3" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', fontSize: '11px' }}
                      formatter={(value) => [`L. ${value.toLocaleString()}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Area type="monotone" dataKey="Ventas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                    <Area type="monotone" dataKey="Cotizaciones" stroke="#f59e0b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorQuotes)" />
                  </AreaChart>
                </ResponsiveContainer>
              )
            )}
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-neutral-900 text-sm">
              Estado de Órdenes
            </h3>
            <span className="text-[10px] text-neutral-400 font-mono">Volumen</span>
          </div>

          <div className="h-56 w-full flex justify-center items-center">
            {statusDistributionData.length === 0 ? (
              <div className="text-xs text-neutral-400">Sin datos</div>
            ) : (
              mounted && (
                <ResponsiveContainer width="100%" height="100%" debounce={1}>
                  <PieChart>
                    <Pie
                      data={statusDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} órdenes`, '']} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )
            )}
          </div>
          <div className="text-center">
            <p className="text-[10px] text-neutral-500">
              Mantener las cotizaciones actualizadas ayuda al control de inventario.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Top Brands Chart */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-neutral-900 text-sm flex items-center gap-1.5">
              <Award className="h-4 w-4 text-amber-500" />
              Marcas Más Vendidas (Uds)
            </h3>
            <span className="text-[10px] text-neutral-400 font-mono">Top 5</span>
          </div>

          <div className="h-64 w-full">
            {topBrandsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                Completa órdenes para ver las marcas dominantes.
              </div>
            ) : (
              mounted && (
                <ResponsiveContainer width="100%" height="100%" debounce={1}>
                  <BarChart data={topBrandsData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <XAxis type="number" stroke="#a3a3a3" fontSize={9} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#404040" fontSize={10} tickLine={false} width={80} />
                    <Tooltip formatter={(value) => [`${value} unidades`, '']} />
                    <Bar dataKey="Unidades" fill="#171717" radius={[0, 4, 4, 0]}>
                      {topBrandsData.map((entry, index) => {
                        const colors = ['#171717', '#404040', '#737373', '#a3a3a3', '#d4d4d4'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            )}
          </div>
        </div>

        {/* Gender category distribution Pie Chart */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-neutral-900 text-sm">
              Preferencia de Público (Géneros)
            </h3>
            <span className="text-[10px] text-neutral-400 font-mono">Unidades</span>
          </div>

          <div className="h-64 w-full flex justify-center items-center">
            {categoryDistributionData.length === 0 ? (
              <div className="text-xs text-neutral-400">Sin datos de venta</div>
            ) : (
              mounted && (
                <ResponsiveContainer width="100%" height="100%" debounce={1}>
                  <PieChart>
                    <Pie
                      data={categoryDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} unidades`, '']} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )
            )}
          </div>
        </div>

        {/* Top 5 Perfumes List Table */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-neutral-900 text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
              Perfumes Best Sellers
            </h3>
            <span className="text-[10px] text-neutral-400 font-mono">Por volumen</span>
          </div>

          <div className="overflow-hidden">
            {topProducts.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-neutral-400">
                Sin datos de perfumes vendidos.
              </div>
            ) : (
              <div className="space-y-3.5">
                {topProducts.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors">
                    <div className="space-y-0.5 max-w-[70%]">
                      <span className="block text-xs font-bold text-neutral-950 truncate">{p.name}</span>
                      <span className="block text-[10px] text-neutral-400 uppercase font-mono font-bold">{p.brand} ({p.size})</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="block text-xs font-black text-neutral-900">{p.qty} uds.</span>
                      <span className="block text-[9px] text-neutral-500">L. {p.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
