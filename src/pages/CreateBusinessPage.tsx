import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Globe,
  LogIn,
  Store,
  Shield,
  Layers,
} from 'lucide-react';

interface CreateBusinessPageProps {
  onOpenConfig?: () => void;
}

export const CreateBusinessPage: React.FC<CreateBusinessPageProps> = ({ onOpenConfig }) => {
  const { navigate } = useRouter();
  const { user, refreshUserData } = useAuth();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ slug: string; name: string } | null>(null);

  // Auto-generate clean slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isSlugManuallyEdited) {
      const generatedSlug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    const cleaned = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-');
    setSlug(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be signed in with Supabase Auth to create a tenant.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Please set your credentials first.');
      return;
    }

    const trimmedName = name.trim();
    const trimmedSlug = slug.trim().toLowerCase();

    if (!trimmedName || !trimmedSlug) {
      setError('Please provide both business name and slug.');
      return;
    }

    if (trimmedSlug.length < 3) {
      setError('Slug must be at least 3 characters.');
      return;
    }

    setLoading(true);

    try {
      // Call Supabase RPC create_tenant(p_slug, p_name)
      const { data, error: rpcError } = await supabase.rpc('create_tenant', {
        p_slug: trimmedSlug,
        p_name: trimmedName,
      });

      if (rpcError) {
        console.error('RPC create_tenant failed:', rpcError);
        setError(rpcError.message || 'Failed to create business via RPC.');
        setLoading(false);
        return;
      }

      setSuccessResult({ slug: trimmedSlug, name: trimmedName });

      // Refresh auth memberships so current user gets 'tenant_owner' role
      await refreshUserData();

      // Redirect after brief celebration
      setTimeout(() => {
        navigate('/admin');
      }, 1500);
    } catch (err: any) {
      console.error('Unexpected error creating tenant:', err);
      setError(err?.message || 'An error occurred during tenant creation.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6">
      {/* Page Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Multi-Tenant Onboarding</span>
        </div>
        <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">
          Create My Turf Business
        </h1>
        <p className="text-sm text-neutral-500 mt-2 max-w-lg mx-auto">
          Spin up a dedicated, path-isolated venue instance with independent branding, turfs, and staff access.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Supabase Connection Required</span>
            <p className="mt-0.5 text-amber-700">
              Creating a tenant calls the <code className="bg-amber-100 px-1 rounded font-mono">create_tenant(p_slug, p_name)</code> stored RPC in your Supabase database.
            </p>
            {onOpenConfig && (
              <button
                type="button"
                onClick={onOpenConfig}
                className="mt-2 text-xs font-semibold px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer"
              >
                Configure Supabase
              </button>
            )}
          </div>
        </div>
      )}

      {/* Auth Guard Banner if not signed in */}
      {!user && (
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-950 text-sm">Account Required</h3>
              <p className="text-xs text-blue-800 mt-0.5">
                Sign in first so you can be designated as the <code className="bg-blue-100 px-1 rounded font-bold">tenant_owner</code> in <code className="bg-blue-100 px-1 rounded">tenant_members</code>.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 flex items-center justify-center"
          >
            Sign In / Sign Up
          </button>
        </div>
      )}

      {/* Success Notification */}
      {successResult && (
        <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">Turf Business Created Successfully!</h3>
            <p className="text-xs text-emerald-700 mt-1">
              Registered <strong>{successResult.name}</strong> at path <code className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded">/t/{successResult.slug}</code>. Redirecting to your Admin Shell...
            </p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
              Turf Facility / Business Name (<code className="text-emerald-700 font-mono">p_name</code>)
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Skyline Sports Arena"
                className="w-full text-base sm:text-sm pl-10 pr-3 py-2.5 min-h-[44px] bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              The public name displayed on your storefront and header.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
              URL Subpath / Slug (<code className="text-emerald-700 font-mono">p_slug</code>)
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={slug}
                onChange={handleSlugChange}
                placeholder="skyline-sports-arena"
                className="w-full text-base sm:text-sm pl-10 pr-3 py-2.5 min-h-[44px] bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div className="mt-2 p-2.5 bg-neutral-100 rounded-xl flex items-center gap-2 text-xs text-neutral-600 font-mono">
              <span className="text-neutral-400">Public URL:</span>
              <span className="font-semibold text-emerald-700 truncate">
                {window.location.origin}/t/{slug || 'your-slug'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2 text-xs text-neutral-600">
            <div className="font-semibold text-neutral-800 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>What happens next:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-neutral-600 text-[11px]">
              <li>Calls Supabase RPC: <code className="font-mono bg-neutral-200 px-1 rounded">create_tenant(p_slug, p_name)</code></li>
              <li>Generates entry in the <code className="font-mono bg-neutral-200 px-1 rounded">tenants</code> table</li>
              <li>Grants your user ID the <code className="font-mono bg-neutral-200 px-1 rounded font-bold text-emerald-800">tenant_owner</code> role in <code className="font-mono bg-neutral-200 px-1 rounded">tenant_members</code></li>
              <li>Redirects to your new <strong>Admin Shell</strong> to manage turfs and schedule</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading || !user}
            className="w-full min-h-[44px] py-3 px-4 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Register Turf Business</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
