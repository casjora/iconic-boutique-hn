import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nsubmnvkojsmoykfcjgl.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_FIp9glGAZJ1hLMp2pEKtcQ_BwSQPR1e';

// Hybrid cookie + localStorage storage handler to ensure auth sessions work seamlessly in cross-site iframes (AI Studio) and standalone domains (Vercel)
const dualStorage = {
  getItem: (key) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const localVal = window.localStorage.getItem(key);
        if (localVal) return localVal;
      } catch (err) {
        console.warn('localStorage getItem error:', err);
      }
    }
    if (typeof document === 'undefined') return null;
    const name = key + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return null;
  },
  setItem: (key, value) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch (err) {
        console.warn('localStorage setItem error:', err);
      }
    }
    if (typeof document === 'undefined') return;
    const isHttps = window.location.protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';
    // Use Lax SameSite and path=/ for session validation, secure if https
    try {
      document.cookie = `${key}=${encodeURIComponent(value)}; path=/; SameSite=Lax${secureFlag}`;
    } catch (err) {
      console.warn('cookie setItem error:', err);
    }
  },
  removeItem: (key) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch (err) {
        console.warn('localStorage removeItem error:', err);
      }
    }
    if (typeof document === 'undefined') return;
    const isHttps = window.location.protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';
    try {
      document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax${secureFlag}`;
    } catch (err) {
      console.warn('cookie removeItem error:', err);
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: dualStorage,
    persistSession: true,
    detectSessionInUrl: true
  }
});

