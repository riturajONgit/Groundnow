import React, { useState, useEffect } from 'react';
import { RouterProvider, useRouter } from './lib/router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import type { Tenant } from './types/database';
import { Navbar } from './components/Navbar';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { TenantLanding } from './pages/TenantLanding';
import { AuthPage } from './pages/AuthPage';
import { CreateBusinessPage } from './pages/CreateBusinessPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { HomePage } from './pages/HomePage';
import { ShieldAlert, PlusCircle, ArrowLeft } from 'lucide-react';

function AppContent() {
  const { route, navigate } = useRouter();
  const { user, isStaffOrOwner, userRole, loading: authLoading } = useAuth();

  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Sync tenant data when on /t/:slug
  useEffect(() => {
    if (route.tenantSlug && isSupabaseConfigured) {
      supabase
        .from('tenants')
        .select('*')
        .eq('slug', route.tenantSlug)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setCurrentTenant(data as Tenant);
          } else {
            setCurrentTenant(null);
          }
        });
    } else {
      setCurrentTenant(null);
    }
  }, [route.tenantSlug]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col font-sans antialiased">
      {/* Hide default navbar inside admin page if on desktop or when admin shell provides its own */}
      {!route.isAdmin && (
        <Navbar
          tenant={currentTenant}
          onOpenConfig={() => setConfigModalOpen(true)}
        />
      )}

      {/* Route Switcher */}
      <div className="flex-1 flex flex-col">
        {(() => {
          // 1. Admin Shell (/admin)
          if (route.isAdmin) {
            if (authLoading) {
              return (
                <div className="min-h-screen flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              );
            }

            // If not logged in
            if (!user) {
              return (
                <div className="max-w-md mx-auto my-auto px-4 py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-neutral-900 mb-2">Staff Sign-In Required</h2>
                  <p className="text-xs text-neutral-600 mb-6 leading-relaxed">
                    You must sign in as a <code className="bg-neutral-200 px-1 rounded font-semibold">tenant_owner</code> or <code className="bg-neutral-200 px-1 rounded font-semibold">tenant_staff</code> in <code className="bg-neutral-200 px-1 rounded">tenant_members</code> to access the Admin Shell.
                  </p>
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs cursor-pointer shadow-sm flex items-center justify-center"
                  >
                    Go to Sign In
                  </button>
                </div>
              );
            }

            // If logged in, but not staff or owner
            if (!isStaffOrOwner) {
              return (
                <div className="max-w-md mx-auto my-auto px-4 py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-neutral-900 mb-2">Customer Account Detected</h2>
                  <p className="text-xs text-neutral-600 mb-6 leading-relaxed">
                    Your account (<span className="font-semibold">{user.email}</span>) does not have a staff or owner record in the <code className="bg-neutral-200 px-1 rounded">tenant_members</code> table.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => navigate('/create-business')}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <PlusCircle className="w-4 h-4 shrink-0" />
                      <span>Register as a Turf Owner</span>
                    </button>
                    <button
                      onClick={() => navigate('/')}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-neutral-300 text-neutral-700 font-semibold text-xs hover:bg-neutral-100 cursor-pointer flex items-center justify-center"
                    >
                      Browse Venues as Customer
                    </button>
                  </div>
                </div>
              );
            }

            return <AdminDashboard onOpenConfig={() => setConfigModalOpen(true)} />;
          }

          // 2. Auth Page (/login, /signup, /t/:slug/login)
          if (route.isAuth) {
            return (
              <AuthPage
                initialMode={route.authMode}
                tenantSlug={route.tenantSlug}
                onOpenConfig={() => setConfigModalOpen(true)}
              />
            );
          }

          // 3. Create Business Form (/create-business)
          if (route.isCreateBusiness) {
            return <CreateBusinessPage onOpenConfig={() => setConfigModalOpen(true)} />;
          }

          // 4. Tenant Public Landing Page (/t/:slug)
          if (route.tenantSlug) {
            return (
              <TenantLanding
                slug={route.tenantSlug}
                onOpenConfig={() => setConfigModalOpen(true)}
              />
            );
          }

          // 5. Default Home Page
          return <HomePage onOpenConfig={() => setConfigModalOpen(true)} />;
        })()}
      </div>

      {/* Supabase Connection Setup Modal */}
      <SupabaseConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </RouterProvider>
  );
}
