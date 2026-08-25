import { writable } from 'svelte/store';
import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

export const user = writable<User | null>(null);
export const loading = writable(true);

// Initialize auth state
export const initAuth = () => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    user.set(session?.user ?? null);
    loading.set(false);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    user.set(session?.user ?? null);
  });
};
