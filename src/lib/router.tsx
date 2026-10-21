import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export interface RouteState {
  path: string;
  tenantSlug: string | null;
  isAdmin: boolean;
  isCreateBusiness: boolean;
  isAuth: boolean;
  authMode: 'login' | 'signup';
  adminTab: 'turfs' | 'pricing' | 'slots' | 'bookings' | 'settings';
}

interface RouterContextType {
  route: RouteState;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

function parsePath(pathname: string, search: string): RouteState {
  const cleanPath = pathname || '/';
  const searchParams = new URLSearchParams(search);

  // Check /t/:slug patterns
  // e.g., /t/skyline-arena, /t/skyline-arena/login, /t/skyline-arena/signup
  const tenantMatch = cleanPath.match(/^\/t\/([^/]+)(?:\/(login|signup))?/i);
  const tenantSlug = tenantMatch ? tenantMatch[1] : null;
  const tenantSubAction = tenantMatch ? tenantMatch[2] : null;

  const isAdmin = cleanPath.startsWith('/admin');
  const isCreateBusiness = cleanPath === '/create-business' || cleanPath === '/create-tenant';
  const isAuth =
    cleanPath === '/login' ||
    cleanPath === '/signup' ||
    tenantSubAction === 'login' ||
    tenantSubAction === 'signup';

  const authMode: 'login' | 'signup' =
    cleanPath === '/signup' || tenantSubAction === 'signup' ? 'signup' : 'login';

  // Admin tab can be from path /admin/:tab or query ?tab=pricing
  const pathTab = cleanPath.replace(/^\/admin\/?/, '').split('/')[0];
  const queryTab = searchParams.get('tab');
  const rawTab = (queryTab || pathTab || 'turfs').toLowerCase();
  
  let adminTab: 'turfs' | 'pricing' | 'slots' | 'bookings' | 'settings' = 'turfs';
  if (rawTab === 'pricing') adminTab = 'pricing';
  else if (rawTab === 'slots') adminTab = 'slots';
  else if (rawTab === 'bookings') adminTab = 'bookings';
  else if (rawTab === 'settings') adminTab = 'settings';

  return {
    path: cleanPath,
    tenantSlug,
    isAdmin,
    isCreateBusiness,
    isAuth,
    authMode,
    adminTab,
  };
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState({
    pathname: window.location.pathname,
    search: window.location.search,
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath({
        pathname: window.location.pathname,
        search: window.location.search,
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to: string) => {
    if (to === window.location.pathname + window.location.search) return;
    window.history.pushState({}, '', to);
    const url = new URL(to, window.location.origin);
    setCurrentPath({
      pathname: url.pathname,
      search: url.search,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const route = useMemo(
    () => parsePath(currentPath.pathname, currentPath.search),
    [currentPath.pathname, currentPath.search]
  );

  return (
    <RouterContext.Provider value={{ route, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}
