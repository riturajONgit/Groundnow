import React, { useState } from 'react';
import { useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { Tenant } from '../types/database';
import { isSupabaseConfigured } from '../lib/supabase';
import { getTenantThemeStyles } from '../lib/theme';
import {
  ShieldAlert,
  Building2,
  LogIn,
  LogOut,
  LayoutDashboard,
  PlusCircle,
  Menu,
  X,
  Database,
  Store,
  Sun,
  Moon,
} from 'lucide-react';

interface NavbarProps {
  tenant?: Tenant | null;
  onOpenConfig?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ tenant, onOpenConfig }) => {
  const { navigate, route } = useRouter();
  const { user, isStaffOrOwner, isSuperAdmin, userRole, signOut } = useAuth();
  const { isDark, toggleDark } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const theme = tenant ? getTenantThemeStyles(tenant.brand_color) : null;

  const handleSignOut = async () => {
    await signOut();
    if (tenant) {
      navigate(`/t/${tenant.slug}`);
    } else {
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand / Tenant */}
          <div className="flex items-center gap-3">
            {tenant ? (
              <button
                onClick={() => navigate(`/t/${tenant.slug}`)}
                className="flex items-center gap-2.5 text-left group cursor-pointer"
              >
                {tenant.logo_url ? (
                  <img
                    src={tenant.logo_url}
                    alt={tenant.name}
                    className="w-9 h-9 rounded-xl object-cover border border-neutral-200 shadow-2xs group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div
                    style={theme?.buttonStyle}
                    className="w-9 h-9 rounded-xl font-bold flex items-center justify-center text-sm shadow-2xs group-hover:scale-105 transition-transform"
                  >
                    {tenant.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-bold text-neutral-900 leading-tight flex items-center gap-1.5 text-base">
                    {tenant.name}
                    <span
                      style={theme?.badgeStyle}
                      className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full border"
                    >
                      Turf
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono">
                    /t/{tenant.slug}
                  </div>
                </div>
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-left group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center shadow-2xs group-hover:bg-emerald-700 transition-colors">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-neutral-900 text-base leading-tight tracking-tight">
                    GroundNow
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium">
                    Multi-Tenant Turf Booking
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Center / Right: Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            {/* Supabase Status Button */}
            {onOpenConfig && (
              <button
                onClick={onOpenConfig}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSupabaseConfigured
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100/70'
                    : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
                title="Supabase Backend Status"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{isSupabaseConfigured ? 'Supabase Connected' : 'Connect Supabase'}</span>
              </button>
            )}

            {/* If on a tenant page, option to view all or switch */}
            {tenant && (
              <button
                onClick={() => navigate('/')}
                className="text-xs text-neutral-600 hover:text-neutral-900 font-medium px-2 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Browse All Venues
              </button>
            )}

            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleDark}
              className="min-h-[38px] min-w-[38px] p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
            </button>

            {/* Create Business Link */}
            <button
              onClick={() => navigate('/create-business')}
              className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                route.isCreateBusiness
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Create Turf Business</span>
            </button>

            {/* User State */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-neutral-200 dark:border-neutral-700">
                {/* Super Admin Link (only for super admins) */}
                {isSuperAdmin && (
                  <button
                    onClick={() => navigate('/superadmin')}
                    className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                    title="Super Admin Platform Console"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Super Admin</span>
                  </button>
                )}

                {/* Admin button for staff/owner */}
                {isStaffOrOwner && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Admin Dashboard</span>
                  </button>
                )}

                <div className="text-right">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 max-w-[140px] truncate">
                    {user.email}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
                        isSuperAdmin
                          ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                          : userRole === 'tenant_owner'
                          ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300'
                          : userRole === 'tenant_staff'
                          ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      {isSuperAdmin
                        ? 'Super Admin'
                        : userRole === 'tenant_owner'
                        ? 'Owner'
                        : userRole === 'tenant_staff'
                        ? 'Staff'
                        : 'Customer'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-neutral-200 dark:border-neutral-700">
                <button
                  onClick={() =>
                    navigate(tenant ? `/t/${tenant.slug}/login` : '/login')
                  }
                  style={theme?.buttonStyle}
                  className={`text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer ${
                    !tenant ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu & Theme Toggles */}
          <div className="flex md:hidden items-center gap-1.5">
            {/* Dark mode button for mobile */}
            <button
              onClick={toggleDark}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
            </button>

            {onOpenConfig && (
              <button
                onClick={onOpenConfig}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl border text-xs cursor-pointer ${
                  isSupabaseConfigured
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}
                aria-label="Supabase Configuration"
              >
                <Database className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 pt-3 pb-5 space-y-2.5 shadow-lg">
          {user ? (
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl space-y-1 mb-2">
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Signed in as:</div>
              <div className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                {user.email}
              </div>
              <div className="inline-block mt-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isSuperAdmin
                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 font-extrabold'
                      : userRole === 'tenant_owner'
                      ? 'bg-purple-100 text-purple-700'
                      : userRole === 'tenant_staff'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-neutral-200 text-neutral-700'
                  }`}
                >
                  Role: {isSuperAdmin ? 'Super Admin' : userRole}
                </span>
              </div>
            </div>
          ) : null}

          {/* Super Admin mobile link (only for super admins) */}
          {isSuperAdmin && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/superadmin');
              }}
              className="w-full min-h-[44px] text-left py-2.5 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-black flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 text-neutral-950" />
              <span>Super Admin Console</span>
            </button>
          )}

          {isStaffOrOwner && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/admin');
              }}
              className="w-full min-h-[44px] text-left py-2.5 px-3.5 rounded-xl bg-neutral-900 dark:bg-neutral-800 text-white text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Go to Admin Dashboard</span>
            </button>
          )}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/create-business');
            }}
            className="w-full min-h-[44px] text-left py-2.5 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Create My Turf Business</span>
          </button>

          {tenant && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/');
              }}
              className="w-full min-h-[44px] text-left py-2.5 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center cursor-pointer"
            >
              Browse All Turf Venues
            </button>
          )}

          {user ? (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleSignOut();
              }}
              className="w-full min-h-[44px] text-left py-2.5 px-3.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate(tenant ? `/t/${tenant.slug}/login` : '/login');
              }}
              style={theme?.buttonStyle}
              className={`w-full min-h-[44px] text-center py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-2xs cursor-pointer ${
                !tenant ? 'bg-emerald-600 text-white' : ''
              }`}
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
