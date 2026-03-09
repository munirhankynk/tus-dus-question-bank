import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface UserProfile {
  id: string;
  name: string;
  mode: 'TUS' | 'DUS';
  university: string | null;
  attempt_number: number | null;
  streak_count: number;
  last_active_date: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: () => Promise<void>;
  createProfile: (params: { name: string; mode: 'TUS' | 'DUS'; university?: string; attemptNumber?: number }) => Promise<{ data: UserProfile | null; error: any }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,

  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (data && !error) set({ profile: data as UserProfile });
  },

  createProfile: async ({ name, mode, university, attemptNumber }) => {
    const { user } = get();
    if (!user) return { data: null, error: 'Kullanıcı bulunamadı' };
    const { data, error } = await supabase
      .from('users')
      .insert({ id: user.id, name, mode, university: university || null, attempt_number: attemptNumber || null, streak_count: 0 })
      .select().single();
    if (data && !error) set({ profile: data as UserProfile });
    return { data: data as UserProfile | null, error };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, session: null });
  },
}));