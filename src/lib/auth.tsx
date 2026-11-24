import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import type { Profile } from './database.types';
import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const lastUserId = useRef<string | null>(null);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
      setProfile(data ?? null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      lastUserId.current = data.session?.user.id ?? null;
      setSession(data.session);
      await loadProfile(data.session);
      if (active) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Only reload the profile when a different user signs in or out, not on token refreshes.
      const userId = s?.user.id ?? null;
      if (userId === lastUserId.current) return;
      lastUserId.current = userId;
      setProfile(null);
      if (s) setProfileLoading(true);
      // Load outside the callback, as Supabase recommends, to avoid blocking the auth client.
      setTimeout(() => {
        void loadProfile(s);
      }, 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value: AuthState = {
    session,
    profile,
    // Block the screen only while there's no profile yet, so refreshes never reset navigation.
    loading: loading || (profileLoading && !profile),
    refreshProfile: () => loadProfile(session),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
