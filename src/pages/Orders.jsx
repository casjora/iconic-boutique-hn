import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { FileSpreadsheet, RefreshCw, Phone, Edit, CheckCircle, XCircle, AlertCircle, ShoppingCart } from 'lucide-react';
import { isProductSet } from '../utils/productHelper';

export default function Orders() {
  const { orders, fetchOrders, user, updateOrderStatus, repeatOrder } = useStore();
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('Todos');

  const isEmployee = user?.role === 'owner' || user?.role === 'dueño' || user?.role === 'vendedor';

  const handleRefresh = async () => {
    setLoadingLocal(true);
    await fetchOrders();
    setLoadingLocal(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    if (confirm(`¿Estás seguro de cambiar el estado de la orden a: ${newStatus.toUpperCase()}?`)) {
      await updateOrderStatus(orderId, newStatus);
    }
  };

  // Repeat an order (sets the cart state to match these items)
  const handleRepeatOrder = (order) => {
    const res = repeatOrder(order.items);
    if (res.success) {
      alert(`¡Se han cargado ${res.addedCount} perfumes al carrito! Redirigiendo...`);
      window.location.hash = '#/cart';
    } else {
      alert('Error: Todos los productos de esta orden se encuentran actualmente agotados.');
    }
  };

  // Filter orders according to user access
  const filteredOrders = orders.filter(o => {
    // 1. Ownership rules: clients only see their own orders
    if (!isEmployee && o.buyerId !== user?.uid) {
      return false;
    }
    // 2. Status filters
    if (filterStatus !== 'Todos' && o.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'entregado':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            Entregado
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700">
            <XCircle className="h-3.5 w-3.5 text-rose-500" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            Pendiente
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" /> 
            {isEmployee ? 'Administración de Órdenes' : 'Historial de Mis Cotizaciones'}
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            {isEmployee 
              ? 'Controla las cotizaciones recibidas por WhatsApp y el estado de entrega en Honduras.'
              : 'Revisa tus cotizaciones pasadas, repite pedidos frecuentes o finaliza el pago.'}
          </p>
        </div>

        {/* Action Header controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-neutral-200 px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-600">
            <span>Filtrar</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent font-bold text-neutral-900 focus:outline-none cursor-pointer"
            >
              <option value="Todos">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="entregado">Entregados</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loadingLocal}
            className="p-2.5 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loadingLocal ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
        {filteredOrders.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest font-mono">No hay órdenes registradas</p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              No se han encontrado cotizaciones registradas en esta vista.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredOrders.map((o) => {
              
              return (
                <div key={o.id} className="p-6 space-y-4 hover:bg-neutral-50/50 transition-colors">
                  
                  {/* Title Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-400">ID:</span>
                        <code className="text-xs font-mono font-extrabold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded">{o.id}</code>
                        {getStatusBadge(o.status)}
                      </div>
                      <div className="text-xs text-neutral-500">
                        Fecha de Solicitud: <span className="font-semibold text-neutral-700">{o.date}</span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] font-bold text-neutral-400 block uppercase tracking-wider font-mono">Total de la Orden:</span>
                      <span className="text-lg font-black text-neutral-950 font-mono">
                        L. {o.total.toLocaleString()} HNL
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="grid gap-6 md:grid-cols-3">
                    {/* Column 1: Client details */}
                    <div className="space-y-1.5 text-xs">
                      <h4 className="font-display font-bold text-neutral-900 text-sm">Información de Contacto</h4>
                      <div className="space-y-1 text-neutral-600">
                        <p><strong className="text-neutral-800">Cliente:</strong> {o.clientName}</p>
                        <p className="flex items-center gap-1">
                          <strong className="text-neutral-800">Teléfono:</strong> 
                          {o.clientPhone}
                          <a 
                            href={`https://wa.me/${o.clientPhone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-neutral-200 rounded text-emerald-600"
                            title="Chatear por WhatsApp"
                          >
                            <Phone className="h-3 w-3" />
                          </a>
                        </p>
                        <p><strong className="text-neutral-800">Nivel de precios:</strong> {o.roleUsed === 'client' ? 'VIP de Distribuidor' : 'Público General'}</p>
                      </div>
                    </div>

                    {/* Column 2: Items detail list */}
                    <div className="space-y-2 text-xs md:col-span-2">
                      <h4 className="font-display font-bold text-neutral-900 text-sm">Fragancias Cotizadas</h4>
                      <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100 space-y-2">
                        {o.items.map((item, idx) => {
                          const isSet = isProductSet(item);
                          return (
                            <div key={idx} className="flex justify-between items-center text-xs text-neutral-700 pb-1.5 border-b border-neutral-100 last:border-0 last:pb-0">
                              <span className="truncate pr-4">
                                <span className="font-bold text-neutral-900 font-mono pr-1">{item.quantity}x</span>{' '}
                                {isSet && <span className="font-bold text-indigo-700">[SET] </span>}
                                <span className="font-bold">{item.brand}</span> {item.name} ({item.size})
                              </span>
                              <span className="font-mono font-bold text-neutral-900">
                                L. {(item.pricePaid * item.quantity).toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRepeatOrder(o)}
                        className="inline-flex items-center gap-1 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Repetir Pedido / Cargar Carrito
                      </button>
                    </div>

                    {isEmployee && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                          <Edit className="h-3 w-3" /> Cambiar Estado:
                        </span>
                        
                        <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden bg-white">
                          <button
                            onClick={() => handleStatusChange(o.id, 'pendiente')}
                            disabled={o.status === 'pendiente'}
                            className={`px-3 py-1.5 text-[10px] font-extrabold uppercase transition-all border-r border-neutral-100 cursor-pointer ${
                              o.status === 'pendiente' 
                                ? 'bg-amber-500 text-white cursor-default' 
                                : 'text-neutral-600 hover:bg-neutral-50'
                            }`}
                          >
                            Pendiente
                          </button>
                          
                          <button
                            onClick={() => handleStatusChange(o.id, 'entregado')}
                            disabled={o.status === 'entregado'}
                            className={`px-3 py-1.5 text-[10px] font-extrabold uppercase transition-all border-r border-neutral-100 cursor-pointer ${
                              o.status === 'entregado' 
                                ? 'bg-emerald-600 text-white cursor-default' 
                                : 'text-neutral-600 hover:bg-neutral-50'
                            }`}
                          >
                            Entregado
                          </button>
                          
                          <button
                            onClick={() => handleStatusChange(o.id, 'cancelado')}
                            disabled={o.status === 'cancelado'}
                            className={`px-3 py-1.5 text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                              o.status === 'cancelado' 
                                ? 'bg-rose-600 text-white cursor-default' 
                                : 'text-neutral-600 hover:bg-neutral-50'
                            }`}
                          >
                            Cancelado
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
