import React, { useState } from 'react';
import { useStore } from '../store';
import { 
  MessageCircle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Copy, 
  Check, 
  Clock, 
  Phone, 
  Edit2, 
  Trash2, 
  Plus, 
  Minus, 
  Save, 
  X,
  PackageOpen
} from 'lucide-react';

export default function OrderList() {
  const { 
    orders, 
    products, 
    updateOrderStatus, 
    updateOrderDetails, 
    loading, 
    error, 
    user 
  } = useStore();

  const [filterStatus, setFilterStatus] = useState('todos');
  const [copiedId, setCopiedId] = useState(null);

  // States for Order Editing Mode (Vendedores/Owners only)
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editItems, setEditItems] = useState([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');

  const isEmployee = user?.role === 'owner' || user?.role === 'vendedor';

  // Status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pendiente':
        return 'bg-amber-50 text-amber-800 border-amber-100';
      case 'completado':
        return 'bg-emerald-50 text-emerald-800 border-emerald-100';
      case 'cancelado':
        return 'bg-red-50 text-red-800 border-red-100';
      default:
        return 'bg-neutral-50 text-neutral-800 border-neutral-100';
    }
  };

  // Pre-format WhatsApp template text
  const getWhatsAppLink = (order) => {
    const itemsText = order.items
      .map(i => `• ${i.quantity}x ${i.brand} ${i.name} (${i.size}) - L. ${(Number(i.pricePaid) || 0).toLocaleString()}`)
      .join('\n');

    const text = `¡Hola *${order.clientName}*! Le saludamos de *Iconic Boutique HN* 🇭🇳✨.

Hemos recibido su orden de cotización *${order.id}*:

${itemsText}

*Total a Pagar:* *L. ${(Number(order.total) || 0).toLocaleString()} HNL*
*Precios aplicados:* ${order.roleUsed === 'client' ? 'Promocional VIP' : 'Público General'}

Para coordinar la facturación manual, método de pago (transferencia Ficohsa/Atlántida/BAC, o efectivo) y el envío (delivery local o Rapido Cargo / CAEX), favor confírmenos por esta vía. ¡Muchas gracias por su preferencia! ✨`;

    const encodedText = encodeURIComponent(text);
    // Honduras phone numbers are 8 digits, add prefix +504
    const cleanPhone = (order.clientPhone || '').replace(/[^\d]/g, '');
    const phoneWithPrefix = cleanPhone.startsWith('504') ? cleanPhone : `504${cleanPhone}`;

    return `https://wa.me/${phoneWithPrefix}?text=${encodedText}`;
  };

  const copyToClipboard = (order) => {
    const itemsText = order.items
      .map(i => `• ${i.quantity}x ${i.brand} ${i.name} (${i.size}) - L. ${(Number(i.pricePaid) || 0).toLocaleString()}`)
      .join('\n');

    const text = `Iconic Boutique HN 🇭🇳\nOrden: ${order.id}\nCliente: ${order.clientName}\nTeléfono: ${order.clientPhone}\n\nDetalle:\n${itemsText}\n\nTotal: L. ${(Number(order.total) || 0).toLocaleString()} HNL`;
    
    navigator.clipboard.writeText(text);
    setCopiedId(order.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    if (window.confirm(`¿Seguro que desea cambiar el estado de la orden a: ${newStatus.toUpperCase()}?`)) {
      await updateOrderStatus(orderId, newStatus);
    }
  };

  // Order editing logic
  const startEditing = (order) => {
    setEditingOrderId(order.id);
    setEditClientName(order.clientName);
    setEditClientPhone(order.clientPhone);
    setEditItems([...order.items]);
    setSelectedProductToAdd('');
  };

  const updateItemQty = (productId, delta) => {
    setEditItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        // Find product to check real-time stock
        const p = products.find(prod => prod.id === productId);
        // Add original quantity of this order since it's already deducted from store.
        const originalOrder = orders.find(o => o.id === editingOrderId);
        const originalQty = originalOrder?.items.find(i => i.productId === productId)?.quantity || 0;
        const availableStock = (p?.stock || 0) + originalQty;

        if (newQty > availableStock) {
          alert(`Inventario insuficiente. Solo quedan ${p?.stock || 0} disponibles en catálogo (+${originalQty} reservados en esta orden). Stock total utilizable: ${availableStock} unidades.`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (productId) => {
    setEditItems(prev => prev.filter(item => item.productId !== productId));
  };

  const addItemToOrder = () => {
    if (!selectedProductToAdd) return;
    const p = products.find(prod => prod.id === selectedProductToAdd);
    if (!p) return;

    if (editItems.some(i => i.productId === p.id)) {
      alert('Esta fragancia ya está agregada en la orden actual.');
      return;
    }

    if (p.stock <= 0) {
      alert('Esta fragancia no cuenta con stock disponible en el inventario actual.');
      return;
    }

    // Determine pricing: if previous items used VIP pricing, keep VIP pricing
    const firstItem = editItems[0];
    const originalProd = firstItem ? products.find(prod => prod.id === firstItem.productId) : null;
    const isVIP = firstItem && originalProd ? firstItem.pricePaid === originalProd.pricePromotional : false;
    const pricePaid = isVIP ? p.pricePromotional : p.pricePublic;

    setEditItems(prev => [
      ...prev,
      {
        productId: p.id,
        name: p.name,
        brand: p.brand,
        size: p.size,
        quantity: 1,
        pricePaid
      }
    ]);
    setSelectedProductToAdd('');
  };

  const saveOrderChanges = async (orderId) => {
    if (!editClientName.trim()) {
      alert('Por favor ingrese el nombre del cliente');
      return;
    }
    if (editItems.length === 0) {
      alert('La orden debe contener al menos 1 artículo');
      return;
    }

    const total = editItems.reduce((acc, curr) => acc + (curr.pricePaid * curr.quantity), 0);
    const ok = await updateOrderDetails(orderId, {
      clientName: editClientName.trim(),
      clientPhone: editClientPhone.trim(),
      items: editItems,
      total
    });

    if (ok) {
      setEditingOrderId(null);
    }
  };

  const filteredOrders = orders.filter(o => filterStatus === 'todos' || o.status === filterStatus);

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-900 tracking-tight">
            Órdenes de Compra y Cotizaciones
          </h2>
          <p className="text-xs text-neutral-500">
            Monitoreo de solicitudes manuales recibidas. Los vendedores coordinan entrega y facturan de forma externa.
          </p>
        </div>

        {/* Filters */}
        <div className="flex bg-neutral-100 p-1 rounded-xl max-w-fit border border-neutral-200">
          {['todos', 'pendiente', 'completado', 'cancelado'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                filterStatus === status
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <Clock className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-400 text-sm font-semibold">
            No se encontraron órdenes con el estado seleccionado.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isEditing = editingOrderId === order.id;

            return (
              <div 
                key={order.id} 
                className={`rounded-2xl border bg-white p-5 sm:p-6 transition-all ${
                  order.status === 'pendiente' ? 'border-amber-200 bg-amber-50/5 shadow-sm' : 'border-neutral-200'
                }`}
              >
                {/* Order Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-black text-sm text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded-lg font-mono">
                      {order.id}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      {order.date}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                    
                    {order.roleUsed === 'client' && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-100">
                        Cliente VIP
                      </span>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  /* ================= EDIT MODE VIEW ================= */
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1 font-mono">
                          Nombre del Cliente
                        </label>
                        <input
                          type="text"
                          value={editClientName}
                          onChange={(e) => setEditClientName(e.target.value)}
                          className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1 font-mono">
                          Número de Teléfono (+504)
                        </label>
                        <input
                          type="text"
                          value={editClientPhone}
                          onChange={(e) => setEditClientPhone(e.target.value)}
                          className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
                        />
                      </div>
                    </div>

                    {/* Edit Items Section */}
                    <div>
                      <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 font-mono">
                        Modificar Fragancias en Orden
                      </h4>
                      
                      <div className="space-y-2 border border-neutral-100 rounded-xl p-3 bg-neutral-50/50">
                        {editItems.map((item) => {
                          const originalP = products.find(prod => prod.id === item.productId);
                          const currentStock = originalP?.stock || 0;
                          return (
                            <div key={item.productId} className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2 text-xs">
                              <div className="flex-1">
                                <span className="font-bold text-neutral-900">{item.brand} {item.name}</span>
                                <span className="text-[10px] text-neutral-400 ml-1.5 font-mono">({item.size})</span>
                                <span className="block text-[9px] text-neutral-400 font-mono">Stock actual: {currentStock} uds.</span>
                              </div>

                              <div className="flex items-center gap-4">
                                {/* Quantity Controls */}
                                <div className="flex items-center border border-neutral-200 rounded-lg bg-white overflow-hidden">
                                  <button
                                    onClick={() => updateItemQty(item.productId, -1)}
                                    className="p-1 px-2 hover:bg-neutral-50 text-neutral-600 transition"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="px-2 font-mono font-bold text-neutral-900">{item.quantity}</span>
                                  <button
                                    onClick={() => updateItemQty(item.productId, 1)}
                                    className="p-1 px-2 hover:bg-neutral-50 text-neutral-600 transition"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>

                                <span className="font-mono font-bold text-neutral-800 w-24 text-right">
                                  L. {(item.pricePaid * item.quantity).toLocaleString()} HNL
                                </span>

                                <button
                                  onClick={() => removeItem(item.productId)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add new product dropdown */}
                        <div className="pt-2 border-t border-neutral-200 flex gap-2">
                          <select
                            value={selectedProductToAdd}
                            onChange={(e) => setSelectedProductToAdd(e.target.value)}
                            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white"
                          >
                            <option value="">-- Agregar otra fragancia a la orden --</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                                {p.brand} {p.name} ({p.size}) - L. {p.pricePublic} {p.stock <= 0 ? '(Agotado)' : `(${p.stock} uds. disp)`}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={addItemToOrder}
                            disabled={!selectedProductToAdd}
                            className="bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" /> Agregar
                          </button>
                        </div>
                      </div>

                      {/* Recalculated total */}
                      <div className="flex justify-between items-center mt-3 pt-2 font-mono border-t border-neutral-100">
                        <span className="text-xs font-bold text-neutral-500 uppercase">Nuevo Total recalculado:</span>
                        <span className="text-base font-black text-emerald-600">
                          L. {editItems.reduce((acc, i) => acc + (i.pricePaid * i.quantity), 0).toLocaleString()} HNL
                        </span>
                      </div>
                    </div>

                    {/* Edit mode footer buttons */}
                    <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
                      <button
                        onClick={() => setEditingOrderId(null)}
                        className="inline-flex items-center gap-1 border border-neutral-200 hover:bg-neutral-50 px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-600 cursor-pointer"
                      >
                        <X className="h-4 w-4" /> Cancelar
                      </button>
                      <button
                        onClick={() => saveOrderChanges(order.id)}
                        disabled={loading}
                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        <Save className="h-4 w-4" /> Guardar Cambios e Inventario
                      </button>
                    </div>

                  </div>
                ) : (
                  /* ================= READ ONLY VIEW ================= */
                  <div className="grid gap-6 md:grid-cols-3">
                    
                    {/* Customer Profile */}
                    <div>
                      <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 font-mono">
                        Información del Cliente
                      </h4>
                      <p className="font-display font-bold text-neutral-900 text-base">
                        {order.clientName}
                      </p>
                      <p className="text-xs text-neutral-600 mt-1 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-neutral-400" />
                        <span>+504 {order.clientPhone}</span>
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5 italic">
                        Id de compra: {order.buyerId || 'Invitado (Sin cuenta)'}
                      </p>
                    </div>

                    {/* Items detail list */}
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                          Detalle de Fragancias
                        </h4>
                        {/* Edit Button for pending orders - Only shown to Employee */}
                        {isEmployee && order.status === 'pendiente' && (
                          <button
                            onClick={() => startEditing(order)}
                            className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                          >
                            <Edit2 className="h-3 w-3" /> Modificar Orden (Inventario)
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {order.items.map((item, index) => {
                          const prod = products.find(p => p.id === item.productId);
                          const actualStock = prod ? prod.stock : 0;
                          return (
                            <div key={index} className="flex justify-between items-center text-xs border-b border-neutral-50 pb-1.5">
                              <div>
                                <span className="font-bold text-neutral-900">{item.quantity}x {item.brand} {item.name}</span>
                                <span className="text-[10px] text-neutral-400 ml-1.5">({item.size})</span>
                                {isEmployee && (
                                  <span className="block text-[9px] text-neutral-400 font-mono leading-none mt-0.5">
                                    Existencia actual: {actualStock} unidades
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-bold text-neutral-800">
                                L. {(item.pricePaid * item.quantity).toLocaleString()} HNL
                              </span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between items-center pt-2 font-mono">
                          <span className="text-xs font-bold text-neutral-500 uppercase">Subtotal Cotizado:</span>
                          <span className="text-base font-black text-neutral-950">
                            L. {(Number(order.total) || 0).toLocaleString()} HNL
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* Action Buttons footer - Only show if not editing */}
                {!isEditing && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4 mt-5">
                    
                    {/* Left side actions: Complete or Cancel order */}
                    <div className="flex gap-2">
                      {order.status === 'pendiente' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(order.id, 'completado')}
                            disabled={loading}
                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Completar Pago (Facturar)
                          </button>
                          <button
                            onClick={() => handleStatusChange(order.id, 'cancelado')}
                            disabled={loading}
                            className="inline-flex items-center gap-1 border border-neutral-200 hover:bg-red-50 hover:text-red-600 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 cursor-pointer"
                          >
                            <XCircle className="h-4 w-4" />
                            Cancelar Orden
                          </button>
                        </>
                      )}
                      {order.status !== 'pendiente' && (
                        <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                          <PackageOpen className="h-3.5 w-3.5 text-neutral-300" />
                          Esta orden ha sido finalizada como <strong className="uppercase font-mono text-neutral-500">{order.status}</strong> y ya no permite modificaciones de stock.
                        </span>
                      )}
                    </div>

                    {/* Right side external actions: WhatsApp Chat Link and copy data */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(order)}
                        className="inline-flex items-center gap-1 border border-neutral-200 hover:bg-neutral-50 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-700 cursor-pointer"
                        title="Copiar detalles al portapapeles"
                      >
                        {copiedId === order.id ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-600" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 text-neutral-400" />
                            Copiar Datos
                          </>
                        )}
                      </button>

                      <a
                        href={getWhatsAppLink(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Contactar por WhatsApp
                      </a>
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
