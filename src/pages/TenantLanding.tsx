import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { getTenantThemeStyles, hexToRgba } from '../lib/theme';
import type { Tenant, Turf } from '../types/database';
import {
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  Info,
  ShieldCheck,
  Building,
  ArrowRight,
  SlidersHorizontal,
  Compass,
  LayoutDashboard,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

import { TurfSlotsModal } from '../components/turf/TurfSlotsModal';

interface TenantLandingProps {
  slug: string;
  onOpenConfig?: () => void;
}

export const TenantLanding: React.FC<TenantLandingProps> = ({ slug, onOpenConfig }) => {
  const { navigate } = useRouter();
  const { user, isStaffOrOwner, getRoleForTenant } = useAuth();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedTurfForSlots, setSelectedTurfForSlots] = useState<Turf | null>(null);
  const [isSlotsModalOpen, setIsSlotsModalOpen] = useState(false);

  const fetchTenantAndTurfs = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch tenant by slug
      const { data: tenantData, error: tenantErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single();

      if (tenantErr || !tenantData) {
        setError(`Venue with slug "${slug}" was not found.`);
        setLoading(false);
        return;
      }

      setTenant(tenantData as Tenant);

      // 2. Fetch turfs for this tenant
      const { data: turfData, error: turfErr } = await supabase
        .from('turfs')
        .select('*')
        .eq('tenant_id', tenantData.id)
        .order('name', { ascending: true });

      if (turfErr) {
        console.warn('Error fetching turfs:', turfErr.message);
        setTurfs([]);
      } else {
        setTurfs((turfData as Turf[]) || []);
      }
    } catch (err: any) {
      console.error('Failed to load tenant:', err);
      setError(err?.message || 'Failed to load venue information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantAndTurfs();
  }, [slug]);

  const theme = getTenantThemeStyles(tenant?.brand_color);
  const userTenantRole = tenant ? getRoleForTenant(tenant.id) : 'customer';
  const isManagerOfThisTenant = userTenantRole === 'tenant_owner' || userTenantRole === 'tenant_staff';

  // Auto-open Check Slots flow if URL has ?turf=turfId from marketplace
  useEffect(() => {
    if (turfs.length > 0 && !isSlotsModalOpen) {
      const urlParams = new URLSearchParams(window.location.search);
      const targetTurfId = urlParams.get('turf');
      if (targetTurfId) {
        const found = turfs.find(
          (t) => t.id === targetTurfId || t.name.toLowerCase() === targetTurfId.toLowerCase()
        );
        if (found) {
          setSelectedTurfForSlots(found);
          setIsSlotsModalOpen(true);
        }
      }
    }
  }, [turfs]);

  // Extract unique sport types for quick filtering
  const sportCategories = React.useMemo(() => {
    const list = new Set<string>();
    turfs.forEach((t) => {
      if (t.sport_type) list.add(t.sport_type.toLowerCase());
    });
    return Array.from(list);
  }, [turfs]);

  const filteredTurfs = turfs.filter((turf) => {
    if (activeFilter === 'all') return true;
    return turf.sport_type?.toLowerCase() === activeFilter;
  });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl border-4 border-emerald-200 border-t-emerald-600 animate-spin mb-4" />
        <h2 className="text-lg font-bold text-neutral-800">Loading Venue...</h2>
        <p className="text-xs text-neutral-500 font-mono mt-1">/t/{slug}</p>
      </div>
    );
  }

  // Not found or error state
  if (error || !tenant) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-3xl bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-4">
          <Building className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-neutral-900 mb-2">Venue Not Found</h2>
        <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
          {error || `We couldn't find a turf venue registered under "/t/${slug}".`}
        </p>

        {!isSupabaseConfigured && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left text-xs text-amber-900 space-y-2">
            <div className="font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Supabase Not Connected
            </div>
            <p>
              To query the live <code className="bg-amber-100 px-1 rounded">tenants</code> and <code className="bg-amber-100 px-1 rounded">turfs</code> tables, connect your Supabase project credentials.
            </p>
            {onOpenConfig && (
              <button
                onClick={onOpenConfig}
                className="mt-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold text-xs cursor-pointer hover:bg-amber-700"
              >
                Configure Supabase
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-neutral-300 font-semibold text-xs text-neutral-700 hover:bg-neutral-50 cursor-pointer"
          >
            Explore Other Venues
          </button>
          <button
            onClick={() => navigate('/create-business')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-xs text-white shadow-sm cursor-pointer"
          >
            Claim or Register This Business
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Dynamic Theme Banner / Staff Quickbar */}
      {isManagerOfThisTenant && (
        <div className="bg-neutral-900 text-white px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              You are signed in as <strong className="capitalize">{userTenantRole.replace('_', ' ')}</strong> of this venue.
            </span>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Open Admin Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hero Section with Dynamic Brand Color */}
      <section
        style={{
          background: `linear-gradient(135deg, ${tenant.brand_color || '#059669'} 0%, ${hexToRgba(tenant.brand_color || '#059669', 0.85)} 60%, #111827 100%)`,
        }}
        className="text-white relative overflow-hidden py-10 px-4 sm:px-6 lg:px-8 shadow-inner"
      >
        {/* Subtle decorative grass/mesh pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.4) 2%, transparent 0%)`,
            backgroundSize: '30px 30px',
          }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Logo */}
            {tenant.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover bg-white p-1 border-2 border-white/30 shadow-xl"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-2xl sm:text-3xl text-white shadow-xl">
                {tenant.name.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-1.5 flex-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-[11px] font-semibold uppercase tracking-wider text-white">
                <Sparkles className="w-3 h-3" />
                Verified Turf Partner
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-xs">
                {tenant.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-white/90 pt-1">
                {tenant.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-white/80" />
                    {tenant.city}
                  </span>
                )}
                {tenant.address && (
                  <span className="text-white/80">
                    {tenant.city ? '• ' : ''}{tenant.address}
                  </span>
                )}
              </div>
              {tenant.description && (
                <p className="text-xs sm:text-sm text-white/85 max-w-2xl pt-1 leading-relaxed">
                  {tenant.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Controls / Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <span>Available Arenas & Turfs</span>
              <span
                style={theme.badgeStyle}
                className="text-xs px-2.5 py-0.5 rounded-full font-semibold border"
              >
                {turfs.length} {turfs.length === 1 ? 'Ground' : 'Grounds'}
              </span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Select a turf to view specifications and upcoming slot schedule
            </p>
          </div>

          {/* Sport Filters if sports exist */}
          {sportCategories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
              <button
                onClick={() => setActiveFilter('all')}
                style={activeFilter === 'all' ? theme.buttonStyle : undefined}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  activeFilter === 'all'
                    ? 'shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                All Sports
              </button>
              {sportCategories.map((sport) => (
                <button
                  key={sport}
                  onClick={() => setActiveFilter(sport)}
                  style={activeFilter === sport ? theme.buttonStyle : undefined}
                  className={`text-xs px-3 py-1.5 rounded-xl font-semibold capitalize transition-colors cursor-pointer ${
                    activeFilter === sport
                      ? 'shadow-2xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Turf Cards Grid */}
        {filteredTurfs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {filteredTurfs.map((turf) => {
              const rate = turf.hourly_rate ?? turf.price_per_hour ?? turf.rate;
              return (
                <div
                  key={turf.id}
                  className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
                >
                  {/* Turf Image or Sport Banner */}
                  <div className="relative h-44 bg-neutral-800 overflow-hidden">
                    {turf.image_url ? (
                      <img
                        src={turf.image_url}
                        alt={turf.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          background: `linear-gradient(135deg, ${tenant.brand_color || '#059669'} 0%, #1f2937 100%)`,
                        }}
                        className="w-full h-full flex flex-col items-center justify-center text-white p-4 text-center"
                      >
                        <Compass className="w-10 h-10 opacity-70 mb-2" />
                        <span className="font-bold text-sm tracking-wide uppercase">
                          {turf.sport_type || 'Turf Ground'}
                        </span>
                        <span className="text-[11px] text-white/70">
                          {turf.surface_type || 'Synthetic Turf Surface'}
                        </span>
                      </div>
                    )}

                    {/* Sport Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      {turf.sport_type && (
                        <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-bold uppercase tracking-wider">
                          {turf.sport_type}
                        </span>
                      )}
                      {turf.indoor && (
                        <span className="px-2 py-1 rounded-lg bg-blue-600/80 backdrop-blur-md text-white text-[10px] font-semibold">
                          Indoor
                        </span>
                      )}
                    </div>

                    {/* Rate pill */}
                    {rate !== undefined && rate !== null && (
                      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md text-neutral-900 px-3 py-1 rounded-xl font-bold text-xs shadow-md">
                        <span className="text-emerald-700 font-extrabold text-sm">
                          ₹{rate}
                        </span>
                        <span className="text-neutral-500 font-medium text-[11px]">/hr</span>
                      </div>
                    )}
                  </div>

                  {/* Turf Info Body */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-neutral-950 text-base sm:text-lg mb-1 leading-snug">
                        {turf.name}
                      </h3>
                      {turf.description && (
                        <p className="text-xs text-neutral-600 line-clamp-2 mb-3 leading-relaxed">
                          {turf.description}
                        </p>
                      )}

                      {/* Attribute Pills */}
                      <div className="flex flex-wrap gap-1.5 mb-4 text-[11px]">
                        {turf.surface_type && (
                          <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium">
                            {turf.surface_type}
                          </span>
                        )}
                        {turf.dimension && (
                          <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium">
                            {turf.dimension}
                          </span>
                        )}
                        {turf.lighting !== false && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                            Floodlights
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action footer */}
                    <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      <div className="text-xs font-semibold text-neutral-500">
                        {rate ? `₹${rate}/hr` : 'Standard Rate'}
                      </div>

                      <button
                        style={theme.buttonStyle}
                        className="w-full sm:w-auto min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-2xs hover:opacity-90 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                        onClick={() => {
                          setSelectedTurfForSlots(turf);
                          setIsSlotsModalOpen(true);
                        }}
                      >
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span>Check Slots</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 bg-neutral-50 rounded-2xl border border-dashed border-neutral-300 p-8 sm:p-12 text-center max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-neutral-900 text-base mb-1">No Turfs Listed Yet</h3>
            <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
              This venue doesn't have any turfs registered yet.
            </p>
            {isManagerOfThisTenant ? (
              <button
                onClick={() => navigate('/admin')}
                style={theme.buttonStyle}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" />
                Go to Admin Dashboard to Add Turfs
              </button>
            ) : (
              <div className="text-xs text-neutral-400">
                Check back soon or contact venue management.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Slots & Booking Modal */}
      {selectedTurfForSlots && (
        <TurfSlotsModal
          isOpen={isSlotsModalOpen}
          onClose={() => {
            setIsSlotsModalOpen(false);
            setSelectedTurfForSlots(null);
          }}
          turf={selectedTurfForSlots}
          tenant={tenant}
        />
      )}
    </div>
  );
};
