import { create } from 'zustand';

export const useStore = create((set, get) => ({
  user: null,
  products: [],
  orders: [],
  cart: [],
  telegramConfig: { token: '', chatId: '', active: false },
  currentView: 'home',
  loading: false,
  error: null,
  searchTerm: '',
  categoryFilter: 'Todos',
  brandFilter: 'Todas',

  setView: (view) => set({ currentView: view, error: null }),
  setError: (err) => set({ error: err }),

  // Auth
  login: async (id, pass) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password: pass })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al iniciar sesión');
      }
      const userData = await res.json();
      set({ user: userData, currentView: 'catalog', loading: false });
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  register: async (id, name, pass) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, password: pass })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al registrar usuario');
      }
      const userData = await res.json();
      set({ user: userData, currentView: 'catalog', loading: false });
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  logout: () => {
    set({ user: null, cart: [], currentView: 'home', error: null });
  },

  // Products
  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Error al cargar productos');
      const productsData = await res.json();
      set({ products: productsData, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  addProduct: async (productData) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al agregar producto');
      }
      const newProduct = await res.json();
      set((state) => ({
        products: [newProduct, ...state.products],
        loading: false
      }));
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  updateProduct: async (id, productData) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al actualizar producto');
      }
      const updatedProduct = await res.json();
      set((state) => ({
        products: state.products.map(p => p.id === id ? updatedProduct : p),
        loading: false
      }));
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  deleteProduct: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al eliminar producto');
      }
      set((state) => ({
        products: state.products.filter(p => p.id !== id),
        loading: false
      }));
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  uploadPdf: async (base64, fileName) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/products/upload-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: base64, fileName })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al procesar el PDF con IA');
      }
      const data = await res.json();
      set({ loading: false });
      return data.products;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // Orders
  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Error al cargar órdenes');
      const ordersData = await res.json();
      set({ orders: ordersData, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  submitOrder: async (clientName, clientPhone) => {
    set({ loading: true, error: null });
    const { cart, user, products } = get();
    if (!cart.length) {
      set({ error: 'El carrito está vacío', loading: false });
      return null;
    }

    const isClient = user?.role === 'client';
    const isVendedor = user?.role === 'vendedor' || user?.role === 'owner';
    const roleUsed = isClient ? 'client' : (isVendedor ? 'vendedor' : 'public');

    const items = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      brand: item.product.brand,
      size: item.product.size,
      quantity: item.quantity,
      pricePaid: isClient ? item.product.pricePromotional : item.product.pricePublic
    }));

    const total = items.reduce((acc, curr) => acc + (curr.pricePaid * curr.quantity), 0);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientPhone,
          items,
          total,
          roleUsed,
          buyerId: user?.id
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al enviar cotización');
      }

      const orderCreated = await res.json();
      
      // Update local stock since server updated its DB
      const updatedProducts = products.map(p => {
        const itemOrdered = cart.find(item => item.product.id === p.id);
        if (itemOrdered) {
          return { ...p, stock: Math.max(0, p.stock - itemOrdered.quantity) };
        }
        return p;
      });

      set({ 
        cart: [], 
        products: updatedProducts, 
        loading: false,
        orders: [orderCreated, ...get().orders]
      });

      return orderCreated;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  updateOrderStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al actualizar estado de la orden');
      }
      const updatedOrder = await res.json();
      set((state) => ({
        orders: state.orders.map(o => o.id === id ? updatedOrder : o),
        loading: false
      }));
      // Re-fetch products to reflect returned stock if cancelled
      get().fetchProducts();
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  updateOrderDetails: async (id, details) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al modificar detalles de la orden');
      }
      const updatedOrder = await res.json();
      set((state) => ({
        orders: state.orders.map(o => o.id === id ? updatedOrder : o),
        loading: false
      }));
      // Re-fetch products to reflect latest inventory/stocks
      get().fetchProducts();
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  // Telegram Config
  fetchTelegramConfig: async () => {
    try {
      const res = await fetch('/api/telegram/config');
      if (res.ok) {
        const config = await res.json();
        set({ telegramConfig: config });
      }
    } catch (err) {
      console.error('Error fetching Telegram config', err);
    }
  },

  saveTelegramConfig: async (config) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Error al guardar configuración de Telegram');
      const savedConfig = await res.json();
      set({ telegramConfig: savedConfig, loading: false });
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  testTelegram: async (token, chatId) => {
    set({ error: null });
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, chatId })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al probar conexión con Telegram');
      }
      return true;
    } catch (err) {
      set({ error: err.message });
      return false;
    }
  },

  // Cart operations
  addToCart: (product, quantity) => {
    const { cart } = get();
    const existing = cart.find(item => item.product.id === product.id);
    
    // Check stock
    const maxQty = product.stock;
    if (maxQty <= 0) return;

    if (existing) {
      const newQty = Math.min(maxQty, existing.quantity + quantity);
      set({
        cart: cart.map(item => item.product.id === product.id ? { ...item, quantity: newQty } : item)
      });
    } else {
      const newQty = Math.min(maxQty, quantity);
      set({
        cart: [...cart, { product, quantity: newQty }]
      });
    }
  },

  removeFromCart: (productId) => {
    set({
      cart: get().cart.filter(item => item.product.id !== productId)
    });
  },

  updateCartQuantity: (productId, qty) => {
    const { cart } = get();
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const maxQty = item.product.stock;
    const finalQty = Math.max(1, Math.min(maxQty, qty));

    set({
      cart: cart.map(i => i.product.id === productId ? { ...i, quantity: finalQty } : i)
    });
  },

  clearCart: () => set({ cart: [] }),

  // Search & Filters
  setSearchTerm: (term) => set({ searchTerm: term }),
  setCategoryFilter: (cat) => set({ categoryFilter: cat }),
  setBrandFilter: (brand) => set({ brandFilter: brand })
}));
