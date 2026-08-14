import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { 
  ClipboardList, Search, Edit2, Loader2, CheckCircle2, AlertCircle, 
  ShoppingBag, Eye, X, Plus, Trash2, Tag, Sparkles, AlertTriangle,
  UserPlus, Users, UserCheck
} from 'lucide-react';
import { getProductPrices } from '../utils/productHelper';

const DEFAULT_PROMO_RULES = [
  { id: 'promo_3000', name: 'Compra > L. 3,000 (5% desc)', minAmount: 3000, discountType: 'percentage', discountValue: 5 },
  { id: 'promo_5000', name: 'Compra > L. 5,000 (10% desc)', minAmount: 5000, discountType: 'percentage', discountValue: 10 },
  { id: 'promo_10000', name: 'Compra > L. 10,000 (15% desc)', minAmount: 10000, discountType: 'percentage', discountValue: 15 },
];

const calculateDiscountDetails = (items, roleUsed, discountMode, selectedPromoId, manualType, manualValue, promoRulesList) => {
  const retailSubtotal = items.reduce((acc, i) => {
    const qty = Number(i.quantity || 1);
    const pPublic = Number(i.pricePublic || i.pricePaid || 0);
    return acc + (pPublic * qty);
  }, 0);

  const wholesaleSubtotal = items.reduce((acc, i) => {
    const qty = Number(i.quantity || 1);
    const pPromotional = Number(i.pricePromotional || 0);
    return acc + (pPromotional * qty);
  }, 0);

  const costSubtotal = items.reduce((acc, i) => {
    const qty = Number(i.quantity || 1);
    const cost = Number(i.cost || 0);
    return acc + (cost * qty);
  }, 0);

  const rawSubtotal = roleUsed === 'mayorista' ? wholesaleSubtotal : retailSubtotal;
  const minAllowedTotal = roleUsed === 'mayorista' ? costSubtotal : wholesaleSubtotal;
  const maxDiscountAllowed = Math.max(0, rawSubtotal - minAllowedTotal);

  let requestedDiscount = 0;
  let promoAppliedName = '';
  let extraPercentageLabel = '';

  if (discountMode === 'promo') {
    const rule = promoRulesList.find(r => r.id === selectedPromoId);
    if (rule) {
      promoAppliedName = rule.name;
      if (rule.discountType === 'percentage') {
        const pct = Number(rule.discountValue || 0);
        requestedDiscount = retailSubtotal * (pct / 100);
        extraPercentageLabel = `${pct}% s/detalle`;
      } else {
        requestedDiscount = Number(rule.discountValue || 0);
      }
    }
  } else if (discountMode === 'manual') {
    const val = Number(manualValue || 0);
    if (manualType === 'percentage') {
      if (roleUsed === 'mayorista') {
        const addPct = val >= 25 ? (val - 25) : val;
        requestedDiscount = retailSubtotal * (addPct / 100);
        extraPercentageLabel = `${addPct}% adicional s/detalle (${25 + addPct}% total)`;
      } else {
        const detPct = Math.min(25, val);
        requestedDiscount = retailSubtotal * (detPct / 100);
        extraPercentageLabel = `${detPct}% s/detalle`;
      }
    } else {
      requestedDiscount = val;
    }
  }

  requestedDiscount = Math.max(0, requestedDiscount);
  const actualAppliedDiscount = Math.min(requestedDiscount, maxDiscountAllowed);
  const isCapped = requestedDiscount > maxDiscountAllowed && maxDiscountAllowed >= 0;
  const finalTotal = Math.max(minAllowedTotal, rawSubtotal - actualAppliedDiscount);

  // Check qualifying auto promos based on order subtotal
  const qualifyingPromos = (promoRulesList || [])
    .filter(r => rawSubtotal >= Number(r.minAmount || 0))
    .sort((a, b) => Number(b.minAmount) - Number(a.minAmount));

  return {
    rawSubtotal,
    retailSubtotal,
    wholesaleSubtotal,
    costSubtotal,
    minAllowedTotal,
    maxDiscountAllowed,
    requestedDiscount,
    actualAppliedDiscount,
    isCapped,
    finalTotal,
    promoAppliedName,
    extraPercentageLabel,
    qualifyingPromos
  };
};

const applyProportionalDiscountToItems = (items, roleUsed, actualAppliedDiscount, rawSubtotal) => {
  if (rawSubtotal <= 0 || actualAppliedDiscount <= 0) {
    return items;
  }

  return items.map(item => {
    const qty = Number(item.quantity || 1);
    const itemSubtotal = Number(item.pricePaid || 0) * qty;
    const ratio = itemSubtotal / rawSubtotal;
    const itemDiscount = actualAppliedDiscount * ratio;
    const discountedItemTotal = itemSubtotal - itemDiscount;
    const rawDiscountedUnitPrice = qty > 0 ? discountedItemTotal / qty : item.pricePaid;

    const minUnitPrice = roleUsed === 'mayorista' 
      ? Number(item.cost || 0) 
      : Number(item.pricePromotional || 0);

    const safeUnitPrice = Math.max(minUnitPrice, Math.round(rawDiscountedUnitPrice * 100) / 100);

    return {
      ...item,
      pricePaid: safeUnitPrice
    };
  });
};

export default function Orders() {
  const { 
    orders, products, updateOrderStatus, updateOrder, reportPhysicalSale, 
    loading: storeLoading, error: storeError, fetchCustomers, customers,
    updateProductBarcode, createCustomerManually
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  // Quick Create Customer Modal state
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [quickCustomerRole, setQuickCustomerRole] = useState('detalle');
  const [quickCustomerAddress, setQuickCustomerAddress] = useState('');
  const [quickCustomerEmail, setQuickCustomerEmail] = useState('');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [createCustomerMsg, setCreateCustomerMsg] = useState({ type: '', text: '' });

  // Promo rules state
  const [promoRules, setPromoRules] = useState(() => {
    try {
      const saved = localStorage.getItem('iconic_promo_rules');
      return saved ? JSON.parse(saved) : DEFAULT_PROMO_RULES;
    } catch {
      return DEFAULT_PROMO_RULES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('iconic_promo_rules', JSON.stringify(promoRules));
    } catch (err) {
      console.error('Error saving promo rules:', err);
    }
  }, [promoRules]);

  // Promo Manager modal state
  const [showPromoManagerModal, setShowPromoManagerModal] = useState(false);
  const [editingPromoRuleId, setEditingPromoRuleId] = useState(null);
  const [newPromoName, setNewPromoName] = useState('');
  const [newPromoMinAmount, setNewPromoMinAmount] = useState('');
  const [newPromoType, setNewPromoType] = useState('percentage');
  const [newPromoValue, setNewPromoValue] = useState('');

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
  const [editRoleUsed, setEditRoleUsed] = useState('detalle');
  const [editItems, setEditItems] = useState([]);
  const [editBarcodeInput, setEditBarcodeInput] = useState('');
  const [editDiscountMode, setEditDiscountMode] = useState('none');
  const [editSelectedPromoId, setEditSelectedPromoId] = useState('');
  const [editManualType, setEditManualType] = useState('percentage');
  const [editManualValue, setEditManualValue] = useState('');

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
  const [physicalDiscountMode, setPhysicalDiscountMode] = useState('none');
  const [physicalSelectedPromoId, setPhysicalSelectedPromoId] = useState('');
  const [physicalManualType, setPhysicalManualType] = useState('percentage');
  const [physicalManualValue, setPhysicalManualValue] = useState('');

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
          pricePublic: prices.pricePublic,
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

  const validateItemPrice = (pricePaid, roleUsed, item) => {
    if (item?.isRemate) return null;
    const pPaid = Number(pricePaid || 0);
    const cost = Number(item?.cost || 0);
    const wholesalePrice = Number(item?.pricePromotional || 0);

    if (roleUsed === 'detalle' && wholesalePrice > 0 && pPaid < wholesalePrice) {
      return `El precio al detalle (L. ${pPaid}) debe ser >= al precio de mayoreo (L. ${wholesalePrice}).`;
    }
    if (roleUsed === 'mayorista' && cost > 0 && pPaid < cost) {
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

  const handleSelectPhysicalBuyer = (buyerId) => {
    setPhysicalBuyerId(buyerId);
    if (buyerId && customers) {
      const cust = customers.find(c => c.id === buyerId);
      if (cust) {
        setPhysicalClientName(cust.name || 'Cliente');
        setPhysicalClientPhone(cust.phone || '');
        const roleNorm = String(cust.role || '').toLowerCase();
        const newRole = (roleNorm === 'mayorista') ? 'mayorista' : 'detalle';
        setPhysicalRoleUsed(newRole);
        setPhysicalSaleItems(prev => prev.map(i => ({
          ...i,
          pricePaid: newRole === 'mayorista' ? (i.pricePromotional || i.pricePaid) : (i.pricePublic || i.pricePaid)
        })));
      }
    } else if (!buyerId) {
      setPhysicalClientName('Venta Física (Mostrador)');
      setPhysicalClientPhone('');
    }
  };

  const handleSaveQuickCustomer = async (e) => {
    if (e) e.preventDefault();
    if (!quickCustomerName.trim() || !quickCustomerPhone.trim()) {
      setCreateCustomerMsg({ type: 'error', text: 'El nombre y número de teléfono son requeridos.' });
      return;
    }

    setIsSavingCustomer(true);
    setCreateCustomerMsg({ type: '', text: '' });

    const res = await createCustomerManually(
      quickCustomerName.trim(),
      quickCustomerRole,
      quickCustomerPhone.trim(),
      quickCustomerAddress.trim() || null,
      quickCustomerEmail.trim() || null
    );

    setIsSavingCustomer(false);

    if (res.success) {
      const newCust = res.data;
      setCreateCustomerMsg({ type: 'success', text: `¡Cliente "${quickCustomerName.trim()}" guardado exitosamente!` });

      // Auto-bind newly created customer if Physical Sale Modal is active
      if (showPhysicalSaleModal && newCust) {
        setPhysicalBuyerId(newCust.id);
        setPhysicalClientName(newCust.name || quickCustomerName.trim());
        setPhysicalClientPhone(newCust.phone || quickCustomerPhone.trim());
        setPhysicalRoleUsed(newCust.role || quickCustomerRole);
        setPhysicalSaleItems(prev => prev.map(i => ({
          ...i,
          pricePaid: (newCust.role || quickCustomerRole) === 'mayorista' ? (i.pricePromotional || i.pricePaid) : (i.pricePublic || i.pricePaid)
        })));
      }

      setTimeout(() => {
        setCreateCustomerMsg({ type: '', text: '' });
        setShowCreateCustomerModal(false);
      }, 1000);
    } else {
      setCreateCustomerMsg({ type: 'error', text: res.error || 'Error al guardar el cliente.' });
    }
  };

  const handleSaveCurrentPhysicalClientAsCustomer = async () => {
    if (!physicalClientName.trim() || physicalClientName === 'Venta Física (Mostrador)') {
      setPhysicalSaleMsg({ type: 'error', text: 'Ingresa un nombre de cliente válido para registrarlo.' });
      return;
    }
    if (!physicalClientPhone.trim()) {
      setPhysicalSaleMsg({ type: 'error', text: 'Ingresa un número de teléfono válido para registrar al cliente.' });
      return;
    }

    setReportingPhysicalSale(true);
    const res = await createCustomerManually(
      physicalClientName.trim(),
      physicalRoleUsed,
      physicalClientPhone.trim(),
      null,
      null
    );
    setReportingPhysicalSale(false);

    if (res.success) {
      if (res.data) {
        setPhysicalBuyerId(res.data.id);
      }
      setPhysicalSaleMsg({ type: 'success', text: `¡Cliente "${physicalClientName.trim()}" registrado y vinculado correctamente!` });
      setTimeout(() => setPhysicalSaleMsg({ type: '', text: '' }), 4000);
    } else {
      setPhysicalSaleMsg({ type: 'error', text: res.error || 'Error al registrar cliente.' });
    }
  };

  // Physical Sale Calculations
  const physicalDiscountDetails = useMemo(() => {
    return calculateDiscountDetails(
      physicalSaleItems,
      physicalRoleUsed,
      physicalDiscountMode,
      physicalSelectedPromoId,
      physicalManualType,
      physicalManualValue,
      promoRules
    );
  }, [physicalSaleItems, physicalRoleUsed, physicalDiscountMode, physicalSelectedPromoId, physicalManualType, physicalManualValue, promoRules]);

  const handleReportPhysicalSaleSubmit = async (e) => {
    e.preventDefault();
    if (physicalSaleItems.length === 0) {
      setPhysicalSaleMsg({ type: 'error', text: 'Por favor añade al menos un perfume a la venta.' });
      return;
    }

    const discountedItems = applyProportionalDiscountToItems(
      physicalSaleItems,
      physicalRoleUsed,
      physicalDiscountDetails.actualAppliedDiscount,
      physicalDiscountDetails.rawSubtotal
    );

    for (const item of discountedItems) {
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
      discountedItems,
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

  const handleOpenPhysicalSale = async () => {
    if (!customers || customers.length === 0) {
      await fetchCustomers();
    }
    setPhysicalSaleItems([]);
    setBarcodeInput('');
    setPhysicalClientName('Venta Física (Mostrador)');
    setPhysicalClientPhone('');
    setPhysicalBuyerId('');
    setPhysicalRoleUsed('detalle');
    setPhysicalDiscountMode('none');
    setPhysicalSelectedPromoId('');
    setPhysicalManualType('percentage');
    setPhysicalManualValue('');
    setPhysicalSaleMsg({ type: '', text: '' });
    setShowPhysicalSaleModal(true);
  };

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

  const getEditingOrderRole = (targetOrder = editingOrder) => {
    if (!targetOrder) return 'detalle';
    const savedRole = String(targetOrder.roleUsed || '').toLowerCase();
    if (savedRole === 'mayorista') return 'mayorista';
    if (savedRole === 'detalle') return 'detalle';

    if (customers && targetOrder.buyerId) {
      const cust = customers.find(c => c.id === targetOrder.buyerId);
      if (cust) {
        const roleNorm = String(cust.role || '').toLowerCase();
        if (roleNorm === 'mayorista') return 'mayorista';
      }
    }
    return 'detalle';
  };

  const handleOpenEdit = async (order) => {
    if (!customers || customers.length === 0) {
      await fetchCustomers();
    }
    setEditingOrder(order);
    setEditClientName(order.clientName);
    setEditClientPhone(order.clientPhone);
    const initialRole = getEditingOrderRole(order);
    setEditRoleUsed(initialRole);

    const enrichedItems = (order.items || []).map(item => {
      const prod = products.find(p => p.id === item.productId || p.name === item.name);
      let pPublic = item.pricePublic;
      let pPromotional = item.pricePromotional;
      let cost = item.cost;

      if (prod) {
        const prices = getProductPrices(prod);
        pPublic = prices.pricePublic;
        pPromotional = prices.baseWholesale || prices.finalWholesale;
        if (!cost) cost = prod.cost || 0;
      } else {
        if (!pPublic || pPublic === item.pricePaid) {
          if (initialRole === 'mayorista') {
            pPublic = Math.round(item.pricePaid / 0.75);
            pPromotional = item.pricePaid;
          } else {
            pPublic = item.pricePaid || 0;
            pPromotional = Math.round((item.pricePaid || 0) * 0.75);
          }
        } else if (!pPromotional) {
          pPromotional = Math.round(pPublic * 0.75);
        }
        if (!cost) cost = 0;
      }

      return {
        ...item,
        pricePublic: pPublic,
        pricePromotional: pPromotional,
        cost: cost
      };
    });

    setEditItems(enrichedItems);
    setEditBarcodeInput('');
    setEditDiscountMode('none');
    setEditSelectedPromoId('');
    setEditManualType('percentage');
    setEditManualValue('');
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

    const prices = getProductPrices(product);
    const defaultPrice = editRoleUsed === 'mayorista' ? prices.finalWholesale : prices.finalDetalle;

    setEditItems(prev => [...prev, {
      productId: product.id,
      name: product.name,
      brand: product.brand,
      size: product.size,
      quantity: 1,
      pricePaid: defaultPrice,
      cost: product.cost || 0,
      pricePromotional: prices.finalWholesale,
      pricePublic: prices.pricePublic,
      description: product.description || ''
    }]);
  };

  const editDiscountDetails = useMemo(() => {
    return calculateDiscountDetails(
      editItems,
      editRoleUsed,
      editDiscountMode,
      editSelectedPromoId,
      editManualType,
      editManualValue,
      promoRules
    );
  }, [editItems, editRoleUsed, editDiscountMode, editSelectedPromoId, editManualType, editManualValue, promoRules]);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editClientName || !editClientPhone || editItems.length === 0) return;

    const discountedItems = applyProportionalDiscountToItems(
      editItems,
      editRoleUsed,
      editDiscountDetails.actualAppliedDiscount,
      editDiscountDetails.rawSubtotal
    );

    for (const item of discountedItems) {
      const err = validateItemPrice(item.pricePaid, editRoleUsed, item);
      if (err) {
        alert(`Error en "${item.name}": ${err}`);
        return;
      }
    }

    const ok = await updateOrder(editingOrder.id, editClientName.trim(), editClientPhone.trim(), discountedItems, editRoleUsed);
    if (ok) {
      setEditingOrder(null);
    }
  };

  const handleSavePromoRule = (e) => {
    e.preventDefault();
    if (!newPromoName.trim() || !newPromoMinAmount || !newPromoValue) return;

    if (editingPromoRuleId) {
      setPromoRules(prev => prev.map(r => {
        if (r.id === editingPromoRuleId) {
          return {
            ...r,
            name: newPromoName.trim(),
            minAmount: Number(newPromoMinAmount),
            discountType: newPromoType,
            discountValue: Number(newPromoValue)
          };
        }
        return r;
      }));
      setEditingPromoRuleId(null);
    } else {
      const newRule = {
        id: 'promo_' + Date.now(),
        name: newPromoName.trim(),
        minAmount: Number(newPromoMinAmount),
        discountType: newPromoType,
        discountValue: Number(newPromoValue)
      };
      setPromoRules(prev => [...prev, newRule]);
    }

    setNewPromoName('');
    setNewPromoMinAmount('');
    setNewPromoValue('');
    setNewPromoType('percentage');
  };

  const handleStartEditPromoRule = (rule) => {
    setEditingPromoRuleId(rule.id);
    setNewPromoName(rule.name);
    setNewPromoMinAmount(rule.minAmount);
    setNewPromoType(rule.discountType || 'percentage');
    setNewPromoValue(rule.discountValue);
  };

  const handleCancelEditPromoRule = () => {
    setEditingPromoRuleId(null);
    setNewPromoName('');
    setNewPromoMinAmount('');
    setNewPromoValue('');
    setNewPromoType('percentage');
  };

  const handleDeletePromoRule = (ruleId) => {
    if (editingPromoRuleId === ruleId) {
      handleCancelEditPromoRule();
    }
    setPromoRules(prev => prev.filter(r => r.id !== ruleId));
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
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => {
              setQuickCustomerName('');
              setQuickCustomerPhone('');
              setQuickCustomerRole('detalle');
              setQuickCustomerAddress('');
              setQuickCustomerEmail('');
              setCreateCustomerMsg({ type: '', text: '' });
              setShowCreateCustomerModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
            title="Registrar un nuevo cliente manualmente"
          >
            <UserPlus className="w-4 h-4" /> Nuevo Cliente
          </button>
          <button
            type="button"
            onClick={() => setShowPromoManagerModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
            title="Configurar promociones por total de compra"
          >
            <Tag className="w-4 h-4 text-amber-500" /> Promociones
          </button>
          <button
            type="button"
            onClick={handleOpenPhysicalSale}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-neutral-950 dark:bg-amber-400 hover:bg-neutral-850 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 uppercase tracking-wider shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Registrar Venta Física
          </button>
        </div>
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
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-neutral-400">
                    <ShoppingBag className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    No se encontraron órdenes registradas.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                        {order.id}
                      </div>
                      <div className="text-[10px] text-neutral-400 dark:text-neutral-500">
                        {order.date}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-neutral-900 dark:text-neutral-100">{order.clientName}</div>
                      <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{order.clientPhone}</span>
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                          order.roleUsed === 'mayorista'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                        }`}>
                          {order.roleUsed === 'mayorista' ? 'Mayoreo' : 'Detalle'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-extrabold text-neutral-900 dark:text-amber-400">
                      L. {order.total.toLocaleString()} HNL
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-neutral-500 dark:text-neutral-400 text-xs">
                      {order.items?.length || 0} fragancia(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold outline-none cursor-pointer border transition-all ${
                          order.status === 'entregado'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : order.status === 'cancelado'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        <option value="pendiente">Pendiente 🕒</option>
                        <option value="entregado">Entregado ✓</option>
                        <option value="cancelado">Cancelado ✕</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => setViewingOrder(order)}
                        className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(order)}
                        className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                        title="Editar orden"
                      >
                        <Edit2 className="h-4 w-4" />
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
      {viewingOrder && createPortal(
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                <div>
                  <span className="text-neutral-400 dark:text-neutral-500 font-bold block mb-1">Cliente</span>
                  <span className="text-neutral-900 dark:text-neutral-100 font-extrabold">{viewingOrder.clientName}</span>
                </div>
                <div>
                  <span className="text-neutral-400 dark:text-neutral-500 font-bold block mb-1">Teléfono</span>
                  <span className="text-neutral-900 dark:text-neutral-100 font-mono font-extrabold">{viewingOrder.clientPhone}</span>
                </div>
                <div>
                  <span className="text-neutral-400 dark:text-neutral-500 font-bold block mb-1">Tarifa Aplicada</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    viewingOrder.roleUsed === 'mayorista'
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                  }`}>
                    {viewingOrder.roleUsed === 'mayorista' ? 'Mayoreo' : 'Detalle'}
                  </span>
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
                          Tamaño: {item.size} | {item.quantity} pzs c/u @ L. {item.pricePaid?.toLocaleString()}
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
        </div>,
        document.body
      )}

      {/* Edit Order Modal */}
      {editingOrder && createPortal(
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

            <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto text-xs">
              
              {/* Cliente info & Tarifa fields */}
              <div className="grid gap-4 sm:grid-cols-3">
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
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 block">
                    Tarifa Aplicada
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditRoleUsed('detalle');
                        setEditItems(prev => prev.map(i => ({ ...i, pricePaid: i.pricePublic || i.pricePaid })));
                      }}
                      className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        editRoleUsed === 'detalle'
                          ? 'bg-neutral-950 dark:bg-amber-400 text-white dark:text-neutral-950 border-transparent shadow-xs'
                          : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100'
                      }`}
                    >
                      Detalle
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditRoleUsed('mayorista');
                        setEditItems(prev => prev.map(i => ({ ...i, pricePaid: i.pricePromotional || i.pricePaid })));
                      }}
                      className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        editRoleUsed === 'mayorista'
                          ? 'bg-neutral-950 dark:bg-amber-400 text-white dark:text-neutral-950 border-transparent shadow-xs'
                          : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100'
                      }`}
                    >
                      Mayoreo
                    </button>
                  </div>
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
                    className="px-4 py-2 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 font-bold rounded-xl text-xs cursor-pointer shrink-0"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* Items List in Edit */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                  Items en la Orden ({editItems.length})
                </label>

                {editItems.length === 0 ? (
                  <div className="p-4 text-center text-neutral-400 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
                    No hay ítems en esta orden. Usa la búsqueda superior para añadir fragancias.
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900">
                    {editItems.map((item, idx) => {
                      const orderRole = editRoleUsed;
                      const priceErr = validateItemPrice(item.pricePaid, orderRole, item);

                      return (
                        <div key={idx} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <span className="font-extrabold text-neutral-900 dark:text-neutral-100 block text-xs truncate">
                              [{item.brand}] {item.name}
                            </span>
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">
                              Tamaño: {item.size} | Detalle: L. {item.pricePublic} | Mayoreo: L. {item.pricePromotional}
                            </span>
                            {priceErr && (
                              <span className="text-[10px] text-rose-500 font-bold block">
                                ⚠️ {priceErr}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                            {/* Price field */}
                            <div>
                              <label className="text-[9px] font-bold text-neutral-400 block text-center">Precio C/U</label>
                              <div className="flex items-center">
                                <span className="text-xs font-mono font-bold text-neutral-400 mr-1">L.</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.pricePaid}
                                  onChange={(e) => handleUpdateItemPrice(item.productId, Number(e.target.value))}
                                  className="w-20 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg font-mono font-bold text-xs text-right outline-none focus:ring-1 focus:ring-amber-400"
                                />
                              </div>
                            </div>

                            {/* Quantity buttons */}
                            <div>
                              <label className="text-[9px] font-bold text-neutral-400 block text-center">Cant</label>
                              <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(item.productId, item.quantity - 1)}
                                  className="px-2 py-1 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-2 text-xs font-mono font-bold min-w-[1.2rem] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(item.productId, item.quantity + 1)}
                                  className="px-2 py-1 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
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
                              onClick={() => handleRemoveItem(item.productId)}
                              className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg cursor-pointer"
                              title="Eliminar item"
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

              {/* Discount Section in Edit Order */}
              {editItems.length > 0 && (
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-500" /> Descuentos y Promociones
                    </span>
                    {editDiscountDetails.qualifyingPromos.length > 0 && editDiscountMode !== 'promo' && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        ¡Califica para {editDiscountDetails.qualifyingPromos[0].name}!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditDiscountMode('none')}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        editDiscountMode === 'none'
                          ? 'bg-neutral-900 text-white dark:bg-amber-400 dark:text-neutral-950 border-transparent shadow'
                          : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      Sin Descuento
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditDiscountMode('promo');
                        if (editDiscountDetails.qualifyingPromos.length > 0) {
                          setEditSelectedPromoId(editDiscountDetails.qualifyingPromos[0].id);
                        } else if (promoRules.length > 0) {
                          setEditSelectedPromoId(promoRules[0].id);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        editDiscountMode === 'promo'
                          ? 'bg-neutral-900 text-white dark:bg-amber-400 dark:text-neutral-950 border-transparent shadow'
                          : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      Promoción por Compra
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditDiscountMode('manual')}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        editDiscountMode === 'manual'
                          ? 'bg-neutral-900 text-white dark:bg-amber-400 dark:text-neutral-950 border-transparent shadow'
                          : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      Descuento Manual
                    </button>
                  </div>

                  {editDiscountMode === 'promo' && (
                    <div className="space-y-2 pt-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        Seleccionar Regla de Promoción
                      </label>
                      <select
                        value={editSelectedPromoId}
                        onChange={(e) => setEditSelectedPromoId(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-100 outline-none cursor-pointer"
                      >
                        {promoRules.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name} (Min. L. {Number(r.minAmount).toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {editDiscountMode === 'manual' && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                            Tipo de Descuento
                          </label>
                          <select
                            value={editManualType}
                            onChange={(e) => setEditManualType(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-100 outline-none cursor-pointer"
                          >
                            <option value="percentage">Porcentaje (%)</option>
                            <option value="fixed">Monto Fijo (L.)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                            {editManualType === 'percentage'
                              ? (editRoleUsed === 'mayorista' ? 'Adicional / Total s/Detalle (%)' : 'Porcentaje s/Detalle (máx 25%)')
                              : 'Valor del Descuento'
                            }
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={editManualValue}
                            onChange={(e) => setEditManualValue(e.target.value)}
                            placeholder={editManualType === 'percentage' 
                              ? (editRoleUsed === 'mayorista' ? 'Ej: 5 (5% extra = 30% total)' : 'Ej: 10 (10% desc. detalle)')
                              : 'Ej: 200'
                            }
                            className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold text-neutral-800 dark:text-neutral-100 outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl text-[11px] text-neutral-600 dark:text-neutral-300">
                        {editRoleUsed === 'mayorista' ? (
                          <span>
                            💡 <strong>Tarifa Mayorista:</strong> La tarifa base ya incluye 25% de descuento sobre detalle. Descuentos adicionales son sobre precio al detalle (Piso: Costo total L. {editDiscountDetails.costSubtotal.toLocaleString()}).
                            {editManualType === 'percentage' && editManualValue && (
                              <span className="block mt-1 font-bold text-amber-600 dark:text-amber-400">
                                {Number(editManualValue) >= 25 
                                  ? `Equivale a 25% base + ${Number(editManualValue) - 25}% adicional s/detalle (-L. ${(editDiscountDetails.retailSubtotal * ((Number(editManualValue) - 25) / 100)).toLocaleString()}). Total desc. s/detalle: ${editManualValue}%.`
                                  : `${editManualValue}% adicional s/detalle = -L. ${(editDiscountDetails.retailSubtotal * (Number(editManualValue) / 100)).toLocaleString()}. Total desc. s/detalle: ${25 + Number(editManualValue)}%.`
                                }
                              </span>
                            )}
                          </span>
                        ) : (
                          <span>
                            💡 <strong>Tarifa Detalle:</strong> Todo porcentaje de descuento es sobre precio al detalle. Máximo descuento permitido: <strong>25%</strong> (Piso: Tarifa Mayoreo L. {editDiscountDetails.wholesaleSubtotal.toLocaleString()}).
                            {editManualType === 'percentage' && editManualValue && (
                              <span className="block mt-1 font-bold text-amber-600 dark:text-amber-400">
                                {Number(editManualValue) > 25 
                                  ? `El descuento máximo a detalle es 25%. Se aplicará el 25% (-L. ${(editDiscountDetails.retailSubtotal * 0.25).toLocaleString()}).`
                                  : `Descuento de ${editManualValue}% s/detalle = -L. ${(editDiscountDetails.retailSubtotal * (Number(editManualValue) / 100)).toLocaleString()}.`
                                }
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {editDiscountDetails.isCapped && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Límite de Descuento Aplicado</span>
                        <span className="text-[11px]">
                          {editRoleUsed === 'mayorista'
                            ? `El descuento solicitado excede el margen permitido. Se limitó a L. ${editDiscountDetails.maxDiscountAllowed.toLocaleString()} para asegurar que el total no baje del costo total (L. ${editDiscountDetails.minAllowedTotal.toLocaleString()}).`
                            : `El descuento solicitado excede el margen permitido. Se limitó a L. ${editDiscountDetails.maxDiscountAllowed.toLocaleString()} para asegurar que el total no baje del precio de mayoreo total (L. ${editDiscountDetails.minAllowedTotal.toLocaleString()}).`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </form>

            <div className="p-5 sm:p-6 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between flex-shrink-0">
              <div className="text-left">
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block font-bold">
                  Base Detalle: L. {editDiscountDetails.retailSubtotal.toLocaleString()} | Subtotal {editRoleUsed === 'mayorista' ? 'Mayoreo' : 'Detalle'}: L. {editDiscountDetails.rawSubtotal.toLocaleString()}
                </span>
                {editDiscountDetails.actualAppliedDiscount > 0 && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">
                    Descuento Aplicado (s/detalle): - L. {editDiscountDetails.actualAppliedDiscount.toLocaleString()}
                  </span>
                )}
                <span className="font-mono font-black text-neutral-950 dark:text-amber-400 text-base">
                  Total: L. {editDiscountDetails.finalTotal.toLocaleString()} HNL
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
        </div>,
        document.body
      )}

      {/* Manual / Physical Counter Sale Modal */}
      {showPhysicalSaleModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-5xl h-[90vh] max-h-[90vh] shadow-xl flex flex-col fade-in-up overflow-hidden my-auto">
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
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                      Vincular Perfil Registrado (Opcional)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickCustomerName(physicalClientName !== 'Venta Física (Mostrador)' ? physicalClientName : '');
                        setQuickCustomerPhone(physicalClientPhone);
                        setQuickCustomerRole(physicalRoleUsed);
                        setQuickCustomerAddress('');
                        setQuickCustomerEmail('');
                        setCreateCustomerMsg({ type: '', text: '' });
                        setShowCreateCustomerModal(true);
                      }}
                      className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Crear un nuevo cliente e ingresar sus datos"
                    >
                      <UserPlus className="w-3 h-3" /> + Crear Nuevo Cliente
                    </button>
                  </div>
                  <select
                    value={physicalBuyerId}
                    onChange={(e) => handleSelectPhysicalBuyer(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-semibold outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-amber-400 transition-all text-neutral-800 dark:text-neutral-100 cursor-pointer"
                  >
                    <option value="">Ninguno (Cliente General Mostrador)</option>
                    {(customers || []).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.role === 'mayorista' ? 'Mayorista' : 'Cliente Detalle'}) - {c.phone || 'Sin tel'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                    Tipo de Tarifa Aplicada
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPhysicalRoleUsed('detalle');
                        setPhysicalSaleItems(prev => prev.map(i => ({ ...i, pricePaid: i.pricePublic })));
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                        physicalRoleUsed === 'detalle'
                          ? 'bg-neutral-950 dark:bg-amber-400 text-white dark:text-neutral-950 border-transparent shadow-xs'
                          : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      Detalle (Público)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhysicalRoleUsed('mayorista');
                        setPhysicalSaleItems(prev => prev.map(i => ({ ...i, pricePaid: i.pricePromotional })));
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                        physicalRoleUsed === 'mayorista'
                          ? 'bg-neutral-950 dark:bg-amber-400 text-white dark:text-neutral-950 border-transparent shadow-xs'
                          : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      Mayorista (Especial)
                    </button>
                  </div>
                </div>
              </div>

              {/* Client Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Nombre del Cliente</label>
                  <input
                    type="text"
                    required
                    value={physicalClientName}
                    onChange={(e) => setPhysicalClientName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-semibold outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-amber-400 transition-all text-neutral-800 dark:text-neutral-100"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Teléfono (Opcional)</label>
                    {!physicalBuyerId && physicalClientName.trim() && physicalClientName !== 'Venta Física (Mostrador)' && (
                      <button
                        type="button"
                        onClick={handleSaveCurrentPhysicalClientAsCustomer}
                        className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        title="Guardar este cliente en el sistema"
                      >
                        <UserPlus className="w-2.5 h-2.5" /> Registrar en Clientes
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={physicalClientPhone}
                    onChange={(e) => setPhysicalClientPhone(e.target.value)}
                    placeholder="Ej. +504 9999-9999"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono font-semibold outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-amber-400 transition-all text-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </div>

              {/* Add Perfumes Section */}
              <div className="space-y-2 pt-2">
                <label className="block font-extrabold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[10px]">
                  Escanear o Buscar Perfumes para la Venta
                </label>
                
                <div className="relative flex gap-2">
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
                      placeholder="Escanear código de barras o buscar por nombre/marca..."
                      className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400"
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
                    className="px-4 py-2.5 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-850 dark:hover:bg-amber-300 text-white dark:text-neutral-950 font-bold rounded-xl text-xs cursor-pointer shrink-0"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* Items Table in Physical Sale */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                  Perfumes Seleccionados ({physicalSaleItems.length})
                </label>

                {physicalSaleItems.length === 0 ? (
                  <div className="p-6 text-center text-neutral-400 bg-neutral-50 dark:bg-neutral-950/50 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-1">
                    <ShoppingBag className="mx-auto h-6 w-6 text-neutral-400 opacity-60" />
                    <p className="font-bold text-xs">No has agregado fragancias a la venta</p>
                    <p className="text-[10px]">Usa el buscador o escáner para añadir los perfumes del cliente.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900">
                    {physicalSaleItems.map((item) => {
                      const priceErr = validateItemPrice(item.pricePaid, physicalRoleUsed, item);

                      return (
                        <div key={item.productId} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <span className="font-extrabold text-neutral-900 dark:text-neutral-100 block text-xs truncate">
                              [{item.brand}] {item.name}
                            </span>
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">
                              Tamaño: {item.size} | Stock disp: {item.availableStock} u
                            </span>
                            {priceErr && (
                              <span className="text-[10px] text-rose-500 font-bold block">
                                ⚠️ {priceErr}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                            {/* Price field */}
                            <div>
                              <label className="text-[9px] font-bold text-neutral-400 block text-center">Precio C/U</label>
                              <div className="flex items-center">
                                <span className="text-xs font-mono font-bold text-neutral-400 mr-1">L.</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.pricePaid}
                                  onChange={(e) => handleUpdatePhysicalItemPrice(item.productId, Number(e.target.value))}
                                  className="w-20 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg font-mono font-bold text-xs text-right outline-none focus:ring-1 focus:ring-amber-400"
                                />
                              </div>
                            </div>

                            {/* Quantity buttons */}
                            <div>
                              <label className="text-[9px] font-bold text-neutral-400 block text-center">Cant</label>
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

              {/* Discount Section in Physical Sale */}
              {physicalSaleItems.length > 0 && (
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-500" /> Descuentos y Promociones
                    </span>
                    {physicalDiscountDetails.qualifyingPromos.length > 0 && physicalDiscountMode !== 'promo' && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        ¡Califica para {physicalDiscountDetails.qualifyingPromos[0].name}!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPhysicalDiscountMode('none')}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        physicalDiscountMode === 'none'
                          ? 'bg-neutral-900 text-white dark:bg-amber-400 dark:text-neutral-950 border-transparent shadow'
                          : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      Sin Descuento
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhysicalDiscountMode('promo');
                        if (physicalDiscountDetails.qualifyingPromos.length > 0) {
                          setPhysicalSelectedPromoId(physicalDiscountDetails.qualifyingPromos[0].id);
                        } else if (promoRules.length > 0) {
                          setPhysicalSelectedPromoId(promoRules[0].id);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        physicalDiscountMode === 'promo'
                          ? 'bg-neutral-900 text-white dark:bg-amber-400 dark:text-neutral-950 border-transparent shadow'
                          : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      Promoción por Compra
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhysicalDiscountMode('manual')}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        physicalDiscountMode === 'manual'
                          ? 'bg-neutral-900 text-white dark:bg-amber-400 dark:text-neutral-950 border-transparent shadow'
                          : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      Descuento Manual
                    </button>
                  </div>

                  {physicalDiscountMode === 'promo' && (
                    <div className="space-y-2 pt-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        Seleccionar Regla de Promoción
                      </label>
                      <select
                        value={physicalSelectedPromoId}
                        onChange={(e) => setPhysicalSelectedPromoId(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-100 outline-none cursor-pointer"
                      >
                        {promoRules.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name} (Min. L. {Number(r.minAmount).toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {physicalDiscountMode === 'manual' && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                            Tipo de Descuento
                          </label>
                          <select
                            value={physicalManualType}
                            onChange={(e) => setPhysicalManualType(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-100 outline-none cursor-pointer"
                          >
                            <option value="percentage">Porcentaje (%)</option>
                            <option value="fixed">Monto Fijo (L.)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                            {physicalManualType === 'percentage'
                              ? (physicalRoleUsed === 'mayorista' ? 'Adicional / Total s/Detalle (%)' : 'Porcentaje s/Detalle (máx 25%)')
                              : 'Valor del Descuento'
                            }
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={physicalManualValue}
                            onChange={(e) => setPhysicalManualValue(e.target.value)}
                            placeholder={physicalManualType === 'percentage' 
                              ? (physicalRoleUsed === 'mayorista' ? 'Ej: 5 (5% extra = 30% total)' : 'Ej: 10 (10% desc. detalle)')
                              : 'Ej: 200'
                            }
                            className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold text-neutral-800 dark:text-neutral-100 outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl text-[11px] text-neutral-600 dark:text-neutral-300">
                        {physicalRoleUsed === 'mayorista' ? (
                          <span>
                            💡 <strong>Tarifa Mayorista:</strong> La tarifa base ya incluye 25% de descuento sobre detalle. Descuentos adicionales son sobre precio al detalle (Piso: Costo total L. {physicalDiscountDetails.costSubtotal.toLocaleString()}).
                            {physicalManualType === 'percentage' && physicalManualValue && (
                              <span className="block mt-1 font-bold text-amber-600 dark:text-amber-400">
                                {Number(physicalManualValue) >= 25 
                                  ? `Equivale a 25% base + ${Number(physicalManualValue) - 25}% adicional s/detalle (-L. ${(physicalDiscountDetails.retailSubtotal * ((Number(physicalManualValue) - 25) / 100)).toLocaleString()}). Total desc. s/detalle: ${physicalManualValue}%.`
                                  : `${physicalManualValue}% adicional s/detalle = -L. ${(physicalDiscountDetails.retailSubtotal * (Number(physicalManualValue) / 100)).toLocaleString()}. Total desc. s/detalle: ${25 + Number(physicalManualValue)}%.`
                                }
                              </span>
                            )}
                          </span>
                        ) : (
                          <span>
                            💡 <strong>Tarifa Detalle:</strong> Todo porcentaje de descuento es sobre precio al detalle. Máximo descuento permitido: <strong>25%</strong> (Piso: Tarifa Mayoreo L. {physicalDiscountDetails.wholesaleSubtotal.toLocaleString()}).
                            {physicalManualType === 'percentage' && physicalManualValue && (
                              <span className="block mt-1 font-bold text-amber-600 dark:text-amber-400">
                                {Number(physicalManualValue) > 25 
                                  ? `El descuento máximo a detalle es 25%. Se aplicará el 25% (-L. ${(physicalDiscountDetails.retailSubtotal * 0.25).toLocaleString()}).`
                                  : `Descuento de ${physicalManualValue}% s/detalle = -L. ${(physicalDiscountDetails.retailSubtotal * (Number(physicalManualValue) / 100)).toLocaleString()}.`
                                }
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {physicalDiscountDetails.isCapped && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Límite de Descuento Aplicado</span>
                        <span className="text-[11px]">
                          {physicalRoleUsed === 'mayorista'
                            ? `El descuento solicitado excede el margen permitido. Se limitó a L. ${physicalDiscountDetails.maxDiscountAllowed.toLocaleString()} para asegurar que el total no baje del costo total (L. ${physicalDiscountDetails.minAllowedTotal.toLocaleString()}).`
                            : `El descuento solicitado excede el margen permitido. Se limitó a L. ${physicalDiscountDetails.maxDiscountAllowed.toLocaleString()} para asegurar que el total no baje del precio de mayoreo total (L. ${physicalDiscountDetails.minAllowedTotal.toLocaleString()}).`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Total Calculation Display */}
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/40 rounded-2xl flex flex-col gap-1.5 mt-2">
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span>Subtotal {physicalRoleUsed === 'mayorista' ? 'Mayoreo (25% desc. base)' : 'Detalle'}:</span>
                  <span className="font-mono font-bold">L. {physicalDiscountDetails.rawSubtotal.toLocaleString()} HNL</span>
                </div>
                {physicalRoleUsed === 'mayorista' && (
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span>(Subtotal Base al Detalle: L. {physicalDiscountDetails.retailSubtotal.toLocaleString()} HNL)</span>
                  </div>
                )}
                {physicalDiscountDetails.actualAppliedDiscount > 0 && (
                  <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-bold">
                    <span>Descuento {physicalRoleUsed === 'mayorista' ? 'Adicional' : ''} Aplicado {physicalDiscountDetails.promoAppliedName ? `(${physicalDiscountDetails.promoAppliedName})` : ''}:</span>
                    <span className="font-mono">- L. {physicalDiscountDetails.actualAppliedDiscount.toLocaleString()} HNL</span>
                  </div>
                )}
                <div className="pt-2 border-t border-amber-200/50 dark:border-amber-900/40 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] text-amber-800 dark:text-amber-500 font-extrabold uppercase tracking-widest font-mono">Total de la Venta</span>
                    <span className="block text-xs text-neutral-500">
                      {physicalSaleItems.reduce((acc, i) => acc + Number(i.quantity || 0), 0)} unidades | {physicalRoleUsed === 'mayorista' ? 'Tarifa Mayorista' : 'Tarifa Detalle'}
                    </span>
                  </div>
                  <span className="font-mono font-black text-amber-950 dark:text-amber-200 text-lg">
                    L. {physicalDiscountDetails.finalTotal.toLocaleString()} HNL
                  </span>
                </div>
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
        </div>,
        document.body
      )}

      {/* Assign Barcode Modal */}
      {assignBarcodeState.isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                🏷️ Asignar Código de Barras
              </h3>
              <button
                type="button"
                onClick={() => setAssignBarcodeState(prev => ({ ...prev, isOpen: false }))}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              El código de barras <span className="font-mono font-bold text-amber-600 dark:text-amber-400">"{assignBarcodeState.scannedBarcode}"</span> no está asignado. Selecciónalo en la lista para asociarlo al perfume y agregarlo a la venta.
            </p>

            <div className="space-y-3 text-xs">
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
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold cursor-pointer"
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

            <div className="flex items-center justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setAssignBarcodeState(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-xs font-bold rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={assignBarcodeState.isSaving || !assignBarcodeState.selectedProdId || !assignBarcodeState.scannedBarcode}
                onClick={handleSaveBarcodeAssignment}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-bold rounded-xl shadow disabled:opacity-50 cursor-pointer"
              >
                {assignBarcodeState.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar y Agregar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Promo Rules Manager Modal */}
      {showPromoManagerModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-auto max-h-[90vh] fade-in-up">
            <div className="p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between flex-shrink-0">
              <h3 className="font-display font-bold text-neutral-900 dark:text-neutral-100 text-base flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-500" /> Reglas de Promoción por Total de Compra
              </h3>
              <button onClick={() => setShowPromoManagerModal(false)} className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6 flex-1 overflow-y-auto text-xs">
              <p className="text-neutral-500 dark:text-neutral-400">
                Define promociones automáticas para aplicar a ventas físicas y órdenes en función del monto total de la compra.
              </p>

              {/* Add / Edit Rule Form */}
              <form onSubmit={handleSavePromoRule} className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 block text-xs">
                    {editingPromoRuleId ? 'Editar Regla Promocional' : 'Añadir Nueva Regla Promocional'}
                  </span>
                  {editingPromoRuleId && (
                    <button
                      type="button"
                      onClick={handleCancelEditPromoRule}
                      className="text-[10px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 underline font-semibold cursor-pointer"
                    >
                      Cancelar Edición
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Nombre de la Promoción</label>
                    <input
                      type="text"
                      required
                      value={newPromoName}
                      onChange={(e) => setNewPromoName(e.target.value)}
                      placeholder="Ej: Promo Navidad > L. 3,000"
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-semibold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Monto Mínimo de Compra (L.)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newPromoMinAmount}
                      onChange={(e) => setNewPromoMinAmount(e.target.value)}
                      placeholder="Ej: 3000"
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Tipo de Descuento</label>
                    <select
                      value={newPromoType}
                      onChange={(e) => setNewPromoType(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-semibold outline-none cursor-pointer"
                    >
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed">Monto Fijo (L.)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Valor del Descuento</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={newPromoValue}
                      onChange={(e) => setNewPromoValue(e.target.value)}
                      placeholder={newPromoType === 'percentage' ? 'Ej: 10' : 'Ej: 300'}
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {editingPromoRuleId && (
                    <button
                      type="button"
                      onClick={handleCancelEditPromoRule}
                      className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold rounded-xl text-xs cursor-pointer hover:bg-neutral-300 dark:hover:bg-neutral-600"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-4 py-2 bg-neutral-900 dark:bg-amber-400 text-white dark:text-neutral-950 font-bold rounded-xl cursor-pointer hover:bg-neutral-800 dark:hover:bg-amber-300"
                  >
                    <Plus className="w-3.5 h-3.5" /> {editingPromoRuleId ? 'Actualizar Regla' : 'Guardar Promoción'}
                  </button>
                </div>
              </form>

              {/* Active Rules List */}
              <div className="space-y-2">
                <span className="font-bold text-neutral-500 uppercase tracking-wider text-[10px] block">Reglas Activas</span>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900">
                  {promoRules.length === 0 ? (
                    <div className="p-4 text-center text-neutral-400">No hay reglas de promoción guardadas.</div>
                  ) : (
                    promoRules.map(r => (
                      <div key={r.id} className={`p-3.5 flex items-center justify-between transition-colors ${editingPromoRuleId === r.id ? 'bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'}`}>
                        <div>
                          <span className="font-bold text-neutral-900 dark:text-neutral-100 block">{r.name}</span>
                          <span className="text-[10px] text-neutral-400 font-mono block">
                            Compra Mínima: L. {Number(r.minAmount).toLocaleString()} HNL | Descuento: {r.discountValue}{r.discountType === 'percentage' ? '%' : ' L.'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditPromoRule(r)}
                            className="p-1.5 text-neutral-400 hover:text-amber-500 rounded-lg cursor-pointer transition-colors"
                            title="Editar regla"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePromoRule(r.id)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                            title="Eliminar regla"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-100 dark:border-neutral-800 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowPromoManagerModal(false)}
                className="px-5 py-2.5 bg-neutral-900 dark:bg-amber-400 text-white dark:text-neutral-950 font-bold rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Quick Create Customer Modal */}
      {showCreateCustomerModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-500" />
                Registrar Nuevo Cliente
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateCustomerModal(false)}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Ingresa los datos del cliente para registrarlo en el sistema. Quedará guardado en el módulo de <strong>Clientes</strong> para futuras ventas y reportes.
            </p>

            {createCustomerMsg.text && (
              <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                createCustomerMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200'
              }`}>
                {createCustomerMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{createCustomerMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuickCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Nombre del Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={quickCustomerName}
                  onChange={(e) => setQuickCustomerName(e.target.value)}
                  placeholder="Ej: María Rodríguez"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-semibold text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Número de Teléfono / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={quickCustomerPhone}
                  onChange={(e) => setQuickCustomerPhone(e.target.value)}
                  placeholder="Ej: +504 9876-5432"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono font-bold text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Tarifa / Clasificación
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickCustomerRole('detalle')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      quickCustomerRole === 'detalle'
                        ? 'bg-neutral-950 dark:bg-amber-400 text-white dark:text-neutral-950 border-transparent shadow-xs'
                        : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    Detalle (Público)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCustomerRole('mayorista')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      quickCustomerRole === 'mayorista'
                        ? 'bg-neutral-950 dark:bg-amber-400 text-white dark:text-neutral-950 border-transparent shadow-xs'
                        : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    Mayorista
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Dirección (Opcional)
                </label>
                <input
                  type="text"
                  value={quickCustomerAddress}
                  onChange={(e) => setQuickCustomerAddress(e.target.value)}
                  placeholder="Ej: Tegucigalpa, Col. Palmira"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-medium text-neutral-900 dark:text-neutral-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  value={quickCustomerEmail}
                  onChange={(e) => setQuickCustomerEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-medium text-neutral-900 dark:text-neutral-100 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateCustomerModal(false)}
                  className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-xs font-bold rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer || !quickCustomerName.trim() || !quickCustomerPhone.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
                >
                  {isSavingCustomer ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" /> Guardar Cliente
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
