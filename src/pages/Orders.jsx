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
    <div className="space-y-6 fade-in-up max-w-7xl mx-auto">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-neutral-900" /> Historial de Órdenes y Ventas
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Revisa, edita o actualiza el estado de las órdenes. Las ventas marcadas como <strong className="text-emerald-600">entregado</strong> descuentan de forma automática el stock real de perfumes.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2 relative">
          <AlertCircle className="h-4 w-4 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Area */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Text Search */}
          <div className="sm:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por cliente, teléfono o id de orden..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Status Select */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="block w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all cursor-pointer"
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
      <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-left text-xs">
            <thead className="bg-neutral-50 text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
              <tr>
                <th className="px-6 py-4">Orden / Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-neutral-400">
                    <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
                    <span>No se encontraron órdenes registradas.</span>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 space-y-1">
                      <span className="font-mono text-neutral-900 block font-bold">{o.id}</span>
                      <span className="text-[10px] text-neutral-400 block">{o.date}</span>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <span className="text-neutral-900 block font-bold">{o.clientName}</span>
                      <span className="text-[10px] text-neutral-400 block font-mono">{o.clientPhone}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-neutral-900 text-sm font-bold">
                      L. {o.total.toLocaleString()} HNL
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {(o.items || []).reduce((acc, curr) => acc + curr.quantity, 0)} pzs
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border cursor-pointer outline-none transition-all ${
                          o.status === 'entregado'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : o.status === 'cancelado'
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
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
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                        title="Ver detalle"
                      >
                        <Eye className="h-3.5 w-3.5" /> Detalle
                      </button>

                      <button
                        onClick={() => handleOpenEdit(o)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[85vh] fade-in-up">
            <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-display font-bold text-neutral-900 text-base truncate pr-2">
                Resumen de Orden: <span className="font-mono font-black">{viewingOrder.id}</span>
              </h3>
              <button onClick={() => setViewingOrder(null)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer flex-shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto">
              {/* Client specifications */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                <div>
                  <span className="text-neutral-400 font-bold block mb-1">Cliente</span>
                  <span className="text-neutral-900 font-extrabold">{viewingOrder.clientName}</span>
                </div>
                <div>
                  <span className="text-neutral-400 font-bold block mb-1">Teléfono</span>
                  <span className="text-neutral-900 font-mono font-extrabold">{viewingOrder.clientPhone}</span>
                </div>
                <div>
                  <span className="text-neutral-400 font-bold block mb-1">Fecha</span>
                  <span className="text-neutral-900 font-extrabold">{viewingOrder.date}</span>
                </div>
                <div>
                  <span className="text-neutral-400 font-bold block mb-1">Estado</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                    viewingOrder.status === 'entregado'
                      ? 'bg-emerald-50 text-emerald-700'
                      : viewingOrder.status === 'cancelado'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                  }`}>
                    {viewingOrder.status}
                  </span>
                </div>
              </div>

              {/* Items detail list */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
                  Fragancias Solicitadas
                </h4>

                <div className="divide-y divide-neutral-100 border-y border-neutral-100">
                  {viewingOrder.items.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-neutral-900 block">{item.brand} {item.name}</span>
                        <span className="text-[10px] text-neutral-400 mt-0.5 block font-semibold">
                          Tamaño: {item.size} | {item.quantity} pzs c/u
                        </span>
                      </div>
                      <span className="font-mono font-bold text-neutral-900">
                        L. {(item.pricePaid * item.quantity).toLocaleString()} HNL
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Total Footer */}
            <div className="p-5 sm:p-6 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between flex-shrink-0">
              <span className="text-sm font-bold text-neutral-900">Total Cotizado</span>
              <span className="font-mono font-black text-neutral-950 text-lg">
                L. {viewingOrder.total.toLocaleString()} HNL
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col my-auto max-h-[85vh] fade-in-up">
            <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-display font-bold text-neutral-900 text-sm sm:text-base truncate pr-2">
                Editar Detalles de Orden: <span className="font-mono font-black text-xs sm:text-sm">{editingOrder.id}</span>
              </h3>
              <button onClick={() => setEditingOrder(null)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer flex-shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 sm:space-y-5">
              
              {/* Cliente info fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-name" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">
                    Nombre del Cliente
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    required
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="block w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="edit-phone" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block">
                    Teléfono
                  </label>
                  <input
                    id="edit-phone"
                    type="text"
                    required
                    value={editClientPhone}
                    onChange={(e) => setEditClientPhone(e.target.value)}
                    className="block w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all outline-none font-mono"
                  />
                </div>
              </div>

              {/* Add Perfume block */}
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-3">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
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
                  className="block w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all cursor-pointer"
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
                <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
                  Items en la Orden
                </h4>

                <div className="border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-extrabold text-neutral-900 block">{item.brand} {item.name}</span>
                        <span className="text-[10px] text-neutral-400 mt-0.5 block font-semibold">
                          Tamaño: {item.size} | L. {item.pricePaid.toLocaleString()} c/u
                        </span>
                      </div>

                      <div className="flex items-center gap-4 ml-auto">
                        {/* Quantity adjust */}
                        <div className="flex items-center border border-neutral-200 rounded-xl bg-neutral-50">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(item.productId, item.quantity - 1)}
                            className="px-2 py-1 text-sm font-bold text-neutral-500 hover:text-neutral-950 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-bold text-neutral-950 font-mono min-w-[1.5rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(item.productId, item.quantity + 1)}
                            className="px-2 py-1 text-sm font-bold text-neutral-500 hover:text-neutral-950 cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Trash */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.productId)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </form>

            <div className="p-5 sm:p-6 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between flex-shrink-0">
              <div className="text-left">
                <span className="text-[10px] text-neutral-400 block font-bold">Subtotal Estimado:</span>
                <span className="font-mono font-black text-neutral-950 text-base">
                  L. {editItems.reduce((acc, curr) => acc + (curr.pricePaid * curr.quantity), 0).toLocaleString()} HNL
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-bold rounded-xl cursor-pointer active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={loading || editItems.length === 0}
                  className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl cursor-pointer active:scale-95 disabled:opacity-50"
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
