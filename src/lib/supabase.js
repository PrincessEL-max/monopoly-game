import { createClient } from '@supabase/supabase-js';
import { MULTIPLAYER_ENABLED } from '../constants/config.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = MULTIPLAYER_ENABLED && supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: true, persistSession: true },
    })
  : null;
