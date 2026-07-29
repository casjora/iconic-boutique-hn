import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { ClipboardList, Search, Edit2, Loader2, CheckCircle2, AlertCircle, ShoppingBag, Eye, X, Plus, Trash2 } from 'lucide-react';

export default function Orders() {
  const { orders, products, updateOrderStatus, updateOrder, loading, error } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  // Modal active variables
  const [viewingOrder, setViewingOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);

  // Edit fields inside modal
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editItems, setEditItems] = useState([]);

  // Search filter list
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm.trim() ||
        o.clientName.toLowerCase().includes(term) ||
        o.clientPhone.includes(term) ||
        o.id.toLowerCase().includes(term);

      const matchesStatus = selectedStatus === 'Todos' || o.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, selectedStatus]);

  const handleStatusChange = async (orderId, newStatus) => {
    await updateOrderStatus(orderId, newStatus);
  };

  const handleOpenEdit = (order) => {
    setEditingOrder(order);
    setEditClientName(order.clientName);
    setEditClientPhone(order.clientPhone);
    setEditItems(order.items.map(i => ({ ...i })));
  };

  const handleUpdateItemQty = (productId, newQty) => {
    setEditItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const handleRemoveItem = (productId) => {
    setEditItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handleAddItemToEdit = (product) => {
    if (!product) return;
    const exists = editItems.find(item => item.productId === product.id);
    if (exists) {
      handleUpdateItemQty(product.id, exists.quantity + 1);
      return;
    }

    const price = useStore.getState().user ? product.pricePromotional : product.pricePublic;

    setEditItems(prev => [...prev, {
      productId: product.id,
      name: product.name,
      brand: product.brand,
      size: product.size,
      quantity: 1,
      pricePaid: price
    }]);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editClientName || !editClientPhone || editItems.length === 0) return;

    const ok = await updateOrder(editingOrder.id, editClientName.trim(), editClientPhone.trim(), editItems);
    if (ok) {
      setEditingOrder(null);
    }
  };

  return (
    <div className="space-y-6 fade-in-up max-w-7xl mx-auto w-full flex-1 flex flex-col justify-start">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-neutral-900 dark:text-amber-400" /> Historial de Órdenes y Ventas
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Revisa, edita o actualiza el estado de las órdenes. Las ventas marcadas como <strong className="text-emerald-600 dark:text-emerald-400">entregado</strong> descuentan de forma automática el stock real de perfumes.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-800 dark:text-rose-200 flex items-center gap-2 relative">
          <AlertCircle className="h-4 w-4 text-rose-500 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Area */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Text Search */}
          <div className="sm:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            </div>
            <input
              type="text"
              placeholder="Buscar por cliente, teléfono o id de orden..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Status Select */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="block w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent outline-none transition-all cursor-pointer"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="pendiente">Pendientes 🕒</option>
              <option value="entregado">Entregados ✓</option>
              <option value="cancelado">Cancelados ✕</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/70 text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest font-mono">
              <tr>
                <th className="px-6 py-4">Orden / Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-semibold text-neutral-700 dark:text-neutral-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-neutral-400 dark:text-neutral-500">
                    <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
                    <span>No se encontraron órdenes registradas.</span>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-6 py-4 space-y-1">
                      <span className="font-mono text-neutral-900 dark:text-neutral-100 block font-bold">{o.id}</span>
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">{o.date}</span>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <span className="text-neutral-900 dark:text-neutral-100 block font-bold">{o.clientName}</span>
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block font-mono">{o.clientPhone}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-neutral-900 dark:text-neutral-100 text-sm font-bold">
                      L. {o.total.toLocaleString()} HNL
                    </td>
                    <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                      {(o.items || []).reduce((acc, curr) => acc + curr.quantity, 0)} pzs
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border cursor-pointer outline-none transition-all ${
                          o.status === 'entregado'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                            : o.status === 'cancelado'
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setViewingOrder(o)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                        title="Ver detalle"
                      >
                        <Eye className="h-3.5 w-3.5" /> Detalle
                      </button>

                      <button
                        onClick={() => handleOpenEdit(o)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                        title="Editar orden"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Detail Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-auto max-h-[90vh] fade-in-up">
            <div className="p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between flex-shrink-0">
              <h3 className="font-display font-bold text-neutral-900 dark:text-neutral-100 text-base truncate pr-2">
                Resumen de Orden: <span className="font-mono font-black">{viewingOrder.id}</span>
              </h3>
              <button onClick={() => setViewingOrder(null)} className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 cursor-pointer flex-shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto">
              {/* Client specifications */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                <div>
                  <span className="text-neutral-400 dark:text-neutral-500 font-bold block mb-1">Cliente</span>
                  <span className="text-neutral-900 dark:text-neutral-100 font-extrabold">{viewingOrder.clientName}</span>
                </div>
                <div>
                  <span className="text-neutral-400 dark:text-neutral-500 font-bold block mb-1">Teléfono</span>
                  <span className="text-neutral-900 dark:text-neutral-100 font-mono font-extrabold">{viewingOrder.clientPhone}</span>
                </div>
                <div>
                  <span className="text-neutral-400 dark:text-neutral-500 font-bold block mb-1">Fecha</span>
                  <span className="text-neutral-900 dark:text-neutral-100 font-extrabold">{viewingOrder.date}</span>
                </div>
                <div>
                  <span className="text-neutral-400 dark:text-neutral-500 font-bold block mb-1">Estado</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                    viewingOrder.status === 'entregado'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : viewingOrder.status === 'cancelado'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  }`}>
                    {viewingOrder.status}
                  </span>
                </div>
              </div>

              {/* Items detail list */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest font-mono">
                  Fragancias Solicitadas
                </h4>

                <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border-y border-neutral-100 dark:border-neutral-800">
                  {viewingOrder.items.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-neutral-900 dark:text-neutral-100 block">{item.brand} {item.name}</span>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5 block font-semibold">
                          Tamaño: {item.size} | {item.quantity} pzs c/u
                        </span>
                      </div>
                      <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        L. {(item.pricePaid * item.quantity).toLocaleString()} HNL
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Total Footer */}
            <div className="p-5 sm:p-6 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between flex-shrink-0">
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Total Cotizado</span>
              <span className="font-mono font-black text-neutral-950 dark:text-amber-400 text-lg">
                L. {viewingOrder.total.toLocaleString()} HNL
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-auto max-h-[90vh] fade-in-up">
            <div className="p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between flex-shrink-0">
              <h3 className="font-display font-bold text-neutral-900 dark:text-neutral-100 text-sm sm:text-base truncate pr-2">
                Editar Detalles de Orden: <span className="font-mono font-black text-xs sm:text-sm">{editingOrder.id}</span>
              </h3>
              <button onClick={() => setEditingOrder(null)} className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 cursor-pointer flex-shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 sm:space-y-5">
              
              {/* Cliente info fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-name" className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 block">
                    Nombre del Cliente
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    required
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent transition-all outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="edit-phone" className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 block">
                    Teléfono
                  </label>
                  <input
                    id="edit-phone"
                    type="text"
                    required
                    value={editClientPhone}
                    onChange={(e) => setEditClientPhone(e.target.value)}
                    className="block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent transition-all outline-none font-mono"
                  />
                </div>
              </div>

              {/* Add Perfume block */}
              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                  Añadir Fragancia a la Orden
                </label>
                <select
                  onChange={(e) => {
                    const p = products.find(prod => prod.id === e.target.value);
                    if (p) {
                      handleAddItemToEdit(p);
                      e.target.value = ''; // Reset dropdown
                    }
                  }}
                  className="block w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent outline-none transition-all cursor-pointer"
                >
                  <option value="">-- Selecciona un perfume para añadir --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.brand} {p.name} ({p.size})
                    </option>
                  ))}
                </select>
              </div>

              {/* Items details table */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest font-mono">
                  Items en la Orden
                </h4>

                <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-extrabold text-neutral-900 dark:text-neutral-100 block">{item.brand} {item.name}</span>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5 block font-semibold">
                          Tamaño: {item.size} | L. {item.pricePaid.toLocaleString()} c/u
                        </span>
                      </div>

                      <div className="flex items-center gap-4 ml-auto">
                        {/* Quantity adjust */}
                        <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(item.productId, item.quantity - 1)}
                            className="px-2 py-1 text-sm font-bold text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-bold text-neutral-950 dark:text-neutral-100 font-mono min-w-[1.5rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(item.productId, item.quantity + 1)}
                            className="px-2 py-1 text-sm font-bold text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Trash */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.productId)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 dark:text-neutral-500 dark:hover:text-rose-400 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </form>

            <div className="p-5 sm:p-6 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between flex-shrink-0">
              <div className="text-left">
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block font-bold">Subtotal Estimado:</span>
                <span className="font-mono font-black text-neutral-950 dark:text-amber-400 text-base">
                  L. {editItems.reduce((acc, curr) => acc + (curr.pricePaid * curr.quantity), 0).toLocaleString()} HNL
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold rounded-xl cursor-pointer active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={loading || editItems.length === 0}
                  className="px-5 py-2.5 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-bold rounded-xl cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
