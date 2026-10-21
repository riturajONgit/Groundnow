import React, { useState, useEffect } from 'react';
import { useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getTenantThemeStyles } from '../lib/theme';
import type { Tenant } from '../types/database';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Building2,
  Store,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
  tenantSlug?: string | null;
  onOpenConfig?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  tenantSlug,
  onOpenConfig,
}) => {
  const { navigate } = useRouter();
  const { user, signIn, signUp, userRole, isStaffOrOwner, primaryTenant } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tenant state if accessed under /t/:slug/login
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (tenantSlug && isSupabaseConfigured) {
      supabase
        .from('tenants')
        .select('*')
        .eq('slug', tenantSlug)
        .single()
        .then(({ data }) => {
          if (data) setTenant(data as Tenant);
        });
    }
  }, [tenantSlug]);

  // If already logged in, redirect according to rule:
  // "After login: staff/owner → /admin, customer → /t/:slug"
  useEffect(() => {
    if (user && !loading) {
      if (isStaffOrOwner) {
        navigate('/admin');
      } else if (tenantSlug) {
        navigate(`/t/${tenantSlug}`);
      } else if (primaryTenant?.slug) {
        navigate(`/t/${primaryTenant.slug}`);
      }
    }
  }, [user, isStaffOrOwner, tenantSlug, primaryTenant, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error, role } = await signIn(email, password);
        if (error) {
          setErrorMessage(error.message);
          setLoading(false);
          return;
        }

        // Redirect according to requirement:
        // "After login: staff/owner → /admin, customer → /t/:slug"
        if (role === 'tenant_owner' || role === 'tenant_staff') {
          navigate('/admin');
        } else {
          if (tenantSlug) {
            navigate(`/t/${tenantSlug}`);
          } else if (tenant?.slug) {
            navigate(`/t/${tenant.slug}`);
          } else {
            // Check if there is any tenant to route to
            const { data: firstTenant } = await supabase
              .from('tenants')
              .select('slug')
              .limit(1)
              .maybeSingle();

            if (firstTenant?.slug) {
              navigate(`/t/${firstTenant.slug}`);
            } else {
              navigate('/');
            }
          }
        }
      } else {
        // Sign up
        const { error, user: newUser } = await signUp(email, password);
        if (error) {
          setErrorMessage(error.message);
          setLoading(false);
          return;
        }

        if (newUser && !newUser.identities?.length) {
          setErrorMessage('An account with this email already exists. Please sign in instead.');
          setLoading(false);
          return;
        }

        setSuccessMessage(
          'Account created! If email confirmation is enabled on your Supabase instance, check your inbox. Otherwise, signing you in...'
        );

        // Attempt immediate login if auto-confirmed
        const { error: loginErr, role } = await signIn(email, password);
        if (!loginErr) {
          if (role === 'tenant_owner' || role === 'tenant_staff') {
            navigate('/admin');
          } else if (tenantSlug) {
            navigate(`/t/${tenantSlug}`);
          } else {
            navigate('/');
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const theme = getTenantThemeStyles(tenant?.brand_color);

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8 bg-neutral-50/50">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          {tenant ? (
            <div className="flex flex-col items-center">
              {tenant.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="w-16 h-16 rounded-2xl object-cover mb-3 border border-neutral-200 shadow-sm"
                />
              ) : (
                <div
                  style={theme.buttonStyle}
                  className="w-16 h-16 rounded-2xl font-black text-xl flex items-center justify-center mb-3 shadow-sm"
                >
                  {tenant.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                {tenant.name}
              </h2>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">
                /t/{tenant.slug}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-md">
                <Store className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                GroundNow Platform
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Multi-Tenant Turf Booking & Management
              </p>
            </div>
          )}
        </div>

        {/* Backend status warning if missing */}
        {!isSupabaseConfigured && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Supabase Connection Required</span>
              <p className="mt-0.5 text-amber-700">
                To sign up or log in, please configure your Supabase URL & Anon Key.
              </p>
              {onOpenConfig && (
                <button
                  type="button"
                  onClick={onOpenConfig}
                  className="mt-2 text-xs font-semibold px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer"
                >
                  Enter Supabase Keys
                </button>
              )}
            </div>
          </div>
        )}

        {/* Auth Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200/90 shadow-xl">
          {/* Tab Switcher */}
          <div className="flex rounded-xl bg-neutral-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 min-h-[44px] py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                mode === 'login'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 min-h-[44px] py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                mode === 'signup'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Role Behavior Clarification */}
          <div className="mb-4 p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-[11px] text-neutral-500 space-y-0.5">
            <span className="font-semibold text-neutral-700">Role Routing:</span>
            <p>
              Staff &amp; Owners are automatically routed to <strong>/admin</strong>. Customers are routed to the turf venue (<strong>/t/:slug</strong>).
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full text-base sm:text-xs pl-10 pr-3 py-2.5 min-h-[44px] bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-base sm:text-xs pl-10 pr-10 py-2.5 min-h-[44px] bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-neutral-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={tenant ? theme.buttonStyle : undefined}
              className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                !tenant
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'hover:opacity-95'
              } disabled:opacity-50`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to GroundNow' : 'Create Account'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-neutral-100 text-center">
            <button
              type="button"
              onClick={() => navigate('/create-business')}
              className="min-h-[44px] w-full px-2 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer flex items-center justify-center flex-wrap"
            >
              <span>Are you a turf facility owner?&nbsp;</span>
              <span className="text-emerald-600 font-bold underline">
                Register your venue here
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
