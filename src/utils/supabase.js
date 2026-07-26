import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nsubmnvkojsmoykfcjgl.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_FIp9glGAZJ1hLMp2pEKtcQ_BwSQPR1e';

// Custom cookie-based storage to avoid using localStorage for sessions/credentials
const cookieStorage = {
  getItem: (key) => {
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
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    // Use Lax SameSite and path=/ for general access, secure if on https
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; SameSite=Lax${secure}`;
  },
  removeItem: (key) => {
    document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`;
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: cookieStorage,
    persistSession: true,
    detectSessionInUrl: true
  }
});

