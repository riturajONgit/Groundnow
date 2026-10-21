import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { Tenant, Booking, Profile, Turf, Sport } from '../types/database';
import {
  ShieldAlert,
  Building2,
  Calendar,
  Users,
  Search,
  RefreshCw,
  Edit2,
  Check,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  CreditCard,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  Clock,
  DollarSign,
  Ban,
  Filter,
  Eye,
  Store,
  Mail,
  Phone,
  Shield,
  ArrowLeft,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';

interface TenantWithCounts extends Tenant {
  turfCount: number;
  bookingCount: number;
}

interface BookingWithDetails extends Booking {
  tenants?: { id: string; name: string; slug: string } | null;
  turfs?: (Turf & { tenant_id?: string; tenants?: { id: string; name: string; slug: string } | null }) | null;
  sports?: Sport | null;
}

interface UserProfileWithMemberships extends Profile {
  memberships: Array<{
    tenant_id: string;
    role: string;
    tenantName?: string;
    tenantSlug?: string;
  }>;
}

export const SuperAdminDashboard: React.FC = () => {
  const { navigate } = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isDark, toggleDark } = useTheme();

  // Verification state
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Active Tab: 'tenants' | 'bookings' | 'users'
  const [activeTab, setActiveTab] = useState<'tenants' | 'bookings' | 'users'>('tenants');

  // Data states
  const [tenants, setTenants] = useState<TenantWithCounts[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [profiles, setProfiles] = useState<UserProfileWithMemberships[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tenant edit modal state
  const [editingTenant, setEditingTenant] = useState<TenantWithCounts | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editBrandColor, setEditBrandColor] = useState('#16a34a');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editUpiId, setEditUpiId] = useState('');
  const [savingTenant, setSavingTenant] = useState(false);

  // Filter states
  const [tenantSearch, setTenantSearch] = useState('');
  const [bookingTenantFilter, setBookingTenantFilter] = useState<string>('all');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Booking action loading state
  const [bookingActionLoading, setBookingActionLoading] = useState<string | null>(null);

  // Check super admin flag on load
  const verifySuperAdmin = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    if (!isSupabaseConfigured) {
      setCheckingAccess(false);
      setAccessDenied(true);
      return;
    }

    try {
      setCheckingAccess(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (error || !data || data.is_super_admin !== true) {
        console.warn('Super Admin access denied. User is not is_super_admin:', error?.message);
        setAccessDenied(true);
        navigate('/admin');
        return;
      }

      setAccessDenied(false);
      setCheckingAccess(false);
    } catch (err) {
      console.error('Error verifying super admin:', err);
      setAccessDenied(true);
      navigate('/admin');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    verifySuperAdmin();
  }, [verifySuperAdmin]);

  // Load Tenants data
  const loadTenants = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*, turfs(count), bookings(count)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tenants:', error);
        setErrorMessage(error.message);
        return;
      }

      if (data) {
        const mapped: TenantWithCounts[] = (data as any[]).map((t) => {
          const tCount = Array.isArray(t.turfs) && t.turfs.length > 0 ? t.turfs[0].count ?? 0 : 0;
          const bCount = Array.isArray(t.bookings) && t.bookings.length > 0 ? t.bookings[0].count ?? 0 : 0;
          return {
            ...t,
            turfCount: tCount,
            bookingCount: bCount,
          };
        });
        setTenants(mapped);
      }
    } catch (err: any) {
      console.error('Unexpected error loading tenants:', err);
      setErrorMessage(err?.message || 'Failed to load tenants.');
    }
  }, []);

  // Load Bookings data across tenants
  const loadBookings = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, turfs(id, name, tenant_id, tenants(id, name, slug)), sports(id, name), tenants(id, name, slug)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        setErrorMessage(error.message);
        return;
      }

      if (data) {
        setBookings(data as BookingWithDetails[]);
      }
    } catch (err: any) {
      console.error('Unexpected error loading bookings:', err);
      setErrorMessage(err?.message || 'Failed to load bookings.');
    }
  }, []);

  // Load Users/Profiles data with memberships
  const loadUsers = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      // 1. Fetch profiles
      const { data: profs, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (pErr) {
        console.error('Error fetching profiles:', pErr);
        setErrorMessage(pErr.message);
        return;
      }

      // 2. Fetch tenant_members
      const { data: membs, error: mErr } = await supabase
        .from('tenant_members')
        .select('*, tenants(id, name, slug)');

      if (mErr) {
        console.warn('Error fetching tenant_members:', mErr.message);
      }

      // 3. Fetch bookings to map customer emails to user IDs if profile email is missing
      const { data: bookEmails } = await supabase
        .from('bookings')
        .select('customer_id, customer_email, customer_name, customer_phone')
        .not('customer_id', 'is', null);

      const emailMap = new Map<string, { email?: string; name?: string; phone?: string }>();
      if (bookEmails) {
        for (const b of bookEmails) {
          if (b.customer_id && b.customer_email && !emailMap.has(b.customer_id)) {
            emailMap.set(b.customer_id, {
              email: b.customer_email,
              name: b.customer_name || undefined,
              phone: b.customer_phone || undefined,
            });
          }
        }
      }

      const membershipsByUser = new Map<string, Array<{ tenant_id: string; role: string; tenantName?: string; tenantSlug?: string }>>();
      if (membs) {
        for (const m of membs as any[]) {
          const arr = membershipsByUser.get(m.user_id) || [];
          arr.push({
            tenant_id: m.tenant_id,
            role: m.role,
            tenantName: m.tenants?.name,
            tenantSlug: m.tenants?.slug,
          });
          membershipsByUser.set(m.user_id, arr);
        }
      }

      if (profs) {
        const enriched: UserProfileWithMemberships[] = (profs as Profile[]).map((p) => {
          const userMembs = membershipsByUser.get(p.id) || [];
          const emailFallback = p.email || emailMap.get(p.id)?.email || (user?.id === p.id ? user.email : null);
          const nameFallback = p.full_name || emailMap.get(p.id)?.name || null;
          const phoneFallback = p.phone || emailMap.get(p.id)?.phone || null;

          return {
            ...p,
            email: emailFallback,
            full_name: nameFallback,
            phone: phoneFallback,
            memberships: userMembs,
          };
        });
        setProfiles(enriched);
      }
    } catch (err: any) {
      console.error('Unexpected error loading users:', err);
      setErrorMessage(err?.message || 'Failed to load user profiles.');
    }
  }, [user]);

  // Refresh active tab data
  const refreshAllData = useCallback(async () => {
    setLoadingData(true);
    setErrorMessage(null);
    await Promise.all([loadTenants(), loadBookings(), loadUsers()]);
    setLoadingData(false);
  }, [loadTenants, loadBookings, loadUsers]);

  useEffect(() => {
    if (!checkingAccess && !accessDenied) {
      refreshAllData();
    }
  }, [checkingAccess, accessDenied, refreshAllData]);

  // Handle open Tenant Edit
  const openEditTenantModal = (t: TenantWithCounts) => {
    setEditingTenant(t);
    setEditName(t.name || '');
    setEditSlug(t.slug || '');
    setEditBrandColor(t.brand_color || '#16a34a');
    setEditLogoUrl(t.logo_url || '');
    setEditUpiId(t.upi_id || '');
    setErrorMessage(null);
  };

  // Save Tenant update on `tenants`
  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    setSavingTenant(true);
    setErrorMessage(null);

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setErrorMessage('Tenant name cannot be empty.');
      setSavingTenant(false);
      return;
    }

    try {
      const updates: Partial<Tenant> = {
        name: trimmedName,
        brand_color: editBrandColor.trim() || null,
        logo_url: editLogoUrl.trim() || null,
        upi_id: editUpiId.trim() || null,
      };

      const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', editingTenant.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating tenant:', error);
        setErrorMessage(error.message);
        setSavingTenant(false);
        return;
      }

      setSuccessMessage(`Tenant "${trimmedName}" updated successfully!`);
      setEditingTenant(null);
      await loadTenants();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Unexpected error updating tenant:', err);
      setErrorMessage(err?.message || 'Failed to update tenant.');
    } finally {
      setSavingTenant(false);
    }
  };

  // Handle Mark Booking as Paid
  const handleMarkAsPaid = async (bookingId: string) => {
    setBookingActionLoading(bookingId);
    setErrorMessage(null);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: 'paid' })
        .eq('id', bookingId);

      if (error) {
        console.error('Error marking booking as paid:', error);
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage('Booking marked as Paid.');
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, payment_status: 'paid' } : b))
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Unexpected error updating booking:', err);
      setErrorMessage(err?.message || 'Failed to update booking status.');
    } finally {
      setBookingActionLoading(null);
    }
  };

  // Handle Cancel Booking
  const handleCancelBooking = async (bookingId: string) => {
    setBookingActionLoading(bookingId);
    setErrorMessage(null);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) {
        console.error('Error cancelling booking:', error);
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage('Booking cancelled successfully.');
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Unexpected error cancelling booking:', err);
      setErrorMessage(err?.message || 'Failed to cancel booking.');
    } finally {
      setBookingActionLoading(null);
    }
  };

  // Filtered Tenants
  const filteredTenants = useMemo(() => {
    const q = tenantSearch.toLowerCase().trim();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.upi_id && t.upi_id.toLowerCase().includes(q))
    );
  }, [tenants, tenantSearch]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const tenantMatch =
        bookingTenantFilter === 'all' ||
        b.tenant_id === bookingTenantFilter ||
        b.tenants?.id === bookingTenantFilter ||
        b.turfs?.tenant_id === bookingTenantFilter;

      const statusMatch =
        bookingStatusFilter === 'all' ||
        b.status?.toLowerCase() === bookingStatusFilter.toLowerCase();

      const q = bookingSearch.toLowerCase().trim();
      const textMatch =
        !q ||
        (b.customer_email && b.customer_email.toLowerCase().includes(q)) ||
        (b.customer_name && b.customer_name.toLowerCase().includes(q)) ||
        (b.turfs?.name && b.turfs.name.toLowerCase().includes(q)) ||
        (b.sports?.name && b.sports.name.toLowerCase().includes(q));

      return tenantMatch && statusMatch && textMatch;
    });
  }, [bookings, bookingTenantFilter, bookingStatusFilter, bookingSearch]);

  // Filtered Users
  const filteredProfiles = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const email = p.email ? p.email.toLowerCase() : '';
      const name = p.full_name ? p.full_name.toLowerCase() : '';
      const phone = p.phone ? p.phone.toLowerCase() : '';
      const membs = p.memberships.map((m) => (m.tenantName || '').toLowerCase()).join(' ');
      return email.includes(q) || name.includes(q) || phone.includes(q) || membs.includes(q);
    });
  }, [profiles, userSearch]);

  // Helper for formatting time/date range
  const formatBookingDates = (b: BookingWithDetails) => {
    let startStr = b.start_time;
    let endStr = b.end_time;

    if (b.during) {
      const cleaned = b.during.replace(/^[\[\(]/, '').replace(/[\]\)]$/, '');
      const parts = cleaned.split(',');
      if (parts.length === 2) {
        startStr = parts[0].replace(/['"]/g, '').trim();
        endStr = parts[1].replace(/['"]/g, '').trim();
      }
    }

    if (startStr) {
      try {
        const s = new Date(startStr);
        const dayPart = s.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const startTimePart = s.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        let endTimePart = '';
        if (endStr) {
          const e = new Date(endStr);
          endTimePart = ` - ${e.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}`;
        }
        return `${dayPart} • ${startTimePart}${endTimePart}`;
      } catch {
        return `${startStr} - ${endStr || ''}`;
      }
    }

    return b.booking_date || 'Date not specified';
  };

  // Loading screen while checking super admin privileges
  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl border-4 border-amber-500 border-t-transparent animate-spin mb-4" />
        <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
          Verifying Super Admin Authorization...
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Checking profiles.is_super_admin flag for your account
        </p>
      </div>
    );
  }

  // Access denied fallback (will have navigated, but safety render)
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">
          Access Restricted
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mb-6 leading-relaxed">
          The Super Admin console is restricted to system administrators with <code className="bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded font-mono text-xs">profiles.is_super_admin = true</code>.
        </p>
        <button
          onClick={() => navigate('/admin')}
          className="px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md cursor-pointer"
        >
          Return to Admin Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors duration-200">
      {/* Top Super Admin Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 lg:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Brand & Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black shadow-xs cursor-pointer hover:bg-amber-400 transition-colors shrink-0"
              title="GroundNow"
            >
              <Store className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg sm:text-xl text-neutral-950 dark:text-white tracking-tight leading-none">
                  GroundNow Super Admin
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                  Platform Control
                </span>
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono mt-0.5 truncate max-w-xs sm:max-w-md">
                Admin: {user?.email}
              </div>
            </div>
          </div>

          {/* Header Controls: Back to Admin, Dark mode toggle, Refresh */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleDark}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-700 shrink-0" />
              )}
            </button>

            {/* Refresh Data */}
            <button
              onClick={refreshAllData}
              disabled={loadingData}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
              title="Refresh all Supabase records"
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-amber-500' : ''}`} />
            </button>

            {/* Link to standard Venue Owner Admin */}
            <button
              onClick={() => navigate('/admin')}
              className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Owner</span> Admin
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Alerts */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error:</span>
                <p className="mt-0.5 font-mono text-[11px] leading-relaxed">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Global Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Total Tenants
              </div>
              <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
                {tenants.length}
              </div>
              <div className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                Physical ground venues
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Total Bookings
              </div>
              <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
                {bookings.length}
              </div>
              <div className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                Across all registered venues
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Total Users / Profiles
              </div>
              <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
                {profiles.length}
              </div>
              <div className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                Customers, staff & owners
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tab Navigation Navigation */}
        <div className="flex rounded-2xl bg-white dark:bg-neutral-900 p-1.5 border border-neutral-200 dark:border-neutral-800 shadow-2xs overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`flex-1 min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'tenants'
                ? 'bg-amber-500 text-neutral-950 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Tenants ({tenants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex-1 min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-amber-500 text-neutral-950 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Bookings ({bookings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-amber-500 text-neutral-950 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Users &amp; Profiles ({profiles.length})</span>
          </button>
        </div>

        {/* TAB 1: TENANTS */}
        {activeTab === 'tenants' && (
          <div className="space-y-4">
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  placeholder="Search tenants by name, slug, or UPI..."
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                />
              </div>

              <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 self-end sm:self-auto">
                <span>Showing <strong>{filteredTenants.length}</strong> of {tenants.length}</span>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Venue Name</th>
                      <th className="py-3 px-4">Path Slug</th>
                      <th className="py-3 px-4">Turfs</th>
                      <th className="py-3 px-4">Bookings</th>
                      <th className="py-3 px-4">UPI ID</th>
                      <th className="py-3 px-4">Registered Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-neutral-800 dark:text-neutral-200">
                    {filteredTenants.length > 0 ? (
                      filteredTenants.map((t) => (
                        <tr
                          key={t.id}
                          onClick={() => openEditTenantModal(t)}
                          className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              {t.logo_url ? (
                                <img
                                  src={t.logo_url}
                                  alt={t.name}
                                  className="w-8 h-8 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div
                                  style={{ backgroundColor: t.brand_color || '#16a34a' }}
                                  className="w-8 h-8 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  {t.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-bold text-neutral-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors block truncate max-w-xs">
                                  {t.name}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mt-0.5">
                                  <span
                                    className="w-2 h-2 rounded-full inline-block"
                                    style={{ backgroundColor: t.brand_color || '#16a34a' }}
                                  />
                                  <span>{t.brand_color || '#16a34a'}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                            /t/{t.slug}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                              {t.turfCount} {t.turfCount === 1 ? 'Turf' : 'Turfs'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-bold text-[11px]">
                              {t.bookingCount} Bookings
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                            {t.upi_id ? (
                              <span className="truncate block max-w-[160px]">{t.upi_id}</span>
                            ) : (
                              <span className="text-neutral-400 italic">Not set</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-neutral-500 dark:text-neutral-400 text-[11px]">
                            {t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditTenantModal(t)}
                                className="min-h-[36px] px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => navigate(`/t/${t.slug}`)}
                                className="min-h-[36px] p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg cursor-pointer"
                                title={`Open /t/${t.slug}`}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-xs text-neutral-400">
                          No tenants found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Stacked Cards View */}
            <div className="block sm:hidden space-y-3">
              {filteredTenants.length > 0 ? (
                filteredTenants.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => openEditTenantModal(t)}
                    className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs space-y-3 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {t.logo_url ? (
                          <img
                            src={t.logo_url}
                            alt={t.name}
                            className="w-10 h-10 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div
                            style={{ backgroundColor: t.brand_color || '#16a34a' }}
                            className="w-10 h-10 rounded-xl text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs"
                          >
                            {t.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-neutral-900 dark:text-white text-sm truncate">
                            {t.name}
                          </h4>
                          <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                            /t/{t.slug}
                          </span>
                        </div>
                      </div>

                      <span
                        className="w-3 h-3 rounded-full shrink-0 mt-1"
                        style={{ backgroundColor: t.brand_color || '#16a34a' }}
                        title={`Color: ${t.brand_color}`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                        <span className="text-[10px] text-neutral-400 uppercase font-bold block">Turfs</span>
                        <span className="font-bold text-neutral-900 dark:text-white">{t.turfCount} Active</span>
                      </div>
                      <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                        <span className="text-[10px] text-neutral-400 uppercase font-bold block">Bookings</span>
                        <span className="font-bold text-neutral-900 dark:text-white">{t.bookingCount} Total</span>
                      </div>
                    </div>

                    <div className="text-xs pt-2 border-t border-neutral-100 dark:border-neutral-800/60 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-400">UPI ID:</span>
                        <span className="font-mono text-neutral-700 dark:text-neutral-300 truncate max-w-[180px]">
                          {t.upi_id || 'Not set'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-400">Created:</span>
                        <span className="text-neutral-600 dark:text-neutral-400">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditTenantModal(t)}
                        className="flex-1 min-h-[44px] py-2 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>View / Edit Details</span>
                      </button>
                      <button
                        onClick={() => navigate(`/t/${t.slug}`)}
                        className="min-h-[44px] min-w-[44px] p-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl flex items-center justify-center cursor-pointer"
                        title="View storefront"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 text-center text-xs text-neutral-400 border border-neutral-200 dark:border-neutral-800">
                  No tenants found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BOOKINGS */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Search by customer, turf, or sport..."
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                  />
                </div>

                {/* Filter by Tenant */}
                <div>
                  <select
                    value={bookingTenantFilter}
                    onChange={(e) => setBookingTenantFilter(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white cursor-pointer"
                  >
                    <option value="all">All Venues &amp; Tenants ({tenants.length})</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (/t/{t.slug})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by Status */}
                <div>
                  <select
                    value={bookingStatusFilter}
                    onChange={(e) => setBookingStatusFilter(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white cursor-pointer"
                  >
                    <option value="all">All Reservation Statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Desktop Bookings Table */}
            <div className="hidden lg:block bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Turf &amp; Venue</th>
                      <th className="py-3 px-4">Sport</th>
                      <th className="py-3 px-4">Customer Email</th>
                      <th className="py-3 px-4">Start / End Time</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-neutral-800 dark:text-neutral-200">
                    {filteredBookings.length > 0 ? (
                      filteredBookings.map((b) => {
                        const turfName = b.turfs?.name || 'Standard Turf';
                        const venueName = b.tenants?.name || b.turfs?.tenants?.name || 'Venue Ground';
                        const venueSlug = b.tenants?.slug || b.turfs?.tenants?.slug;
                        const sportName = b.sports?.name || 'Futsal';
                        const isPaid = b.payment_status === 'paid';
                        const isCancelled = b.status === 'cancelled';
                        const amount = b.amount ?? b.total_price ?? 0;

                        return (
                          <tr key={b.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-neutral-900 dark:text-white">{turfName}</div>
                              <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                                {venueName} {venueSlug ? `(/t/${venueSlug})` : ''}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-medium">{sportName}</td>
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-neutral-900 dark:text-white">{b.customer_email || 'No email'}</div>
                              {b.customer_name && (
                                <div className="text-[11px] text-neutral-400">{b.customer_name}</div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300">
                              {formatBookingDates(b)}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">
                              ₹{Number(amount).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  isCancelled
                                    ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                                    : b.status === 'confirmed'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                                }`}
                              >
                                {b.status || 'confirmed'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  isPaid
                                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                                }`}
                              >
                                {isPaid ? 'Paid' : 'Unpaid'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isPaid && (
                                  <button
                                    onClick={() => handleMarkAsPaid(b.id)}
                                    disabled={bookingActionLoading === b.id}
                                    className="min-h-[36px] px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                                    title="Mark booking as Paid"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Mark Paid</span>
                                  </button>
                                )}
                                {!isCancelled && (
                                  <button
                                    onClick={() => handleCancelBooking(b.id)}
                                    disabled={bookingActionLoading === b.id}
                                    className="min-h-[36px] px-2.5 py-1 text-[11px] font-bold rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                    title="Cancel this booking"
                                  >
                                    <Ban className="w-3 h-3" />
                                    <span>Cancel</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-xs text-neutral-400">
                          No bookings found for the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile / Tablet Bookings Cards */}
            <div className="block lg:hidden space-y-3">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((b) => {
                  const turfName = b.turfs?.name || 'Standard Turf';
                  const venueName = b.tenants?.name || b.turfs?.tenants?.name || 'Venue Ground';
                  const sportName = b.sports?.name || 'Futsal';
                  const isPaid = b.payment_status === 'paid';
                  const isCancelled = b.status === 'cancelled';
                  const amount = b.amount ?? b.total_price ?? 0;

                  return (
                    <div
                      key={b.id}
                      className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-neutral-900 dark:text-white text-sm">
                            {turfName}
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                            {venueName} • <span className="font-sans font-medium text-amber-600 dark:text-amber-400">{sportName}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-sm text-neutral-900 dark:text-white">
                            ₹{Number(amount).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-neutral-400">Schedule:</span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                            {formatBookingDates(b)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-neutral-400">Customer:</span>
                          <span className="font-mono text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]">
                            {b.customer_email || 'No email provided'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isCancelled
                              ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                              : b.status === 'confirmed'
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {b.status || 'confirmed'}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isPaid
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                          }`}
                        >
                          {isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>

                      <div className="pt-2 flex flex-col xs:flex-row items-stretch gap-2 border-t border-neutral-100 dark:border-neutral-800">
                        {!isPaid && (
                          <button
                            onClick={() => handleMarkAsPaid(b.id)}
                            disabled={bookingActionLoading === b.id}
                            className="flex-1 min-h-[44px] py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark as Paid</span>
                          </button>
                        )}
                        {!isCancelled && (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            disabled={bookingActionLoading === b.id}
                            className="flex-1 min-h-[44px] py-2 px-3 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Cancel Booking</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 text-center text-xs text-neutral-400 border border-neutral-200 dark:border-neutral-800">
                  No bookings matching current criteria.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: USERS & PROFILES */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search profiles by name, email, phone, or venue..."
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                />
              </div>

              <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 self-end sm:self-auto">
                <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 font-semibold">
                  Read Only Profile Directory
                </span>
              </div>
            </div>

            {/* Desktop Profiles Table */}
            <div className="hidden sm:block bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Tenant Memberships</th>
                      <th className="py-3 px-4">Platform Role</th>
                      <th className="py-3 px-4">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-neutral-800 dark:text-neutral-200">
                    {filteredProfiles.length > 0 ? (
                      filteredProfiles.map((p) => {
                        const isSuper = p.is_super_admin === true;
                        return (
                          <tr key={p.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-700 dark:text-neutral-300">
                                  {(p.full_name || p.email || 'U').substring(0, 1).toUpperCase()}
                                </div>
                                <span>{p.full_name || 'No name listed'}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                              {p.email || <span className="text-neutral-400 italic">No email</span>}
                            </td>
                            <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300 text-[11px]">
                              {p.phone || <span className="text-neutral-400 italic">No phone</span>}
                            </td>
                            <td className="py-3.5 px-4">
                              {p.memberships.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {p.memberships.map((m, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700"
                                    >
                                      <span>{m.tenantName || 'Venue'}</span>
                                      <span className="text-amber-600 dark:text-amber-400 font-bold uppercase text-[9px]">
                                        ({m.role.replace('tenant_', '')})
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-neutral-400 italic">None (Customer)</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {isSuper ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 font-bold text-[10px] uppercase">
                                  <Shield className="w-3 h-3" />
                                  Super Admin
                                </span>
                              ) : (
                                <span className="text-[11px] text-neutral-500 font-medium">Standard</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-neutral-500 dark:text-neutral-400 text-[11px]">
                              {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-xs text-neutral-400">
                          No profiles registered yet or matching search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Profiles Cards */}
            <div className="block sm:hidden space-y-3">
              {filteredProfiles.length > 0 ? (
                filteredProfiles.map((p) => {
                  const isSuper = p.is_super_admin === true;
                  return (
                    <div
                      key={p.id}
                      className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-700 dark:text-neutral-300 shrink-0">
                            {(p.full_name || p.email || 'U').substring(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                              {p.full_name || 'No Name'}
                            </div>
                            <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 truncate">
                              {p.email || 'No email'}
                            </div>
                          </div>
                        </div>

                        {isSuper && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 font-bold text-[9px] uppercase tracking-wider shrink-0">
                            Super Admin
                          </span>
                        )}
                      </div>

                      <div className="text-xs pt-1 border-t border-neutral-100 dark:border-neutral-800 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-neutral-400">Phone:</span>
                          <span className="text-neutral-700 dark:text-neutral-300">{p.phone || 'N/A'}</span>
                        </div>
                        <div className="text-[11px]">
                          <span className="text-neutral-400 block mb-1">Memberships:</span>
                          {p.memberships.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {p.memberships.map((m, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                                >
                                  {m.tenantName || 'Venue'} ({m.role.replace('tenant_', '')})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-neutral-400 italic">None (Customer)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 text-center text-xs text-neutral-400 border border-neutral-200 dark:border-neutral-800">
                  No profiles found.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* EDIT TENANT MODAL */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-neutral-900 dark:text-white text-base">
                    Edit Tenant Details
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                    ID: {editingTenant.id.slice(0, 13)}...
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTenant(null)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats in Modal */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 text-xs">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-bold block">Registered Turfs</span>
                <span className="font-black text-neutral-900 dark:text-white text-sm">
                  {editingTenant.turfCount} Grounds
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-bold block">Total Bookings</span>
                <span className="font-black text-neutral-900 dark:text-white text-sm">
                  {editingTenant.bookingCount} Reservations
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveTenant} className="space-y-4">
              {/* Tenant Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Tenant Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-base sm:text-xs px-3.5 py-2.5 min-h-[44px] bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white font-medium"
                />
              </div>

              {/* Subpath Slug (Read-only for tenant identity safety) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  URL Path Slug (Read-only)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    value={editSlug}
                    className="flex-1 text-base sm:text-xs font-mono px-3.5 py-2.5 min-h-[44px] bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-500 dark:text-neutral-400 cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => navigate(`/t/${editSlug}`)}
                    className="min-h-[44px] px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1 cursor-pointer"
                    title="View storefront"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                </div>
              </div>

              {/* Brand Color */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Brand Color Hex
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editBrandColor.startsWith('#') && editBrandColor.length === 7 ? editBrandColor : '#16a34a'}
                    onChange={(e) => setEditBrandColor(e.target.value)}
                    className="w-12 h-11 p-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editBrandColor}
                    onChange={(e) => setEditBrandColor(e.target.value)}
                    placeholder="#16a34a"
                    className="flex-1 text-base sm:text-xs font-mono px-3.5 py-2.5 min-h-[44px] bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                  />
                </div>
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Logo Image URL
                </label>
                <input
                  type="url"
                  value={editLogoUrl}
                  onChange={(e) => setEditLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full text-base sm:text-xs px-3.5 py-2.5 min-h-[44px] bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                />
                {editLogoUrl && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                    <span>Preview:</span>
                    <img
                      src={editLogoUrl}
                      alt="Logo preview"
                      className="w-8 h-8 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* UPI ID */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Venue UPI ID (<code className="text-amber-600 dark:text-amber-400">tenants.upi_id</code>)
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={editUpiId}
                    onChange={(e) => setEditUpiId(e.target.value)}
                    placeholder="venue@bank or business@okaxis"
                    className="w-full text-base sm:text-xs font-mono pl-10 pr-3.5 py-2.5 min-h-[44px] bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  disabled={savingTenant}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTenant}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingTenant ? (
                    <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
