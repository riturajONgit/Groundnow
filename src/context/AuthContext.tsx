import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { TenantMember, TenantRole, Tenant } from '../types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  memberships: TenantMember[];
  primaryTenant: Tenant | null;
  isStaffOrOwner: boolean;
  userRole: TenantRole;
  refreshUserData: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; role: TenantRole }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; user: User | null }>;
  signOut: () => Promise<void>;
  getRoleForTenant: (tenantId?: string | null) => TenantRole;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [memberships, setMemberships] = useState<TenantMember[]>([]);
  const [primaryTenant, setPrimaryTenant] = useState<Tenant | null>(null);

  const fetchUserRoles = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) return;

    try {
      // Query tenant_members table
      const { data, error } = await supabase
        .from('tenant_members')
        .select('*, tenants(*)')
        .eq('user_id', userId);

      if (error) {
        console.warn('Error fetching tenant_members:', error.message);
        setMemberships([]);
        setPrimaryTenant(null);
        return;
      }

      if (data && data.length > 0) {
        const typedData = data as unknown as TenantMember[];
        setMemberships(typedData);
        // Find primary tenant if joined
        const firstWithTenant = typedData.find((m) => m.tenants);
        if (firstWithTenant && firstWithTenant.tenants) {
          setPrimaryTenant(firstWithTenant.tenants);
        } else if (typedData[0].tenant_id) {
          // If foreign table join is not configured or disabled, fetch tenant directly
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', typedData[0].tenant_id)
            .single();
          if (tenantData) {
            setPrimaryTenant(tenantData as Tenant);
          }
        }
      } else {
        setMemberships([]);
        setPrimaryTenant(null);
      }
    } catch (err) {
      console.warn('Unexpected error querying memberships:', err);
      setMemberships([]);
      setPrimaryTenant(null);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await fetchUserRoles(currentSession.user.id);
      } else {
        setMemberships([]);
        setPrimaryTenant(null);
      }
    } catch (err) {
      console.error('Error refreshing auth:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchUserRoles]);

  useEffect(() => {
    refreshUserData();

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchUserRoles(newSession.user.id);
      } else {
        setMemberships([]);
        setPrimaryTenant(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserRoles, refreshUserData]);

  const isStaffOrOwner = memberships.some(
    (m) => m.role === 'tenant_owner' || m.role === 'tenant_staff'
  );

  const userRole: TenantRole = memberships.some((m) => m.role === 'tenant_owner')
    ? 'tenant_owner'
    : memberships.some((m) => m.role === 'tenant_staff')
    ? 'tenant_staff'
    : 'customer';

  const getRoleForTenant = useCallback(
    (tenantId?: string | null): TenantRole => {
      if (!tenantId) return userRole;
      const match = memberships.find((m) => m.tenant_id === tenantId);
      if (!match) return 'customer';
      return match.role;
    },
    [memberships, userRole]
  );

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Please provide your Supabase URL & Anon Key.'), role: 'customer' as TenantRole };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error, role: 'customer' as TenantRole };
    }

    let detectedRole: TenantRole = 'customer';
    if (data.user) {
      try {
        const { data: memberRows } = await supabase
          .from('tenant_members')
          .select('*, tenants(*)')
          .eq('user_id', data.user.id);

        if (memberRows && memberRows.length > 0) {
          const typedRows = memberRows as unknown as TenantMember[];
          setMemberships(typedRows);
          if (typedRows.some((r) => r.role === 'tenant_owner')) {
            detectedRole = 'tenant_owner';
          } else if (typedRows.some((r) => r.role === 'tenant_staff')) {
            detectedRole = 'tenant_staff';
          }
        }
      } catch (err) {
        console.warn('Could not query role on login:', err);
      }
    }

    return { error: null, role: detectedRole };
  };

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured.'), user: null };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    return { error, user: data.user };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setMemberships([]);
    setPrimaryTenant(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        memberships,
        primaryTenant,
        isStaffOrOwner,
        userRole,
        refreshUserData,
        signIn,
        signUp,
        signOut,
        getRoleForTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
