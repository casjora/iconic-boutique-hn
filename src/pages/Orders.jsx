import { useState, useMemo,useEffect } from 'react';
import { useStore } from '../store';
import { ClipboardList, Search, Edit2, Loader2, CheckCircle2, AlertCircle, ShoppingBag, Eye, X, Plus, Trash2 } from 'lucide-react';

export default function Orders() {
  const { 
    orders, products, updateOrderStatus, updateOrder, reportPhysicalSale, 
    loading: storeLoading, error: storeError, fetchCustomers, customers 
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  // Modal active variables
  const [viewingOrder, setViewingOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);

  // Physical Sale modal states
  const [showPhysicalSaleModal, setShowPhysicalSaleModal] = useState(false);
  const [physicalProductId, setPhysicalProductId] = useState('');
  const [physicalQuantity, setPhysicalQuantity] = useState(1);
  const [physicalClientName, setPhysicalClientName] = useState('Venta Física (Mostrador)');
  const [physicalClientPhone, setPhysicalClientPhone] = useState('');
  const [physicalPricePaid, setPhysicalPricePaid] = useState('');
  const [physicalBuyerId, setPhysicalBuyerId] = useState('');
  const [physicalRoleUsed, setPhysicalRoleUsed] = useState('detalle');
  const [reportingPhysicalSale, setReportingPhysicalSale] = useState(false);
  const [physicalSaleMsg, setPhysicalSaleMsg] = useState({ type: '', text: '' });

  // Edit fields inside modal
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editItems, setEditItems] = useState([]);

  // Memoized calculations for selected physical product
  const selectedProductObj = useMemo(() => {
    return products.find(p => p.id === physicalProductId) || null;
  }, [products, physicalProductId]);

  // Sync default price when product selection or role category changes
  useEffect(() => {
    if (selectedProductObj) {
      const price = physicalRoleUsed === 'mayorista' ? selectedProductObj.pricePromotional : selectedProductObj.pricePublic;
      setPhysicalPricePaid(price);
    } else {
      setPhysicalPricePaid('');
    }
  }, [selectedProductObj, physicalRoleUsed]);

  // Handle buyer account attachment (automatically pre-fills contact details)
  useEffect(() => {
    if (physicalBuyerId && customers) {
      const cust = customers.find(c => c.id === physicalBuyerId);
      if (cust) {
        setPhysicalClientName(cust.name || 'Cliente');
        setPhysicalClientPhone(cust.phone || '');
        const roleNorm = String(cust.role || '').toLowerCase();
        if (roleNorm === 'mayorista') {
          setPhysicalRoleUsed('mayorista');
        } else {
          setPhysicalRoleUsed('detalle');
        }
      }
    }
  }, [physicalBuyerId, customers]);

  const handleReportPhysicalSaleSubmit = async (e) => {
    e.preventDefault();
    if (!physicalProductId) {
      setPhysicalSaleMsg({ type: 'error', text: 'Por favor selecciona un perfume.' });
      return;
    }
    if (!physicalQuantity || Number(physicalQuantity) <= 0) {
      setPhysicalSaleMsg({ type: 'error', text: 'La cantidad debe ser mayor a 0.' });
      return;
    }
    if (!physicalPricePaid || Number(physicalPricePaid) < 0) {
      setPhysicalSaleMsg({ type: 'error', text: 'El precio pagado es requerido.' });
      return;
    }

    setReportingPhysicalSale(true);
    setPhysicalSaleMsg({ type: '', text: '' });

    const qty = Number(physicalQuantity);
    const price = Number(physicalPricePaid);

    const result = await reportPhysicalSale(
      physicalProductId,
      qty,
      physicalClientName.trim() || 'Venta Física (Mostrador)',
      physicalClientPhone.trim() || '',
      price,
      physicalBuyerId || null,
      physicalRoleUsed
    );

    setReportingPhysicalSale(false);

    if (result.success) {
      setPhysicalSaleMsg({ type: 'success', text: '¡Venta registrada exitosamente! El inventario ha sido actualizado.' });
      setTimeout(() => {
        setShowPhysicalSaleModal(false);
      }, 2000);
    } else {
      setPhysicalSaleMsg({ type: 'error', text: result.error || 'Error al procesar la venta.' });
    }
  };

  // Fetch customers if we open physical sale modal to let them attach user account if wanted
  const handleOpenPhysicalSale = async () => {
    // Ensure customers are fetched
    if (!customers || customers.length === 0) {
      await fetchCustomers();
    }
    setPhysicalProductId('');
    setPhysicalQuantity(1);
    setPhysicalClientName('Venta Física (Mostrador)');
    setPhysicalClientPhone('');
    setPhysicalPricePaid('');
    setPhysicalBuyerId('');
    setPhysicalRoleUsed('detalle');
    setPhysicalSaleMsg({ type: '', text: '' });
    setShowPhysicalSaleModal(true);
  };

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
        <button
          onClick={handleOpenPhysicalSale}
          className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-neutral-950 dark:bg-amber-400 hover:bg-neutral-850 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 uppercase tracking-wider shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Registrar Venta Física
        </button>
      </div>

      {storeError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-800 dark:text-rose-200 flex items-center gap-2 relative">
          <AlertCircle className="h-4 w-4 text-rose-500 dark:text-rose-400" />
          <span>{storeError}</span>
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
                  disabled={storeLoading || editItems.length === 0}
                  className="px-5 py-2.5 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-bold rounded-xl cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {storeLoading ? (
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

      {/* Manual / Physical Counter Sale Modal */}
      {showPhysicalSaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col my-8 max-h-[85vh]">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-extrabold text-neutral-900 dark:text-neutral-50 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                Registrar Venta de Mostrador (Física)
              </h3>
              <button
                type="button"
                onClick={() => setShowPhysicalSaleModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content / Form */}
            <form onSubmit={handleReportPhysicalSaleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              
              {physicalSaleMsg.text && (
                <div className={`p-4 rounded-xl border flex items-center gap-2 font-semibold ${
                  physicalSaleMsg.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200' 
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200'
                }`}>
                  {physicalSaleMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{physicalSaleMsg.text}</span>
                </div>
              )}

              {/* Attach Buyer (Optional) */}
              <div className="space-y-1.5">
                <label className="block font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                  Vincular Perfil de Cliente Registrado (Opcional)
                </label>
                <select
                  value={physicalBuyerId}
                  onChange={(e) => setPhysicalBuyerId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-semibold outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-amber-400 transition-all text-neutral-800 dark:text-neutral-100 cursor-pointer"
                >
                  <option value="">-- Cliente de paso sin perfil --</option>
                  {(customers || []).map(cust => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} ({cust.phone || 'Sin número'}) - {cust.role || 'detalle'}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-400">Vincular un perfil autocompleta el nombre, WhatsApp y aplica su tipo de tarifa.</p>
              </div>

              {/* Client Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                    Nombre del Cliente
                  </label>
                  <input
                    type="text"
                    required
                    value={physicalClientName}
                    onChange={(e) => setPhysicalClientName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-semibold outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-amber-400 transition-all text-neutral-800 dark:text-neutral-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                    WhatsApp del Cliente
                  </label>
                  <input
                    type="text"
                    value={physicalClientPhone}
                    onChange={(e) => setPhysicalClientPhone(e.target.value)}
                    placeholder="Ej. +504 9999-9999"
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-semibold outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-amber-400 transition-all text-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </div>

              {/* Product Select */}
              <div className="space-y-1.5">
                <label className="block font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                  Perfume Vendido <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={physicalProductId}
                  onChange={(e) => setPhysicalProductId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-semibold outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-amber-400 transition-all text-neutral-800 dark:text-neutral-100 cursor-pointer"
                >
                  <option value="">-- Selecciona un Perfume --</option>
                  {products.map(prod => {
                    const stock = prod.availableStock !== undefined ? prod.availableStock : prod.stock;
                    return (
                      <option key={prod.id} value={prod.id} disabled={stock <= 0}>
                        [{prod.brand}] {prod.name} ({prod.size}) - Stock: {stock} pzs - L. {prod.pricePublic} (Púb) / L. {prod.pricePromotional} (May)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Pricing, Quantity & Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                    Tarifa Aplicada
                  </label>
                  <select
                    value={physicalRoleUsed}
                    onChange={(e) => setPhysicalRoleUsed(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-semibold outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-amber-400 transition-all text-neutral-800 dark:text-neutral-100 cursor-pointer"
                  >
                    <option value="detalle">Precio al Detalle</option>
                    <option value="mayorista">Precio Mayorista VIP</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                    Precio Cobrado (Unidad)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={physicalPricePaid}
                    onChange={(e) => setPhysicalPricePaid(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono font-bold outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-amber-400 transition-all text-neutral-800 dark:text-neutral-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                    Cantidad Vendida
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedProductObj ? (selectedProductObj.availableStock !== undefined ? selectedProductObj.availableStock : selectedProductObj.stock) : undefined}
                    value={physicalQuantity}
                    onChange={(e) => setPhysicalQuantity(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono font-bold outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-amber-400 transition-all text-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </div>

              {selectedProductObj && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded-xl space-y-1">
                  <div className="flex justify-between font-bold text-neutral-500">
                    <span>Stock Actual:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {selectedProductObj.availableStock !== undefined ? selectedProductObj.availableStock : selectedProductObj.stock} unidades
                    </span>
                  </div>
                  {Number(physicalQuantity) > (selectedProductObj.availableStock !== undefined ? selectedProductObj.availableStock : selectedProductObj.stock) && (
                    <p className="text-rose-500 font-bold text-[10px]">⚠️ Error: La cantidad elegida excede el inventario físico disponible.</p>
                  )}
                </div>
              )}

              {/* Total Calculation Display */}
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/40 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-amber-800 dark:text-amber-500 font-extrabold uppercase tracking-widest font-mono">Total de la Venta</span>
                  <span className="block text-xs text-neutral-500">
                    L. {Number(physicalPricePaid || 0).toLocaleString()} x {Number(physicalQuantity || 0)} pzs
                  </span>
                </div>
                <span className="font-mono font-black text-amber-950 dark:text-amber-200 text-lg">
                  L. {(Number(physicalPricePaid || 0) * Number(physicalQuantity || 0)).toLocaleString()} HNL
                </span>
              </div>

              {/* Form Footer Actions */}
              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPhysicalSaleModal(false)}
                  className="px-4 py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold rounded-xl cursor-pointer active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reportingPhysicalSale || !physicalProductId || Number(physicalQuantity) > (selectedProductObj ? (selectedProductObj.availableStock !== undefined ? selectedProductObj.availableStock : selectedProductObj.stock) : 0)}
                  className="px-5 py-2.5 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-850 dark:hover:bg-amber-300 text-white dark:text-neutral-950 font-black rounded-xl cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  {reportingPhysicalSale ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Procesando...
                    </div>
                  ) : (
                    'Confirmar y Descontar'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
