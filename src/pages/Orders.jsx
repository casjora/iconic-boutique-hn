import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { FileSpreadsheet, RefreshCw, Phone, Edit, CheckCircle, XCircle, AlertCircle, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { isProductSet } from '../utils/productHelper';

export default function Orders() {
  const { orders, fetchOrders, user, updateOrderStatus, repeatOrder, products, updateOrder } = useStore();
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('Todos');

  // Modal editing states
  const [editingOrder, setEditingOrder] = useState(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editItems, setEditItems] = useState([]);
  const [selectedAddProductId, setSelectedAddProductId] = useState('');

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

  const handleAdjustQty = (productId, delta) => {
    setEditItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        const productInDb = products.find(p => p.id === productId);
        const originalItem = editingOrder.items.find(i => i.productId === productId);
        const originalQty = originalItem ? originalItem.quantity : 0;
        const availableStock = (productInDb ? productInDb.stock : 0) + originalQty;
        if (newQty > availableStock) {
          alert(`Lo sentimos, el stock total disponible para este perfume es de ${availableStock} unidades.`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleRemoveItem = (productId) => {
    setEditItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handleAddItemToOrder = () => {
    if (!selectedAddProductId) return;
    const prod = products.find(p => p.id === selectedAddProductId);
    if (!prod) return;
    if (prod.stock <= 0) {
      alert('Este producto no cuenta con stock disponible en tienda.');
      return;
    }
    const existing = editItems.find(i => i.productId === prod.id);
    if (existing) {
      handleAdjustQty(prod.id, 1);
      return;
    }
    const priceToUse = editingOrder.roleUsed === 'client' || editingOrder.roleUsed === 'usuario' ? prod.pricePromotional : prod.pricePublic;
    setEditItems(prev => [
      ...prev,
      {
        productId: prod.id,
        brand: prod.brand,
        name: prod.name,
        size: prod.size,
        quantity: 1,
        pricePaid: priceToUse
      }
    ]);
  };

  const handleSaveModifiedOrder = async () => {
    if (!editClientName.trim() || !editClientPhone.trim()) {
      alert('Por favor, ingresa el nombre y teléfono del cliente.');
      return;
    }
    if (editItems.length === 0) {
      alert('La orden debe contener al menos un producto.');
      return;
    }
    setLoadingLocal(true);
    const ok = await updateOrder(editingOrder.id, editClientName.trim(), editClientPhone.trim(), editItems);
    setLoadingLocal(false);
    if (ok) {
      setEditingOrder(null);
      alert('¡Orden modificada correctamente y stock de tienda actualizado!');
    } else {
      alert('Ocurrió un error al guardar los cambios de la orden.');
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleRepeatOrder(o)}
                        className="inline-flex items-center gap-1 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Repetir Pedido / Cargar Carrito
                      </button>

                      {/* Modificar Orden Action button */}
                      {(isEmployee || (user && o.buyerId === user.uid && o.status === 'pendiente')) && (
                        <button
                          onClick={() => {
                            setEditingOrder(o);
                            setEditClientName(o.clientName);
                            setEditClientPhone(o.clientPhone);
                            setEditItems(o.items.map(i => ({ ...i })));
                            setSelectedAddProductId('');
                          }}
                          className="inline-flex items-center gap-1 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-neutral-200"
                        >
                          <Edit className="h-3.5 w-3.5 text-neutral-500" />
                          Modificar Orden
                        </button>
                      )}
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

      {/* Editing Modal Dialog */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-neutral-200 max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingOrder(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 font-extrabold text-lg p-1 cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h3 className="font-display font-black text-neutral-900 text-xl flex items-center gap-2">
                <Edit className="h-5 w-5 text-indigo-500" /> Modificar Orden
              </h3>
              <p className="text-xs text-neutral-500">
                Ajusta los datos del cliente, elimina perfumes o cambia cantidades. El stock de la tienda se recalculará automáticamente al guardar.
              </p>
            </div>

            <div className="space-y-4">
              {/* Client Info fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">Nombre Cliente</label>
                  <input
                    type="text"
                    required
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:ring-2 focus:ring-neutral-950 focus:border-transparent outline-none font-semibold text-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">Teléfono Cliente</label>
                  <input
                    type="text"
                    required
                    value={editClientPhone}
                    onChange={(e) => setEditClientPhone(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:ring-2 focus:ring-neutral-950 focus:border-transparent outline-none font-mono font-semibold text-neutral-900"
                  />
                </div>
              </div>

              {/* Items modification lists */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-1.5">
                  Fragancias Incluidas
                </h4>
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-neutral-700 pb-2 border-b border-neutral-50 last:border-0 last:pb-0">
                      <div className="truncate pr-4 flex-1">
                        <span className="block font-bold text-neutral-900 leading-tight">{item.brand} {item.name}</span>
                        <span className="text-[10px] text-neutral-400 font-mono font-bold uppercase">{item.size} • L. {item.pricePaid.toLocaleString()} c/u</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Qty selectors */}
                        <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => handleAdjustQty(item.productId, -1)}
                            className="p-1 px-2 hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2.5 font-mono font-bold text-neutral-900">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleAdjustQty(item.productId, 1)}
                            className="p-1 px-2 hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Remove item */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.productId)}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                          title="Quitar de la orden"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add product to order section */}
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100 space-y-2.5">
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider block">Añadir perfume a esta orden:</label>
                <div className="flex gap-2">
                  <select
                    value={selectedAddProductId}
                    onChange={(e) => setSelectedAddProductId(e.target.value)}
                    className="flex-1 bg-white border border-neutral-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  >
                    <option value="">-- Seleccionar Perfume --</option>
                    {products.filter(p => p.stock > 0).map(p => (
                      <option key={p.id} value={p.id}>
                        [{p.brand}] {p.name} ({p.size}) - Stock: {p.stock}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddItemToOrder}
                    disabled={!selectedAddProductId}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Añadir
                  </button>
                </div>
              </div>

              {/* Order total sum preview */}
              <div className="flex justify-between items-center bg-neutral-900 text-white p-4 rounded-2xl">
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold opacity-70">Nuevo Total Calculado:</span>
                <span className="text-base font-black font-mono">
                  L. {editItems.reduce((sum, i) => sum + (i.pricePaid * i.quantity), 0).toLocaleString()} HNL
                </span>
              </div>
            </div>

            {/* Submit Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="flex-1 py-3 border border-neutral-200 text-xs font-bold uppercase tracking-wider text-neutral-600 rounded-xl hover:bg-neutral-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveModifiedOrder}
                disabled={loadingLocal}
                className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loadingLocal ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
