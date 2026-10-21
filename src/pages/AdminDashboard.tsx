import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Tenant, Turf } from '../types/database';
import { getTenantThemeStyles } from '../lib/theme';
import { TurfsTab } from '../components/admin/TurfsTab';
import { PricingTab } from '../components/admin/PricingTab';
import { SlotsTab } from '../components/admin/SlotsTab';
import { BookingsTab } from '../components/admin/BookingsTab';
import { SettingsTab } from '../components/admin/SettingsTab';
import {
  Layers,
  DollarSign,
  Clock,
  CalendarDays,
  ExternalLink,
  ChevronRight,
  Store,
  Menu,
  X,
  LogOut,
  AlertCircle,
  Building2,
  RefreshCw,
  PlusCircle,
  Settings,
} from 'lucide-react';

interface AdminDashboardProps {
  onOpenConfig?: () => void;
}

type AdminTab = 'turfs' | 'pricing' | 'slots' | 'bookings' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenConfig }) => {
  const { navigate, route } = useRouter();
  const { user, memberships, primaryTenant, userRole, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>(route.adminTab || 'turfs');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(primaryTenant);
  const [tenantTurfs, setTenantTurfs] = useState<Turf[]>([]);
  const [loadingTurfs, setLoadingTurfs] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Sync tab with route if updated
  useEffect(() => {
    if (route.adminTab) {
      setActiveTab(route.adminTab);
    }
  }, [route.adminTab]);

  // Update selected tenant if primaryTenant becomes available
  useEffect(() => {
    if (!selectedTenant && primaryTenant) {
      setSelectedTenant(primaryTenant);
    }
  }, [primaryTenant, selectedTenant]);

  // Fetch turfs for the selected tenant respecting tenant_id
  const fetchTenantTurfs = useCallback(async () => {
    if (!selectedTenant?.id || !isSupabaseConfigured) return;

    setLoadingTurfs(true);
    setGlobalError(null);

    try {
      const { data, error } = await supabase
        .from('turfs')
        .select('*')
        .eq('tenant_id', selectedTenant.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Supabase error querying turfs:', error);
        setGlobalError(error.message);
        setTenantTurfs([]);
      } else {
        setTenantTurfs((data as Turf[]) || []);
      }
    } catch (err: any) {
      console.error('Unexpected error loading turfs:', err);
      setGlobalError(err?.message || 'Failed to fetch turfs from Supabase.');
      setTenantTurfs([]);
    } finally {
      setLoadingTurfs(false);
    }
  }, [selectedTenant?.id]);

  useEffect(() => {
    fetchTenantTurfs();
  }, [fetchTenantTurfs]);

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
    navigate(`/admin?tab=${tab}`);
  };

  const navItems: { id: AdminTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'turfs', label: 'Turfs', icon: Layers },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'slots', label: 'Slots', icon: Clock },
    { id: 'bookings', label: 'Bookings', icon: CalendarDays },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const theme = getTenantThemeStyles(selectedTenant?.brand_color);

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5 text-neutral-700" />
          </button>
          <div>
            <h1 className="font-bold text-neutral-900 text-sm">Owner Dashboard</h1>
            <p className="text-[11px] text-neutral-500 font-medium truncate max-w-[150px]">
              {selectedTenant ? selectedTenant.name : 'Select Venue'}
            </p>
          </div>
        </div>

        {selectedTenant && (
          <button
            onClick={() => navigate(`/t/${selectedTenant.slug}`)}
            className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer"
          >
            <span>Public Page</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-neutral-900 text-white flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 sm:p-5 flex-1 flex flex-col">
          {/* Header & Close for mobile */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-sm text-white tracking-tight">
                  GroundNow Admin
                </div>
                <div className="text-[10px] text-neutral-400 font-mono">Owner Dashboard</div>
              </div>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden text-neutral-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tenant Selector / Active Workspace */}
          <div className="mb-6 p-3.5 rounded-2xl bg-neutral-800/80 border border-neutral-700/60">
            <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 mb-1.5 flex items-center justify-between">
              <span>Managed Tenant</span>
              <span className="text-emerald-400 font-mono text-[9px] bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.2 rounded">
                {userRole === 'tenant_owner' ? 'OWNER' : 'STAFF'}
              </span>
            </div>
            {selectedTenant ? (
              <div>
                <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: selectedTenant.brand_color || '#10b981' }}
                  />
                  <span className="truncate">{selectedTenant.name}</span>
                </div>
                <div className="text-[11px] text-neutral-400 font-mono truncate mt-0.5">
                  /t/{selectedTenant.slug}
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-400">
                No active venue selected.
                <button
                  onClick={() => navigate('/create-business')}
                  className="block mt-1 text-emerald-400 hover:underline font-semibold"
                >
                  + Create a Venue
                </button>
              </div>
            )}

            {/* Tenant switcher dropdown if user has multiple tenant memberships */}
            {memberships.length > 1 && (
              <div className="mt-3 pt-2.5 border-t border-neutral-700">
                <label className="text-[10px] text-neutral-400 block mb-1">Switch Tenant:</label>
                <select
                  value={selectedTenant?.id || ''}
                  onChange={(e) => {
                    const match = memberships.find((m) => m.tenant_id === e.target.value)?.tenants;
                    if (match) setSelectedTenant(match);
                  }}
                  className="w-full bg-neutral-900 text-xs text-white rounded-lg px-2.5 py-1.5 border border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {memberships.map((m) => (
                    <option key={m.tenant_id} value={m.tenant_id}>
                      {m.tenants?.name || m.tenant_id}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Navigation Sidebar: Turfs, Pricing, Slots, Bookings */}
          <nav className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 px-3 py-1 mb-0.5">
              Admin Sections
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                </button>
              );
            })}
          </nav>

          {/* Quick link to public landing page */}
          {selectedTenant && (
            <div className="mt-6 pt-4 border-t border-neutral-800">
              <button
                onClick={() => navigate(`/t/${selectedTenant.slug}`)}
                className="w-full py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  View Public Venue
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">/t/{selectedTenant.slug}</span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Footer: User & Sign Out */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate max-w-[180px]">
                {user?.email || 'Logged in Staff'}
              </div>
              <div className="text-[10px] text-neutral-400 capitalize">
                Role: {userRole.replace('_', ' ')}
              </div>
            </div>
            <button
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              title="Sign out"
              className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-neutral-800 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Workspace Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-32 md:pb-8 overflow-y-auto w-full max-w-full">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-neutral-900 capitalize">
                  {activeTab} Management
                </h1>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {activeTab === 'turfs' && 'Create, edit, and organize turf pitches and sub-zones.'}
                {activeTab === 'pricing' && 'Manage hourly rates, peak pricing, and capacities by sport.'}
                {activeTab === 'slots' && 'Set open/close hours and booking slot durations per day of week.'}
                {activeTab === 'bookings' && 'View reservations and confirm UPI payments.'}
                {activeTab === 'settings' && 'Configure venue UPI ID and customer payment details.'}
              </p>
            </div>

            {selectedTenant && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => navigate(`/t/${selectedTenant.slug}`)}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl border border-neutral-300 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span>Public Storefront</span>
                </button>
              </div>
            )}
          </div>

          {/* Global Supabase Error Banner if any */}
          {globalError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Supabase Query Error:</span>
                <p className="mt-0.5 font-mono text-[11px] leading-relaxed">{globalError}</p>
              </div>
            </div>
          )}

          {/* If no selected tenant */}
          {!selectedTenant ? (
            <div className="bg-white rounded-3xl border border-dashed border-neutral-300 p-8 text-center max-w-md mx-auto">
              <Building2 className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-neutral-800 mb-1">No Tenant Selected</h3>
              <p className="text-xs text-neutral-500 mb-4">
                You must belong to a tenant in <code className="bg-neutral-100 px-1 rounded">tenant_members</code> to manage turfs.
              </p>
              <button
                onClick={() => navigate('/create-business')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Create a Turf Business
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: Turfs */}
              {activeTab === 'turfs' && (
                <TurfsTab
                  currentTenant={selectedTenant}
                  turfs={tenantTurfs}
                  loading={loadingTurfs}
                  onRefresh={fetchTenantTurfs}
                />
              )}

              {/* TAB 2: Pricing */}
              {activeTab === 'pricing' && (
                <PricingTab
                  currentTenant={selectedTenant}
                  turfs={tenantTurfs}
                />
              )}

              {/* TAB 3: Slots */}
              {activeTab === 'slots' && (
                <SlotsTab
                  currentTenant={selectedTenant}
                  turfs={tenantTurfs}
                />
              )}

              {/* TAB 4: Bookings */}
              {activeTab === 'bookings' && (
                <BookingsTab
                  currentTenant={selectedTenant}
                  turfs={tenantTurfs}
                />
              )}

              {/* TAB 5: Settings */}
              {activeTab === 'settings' && (
                <SettingsTab
                  currentTenant={selectedTenant}
                  onTenantUpdated={(updated) => setSelectedTenant(updated)}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Admin mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-neutral-200 flex items-center justify-around z-40 shadow-lg px-1 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`flex-1 min-h-[48px] min-w-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-xl text-[10px] sm:text-[11px] font-semibold transition-colors cursor-pointer ${
                isActive ? 'text-emerald-600 bg-emerald-50/60 font-bold' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="truncate max-w-full">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
