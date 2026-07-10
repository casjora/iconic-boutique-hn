import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nsubmnvkojsmoykfcjgl.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_FIp9glGAZJ1hLMp2pEKtcQ_BwSQPR1e';

export const supabase = createClient(supabaseUrl, supabaseKey);
