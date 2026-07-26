import { useMemo } from 'react';
import { useStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Tag, ShoppingCart, Award } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6'];

export default function Dashboard() {
  const { orders, products } = useStore();

  // Filter delivered orders for financial calculations
  const deliveredOrders = useMemo(() => {
    return orders.filter(o => o.status === 'entregado');
  }, [orders]);

  // General calculations
  const stats = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    let itemsSold = 0;

    for (const order of deliveredOrders) {
      revenue += order.total;
      for (const item of order.items || []) {
        itemsSold += item.quantity;
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          cost += Number(prod.cost || 0) * item.quantity;
        }
      }
    }

    const profit = Math.max(0, revenue - cost);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      revenue,
      profit,
      itemsSold,
      margin
    };
  }, [deliveredOrders, products]);

  // Brand Distribution
  const brandData = useMemo(() => {
    const counts = {};
    for (const order of deliveredOrders) {
      for (const item of order.items || []) {
        const prod = products.find(p => p.id === item.productId);
        const brandName = prod?.brand || item.brand || 'Otras';
        counts[brandName] = (counts[brandName] || 0) + item.quantity;
      }
    }

    return Object.entries(counts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [deliveredOrders, products]);

  // Monthly Sales Chart Data
  const monthlyData = useMemo(() => {
    const months = {};
    for (const order of deliveredOrders) {
      let mLabel = 'Sin Mes';
      if (order.createdAt) {
        try {
          const dateObj = new Date(order.createdAt);
          mLabel = dateObj.toLocaleDateString('es-HN', { month: 'short' });
        } catch {
          mLabel = 'Sin Mes';
        }
      } else {
        const splitDate = order.date ? order.date.split(' de ') : [];
        if (splitDate.length > 1) mLabel = splitDate[1].substring(0, 3);
      }
      months[mLabel] = (months[mLabel] || 0) + order.total;
    }

    return Object.entries(months).map(([name, total]) => ({ name, total }));
  }, [deliveredOrders]);

  return (
    <div className="space-y-6 fade-in-up max-w-7xl mx-auto">
      
      {/* Title */}
      <div>
        <h2 className="font-display text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-emerald-600" /> Panel de Analítica Comercial
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          Resumen financiero y distribución de ventas correspondiente a las órdenes entregadas en Honduras.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
              Ingresos Totales (HNL)
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h3 className="font-mono text-2xl font-black text-neutral-900">
              L. {stats.revenue.toLocaleString()}
            </h3>
            <p className="text-[10px] text-neutral-400 mt-1 font-semibold">
              Suma de órdenes entregadas
            </p>
          </div>
        </div>

        {/* Profit */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
              Utilidad Neta (Ganancia)
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h3 className="font-mono text-2xl font-black text-indigo-950">
              L. {stats.profit.toLocaleString()}
            </h3>
            <p className="text-[10px] text-indigo-400 mt-1 font-semibold">
              Descontando costos de importación
            </p>
          </div>
        </div>

        {/* Margin */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
              Margen de Ganancia
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h3 className="font-mono text-2xl font-black text-amber-950">
              {stats.margin.toFixed(1)}%
            </h3>
            <p className="text-[10px] text-amber-400 mt-1 font-semibold">
              Eficiencia de rentabilidad neta
            </p>
          </div>
        </div>

        {/* Perfumes Sold */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
              Fragancias Vendidas
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h3 className="font-mono text-2xl font-black text-rose-950">
              {stats.itemsSold} pzs
            </h3>
            <p className="text-[10px] text-rose-400 mt-1 font-semibold">
              Perfumes y estuches entregados
            </p>
          </div>
        </div>
      </div>

      {/* Charts area */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly revenues bar chart */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-display font-bold text-neutral-900 text-sm uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-emerald-500" /> Ingresos por Meses (Lempiras)
          </h3>
          
          <div className="h-72 w-full">
            {monthlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                Aún no hay ingresos de órdenes entregadas para graficar.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [`L. ${value.toLocaleString()}`, 'Total']} />
                  <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Brands distribution pie chart */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-display font-bold text-neutral-900 text-sm uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Award className="h-4 w-4 text-indigo-500" /> Participación por Marca (Volumen)
          </h3>

          <div className="h-72 w-full flex flex-col sm:flex-row items-center justify-center gap-4">
            {brandData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                Sin datos de fragancias vendidas para graficar.
              </div>
            ) : (
              <>
                <div className="h-48 w-48 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={brandData}
                        dataKey="qty"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {brandData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} unidades`, 'Cantidad']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-2 text-xs overflow-y-auto max-h-[220px] w-full">
                  {brandData.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <span 
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="font-bold text-neutral-700 truncate" title={item.name}>{item.name}</span>
                      </div>
                      <span className="font-mono font-black text-neutral-900 ml-2">{item.qty} u</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
