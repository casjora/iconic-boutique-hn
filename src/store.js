import { create } from 'zustand';
import { supabase } from './utils/supabase';
import { getProductPriceForUser } from './utils/productHelper';

// Sound Alert Helpers
export const playBackupChime = (type = 'order') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    // Safe AudioContext state handling
    const ctx = new AudioContext();

    const playTone = (freq, startTime, duration, vol = 0.12) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gainNode.gain.setValueAtTime(vol, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    if (type === 'customer') {
      // Pleasant dual rising tones: E5 -> G5
      playTone(659.25, ctx.currentTime, 0.25, 0.12);
      playTone(783.99, ctx.currentTime + 0.12, 0.35, 0.12);
    } else {
      // Pleasant store chime: C5 -> E5 -> C6
      playTone(523.25, ctx.currentTime, 0.2, 0.12);
      playTone(659.25, ctx.currentTime + 0.1, 0.2, 0.12);
      playTone(1046.50, ctx.currentTime + 0.2, 0.4, 0.12);
    }
  } catch (e) {
    console.warn('Web Audio API backup chime failed:', e);
  }
};

export const playCustomerAlertSound = () => {
  try {
    const audio = new Audio('https://nsubmnvkojsmoykfcjgl.supabase.co/storage/v1/object/public/miscelaneas/New_customer.mp3');
    
    // If resource fails to load (CORS/404), fall back to synthesized chime
    audio.onerror = () => {
      console.warn('Failed to load customer MP3 from storage, falling back to backup chime.');
      playBackupChime('customer');
    };

    audio.play().catch(e => {
      console.log('Audio playback prevented by browser or blocked, triggering backup chime:', e);
      playBackupChime('customer');
    });
  } catch (err) {
    console.warn('Audio playback error:', err);
    playBackupChime('customer');
  }
};

export const playOrderAlertSound = () => {
  try {
    const audio = new Audio('https://nsubmnvkojsmoykfcjgl.supabase.co/storage/v1/object/public/miscelaneas/orders_sound.mp3');
    
    // If resource fails to load (CORS/404), fall back to synthesized chime
    audio.onerror = () => {
      console.warn('Failed to load orders MP3 from storage, falling back to backup chime.');
      playBackupChime('order');
    };

    audio.play().catch(e => {
      console.log('Audio playback prevented by browser or blocked, triggering backup chime:', e);
      playBackupChime('order');
    });
  } catch (err) {
    console.warn('Audio playback error:', err);
    playBackupChime('order');
  }
};

const PRODUCT_SELECT_COLUMNS = 'id, name, brand, size, cost, price_public, price_promotional, stock, category, barcode, description, image_url, featured_public, public_discount';

// Helper to map DB products (snake_case) to Frontend products (camelCase)
const mapProductFromDb = (p) => {
  let uiCategory = 'Damas';
  if (p.category === 'Masculino') uiCategory = 'Caballeros';
  else if (p.category === 'Unisex') uiCategory = 'Unisex';
  else if (p.category === 'Femenino') uiCategory = 'Damas';

  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    size: p.size,
    cost: Number(p.cost || 0),
    pricePublic: Number(p.price_public || 0),
    pricePromotional: Number(p.price_promotional || 0),
    stock: Number(p.stock || 0),
    category: uiCategory,
    barcode: p.barcode || '',
    description: p.description || '',
    image_url: p.image_url || '',
    featuredPublic: p.featured_public !== undefined && p.featured_public !== null ? Boolean(p.featured_public) : true,
    publicDiscount: Number(p.public_discount || 0)
  };
};

// Helper to map Frontend products to DB products
const mapProductToDb = (p) => {
  const generatedId = p.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'prod_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36));
  const generatedBarcode = p.barcode || Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
  
  let dbCategory = 'Femenino';
  if (p.category === 'Caballeros' || p.category === 'Masculino' || p.category === 'Niños') dbCategory = 'Masculino';
  else if (p.category === 'Unisex') dbCategory = 'Unisex';
  else if (p.category === 'Damas' || p.category === 'Femenino') dbCategory = 'Femenino';

  const dbRecord = {
    id: generatedId,
    name: p.name ? String(p.name).trim() : 'Perfume Desconocido',
    brand: p.brand ? String(p.brand).trim() : 'Marca Desconocida',
    size: p.size ? String(p.size).trim() : '100 ml',
    cost: Number(p.cost || 0),
    price_public: Number(p.pricePublic !== undefined ? p.pricePublic : (p.price_public || 0)),
    price_promotional: Number(p.pricePromotional !== undefined ? p.pricePromotional : (p.price_promotional || 0)),
    stock: Number(p.stock || 0),
    category: dbCategory,
    barcode: generatedBarcode,
    description: p.description || '',
    image_url: p.image_url || p.imageUrl || '',
    featured_public: p.featuredPublic !== undefined ? Boolean(p.featuredPublic) : true,
    public_discount: Number(p.publicDiscount || 0)
  };
  
  return dbRecord;
};

export const useStore = create((setOriginal, get) => {
  const set = (updater) => {
    setOriginal((state) => {
      const nextState = typeof updater === 'function' ? updater(state) : updater;
      let newProducts = nextState.products !== undefined ? nextState.products : state.products;
      let newOrders = nextState.orders !== undefined ? nextState.orders : state.orders;
      
      if (nextState.products !== undefined || nextState.orders !== undefined) {
        const pendingOrders = (newOrders || []).filter(o => o.status === 'pendiente');
        newProducts = newProducts.map(p => {
          let pendingQty = 0;
          for (const order of pendingOrders) {
            for (const item of order.items || []) {
              if (item.productId === p.id) {
                pendingQty += Number(item.quantity || 0);
              }
            }
          }
          return {
            ...p,
            availableStock: Math.max(0, p.stock - pendingQty)
          };
        });
        return {
          ...nextState,
          products: newProducts
        };
      }
      return nextState;
    });
  };

  return {
    user: null,
    checkingSession: true,
    products: [],
    productsLastFetched: null,
    orders: [],
    customers: [],
    cart: [],
    favorites: [],
    telegramConfig: { token: '', chatId: '', active: false },
    hasNewRegistrationsAlert: false,
    hasNewOrdersAlert: false,
    realtimeInitialized: false,
    currentView: (() => {
      if (typeof window !== 'undefined' && window.location) {
        const path = window.location.pathname.substring(1) || 'home';
        const isCategoryPath = path.startsWith('category/');
        const normalizedPath = isCategoryPath ? 'catalog' : path;
        const validViews = ['home', 'catalog', 'favorites', 'cart', 'login', 'forgot-password', 'update-password', 'dashboard', 'inventory', 'barcodes', 'config', 'orders', 'about-us'];
        return validViews.includes(normalizedPath) ? normalizedPath : 'home';
      }
      return 'home';
    })(),
    loading: false,
    error: null,
    searchTerm: '',
    categoryFilter: 'Todos',
    brandFilter: 'Todas',
    theme: (() => {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark' || saved === 'light') return saved;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
      }
      return 'light';
    })(),

    toggleTheme: () => {
      const current = get().theme;
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', nextTheme);
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      set({ theme: nextTheme });
    },

    initTheme: () => {
      const currentTheme = get().theme;
      if (typeof window !== 'undefined') {
        if (currentTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    },

    setView: (view) => set({ currentView: view, error: null }),
    setError: (err) => {
      set({ error: err });
      if (err) {
        setTimeout(() => {
          if (get().error === err) {
            set({ error: null });
          }
        }, 20000);
      }
    },

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
          .select('name, role, phone, address')
          .eq('id', session.user.id)
          .single();

        if (profileErr) throw profileErr;

        let mappedRole = 'pendiente';
        if (profile) {
          const r = String(profile.role || '').toLowerCase();
          if (r === 'dueño' || r === 'owner') mappedRole = 'dueño';
          else if (r === 'vendedor') mappedRole = 'vendedor';
          else if (r === 'mayorista') mappedRole = 'mayorista';
          else if (r === 'detalle') mappedRole = 'detalle';
        }

        const email = session.user.email || '';
        const id = email.includes('@iconicboutique.hn') ? email.split('@')[0] : email;
        const emailConfirmed = !!(session.user.email_confirmed_at || session.user.confirmed_at || email.endsWith('@iconicboutique.hn'));

        if (!emailConfirmed || mappedRole === 'pendiente') {
          await supabase.auth.signOut();
          set({ user: null, checkingSession: false });
          await get().fetchFavorites();
          return false;
        }

        if (session.user.user_metadata?.role !== profile.role) {
          try {
            await supabase.auth.updateUser({
              data: {
                ...session.user.user_metadata,
                role: profile.role,
                name: profile.name
              }
            });
          } catch (e) {
            console.warn('Metadata sync warning:', e);
          }
        }

        const loggedUser = {
          id: id.toLowerCase().trim(),
          name: profile.name,
          role: mappedRole,
          uid: session.user.id,
          email,
          emailConfirmed,
          phone: profile.phone || '',
          address: profile.address || ''
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

        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('name, role, phone, address')
          .eq('id', data.user.id)
          .single();

        if (profileErr) throw profileErr;

        let mappedRole = 'pendiente';
        const userMetaRole = data.user.user_metadata?.role;
        const profileRole = profile?.role;
        const primaryRole = (profileRole && ['dueño', 'owner', 'vendedor', 'mayorista', 'detalle'].includes(String(profileRole).toLowerCase()))
          ? profileRole
          : (userMetaRole || profileRole || '');

        const r = String(primaryRole).toLowerCase();
        if (r === 'dueño' || r === 'owner') mappedRole = 'dueño';
        else if (r === 'vendedor') mappedRole = 'vendedor';
        else if (r === 'mayorista') mappedRole = 'mayorista';
        else if (r === 'detalle') mappedRole = 'detalle';

        const userEmail = data.user.email || '';
        const emailConfirmed = !!(data.user.email_confirmed_at || data.user.confirmed_at || userEmail.endsWith('@iconicboutique.hn'));

        if (!emailConfirmed) {
          await supabase.auth.signOut();
          throw new Error('Debes confirmar tu correo electrónico antes de iniciar sesión. Por favor, revisa tu bandeja de entrada o spam.');
        }

        if (mappedRole === 'pendiente') {
          await supabase.auth.signOut();
          throw new Error('Tu cuenta está pendiente de aprobación por un administrador. Deben asignarte un rol (Detalle o Mayorista) para poder ingresar.');
        }

        if (data.user.user_metadata?.role !== profile.role) {
          try {
            await supabase.auth.updateUser({
              data: {
                ...data.user.user_metadata,
                role: profile.role,
                name: profile.name
              }
            });
          } catch (e) {
            console.warn('Metadata sync warning:', e);
          }
        }

        const loggedUser = {
          id: id.toLowerCase().trim(),
          name: profile.name,
          role: mappedRole,
          uid: data.user.id,
          email: userEmail,
          emailConfirmed,
          phone: profile.phone || '',
          address: profile.address || ''
        };

        set({ user: loggedUser, currentView: 'catalog', loading: false });
        await get().fetchFavorites();
        return true;
      } catch (err) {
        set({ error: err.message, loading: false });
        return false;
      }
    },

    register: async (id, name, pass, phone, address) => {
      set({ loading: true, error: null });
      try {
        let email = id.trim();
        if (!email.includes('@')) {
          email = `${email.toLowerCase()}@iconicboutique.hn`;
        }

        const roleToWrite = 'usuario';

        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: {
              name,
              role: roleToWrite,
              phone: phone || null,
              address: address || null
            }
          }
        });

        if (error) throw error;

        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('name, role, phone, address')
          .eq('id', data.user.id)
          .maybeSingle();

        let profile = existingProfile;

        if (!existingProfile) {
          const { data: newProfile, error: profileInsertErr } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              name,
              role: roleToWrite,
              phone: phone || null,
              address: address || null
            })
            .select()
            .maybeSingle();
          
          if (!profileInsertErr && newProfile) {
            profile = newProfile;
          }
        }

        // Force sign out immediately because we need email verification and admin approval.
        await supabase.auth.signOut();

        const userEmail = data.user.email || '';

        set({ user: null, loading: false });

        // Send telegram notification for new registration
        try {
          await fetch('/api/send-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              registration: {
                name,
                phone: phone || '',
                email: userEmail || '',
                address: address || ''
              }
            })
          });
        } catch (tgErr) {
          console.error('Error sending TG registration notification:', tgErr);
        }

        return true;
      } catch (err) {
        set({ error: err.message, loading: false });
        return false;
      }
    },

    resendVerification: async (email) => {
      set({ loading: true, error: null });
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        if (error) throw error;
        set({ loading: false });
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

    saveProductsBulk: async (inserts, updates) => {
      set({ loading: true, error: null });
      let countNew = 0;
      let countUpdated = 0;
      try {
        if (inserts && inserts.length > 0) {
          const dbInserts = inserts.map(mapProductToDb);
          const { error: insErr } = await supabase.from('products').insert(dbInserts);
          if (insErr) throw insErr;
          countNew = inserts.length;
        }
        
        if (updates && updates.length > 0) {
          const currentProducts = get().products;
          const dbUpdates = updates.map(u => {
            const original = currentProducts.find(p => p.id === u.id) || {};
            
            const name = u.name ? String(u.name).trim() : (original.name || 'Perfume Desconocido');
            const brand = u.brand ? String(u.brand).trim() : (original.brand || 'Marca Desconocida');
            const size = u.size ? String(u.size).trim() : (original.size || '100 ml');
            
            let dbCategory = undefined;
            const categoryToUse = u.category !== undefined ? u.category : original.category;
            if (categoryToUse !== undefined) {
              if (categoryToUse === 'Caballeros' || categoryToUse === 'Masculino' || categoryToUse === 'Niños') dbCategory = 'Masculino';
              else if (categoryToUse === 'Unisex') dbCategory = 'Unisex';
              else if (categoryToUse === 'Damas' || categoryToUse === 'Femenino') dbCategory = 'Femenino';
            }
            if (!dbCategory && original.category) {
              if (original.category === 'Masculino' || original.category === 'Caballeros') dbCategory = 'Masculino';
              else if (original.category === 'Unisex') dbCategory = 'Unisex';
              else dbCategory = 'Femenino';
            }

            return {
              id: u.id,
              name,
              brand,
              size,
              stock: Number(u.stock !== undefined ? u.stock : (original.stock || 0)),
              cost: Number(u.cost !== undefined ? u.cost : (original.cost || 0)),
              price_public: Number(u.pricePublic !== undefined ? u.pricePublic : (original.pricePublic || 0)),
              price_promotional: Number(u.pricePromotional !== undefined ? u.pricePromotional : (original.pricePromotional || 0)),
              category: dbCategory || 'Femenino',
              barcode: u.barcode !== undefined ? u.barcode : (original.barcode || null),
              description: original.description || null,
              image_url: original.imageUrl || null
            };
          });
          for (const item of dbUpdates) {
            const { error: updErr } = await supabase.from('products').update(item).eq('id', item.id);
            if (updErr) throw updErr;
          }
          countUpdated = updates.length;
        }

        await get().fetchProducts();
        return { success: true, countNew, countUpdated };
      } catch (err) {
        set({ error: err.message, loading: false });
        return { success: false, error: err.message };
      }
    },

    fetchProducts: async (force = false) => {
      const now = Date.now();
      const { products, productsLastFetched, user } = get();
      const userRole = user?.role;
      const isAdmin = ['dueño', 'owner', 'vendedor'].includes(userRole);
      const CACHE_TTL = 3 * 60 * 1000; // 3 minutes TTL for clients/guests

      // Stale-While-Revalidate: Return cached products for clients/guests if fresh
      if (!isAdmin && !force && products.length > 0 && productsLastFetched && (now - productsLastFetched < CACHE_TTL)) {
        return products;
      }

      set({ loading: true, error: null });
      try {
        const columns = isAdmin
          ? 'id, name, brand, size, cost, price_public, price_promotional, stock, category, barcode, description, image_url, featured_public, public_discount'
          : 'id, name, brand, size, price_public, price_promotional, stock, category, barcode, description, image_url, featured_public, public_discount';

        // Optimized Egress query: select specific required columns instead of wildcard '*'
        const { data, error } = await supabase
          .from('products')
          .select(columns)
          .order('name', { ascending: true });

        if (error) throw error;

        const mapped = data.map(mapProductFromDb);
        set({ products: mapped, productsLastFetched: Date.now(), loading: false });
        return mapped;
      } catch (err) {
        set({ error: err.message, loading: false });
        return get().products;
      }
    },

    addProduct: async (productData) => {
      set({ loading: true, error: null });
      try {
        const dbProduct = mapProductToDb(productData);
        
        const { data, error } = await supabase
          .from('products')
          .insert([dbProduct])
          .select(PRODUCT_SELECT_COLUMNS)
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
          .select(PRODUCT_SELECT_COLUMNS)
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

    updateProductBarcode: async (id, newBarcode) => {
      set({ loading: true, error: null });
      try {
        const cleanBarcode = String(newBarcode || '').trim();
        const { data, error } = await supabase
          .from('products')
          .update({ barcode: cleanBarcode })
          .eq('id', id)
          .select(PRODUCT_SELECT_COLUMNS)
          .single();

        if (error) throw error;

        const updatedProduct = mapProductFromDb(data);
        set((state) => ({
          products: state.products.map(p => p.id === id ? updatedProduct : p),
          loading: false
        }));
        return { success: true, product: updatedProduct };
      } catch (err) {
        set({ error: err.message, loading: false });
        return { success: false, error: err.message };
      }
    },

    applyBulkDiscount: async (productIds, discountPercent) => {
      set({ loading: true, error: null });
      try {
        const { products } = get();
        const dbUpdates = [];
        for (const p of products) {
          if (productIds.includes(p.id)) {
            const cleanDesc = p.description 
              ? p.description
                  .replace(/\[PROMO_DETALLE:.*?\]/g, '')
                  .replace(/\[PROMO_MAYORISTA:.*?\]/g, '')
                  .replace(/\[PROMO:\d+\]/g, '')
                  .trim()
              : '';
            const newDesc = discountPercent > 0 ? `${cleanDesc}\n\n[PROMO_DETALLE:${discountPercent}%]`.trim() : cleanDesc;
            
            const dbProduct = mapProductToDb({ ...p, description: newDesc });
            dbUpdates.push(dbProduct);
          }
        }

        if (dbUpdates.length > 0) {
          for (const item of dbUpdates) {
            const { error } = await supabase.from('products').update({ description: item.description }).eq('id', item.id);
            if (error) throw error;
          }
        }

        await get().fetchProducts();
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

    uploadPdf: async (base64, fileName, model = "gemini-3.5-flash", startPage = 0, productsParsedSoFar = [], pagesText = null, signal = null) => {
      set({ loading: true, error: null });
      try {
        const res = await fetch('/api/products/upload-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({ 
            pdfBase64: base64, 
            fileName,
            model,
            startPage,
            productsParsedSoFar,
            pagesText
          })
        });
        const data = await res.json();
        set({ loading: false });
        if (!res.ok) {
          throw new Error(data.error || 'Error al procesar el PDF con IA');
        }
        return data; // returns { success, products, error, failedPageIndex, pagesText, productsParsedSoFar, model }
      } catch (err) {
        set({ loading: false });
        if (err.name === 'AbortError' || signal?.aborted) {
          return { success: false, cancelled: true };
        }
        set({ error: err.message });
        return { success: false, error: err.message };
      }
    },

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
                size,
                cost,
                price_promotional,
                price_public,
                description
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
            pricePaid: Number(item.price_paid),
            cost: Number(item.products?.cost || 0),
            pricePromotional: Number(item.products?.price_promotional || 0),
            pricePublic: Number(item.products?.price_public || 0),
            description: item.products?.description || ''
          }))
        }));

        const previousOrders = get().orders || [];
        if (previousOrders.length > 0) {
          const prevPendingIds = new Set(previousOrders.filter(o => o.status === 'pendiente').map(o => o.id));
          const hasNewPending = mappedOrders.some(o => o.status === 'pendiente' && !prevPendingIds.has(o.id));
          if (hasNewPending) {
            set({ hasNewOrdersAlert: true });
          }
        }

        set({ orders: mappedOrders, loading: false });
      } catch (err) {
        set({ error: err.message, loading: false });
      }
    },

    // Targeted stock verification for checkout (Minimal egress)
    verifyCartStock: async () => {
      const { cart } = get();
      if (!cart || cart.length === 0) {
        return { valid: true, outOfStockItems: [] };
      }

      const cartProductIds = cart.map(item => item.product.id);
      try {
        // Query Supabase directly checking ONLY stock for product IDs in cart (.in('id', arrayDeIds))
        const { data, error } = await supabase
          .from('products')
          .select('id, name, stock, price_public')
          .in('id', cartProductIds);

        if (error) throw error;

        const stockMap = new Map((data || []).map(p => [p.id, Number(p.stock || 0)]));
        const outOfStockItems = [];

        for (const item of cart) {
          const realStock = stockMap.has(item.product.id) ? stockMap.get(item.product.id) : 0;
          if (item.quantity > realStock) {
            outOfStockItems.push({
              id: item.product.id,
              name: item.product.name,
              requested: item.quantity,
              available: realStock
            });
          }
        }

        // Automatically update cart quantities or remove items if stock is insufficient
        if (outOfStockItems.length > 0) {
          set((state) => ({
            cart: state.cart
              .map(item => {
                const avail = stockMap.has(item.product.id) ? stockMap.get(item.product.id) : 0;
                if (avail <= 0) return null;
                if (item.quantity > avail) {
                  return { ...item, quantity: avail };
                }
                return item;
              })
              .filter(Boolean)
          }));
        }

        return {
          valid: outOfStockItems.length === 0,
          outOfStockItems
        };
      } catch (err) {
        console.error('Error verifying cart stock:', err);
        return { valid: true, outOfStockItems: [] };
      }
    },

    submitOrder: async (clientName, clientPhone) => {
      set({ loading: true, error: null });
      const { cart, user } = get();
      if (!cart.length) {
        set({ error: 'El carrito está vacío', loading: false });
        return null;
      }

      // Perform targeted stock verification before confirming order
      const stockCheck = await get().verifyCartStock();
      if (!stockCheck.valid) {
        const itemNames = stockCheck.outOfStockItems.map(i => `"${i.name}" (Disponible: ${i.available})`).join(', ');
        set({
          error: `Disponibilidad modificada: El stock cambió para: ${itemNames}. Hemos actualizado las cantidades en tu carrito.`,
          loading: false
        });
        return { outOfStock: true, outOfStockItems: stockCheck.outOfStockItems };
      }

      const isClient = user?.role === 'client';
      const isVendedor = user?.role === 'vendedor' || user?.role === 'owner';
      const roleUsed = isClient ? 'usuario' : (isVendedor ? (user?.role === 'owner' ? 'dueño' : 'vendedor') : 'publico');

      const total = cart.reduce((acc, curr) => {
        const price = getProductPriceForUser(curr.product, user);
        return acc + (price * curr.quantity);
      }, 0);

      const orderId = 'order_' + Date.now() + '_' + Math.floor(Math.random() * 100);
      const orderDate = new Date().toLocaleDateString('es-HN', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      try {
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

        const itemsToInsert = cart.map(item => ({
          order_id: orderId,
          product_id: item.product.id,
          quantity: item.quantity,
          price_paid: getProductPriceForUser(item.product, user)
        }));

        const { error: itemsErr } = await supabase
          .from('order_items')
          .insert(itemsToInsert);

        if (itemsErr) throw itemsErr;

        await get().fetchProducts();
        await get().fetchOrders();

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
            pricePaid: getProductPriceForUser(item.product, user)
          }))
        };

        try {
          await fetch('/api/send-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order: orderCreated,
              hasVipPrice: !!user
            })
          });
        } catch (tgErr) {
          console.error('Error sending TG notification via backend', tgErr);
        }

        set((state) => ({
          cart: [],
          orders: [orderCreated, ...state.orders.filter(o => o.id !== orderId)],
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
        let apiSuccess = false;
        let apiError = null;

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          const response = await fetch('/api/update-order-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ id, status })
          });

          const responseText = await response.text();
          let resData = null;
          try {
            resData = JSON.parse(responseText);
          } catch {
            // Not JSON
          }

          if (response.ok && resData && resData.success) {
            apiSuccess = true;
          } else if (resData && resData.error) {
            apiError = resData.error;
          }
        } catch (fetchErr) {
          console.warn('API update-order-status failed, falling back to direct DB:', fetchErr);
        }

        if (!apiSuccess) {
          // Direct Supabase fallback
          const { data: currentOrder, error: orderErr } = await supabase
            .from('orders')
            .select('status')
            .eq('id', id)
            .maybeSingle();

          if (orderErr) throw orderErr;
          if (!currentOrder) {
            throw new Error(apiError || 'No se encontró la orden especificada');
          }

          const oldStatus = currentOrder.status || 'pendiente';

          if (oldStatus !== 'entregado' && status === 'entregado') {
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
                  const newStock = Math.max(0, Number(prod.stock || 0) - Number(item.quantity || 0));
                  await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);
                }
              }
            }
          } else if (oldStatus === 'entregado' && status !== 'entregado') {
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
                  const newStock = Number(prod.stock || 0) + Number(item.quantity || 0);
                  await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);
                }
              }
            }
          }

          const { error: updateErr } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', id);

          if (updateErr) throw updateErr;
        }

        set((state) => ({
          orders: state.orders.map(o => o.id === id ? { ...o, status } : o),
          loading: false
        }));

        await get().fetchProducts();
        await get().fetchOrders();
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

    updateOrder: async (orderId, clientName, clientPhone, newItems) => {
      set({ loading: true, error: null });
      try {
        let apiSuccess = false;
        let apiError = null;

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          const response = await fetch('/api/update-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ orderId, clientName, clientPhone, newItems })
          });

          const responseText = await response.text();
          let resData = null;
          try {
            resData = JSON.parse(responseText);
          } catch {
            // Not JSON
          }

          if (response.ok && resData && resData.success) {
            apiSuccess = true;
          } else if (resData && resData.error) {
            apiError = resData.error;
          }
        } catch (fetchErr) {
          console.warn('API update-order failed, falling back to direct DB:', fetchErr);
        }

        if (!apiSuccess) {
          if (apiError) {
            throw new Error(apiError);
          }

          // Direct DB Fallback
          const { data: orderData, error: orderDataErr } = await supabase
            .from('orders')
            .select('status')
            .eq('id', orderId)
            .maybeSingle();

          if (orderDataErr) throw orderDataErr;
          const isDelivered = orderData && orderData.status === 'entregado';

          if (isDelivered) {
            const { data: oldItems, error: oldItemsErr } = await supabase
              .from('order_items')
              .select('product_id, quantity')
              .eq('order_id', orderId);

            if (oldItemsErr) throw oldItemsErr;

            if (oldItems) {
              for (const oldItem of oldItems) {
                const { data: prod } = await supabase
                  .from('products')
                  .select('stock')
                  .eq('id', oldItem.product_id)
                  .maybeSingle();
                if (prod) {
                  await supabase
                    .from('products')
                    .update({ stock: Number(prod.stock || 0) + Number(oldItem.quantity) })
                    .eq('id', oldItem.product_id);
                }
              }
            }
          }

          const { error: deleteErr } = await supabase
            .from('order_items')
            .delete()
            .eq('order_id', orderId);

          if (deleteErr) throw deleteErr;

          const total = newItems.reduce((acc, curr) => acc + (curr.pricePaid * curr.quantity), 0);

          const itemsToInsert = newItems.map(item => ({
            order_id: orderId,
            product_id: item.productId,
            quantity: item.quantity,
            price_paid: item.pricePaid
          }));

          const { error: insertErr } = await supabase
            .from('order_items')
            .insert(itemsToInsert);

          if (insertErr) throw insertErr;

          if (isDelivered) {
            for (const item of newItems) {
              const { data: prod } = await supabase
                .from('products')
                .select('stock')
                .eq('id', item.productId)
                .maybeSingle();
              if (prod) {
                const newStock = Math.max(0, Number(prod.stock || 0) - Number(item.quantity));
                await supabase
                  .from('products')
                  .update({ stock: newStock })
                  .eq('id', item.productId);
              }
            }
          }

          const { error: orderUpdateErr } = await supabase
            .from('orders')
            .update({
              client_name: clientName,
              client_phone: clientPhone,
              total: total
            })
            .eq('id', orderId);

          if (orderUpdateErr) throw orderUpdateErr;
        }

        await get().fetchOrders();
        await get().fetchProducts();
        set({ loading: false });
        return true;
      } catch (err) {
        set({ error: err.message, loading: false });
        return false;
      }
    },

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

    addToCart: (product, quantity) => {
      const { cart } = get();
      const existing = cart.find(item => item.product.id === product.id);
      const maxQty = product.availableStock !== undefined ? product.availableStock : product.stock;
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

      const maxQty = item.product.availableStock !== undefined ? item.product.availableStock : item.product.stock;
      const finalQty = Math.max(1, Math.min(maxQty, qty));

      set({
        cart: cart.map(i => i.product.id === productId ? { ...i, quantity: finalQty } : i)
      });
    },

    clearCart: () => set({ cart: [] }),

    fetchFavorites: async () => {
      const user = get().user;
      if (!user || !user.uid) {
        set({ favorites: [] });
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
        set({ favorites: [] });
      }
    },

    toggleFavorite: async (productId) => {
      const user = get().user;
      if (!user || !user.uid) return;

      const currentFavs = get().favorites;
      const isFav = currentFavs.includes(productId);
      const updatedFavs = isFav 
        ? currentFavs.filter(id => id !== productId) 
        : [...currentFavs, productId];

      set({ favorites: updatedFavs });

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
      } catch (err) {
        console.error('Error toggling favorite in DB:', err);
      }
    },

    repeatOrder: (orderItems) => {
      const { products } = get();
      const itemsToSet = [];
      let itemsSkipped = 0;
      let stockAdjusted = false;

      orderItems.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const availStock = prod ? (prod.availableStock ?? prod.stock) : 0;
        if (prod && availStock > 0) {
          let qtyToAdd = item.quantity;
          if (qtyToAdd > availStock) {
            qtyToAdd = availStock;
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
    },

    updateShowroomCuration: async (updatedItems) => {
      set({ loading: true, error: null });
      try {
        const { products } = get();
        const updatedProducts = products.map(p => {
          const update = updatedItems.find(u => u.id === p.id);
          if (update) {
            return {
              ...p,
              featuredPublic: update.featuredPublic !== undefined ? Boolean(update.featuredPublic) : p.featuredPublic,
              publicDiscount: update.publicDiscount !== undefined ? Number(update.publicDiscount || 0) : p.publicDiscount
            };
          }
          return p;
        });

        // Fast parallel update in chunks of 20
        const chunkSize = 20;
        let hasErrors = false;
        let lastError = null;

        for (let i = 0; i < updatedItems.length; i += chunkSize) {
          const chunk = updatedItems.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map(item => {
              const dbPayload = {};
              if (item.featuredPublic !== undefined) dbPayload.featured_public = Boolean(item.featuredPublic);
              if (item.publicDiscount !== undefined) dbPayload.public_discount = Number(item.publicDiscount || 0);

              return supabase
                .from('products')
                .update(dbPayload)
                .eq('id', item.id)
                .then(({ error }) => {
                  if (error) {
                    console.error('DB update error for item:', item.id, error);
                    hasErrors = true;
                    lastError = error;
                  }
                })
                .catch(e => {
                  console.error('DB update catch:', item.id, e);
                  hasErrors = true;
                  lastError = e;
                });
            })
          );
        }

        if (hasErrors) {
          throw new Error(lastError?.message || 'Error al guardar algunos productos en la base de datos.');
        }

        set({ products: updatedProducts, loading: false });
        return true;
      } catch (err) {
        console.error('Error updating showroom curation:', err);
        set({ error: err.message, loading: false });
        return false;
      }
    },

    fetchCustomers: async () => {
      try {
        // Try fetching with email column in case it exists or was added
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, role, phone, address, created_at, email')
          .order('created_at', { ascending: false });

        let result = [];
        if (!error) {
          result = data || [];
        } else {
          // Fallback without email column if it doesn't exist
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('profiles')
            .select('id, name, role, phone, address, created_at')
            .order('created_at', { ascending: false });

          if (fallbackError) throw fallbackError;
          result = fallbackData || [];
        }

        const previousCustomers = get().customers || [];
        if (previousCustomers.length > 0) {
          const isPending = (c) => !c.role || c.role === 'pendiente' || c.role === 'usuario' || c.role === 'cliente';
          const prevPendingIds = new Set(previousCustomers.filter(isPending).map(c => c.id));
          const hasNewPending = result.some(c => isPending(c) && !prevPendingIds.has(c.id));
          if (hasNewPending) {
            set({ hasNewRegistrationsAlert: true });
            playCustomerAlertSound();
          }
        }

        set({ customers: result });
        return result;
      } catch (err) {
        console.error('Error fetching customers:', err);
        return [];
      }
    },

    updateCustomerRole: async (profileId, newRole) => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', profileId);

        if (error) throw error;
        return { success: true };
      } catch (err) {
        console.error('Error updating customer role:', err);
        return { success: false, error: err.message };
      }
    },

    updateCustomerFields: async (profileId, fields) => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update(fields)
          .eq('id', profileId);

        if (error) throw error;
        return { success: true };
      } catch (err) {
        console.error('Error updating customer fields:', err);
        return { success: false, error: err.message };
      }
    },

    createCustomerManually: async (name, role, phone, address, email) => {
      try {
        const uniqueId = 'manual-client-' + Math.random().toString(36).substring(2, 11);
        
        // Let's check if we can insert email, try first with email if email provided
        const payload = {
          id: uniqueId,
          name,
          role,
          phone: phone || null,
          address: address || null
        };
        
        if (email) {
          payload.email = email;
        }

        const { data, error } = await supabase
          .from('profiles')
          .insert(payload)
          .select()
          .single();

        if (error) {
          // If insert failed due to column "email", retry without email
          if (error.message && error.message.includes('column "email"')) {
            const { email: _, ...safePayload } = payload;
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('profiles')
              .insert(safePayload)
              .select()
              .single();
            if (fallbackError) throw fallbackError;
            return { success: true, data: fallbackData };
          }
          throw error;
        }
        return { success: true, data };
      } catch (err) {
        console.error('Error creating customer manually:', err);
        return { success: false, error: err.message };
      }
    },

    deleteCustomer: async (profileId) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch('/api/delete-customer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ targetId: profileId })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al eliminar el cliente');
        }

        // Update local store customers list
        set((state) => ({
          customers: (state.customers || []).filter(c => c.id !== profileId)
        }));

        return { success: true };
      } catch (err) {
        console.error('Error deleting customer:', err);
        return { success: false, error: err.message };
      }
    },

    resendVerificationEmail: async (email) => {
      try {
        if (!email) throw new Error('El correo electrónico es requerido.');
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        return { success: true };
      } catch (err) {
        console.error('Error resending verification email:', err);
        return { success: false, error: err.message };
      }
    },

    sendPasswordResetEmail: async (email) => {
      try {
        if (!email) throw new Error('El correo electrónico es requerido.');
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/update-password'
        });
        if (error) throw error;
        return { success: true };
      } catch (err) {
        console.error('Error sending password reset link:', err);
        return { success: false, error: err.message };
      }
    },

    clearNewRegistrationsAlert: () => set({ hasNewRegistrationsAlert: false }),
    clearNewOrdersAlert: () => set({ hasNewOrdersAlert: false }),

    initRealtime: () => {
      if (get().realtimeInitialized) return;
      set({ realtimeInitialized: true });

      // Subscribe to inserts in profiles
      const profilesChannel = supabase
        .channel('realtime-profiles')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'profiles' },
          async (payload) => {
            console.log('Realtime profile insert received:', payload.new);
            // Fetch customers again
            await get().fetchCustomers();
            // Set alert and play sound
            set({ hasNewRegistrationsAlert: true });
            playCustomerAlertSound();
          }
        )
        .subscribe();

      // Subscribe to updates in profiles (so if we change roles, lists update instantly)
      const profilesUpdatesChannel = supabase
        .channel('realtime-profiles-updates')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles' },
          async (payload) => {
            console.log('Realtime profile update received:', payload.new);
            await get().fetchCustomers();
          }
        )
        .subscribe();

      // Subscribe to inserts/updates in orders
      const ordersChannel = supabase
        .channel('realtime-orders')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          async (payload) => {
            console.log('Realtime order change received:', payload.eventType, payload.new);
            await get().fetchOrders();
            if (payload.eventType === 'INSERT') {
              set({ hasNewOrdersAlert: true });
              playOrderAlertSound();
            }
          }
        )
        .subscribe();
    },

    reportPhysicalSale: async (itemsOrProductId, quantityOrName, clientNameOrPhone, clientPhoneOrBuyerId, pricePaidOrRole, buyerIdParam, roleUsedParam) => {
      set({ loading: true, error: null });
      try {
        let items = [];
        let clientName = 'Venta Física (Mostrador)';
        let clientPhone = '';
        let buyerId = null;
        let roleUsed = 'detalle';

        if (Array.isArray(itemsOrProductId)) {
          items = itemsOrProductId;
          clientName = quantityOrName || 'Venta Física (Mostrador)';
          clientPhone = clientNameOrPhone || '';
          buyerId = clientPhoneOrBuyerId || null;
          roleUsed = pricePaidOrRole || 'detalle';
        } else {
          items = [{
            productId: itemsOrProductId,
            quantity: Number(quantityOrName || 1),
            pricePaid: Number(pricePaidOrRole || 0)
          }];
          clientName = clientNameOrPhone || 'Venta Física (Mostrador)';
          clientPhone = clientPhoneOrBuyerId || '';
          buyerId = buyerIdParam || null;
          roleUsed = roleUsedParam || 'detalle';
        }

        if (!items || items.length === 0) {
          throw new Error('Debes incluir al menos un perfume en la venta.');
        }

        const orderId = 'physical_' + Date.now() + '_' + Math.floor(Math.random() * 100);
        const orderDate = new Date().toLocaleDateString('es-HN', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });

        // 1. Calculate total and verify stock
        let total = 0;
        for (const item of items) {
          const { data: prod, error: prodErr } = await supabase
            .from('products')
            .select('stock, name')
            .eq('id', item.productId)
            .maybeSingle();

          if (prodErr) throw prodErr;
          if (!prod) throw new Error(`Producto no encontrado.`);

          const currentStock = Number(prod.stock || 0);
          if (currentStock < item.quantity) {
            throw new Error(`Stock insuficiente para "${prod.name}". Stock actual: ${currentStock}, solicitado: ${item.quantity}`);
          }
          total += Number(item.pricePaid) * Number(item.quantity);
        }

        // 2. Insert order
        const { error: orderErr } = await supabase
          .from('orders')
          .insert({
            id: orderId,
            client_name: clientName || 'Venta Física (Mostrador)',
            client_phone: clientPhone || '',
            total: total,
            status: 'entregado',
            role_used: roleUsed || 'detalle',
            buyer_id: buyerId || null,
            date: orderDate
          });

        if (orderErr) throw orderErr;

        // 3. Insert items and subtract stock
        for (const item of items) {
          const { error: itemsErr } = await supabase
            .from('order_items')
            .insert({
              order_id: orderId,
              product_id: item.productId,
              quantity: item.quantity,
              price_paid: item.pricePaid
            });

          if (itemsErr) throw itemsErr;

          const { data: currentP } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.productId)
            .single();

          if (currentP) {
            const newStock = Math.max(0, Number(currentP.stock) - item.quantity);
            await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', item.productId);
          }
        }

        await get().fetchProducts();
        await get().fetchOrders();

        set({ loading: false });
        return { success: true };
      } catch (err) {
        console.error('Error reporting physical sale:', err);
        set({ error: err.message, loading: false });
        return { success: false, error: err.message };
      }
    }
}
});
