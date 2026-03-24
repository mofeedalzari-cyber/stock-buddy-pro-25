import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'employee';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  displayName: string;
  organizationId: string | null;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const fetchRole = async (userId: string): Promise<AppRole | null> => {
    const { data, error } = await supabase
      .from('user_roles' as any)
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching role:', error);
      return null;
    }

    return ((data as any)?.role as AppRole | undefined) ?? null;
  };

  const fetchProfile = async (userId: string): Promise<{ displayName: string; orgId: string | null }> => {
    const { data, error } = await supabase
      .from('profiles' as any)
      .select('display_name, organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return { displayName: '', orgId: null };
    }

    const d = data as any;
    return { displayName: d?.display_name ?? '', orgId: d?.organization_id ?? null };
  };

  useEffect(() => {
    let mounted = true;
    let currentUserId: string | null = null;

    const applySession = (nextSession: Session | null) => {
      if (!mounted) return;

      const nextUserId = nextSession?.user?.id ?? null;

      if (nextUserId && nextUserId === currentUserId) {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        return;
      }

      currentUserId = nextUserId;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setRole(null);
        setDisplayName('');
        setOrganizationId(null);
        setLoading(false);
        return;
      }

      setLoading(false);

      void Promise.allSettled([
        fetchRole(nextSession.user.id),
        fetchProfile(nextSession.user.id),
      ]).then(([roleResult, profileResult]) => {
        if (!mounted) return;
        setRole(roleResult.status === 'fulfilled' ? roleResult.value : null);
        if (profileResult.status === 'fulfilled') {
          setDisplayName(profileResult.value.displayName);
          setOrganizationId(profileResult.value.orgId);
        }
      });
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        applySession(initialSession);
      })
      .catch((error) => {
        console.error('Error getting session:', error);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error?.message || null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setDisplayName('');
    setOrganizationId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        displayName,
        organizationId,
        signUp,
        signIn,
        signOut,
        isAdmin: role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
