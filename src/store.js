import { create } from 'zustand';
import { supabase } from './utils/supabase';
import { isProductSet } from './utils/productHelper';

// Helper to map DB products (snake_case) to Frontend products (camelCase)
const mapProductFromDb = (p) => ({
  id: p.id,
  name: p.name,
  brand: p.brand,
  size: p.size,
  cost: Number(p.cost || 0),
  pricePublic: Number(p.price_public || 0),
  pricePromotional: Number(p.price_promotional || 0),
  stock: Number(p.stock || 0),
  category: p.category,
  barcode: p.barcode || '',
  description: p.description || '',
  image_url: p.image_url || ''
});

// Helper to map Frontend products to DB products
const mapProductToDb = (p) => {
  const generatedId = p.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'prod_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36));
  return {
    id: generatedId,
    name: p.name,
    brand: p.brand,
    size: p.size,
    cost: Number(p.cost || 0),
    price_public: Number(p.pricePublic || 0),
    price_promotional: Number(p.pricePromotional || 0),
    stock: Number(p.stock || 0),
    category: p.category,
    barcode: p.barcode || null,
    description: p.description || '',
    image_url: p.image_url || ''
  };
};

export const useStore = create((set, get) => ({
  user: null,
  checkingSession: true,
  products: [],
  orders: [],
  cart: [],
  favorites: [],
  telegramConfig: { token: '', chatId: '', active: false },
  currentView: 'home',
  loading: false,
  error: null,
  searchTerm: '',
  categoryFilter: 'Todos',
  brandFilter: 'Todas',

  setView: (view) => set({ currentView: view, error: null }),
  setError: (err) => set({ error: err }),

  restoreSession: async () => {
    set({ checkingSession: true });
    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session || !session.user) {
        set({ user: null, checkingSession: false });
        await get().fetchFavorites();
        return false;
      }

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', session.user.id)
        .single();

      if (profileErr) throw profileErr;

      let mappedRole = 'client';
      if (profile.role === 'dueño' || profile.role === 'owner') mappedRole = 'owner';
      else if (profile.role === 'vendedor') mappedRole = 'vendedor';

      const email = session.user.email || '';
      const id = email.includes('@iconicboutique.hn') ? email.split('@')[0] : email;

      const loggedUser = {
        id: id.toLowerCase().trim(),
        name: profile.name,
        role: mappedRole,
        uid: session.user.id
      };

      set({ user: loggedUser, checkingSession: false });
      await get().fetchFavorites();
      return true;
    } catch (err) {
      console.error('Error restoring session:', err);
      set({ user: null, checkingSession: false });
      await get().fetchFavorites();
      return false;
    }
  },

  // Auth using Supabase Auth + Profiles mapping
  login: async (id, pass) => {
    set({ loading: true, error: null });
    try {
      let email = id.trim();
      if (!email.includes('@')) {
        email = `${email.toLowerCase()}@iconicboutique.hn`;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass
      });

      if (error) throw error;

      // Fetch user profile
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', data.user.id)
        .single();

      if (profileErr) throw profileErr;

      // Map Supabase roles ('dueño', 'vendedor', 'usuario') to App roles ('owner', 'vendedor', 'client')
      let mappedRole = 'client';
      if (profile.role === 'dueño' || profile.role === 'owner') mappedRole = 'owner';
      else if (profile.role === 'vendedor') mappedRole = 'vendedor';

      const loggedUser = {
        id: id.toLowerCase().trim(),
        name: profile.name,
        role: mappedRole,
        uid: data.user.id
      };

      set({ user: loggedUser, currentView: 'catalog', loading: false });
      await get().fetchFavorites();
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  register: async (id, name, pass) => {
    set({ loading: true, error: null });
    try {
      let email = id.trim();
      if (!email.includes('@')) {
        email = `${email.toLowerCase()}@iconicboutique.hn`;
      }

      const roleToWrite = 'usuario'; // Default registered is general user

      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            name,
            role: roleToWrite
          }
        }
      });

      if (error) throw error;

      // Fallback: manually insert profile row if trigger hasn't fired yet
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', data.user.id)
        .maybeSingle();

      let profile = existingProfile;

      if (!existingProfile) {
        const { data: newProfile, error: profileInsertErr } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name,
            role: roleToWrite
          })
          .select()
          .maybeSingle();
        
        if (!profileInsertErr && newProfile) {
          profile = newProfile;
        }
      }

      let mappedRole = 'client';
      if (profile) {
        if (profile.role === 'dueño' || profile.role === 'owner') mappedRole = 'owner';
        else if (profile.role === 'vendedor') mappedRole = 'vendedor';
      }

      const registeredUser = {
        id: id.toLowerCase().trim(),
        name,
        role: mappedRole,
        uid: data.user.id
      };

      set({ user: registeredUser, currentView: 'catalog', loading: false });
      await get().fetchFavorites();
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, cart: [], currentView: 'home', error: null });
    await get().fetchFavorites();
  },

  resetPasswordForEmail: async (email) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      set({ loading: false });
      return { success: true };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  updatePassword: async (newPassword) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      set({ loading: false });
      return { success: true };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  // Products operations
  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      const mapped = data.map(mapProductFromDb);
      set({ products: mapped, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  addProduct: async (productData) => {
    set({ loading: true, error: null });
    try {
      const dbProduct = mapProductToDb(productData);
      
      const { data, error } = await supabase
        .from('products')
        .upsert(dbProduct)
        .select()
        .single();

      if (error) throw error;

      const newProduct = mapProductFromDb(data);
      set((state) => {
        const filtered = state.products.filter(p => p.id !== newProduct.id);
        return {
          products: [newProduct, ...filtered],
          loading: false
        };
      });
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  updateProduct: async (id, productData) => {
    set({ loading: true, error: null });
    try {
      const dbProduct = mapProductToDb({ ...productData, id });
      
      const { data, error } = await supabase
        .from('products')
        .update(dbProduct)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedProduct = mapProductFromDb(data);
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
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

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

  // Orders operations (inserts orders and order_items with stock deducts)
  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            product_id,
            quantity,
            price_paid,
            products (
              name,
              brand,
              size
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedOrders = data.map(o => ({
        id: o.id,
        clientName: o.client_name,
        clientPhone: o.client_phone,
        total: Number(o.total),
        status: o.status,
        roleUsed: o.role_used === 'usuario' ? 'client' : (o.role_used === 'dueño' ? 'owner' : o.role_used),
        buyerId: o.buyer_id,
        date: o.date,
        createdAt: o.created_at,
        items: (o.order_items || []).map(item => ({
          productId: item.product_id,
          name: item.products?.name || 'Fragancia',
          brand: item.products?.brand || '',
          size: item.products?.size || '',
          quantity: item.quantity,
          pricePaid: Number(item.price_paid)
        }))
      }));

      set({ orders: mappedOrders, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  submitOrder: async (clientName, clientPhone) => {
    set({ loading: true, error: null });
    const { cart, user } = get();
    if (!cart.length) {
      set({ error: 'El carrito está vacío', loading: false });
      return null;
    }

    const isClient = user?.role === 'client';
    const isVendedor = user?.role === 'vendedor' || user?.role === 'owner';
    const roleUsed = isClient ? 'usuario' : (isVendedor ? (user?.role === 'owner' ? 'dueño' : 'vendedor') : 'publico');

    const total = cart.reduce((acc, curr) => {
      const price = isClient ? curr.product.pricePromotional : curr.product.pricePublic;
      return acc + (price * curr.quantity);
    }, 0);

    const orderId = 'order_' + Date.now() + '_' + Math.floor(Math.random() * 100);
    const orderDate = new Date().toLocaleDateString('es-HN', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    try {
      // 1. Insert into orders
      const { error: orderErr } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          client_name: clientName,
          client_phone: clientPhone,
          total: total,
          status: 'pendiente',
          role_used: roleUsed,
          buyer_id: user?.uid || null,
          date: orderDate
        });

      if (orderErr) throw orderErr;

      // 2. Insert into order_items
      const itemsToInsert = cart.map(item => ({
        order_id: orderId,
        product_id: item.product.id,
        quantity: item.quantity,
        price_paid: isClient ? item.product.pricePromotional : item.product.pricePublic
      }));

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsErr) throw itemsErr;

      // 3. Deduct stock for each product in the cart
      for (const item of cart) {
        const newStock = Math.max(0, item.product.stock - item.quantity);
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.product.id);
      }

      // 4. Fetch updated products to refresh store state
      await get().fetchProducts();

      const orderCreated = {
        id: orderId,
        clientName,
        clientPhone,
        total,
        status: 'pendiente',
        roleUsed: user?.role || 'public',
        buyerId: user?.uid || null,
        date: orderDate,
        items: cart.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          brand: item.product.brand,
          size: item.product.size,
          quantity: item.quantity,
          pricePaid: isClient ? item.product.pricePromotional : item.product.pricePublic
        }))
      };

      // 5. Send Telegram notification directly from the client side
      try {
        const config = get().telegramConfig;
        if (config && config.active && config.token && config.chatId) {
          const itemsText = orderCreated.items
            .map(i => {
              const prefix = isProductSet(i) ? '🎁 [SET] ' : '';
              return `• *${i.quantity}x ${prefix}${i.brand} ${i.name} (${i.size})* - L. ${i.pricePaid.toLocaleString()} c/u`;
            })
            .join('\n');

          let cleanedPhone = (orderCreated.clientPhone || '').replace(/\D/g, '');
          if (cleanedPhone.length === 8) {
            cleanedPhone = '504' + cleanedPhone;
          }
          const phoneLink = cleanedPhone 
            ? `[${orderCreated.clientPhone}](https://wa.me/${cleanedPhone})`
            : (orderCreated.clientPhone || 'Desconocido');

          const text = `🔔 *NUEVA ORDEN DE COMPRA RECIBIDA* 🔔\n\n` +
            `👤 *Cliente:* ${orderCreated.clientName}\n` +
            `📞 *Teléfono:* ${phoneLink}\n` +
            `🕒 *Fecha:* ${orderCreated.date}\n` +
            `💼 *Precios:* ${orderCreated.roleUsed === 'client' ? 'Promocional de Cliente VIP' : 'Público General'}\n` +
            `📍 *Orden ID:* \`${orderCreated.id}\`\n\n` +
            `📦 *Detalle de Perfumes:*\n${itemsText}\n\n` +
            `💵 *TOTAL COTIZADO:* *L. ${orderCreated.total.toLocaleString()} HNL*\n\n` +
            `⚠️ *Nota:* La facturación es manual. Por favor, contactar al cliente por teléfono o WhatsApp para coordinar pago y entrega.`;

          const url = `https://api.telegram.org/bot${config.token}/sendMessage`;
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: config.chatId,
              text: text,
              parse_mode: 'Markdown'
            })
          });
        }
      } catch (tgErr) {
        console.error('Error sending TG notification', tgErr);
      }

      set((state) => ({
        cart: [],
        orders: [orderCreated, ...state.orders],
        loading: false
      }));

      return orderCreated;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  updateOrderStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      // If cancelling, return items to stock
      if (status === 'cancelado') {
        const { data: items } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', id);

        if (items) {
          for (const item of items) {
            const { data: prod } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.product_id)
              .maybeSingle();

            if (prod) {
              await supabase
                .from('products')
                .update({ stock: Number(prod.stock || 0) + Number(item.quantity) })
                .eq('id', item.product_id);
            }
          }
        }
      }

      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, status } : o),
        loading: false
      }));

      await get().fetchProducts();
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  updateOrderDetails: async (id, details) => {
    set({ loading: true, error: null });
    try {
      const dbDetails = {};
      if (details.clientName !== undefined) dbDetails.client_name = details.clientName;
      if (details.clientPhone !== undefined) dbDetails.client_phone = details.clientPhone;
      if (details.status !== undefined) dbDetails.status = details.status;
      if (details.total !== undefined) dbDetails.total = details.total;

      const { error } = await supabase
        .from('orders')
        .update(dbDetails)
        .eq('id', id);

      if (error) throw error;

      await get().fetchOrders();
      await get().fetchProducts();
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  // Telegram Configuration
  fetchTelegramConfig: async () => {
    try {
      const { data, error } = await supabase
        .from('telegram')
        .select('token, chatId, active')
        .eq('id', 'config')
        .maybeSingle();

      if (data && !error) {
        set({ 
          telegramConfig: { 
            token: data.token || '', 
            chatId: data.chatId || '', 
            active: !!data.active 
          } 
        });
      }
    } catch (err) {
      console.error('Error fetching Telegram config', err);
    }
  },

  saveTelegramConfig: async (config) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('telegram')
        .upsert({
          id: 'config',
          token: config.token,
          chatId: config.chatId,
          active: config.active,
          updatedAt: new Date().toISOString()
        });

      if (error) throw error;
      set({ telegramConfig: config, loading: false });
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  testTelegram: async (token, chatId) => {
    set({ error: null });
    try {
      const text = `✅ *Prueba de Integración Exitosa*\n\nEl sistema de Perfumería Iconic Boutique HN se ha conectado correctamente a este bot de Telegram para notificaciones automáticas de órdenes de compra.`;
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown'
        })
      });
      const resData = await response.json();
      if (!resData.ok) {
        throw new Error(resData.description || 'Error de Telegram');
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
  setBrandFilter: (brand) => set({ brandFilter: brand }),

  // Favorites & Repeat Order actions
  fetchFavorites: async () => {
    const user = get().user;
    if (!user || !user.uid) {
      // Guest favorites from localStorage
      try {
        const guestFavs = JSON.parse(localStorage.getItem('iconic_favorites_guest') || '[]');
        set({ favorites: guestFavs });
      } catch {
        set({ favorites: [] });
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('user_id', user.uid);
      
      if (error) throw error;
      set({ favorites: (data || []).map(f => f.product_id) });
    } catch (err) {
      console.error('Error fetching favorites:', err);
      // Fallback to localStorage
      try {
        const guestFavs = JSON.parse(localStorage.getItem('iconic_favorites_guest') || '[]');
        set({ favorites: guestFavs });
      } catch {
        set({ favorites: [] });
      }
    }
  },

  toggleFavorite: async (productId) => {
    const user = get().user;
    const currentFavs = get().favorites;
    const isFav = currentFavs.includes(productId);
    const updatedFavs = isFav 
      ? currentFavs.filter(id => id !== productId) 
      : [...currentFavs, productId];

    // Always update local state first for instant responsiveness
    set({ favorites: updatedFavs });

    if (!user || !user.uid) {
      // Guest favorites save to localStorage
      localStorage.setItem('iconic_favorites_guest', JSON.stringify(updatedFavs));
      return;
    }

    try {
      if (isFav) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.uid)
          .eq('product_id', productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.uid, product_id: productId });
        if (error) throw error;
      }
      // Also sync guest list just in case
      localStorage.setItem('iconic_favorites_guest', JSON.stringify(updatedFavs));
    } catch (err) {
      console.error('Error toggling favorite in DB:', err);
      // Keep local state in sync anyway
      localStorage.setItem('iconic_favorites_guest', JSON.stringify(updatedFavs));
    }
  },

  repeatOrder: (orderItems) => {
    // orderItems is an array of { productId, quantity }
    const { products } = get();
    const itemsToSet = [];
    let itemsSkipped = 0;
    let stockAdjusted = false;

    orderItems.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod && prod.stock > 0) {
        // limit quantity by current stock
        let qtyToAdd = item.quantity;
        if (qtyToAdd > prod.stock) {
          qtyToAdd = prod.stock;
          stockAdjusted = true;
        }
        itemsToSet.push({ product: prod, quantity: qtyToAdd });
      } else {
        itemsSkipped++;
      }
    });

    set({ cart: itemsToSet });
    return {
      success: itemsToSet.length > 0,
      addedCount: itemsToSet.length,
      itemsSkipped,
      stockAdjusted
    };
  }
}));
