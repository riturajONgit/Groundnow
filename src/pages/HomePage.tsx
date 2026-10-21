import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import type { Tenant } from '../types/database';
import { getTenantThemeStyles } from '../lib/theme';
import {
  Store,
  PlusCircle,
  ArrowRight,
  Search,
  Building2,
  ShieldCheck,
  LayoutDashboard,
  Layers,
  Sparkles,
  ExternalLink,
  MapPin,
  Database,
} from 'lucide-react';

interface HomePageProps {
  onOpenConfig?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenConfig }) => {
  const { navigate } = useRouter();
  const { user, isStaffOrOwner, userRole } = useAuth();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [directSlug, setDirectSlug] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setTenants(data as Tenant[]);
        } else {
          setTenants([]);
        }
        setLoading(false);
      });
  }, []);

  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      (t.city && t.city.toLowerCase().includes(q))
    );
  });

  const handleDirectJump = (e: React.FormEvent) => {
    e.preventDefault();
    if (directSlug.trim()) {
      navigate(`/t/${directSlug.trim().toLowerCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-neutral-900 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-neutral-800">
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20px 20px, #10b981 1.5%, transparent 0%)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Online Turf Booking</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            GroundNow Booking Platform
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            Discover premier sports turfs and arenas with custom venue branding. Each facility operates on its own dedicated path <code className="text-emerald-400 font-mono text-xs bg-neutral-800 px-1.5 py-0.5 rounded">/t/:slug</code>.
          </p>

          {/* Quick Direct Jump Input */}
          <form
            onSubmit={handleDirectJump}
            className="pt-4 max-w-md mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400">
                /t/
              </span>
              <input
                type="text"
                value={directSlug}
                onChange={(e) => setDirectSlug(e.target.value)}
                placeholder="enter-venue-slug"
                className="w-full min-h-[44px] text-base sm:text-xs font-mono pl-9 pr-3 py-2.5 bg-neutral-800/90 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[44px] py-2.5 px-5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer flex items-center justify-center"
            >
              Go to Venue
            </button>
          </form>

          {/* CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <button
              onClick={() => navigate('/create-business')}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Create My Turf Business</span>
            </button>

            {isStaffOrOwner && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Go to Admin Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Directory Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <span>Registered Turf Venues</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-200 text-neutral-800 font-semibold">
                {tenants.length}
              </span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Select a facility to experience its custom brand color and turf catalogue.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or slug..."
              className="w-full min-h-[44px] text-base sm:text-xs pl-9 pr-3 py-2 bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Tenant Cards Grid */}
        {loading ? (
          <div className="py-16 text-center text-xs text-neutral-500">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto mb-2" />
            <span>Loading registered tenants from database...</span>
          </div>
        ) : filteredTenants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {filteredTenants.map((t) => {
              const theme = getTenantThemeStyles(t.brand_color);
              return (
                <div
                  key={t.id}
                  onClick={() => navigate(`/t/${t.slug}`)}
                  className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group hover:border-neutral-300"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      {t.logo_url ? (
                        <img
                          src={t.logo_url}
                          alt={t.name}
                          className="w-12 h-12 rounded-xl object-cover border border-neutral-200 shadow-2xs group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          style={theme.buttonStyle}
                          className="w-12 h-12 rounded-xl font-black text-base flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform"
                        >
                          {t.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      <span
                        style={theme.badgeStyle}
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                      >
                        Active
                      </span>
                    </div>

                    <h3 className="font-bold text-neutral-900 text-base group-hover:text-emerald-700 transition-colors">
                      {t.name}
                    </h3>
                    <div className="text-xs font-mono text-neutral-400 mt-0.5">
                      /t/{t.slug}
                    </div>

                    {t.description && (
                      <p className="text-xs text-neutral-500 mt-2 line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: t.brand_color || '#10b981' }}
                        title={`Brand color: ${t.brand_color || '#10b981'}`}
                      />
                      <span>Theme: {t.brand_color || '#10b981'}</span>
                    </div>

                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>Visit Venue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 bg-white rounded-2xl border border-dashed border-neutral-300 p-8 sm:p-12 text-center max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-neutral-900 text-base mb-1">
              No Venues Found in Database
            </h3>
            <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
              Register the first venue to start listing turfs and testing the multi-tenant architecture.
            </p>
            <button
              onClick={() => navigate('/create-business')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create My Turf Business</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
