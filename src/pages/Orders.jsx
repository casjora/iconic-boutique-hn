import { useState, useMemo,useEffect } from 'react';
import { useStore } from '../store';
import { ClipboardList, Search, Edit2, Loader2, CheckCircle2, AlertCircle, ShoppingBag, Eye, X, Plus, Trash2 } from 'lucide-react';
import { getProductPrices } from '../utils/productHelper';

export default function Orders() {
  const { 
    orders, products, updateOrderStatus, updateOrder, reportPhysicalSale, 
    loading: storeLoading, error: storeError, fetchCustomers, customers,
    updateProductBarcode
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  // Barcode quick assignment modal state
  const [assignBarcodeState, setAssignBarcodeState] = useState({
    isOpen: false,
    scannedBarcode: '',
    selectedProdId: '',
    targetContext: 'physical',
    isSaving: false,
    msg: ''
  });

  // Modal active variables
  const [viewingOrder, setViewingOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);

  // Edit order modal states
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editItems, setEditItems] = useState([]);
  const [editBarcodeInput, setEditBarcodeInput] = useState('');

  // Physical Sale modal states
  const [showPhysicalSaleModal, setShowPhysicalSaleModal] = useState(false);
  const [physicalSaleItems, setPhysicalSaleItems] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [physicalClientName, setPhysicalClientName] = useState('Venta Física (Mostrador)');
  const [physicalClientPhone, setPhysicalClientPhone] = useState('');
  const [physicalBuyerId, setPhysicalBuyerId] = useState('');
  const [physicalRoleUsed, setPhysicalRoleUsed] = useState('detalle');
  const [reportingPhysicalSale, setReportingPhysicalSale] = useState(false);
  const [physicalSaleMsg, setPhysicalSaleMsg] = useState({ type: '', text: '' });

  // Add perfume to physical sale items list
  const handleAddProductToPhysicalSale = (prod) => {
    if (!prod) return;
    const existingIndex = physicalSaleItems.findIndex(item => item.productId === prod.id);
    const prices = getProductPrices(prod);
    const defaultPrice = physicalRoleUsed === 'mayorista' ? prices.finalWholesale : prices.finalDetalle;

    if (existingIndex >= 0) {
      const updated = [...physicalSaleItems];
      updated[existingIndex].quantity += 1;
      setPhysicalSaleItems(updated);
    } else {
      setPhysicalSaleItems(prev => [
        ...prev,
        {
          productId: prod.id,
          name: prod.name,
          brand: prod.brand,
          size: prod.size,
          barcode: prod.barcode || '',
          quantity: 1,
          pricePaid: defaultPrice,
          cost: prod.cost || 0,
          pricePromotional: prices.finalWholesale,
          pricePublic: prices.finalDetalle,
          availableStock: prod.availableStock !== undefined ? prod.availableStock : prod.stock
        }
      ]);
    }
  };

  const handleScanBarcodeOrSearch = (inputVal) => {
    const term = inputVal.trim().toLowerCase();
    if (!term) return;
    const matched = products.find(p => (p.barcode || '').trim().toLowerCase() === term) ||
                    products.find(p => (p.name || '').trim().toLowerCase().includes(term)) ||
                    products.find(p => (p.brand || '').trim().toLowerCase().includes(term));

    if (matched) {
      handleAddProductToPhysicalSale(matched);
      setBarcodeInput('');
    } else {
      setAssignBarcodeState({
        isOpen: true,
        scannedBarcode: inputVal.trim(),
        selectedProdId: products[0]?.id || '',
        targetContext: 'physical',
        isSaving: false,
        msg: ''
      });
      setBarcodeInput('');
    }
  };

  const handleSaveBarcodeAssignment = async () => {
    const { scannedBarcode, selectedProdId, targetContext } = assignBarcodeState;
    if (!scannedBarcode || !selectedProdId) return;

    setAssignBarcodeState(prev => ({ ...prev, isSaving: true, msg: '' }));
    const res = await updateProductBarcode(selectedProdId, scannedBarcode);
    if (res.success) {
      const prod = res.product || products.find(p => p.id === selectedProdId);
      if (prod) {
        if (targetContext === 'physical') {
          handleAddProductToPhysicalSale({ ...prod, barcode: scannedBarcode });
        } else if (targetContext === 'editOrder') {
          handleAddItemToEdit({ ...prod, barcode: scannedBarcode });
        }
      }
      setAssignBarcodeState({
        isOpen: false,
        scannedBarcode: '',
        selectedProdId: '',
        targetContext: 'physical',
        isSaving: false,
        msg: ''
      });
    } else {
      setAssignBarcodeState(prev => ({ ...prev, isSaving: false, msg: res.error || 'Error al guardar el código de barras' }));
    }
  };

  // Price rule validation helper (Requirement 6)
  // Retail price MUST be >= Wholesale price (pricePromotional)
  // Wholesale price MUST be >= Cost
  const validateItemPrice = (pricePaid, roleUsed, item) => {
    const pPaid = Number(pricePaid || 0);
    const cost = Number(item.cost || 0);
    const wholesalePrice = Number(item.pricePromotional || 0);

    if (roleUsed === 'detalle' && pPaid < wholesalePrice) {
      return `El precio al detalle (L. ${pPaid}) debe ser >= al precio de mayoreo (L. ${wholesalePrice}).`;
    }
    if (roleUsed === 'mayorista' && pPaid < cost) {
      return `El precio de mayoreo (L. ${pPaid}) debe ser >= al costo (L. ${cost}).`;
    }
    return null;
  };

  const handleUpdatePhysicalItemQty = (productId, newQty) => {
    if (newQty <= 0) {
      setPhysicalSaleItems(prev => prev.filter(i => i.productId !== productId));
    } else {
      setPhysicalSaleItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: newQty } : i));
    }
  };

  const handleUpdatePhysicalItemPrice = (productId, newPrice) => {
    setPhysicalSaleItems(prev => prev.map(i => i.productId === productId ? { ...i, pricePaid: newPrice } : i));
  };

  const handleRemovePhysicalItem = (productId) => {
    setPhysicalSaleItems(prev => prev.filter(i => i.productId !== productId));
  };

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
    if (physicalSaleItems.length === 0) {
      setPhysicalSaleMsg({ type: 'error', text: 'Por favor añade al menos un perfume a la venta.' });
      return;
    }

    // Validate price boundaries for all items (Requirement 6)
    for (const item of physicalSaleItems) {
      const err = validateItemPrice(item.pricePaid, physicalRoleUsed, item);
      if (err) {
        setPhysicalSaleMsg({ type: 'error', text: `Error en "${item.name}": ${err}` });
        return;
      }
      if (item.quantity > item.availableStock) {
        setPhysicalSaleMsg({ type: 'error', text: `La cantidad de "${item.name}" excede el stock disponible (${item.availableStock} u).` });
        return;
      }
    }

    setReportingPhysicalSale(true);
    setPhysicalSaleMsg({ type: '', text: '' });

    const result = await reportPhysicalSale(
      physicalSaleItems,
      physicalClientName.trim() || 'Venta Física (Mostrador)',
      physicalClientPhone.trim() || '',
      physicalBuyerId || null,
      physicalRoleUsed
    );

    setReportingPhysicalSale(false);

    if (result.success) {
      setPhysicalSaleMsg({ type: 'success', text: '¡Venta registrada exitosamente! Se descontó el inventario.' });
      setPhysicalSaleItems([]);
      setTimeout(() => {
        setShowPhysicalSaleModal(false);
      }, 1800);
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
    setPhysicalSaleItems([]);
    setBarcodeInput('');
    setPhysicalClientName('Venta Física (Mostrador)');
    setPhysicalClientPhone('');
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

  const getEditingOrderRole = () => {
    if (!editingOrder || !customers) return 'detalle';
    const cust = customers.find(c => c.id === editingOrder.buyerId);
    if (!cust) return 'detalle';
    const roleNorm = String(cust.role || '').toLowerCase();
    return roleNorm === 'mayorista' ? 'mayorista' : 'detalle';
  };

  const handleOpenEdit = async (order) => {
    if (!customers || customers.length === 0) {
      await fetchCustomers();
    }
    setEditingOrder(order);
    setEditClientName(order.clientName);
    setEditClientPhone(order.clientPhone);
    setEditItems(order.items.map(i => ({ ...i })));
    setEditBarcodeInput('');
  };

  const handleScanEditBarcodeOrSearch = (inputVal) => {
    const term = inputVal.trim().toLowerCase();
    if (!term) return;
    const matched = products.find(p => (p.barcode || '').trim().toLowerCase() === term) ||
                    products.find(p => (p.name || '').trim().toLowerCase().includes(term)) ||
                    products.find(p => (p.brand || '').trim().toLowerCase().includes(term));

    if (matched) {
      handleAddItemToEdit(matched);
      setEditBarcodeInput('');
    } else {
      setAssignBarcodeState({
        isOpen: true,
        scannedBarcode: inputVal.trim(),
        selectedProdId: products[0]?.id || '',
        targetContext: 'editOrder',
        isSaving: false,
        msg: ''
      });
      setEditBarcodeInput('');
    }
  };

  const handleUpdateItemQty = (productId, newQty) => {
    setEditItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const handleUpdateItemPrice = (productId, newPrice) => {
    setEditItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, pricePaid: newPrice };
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

    const orderRole = getEditingOrderRole();
    const prices = getProductPrices(product);
    const defaultPrice = orderRole === 'mayorista' ? prices.finalWholesale : prices.finalDetalle;

    setEditItems(prev => [...prev, {
      productId: product.id,
      name: product.name,
      brand: product.brand,
      size: product.size,
      quantity: 1,
      pricePaid: defaultPrice,
      cost: product.cost || 0,
      pricePromotional: prices.finalWholesale,
      pricePublic: prices.finalDetalle,
      description: product.description || ''
    }]);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editClientName || !editClientPhone || editItems.length === 0) return;

    const orderRole = getEditingOrderRole();
    for (const item of editItems) {
      const err = validateItemPrice(item.pricePaid, orderRole, item);
      if (err) {
        alert(`Error en "${item.name}": ${err}`);
        return;
      }
    }

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-5xl h-[90vh] max-h-[90vh] flex flex-col fade-in-up overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between flex-shrink-0">
              <h3 className="font-display font-bold text-neutral-900 dark:text-neutral-100 text-sm sm:text-base truncate pr-2">
                Editar Detalles de Orden: <span className="font-mono font-black text-xs sm:text-sm">{editingOrder.id}</span>
              </h3>
              <button onClick={() => setEditingOrder(null)} className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 cursor-pointer flex-shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
              
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
              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3 relative">
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                  Añadir Fragancia a la Orden (Por Código de Barras o Selección)
                </label>
                <div className="flex gap-2 relative">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={editBarcodeInput}
                      onChange={(e) => setEditBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleScanEditBarcodeOrSearch(editBarcodeInput);
                        }
                      }}
                      placeholder="Escribir nombre o marca para buscar..."
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-semibold outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400"
                    />
                    
                    {/* Autocomplete Dropdown overlay */}
                    {editBarcodeInput.trim().length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                        {products
                          .filter(p => {
                            const term = editBarcodeInput.toLowerCase();
                            return (p.name || '').toLowerCase().includes(term) ||
                                   (p.brand || '').toLowerCase().includes(term) ||
                                   (p.barcode || '').toLowerCase().includes(term);
                          })
                          .slice(0, 8)
                          .map(p => {
                            const stock = p.availableStock !== undefined ? p.availableStock : p.stock;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  handleAddItemToEdit(p);
                                  setEditBarcodeInput('');
                                }}
                                className="w-full text-left px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-between text-xs transition-colors cursor-pointer"
                              >
                                <div>
                                  <span className="font-extrabold text-neutral-900 dark:text-neutral-100 block">
                                    [{p.brand}] {p.name}
                                  </span>
                                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">
                                    Tamaño: {p.size} {p.barcode ? `| CB: ${p.barcode}` : ''}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-400">
                                    Stock: {stock} u
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        {products.filter(p => {
                          const term = editBarcodeInput.toLowerCase();
                          return (p.name || '').toLowerCase().includes(term) ||
                                 (p.brand || '').toLowerCase().includes(term) ||
                                 (p.barcode || '').toLowerCase().includes(term);
                        }).length === 0 && (
                          <div className="px-3 py-2.5 text-xs text-neutral-400 text-center">
                            No se encontraron resultados
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleScanEditBarcodeOrSearch(editBarcodeInput)}
                    className="px-3.5 py-2 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-850 dark:hover:bg-amber-300 text-white dark:text-neutral-950 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Añadir
                  </button>
                </div>
                
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
                  <option value="">-- O selecciona un perfume de la lista --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.brand}] {p.name} ({p.size}) {p.barcode ? `- Barcode: ${p.barcode}` : ''}
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
                  {editItems.map((item, idx) => {
                    const orderRole = getEditingOrderRole();
                    const err = validateItemPrice(item.pricePaid, orderRole, item);

                    return (
                      <div key={idx} className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                        err ? 'bg-rose-50/50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-800 rounded-xl' : ''
                      }`}>
                        <div className="flex-1 min-w-0">
                          <span className="font-extrabold text-neutral-900 dark:text-neutral-100 block truncate">{item.brand} {item.name}</span>
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5 block font-semibold">
                            Tamaño: {item.size}
                          </span>
                          {err && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                              ⚠️ {err}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 ml-auto w-full sm:w-auto justify-between sm:justify-end">
                          {/* Price edit (Sellers/Owners can edit) */}
                          <div className="flex flex-col">
                            <label className="text-[9px] font-bold text-neutral-400">Precio (L.)</label>
                            <input
                              type="number"
                              required
                              min="0"
                              value={item.pricePaid}
                              onChange={(e) => handleUpdateItemPrice(item.productId, e.target.value)}
                              className="w-20 px-2 py-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs font-mono font-bold outline-none"
                            />
                          </div>

                          {/* Quantity adjust */}
                          <div className="flex flex-col items-center">
                            <label className="text-[9px] font-bold text-neutral-400">Cant</label>
                            <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(item.productId, item.quantity - 1)}
                                className="px-2 py-0.5 text-xs font-bold text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="px-2 text-xs font-bold text-neutral-950 dark:text-neutral-100 font-mono min-w-[1.2rem] text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(item.productId, item.quantity + 1)}
                                className="px-2 py-0.5 text-xs font-bold text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Subtotal */}
                          <div className="text-right min-w-[4rem]">
                            <span className="text-[9px] font-bold text-neutral-400 block">Subtotal</span>
                            <span className="font-mono font-extrabold text-neutral-900 dark:text-amber-400 text-xs">
                              L. {(Number(item.pricePaid || 0) * Number(item.quantity || 1)).toLocaleString()}
                            </span>
                          </div>

                          {/* Trash */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="p-1 text-neutral-400 hover:text-red-600 dark:text-neutral-500 dark:hover:text-rose-400 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </form>

            <div className="p-5 sm:p-6 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between flex-shrink-0">
              <div className="text-left">
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block font-bold">Subtotal Estimado:</span>
                <span className="font-mono font-black text-neutral-950 dark:text-amber-400 text-base">
                  L. {editItems.reduce((acc, curr) => acc + (Number(curr.pricePaid || 0) * Number(curr.quantity || 1)), 0).toLocaleString()} HNL
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-5xl h-[90vh] max-h-[90vh] shadow-xl flex flex-col fade-in-up overflow-hidden">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-extrabold text-neutral-900 dark:text-neutral-50 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                Registrar Venta de Mostrador (Física - Múltiples Fragancias)
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
            <form onSubmit={handleReportPhysicalSaleSubmit} className="flex-1 flex flex-col overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              
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

              {/* Attach Buyer & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                    Vincular Perfil Registrado (Opcional)
                  </label>
                  <select
                    value={physicalBuyerId}
                    onChange={(e) => setPhysicalBuyerId(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-semibold outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-amber-400 transition-all text-neutral-800 dark:text-neutral-100 cursor-pointer"
                  >
                    <option value="">-- Cliente de paso --</option>
                    {(customers || []).map(cust => (
                      <option key={cust.id} value={cust.id}>
                        {cust.name} ({cust.phone || 'Sin tel'}) - {cust.role || 'detalle'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <span className="block font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                    Tarifa Aplicada
                  </span>
                  <label className="flex items-center gap-3 px-4 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-bold text-neutral-800 dark:text-neutral-200 cursor-pointer select-none hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all h-[38px]">
                    <input
                      type="checkbox"
                      checked={physicalRoleUsed === 'mayorista'}
                      onChange={(e) => {
                        const isWholesale = e.target.checked;
                        const newRole = isWholesale ? 'mayorista' : 'detalle';
                        setPhysicalRoleUsed(newRole);
                        // Update default prices in list
                        setPhysicalSaleItems(prev => prev.map(item => ({
                          ...item,
                          pricePaid: newRole === 'mayorista' ? (item.pricePromotional || item.pricePublic) : item.pricePublic
                        })));
                      }}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-extrabold text-neutral-800 dark:text-neutral-100">
                        ¿Es venta al mayoreo?
                      </span>
                    </div>
                  </label>
                </div>
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
                    placeholder="Ej. Venta de Mostrador / Juan Pérez"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-semibold outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-amber-400 transition-all text-neutral-800 dark:text-neutral-100"
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
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-semibold outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-amber-400 transition-all text-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </div>

              {/* Barcode / Quick Add Search Section */}
              <div className="space-y-2 relative">
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-[10px]">
                  📷 Escanear Código de Barras o Buscar Perfume
                </label>
                <div className="flex gap-2 relative">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleScanBarcodeOrSearch(barcodeInput);
                        }
                      }}
                      placeholder="Escribir nombre o marca para buscar..."
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono text-xs font-semibold outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-amber-400"
                    />
                    
                    {/* Autocomplete Dropdown overlay */}
                    {barcodeInput.trim().length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                        {products
                          .filter(p => {
                            const term = barcodeInput.toLowerCase();
                            return (p.name || '').toLowerCase().includes(term) ||
                                   (p.brand || '').toLowerCase().includes(term) ||
                                   (p.barcode || '').toLowerCase().includes(term);
                          })
                          .slice(0, 8)
                          .map(p => {
                            const stock = p.availableStock !== undefined ? p.availableStock : p.stock;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  handleAddProductToPhysicalSale(p);
                                  setBarcodeInput('');
                                }}
                                className="w-full text-left px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-between text-xs transition-colors cursor-pointer"
                              >
                                <div>
                                  <span className="font-extrabold text-neutral-900 dark:text-neutral-100 block">
                                    [{p.brand}] {p.name}
                                  </span>
                                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">
                                    Tamaño: {p.size} {p.barcode ? `| CB: ${p.barcode}` : ''}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-400">
                                    Stock: {stock} u
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        {products.filter(p => {
                          const term = barcodeInput.toLowerCase();
                          return (p.name || '').toLowerCase().includes(term) ||
                                 (p.brand || '').toLowerCase().includes(term) ||
                                 (p.barcode || '').toLowerCase().includes(term);
                        }).length === 0 && (
                          <div className="px-3 py-2.5 text-xs text-neutral-400 text-center">
                            No se encontraron resultados
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleScanBarcodeOrSearch(barcodeInput)}
                    className="px-4 py-2 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 font-bold rounded-xl cursor-pointer"
                  >
                    Añadir
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-neutral-400 font-semibold">
                    O selecciona de la lista:
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      const selected = products.find(p => p.id === e.target.value);
                      if (selected) {
                        handleAddProductToPhysicalSale(selected);
                      }
                    }}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-semibold outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-amber-400 transition-all text-neutral-800 dark:text-neutral-100 cursor-pointer"
                  >
                    <option value="">-- Hacer clic para seleccionar perfume del inventario --</option>
                    {products.map(prod => {
                      const stock = prod.availableStock !== undefined ? prod.availableStock : prod.stock;
                      const prices = getProductPrices(prod);
                      return (
                        <option key={prod.id} value={prod.id} disabled={stock <= 0}>
                          [{prod.brand}] {prod.name} ({prod.size}) - Stock: {stock} u - L. {prices.finalDetalle} (Púb) / L. {prices.finalWholesale} (May)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2 mt-3">
                <label className="block font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px] flex justify-between items-center">
                  <span>Perfumes Agregados ({physicalSaleItems.length})</span>
                  {physicalSaleItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPhysicalSaleItems([])}
                      className="text-rose-500 hover:underline text-[10px] lowercase cursor-pointer"
                    >
                      Vaciar lista
                    </button>
                  )}
                </label>

                {physicalSaleItems.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-neutral-400">
                    <p className="font-semibold">No has añadido perfumes a la venta física.</p>
                    <p className="text-[10px] mt-1">Escanea un código de barras o selecciona un perfume de la lista superior.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {physicalSaleItems.map((item) => {
                      const err = validateItemPrice(item.pricePaid, physicalRoleUsed, item);
                      const isOverStock = item.quantity > item.availableStock;

                      return (
                        <div
                          key={item.productId}
                          className={`p-3 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                            err || isOverStock
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                              : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-extrabold text-neutral-900 dark:text-neutral-100 block truncate">
                              [{item.brand}] {item.name}
                            </span>
                            <span className="text-[10px] text-neutral-400 block font-semibold">
                              {item.size} {item.barcode && `| Barcode: ${item.barcode}`} | Stock disp: {item.availableStock} u
                            </span>
                            {err && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                                ⚠️ {err}
                              </p>
                            )}
                            {isOverStock && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                                ⚠️ Excede el stock ({item.availableStock} disponibles).
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
                            {/* Price per item input */}
                            <div className="flex flex-col">
                              <label className="text-[9px] font-bold text-neutral-400">Precio (L.)</label>
                              <input
                                type="number"
                                required
                                min="0"
                                value={item.pricePaid}
                                onChange={(e) => handleUpdatePhysicalItemPrice(item.productId, e.target.value)}
                                className="w-20 px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs font-mono font-bold outline-none"
                              />
                            </div>

                            {/* Quantity control */}
                            <div className="flex flex-col items-center">
                              <label className="text-[9px] font-bold text-neutral-400">Cant</label>
                              <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900">
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePhysicalItemQty(item.productId, item.quantity - 1)}
                                  className="px-2 py-0.5 text-xs font-bold text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-2 text-xs font-bold font-mono min-w-[1.2rem] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePhysicalItemQty(item.productId, item.quantity + 1)}
                                  className="px-2 py-0.5 text-xs font-bold text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Subtotal */}
                            <div className="text-right min-w-[4rem]">
                              <span className="text-[9px] font-bold text-neutral-400 block">Subtotal</span>
                              <span className="font-mono font-extrabold text-neutral-900 dark:text-amber-400 text-xs">
                                L. {(Number(item.pricePaid || 0) * Number(item.quantity || 1)).toLocaleString()}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemovePhysicalItem(item.productId)}
                              className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Total Calculation Display */}
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/40 rounded-2xl flex items-center justify-between mt-2">
                <div>
                  <span className="block text-[10px] text-amber-800 dark:text-amber-500 font-extrabold uppercase tracking-widest font-mono">Total de la Venta</span>
                  <span className="block text-xs text-neutral-500">
                    {physicalSaleItems.reduce((acc, i) => acc + Number(i.quantity || 0), 0)} unidades en total
                  </span>
                </div>
                <span className="font-mono font-black text-amber-950 dark:text-amber-200 text-lg">
                  L. {physicalSaleItems.reduce((acc, i) => acc + (Number(i.pricePaid || 0) * Number(i.quantity || 1)), 0).toLocaleString()} HNL
                </span>
              </div>

              </div>

              {/* Form Footer Actions */}
              <div className="p-5 sm:p-6 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-100 dark:border-neutral-800 flex gap-2 justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPhysicalSaleModal(false)}
                  className="px-4 py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold rounded-xl cursor-pointer active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reportingPhysicalSale || physicalSaleItems.length === 0}
                  className="px-5 py-2.5 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-850 dark:hover:bg-amber-300 text-white dark:text-neutral-950 font-black rounded-xl cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  {reportingPhysicalSale ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Procesando...
                    </div>
                  ) : (
                    'Confirmar Venta y Descontar'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Assign Barcode Modal */}
      {assignBarcodeState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                🏷️ Asignar Código de Barras
              </h3>
              <button
                type="button"
                onClick={() => setAssignBarcodeState(prev => ({ ...prev, isOpen: false }))}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              El código de barras <span className="font-mono font-bold text-amber-600 dark:text-amber-400">"{assignBarcodeState.scannedBarcode}"</span> no está asignado. Selecciónalo en la lista para asociarlo al perfume y agregarlo a la venta.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Código de Barras Escaneado
                </label>
                <input
                  type="text"
                  value={assignBarcodeState.scannedBarcode}
                  onChange={(e) => setAssignBarcodeState(prev => ({ ...prev, scannedBarcode: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Seleccionar Perfume del Inventario
                </label>
                <select
                  value={assignBarcodeState.selectedProdId}
                  onChange={(e) => setAssignBarcodeState(prev => ({ ...prev, selectedProdId: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.brand}] {p.name} ({p.size}) {p.barcode ? `- CB actual: ${p.barcode}` : '- Sin CB'}
                    </option>
                  ))}
                </select>
              </div>

              {assignBarcodeState.msg && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-700 dark:text-red-300 rounded-xl text-xs font-semibold">
                  {assignBarcodeState.msg}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignBarcodeState(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-xs font-bold rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={assignBarcodeState.isSaving || !assignBarcodeState.selectedProdId || !assignBarcodeState.scannedBarcode}
                onClick={handleSaveBarcodeAssignment}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-bold rounded-xl shadow disabled:opacity-50"
              >
                {assignBarcodeState.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar y Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
