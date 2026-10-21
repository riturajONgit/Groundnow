import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import type { MarketplaceTurf, CityOption, Sport } from '../types/database';
import {
  MapPin,
  Search,
  SlidersHorizontal,
  Navigation,
  Compass,
  Calendar,
  ArrowRight,
  Store,
  PlusCircle,
  LayoutDashboard,
  Sparkles,
  X,
  Filter,
  Check,
  AlertCircle,
  RefreshCw,
  Layers,
  ChevronDown,
  DollarSign,
  Tag,
} from 'lucide-react';

const LOCAL_STORAGE_CITY_KEY = 'groundnow_marketplace_city';

type SortOption = 'Newest' | 'Price low-high' | 'Price high-low' | 'Nearest';

interface HomePageProps {
  onOpenConfig?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenConfig }) => {
  const { navigate } = useRouter();
  const { user, isStaffOrOwner } = useAuth();

  // Cities from rpc list_cities()
  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_STORAGE_CITY_KEY) || 'all';
    }
    return 'all';
  });

  // Sports list from `sports` table
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSportId, setSelectedSportId] = useState<number | string | null>(null);

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Price range (min / max)
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // Sort option
  const [sortOption, setSortOption] = useState<SortOption>('Newest');

  // Geolocation / Near Me state
  const [isNearMe, setIsNearMe] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Filter drawer toggle on mobile
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Results state
  const [turfs, setTurfs] = useState<MarketplaceTurf[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Direct venue jump input
  const [directSlug, setDirectSlug] = useState('');

  // 1. Fetch cities from rpc list_cities()
  const fetchCities = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase.rpc('list_cities');
      if (error) {
        console.warn('Error fetching cities via list_cities():', error.message);
        return;
      }
      if (data && Array.isArray(data)) {
        // Normalize returned items: could be string[] or { city, state, turf_count }[]
        const normalized: CityOption[] = data.map((item: any) => {
          if (typeof item === 'string') {
            return { city: item };
          }
          return {
            city: item.city || item.name || '',
            state: item.state || null,
            turf_count: item.turf_count != null ? Number(item.turf_count) : null,
          };
        }).filter((c) => Boolean(c.city));
        setCities(normalized);
      }
    } catch (err) {
      console.warn('Failed to call list_cities RPC:', err);
    }
  }, []);

  // 2. Fetch sports from `sports` table
  const fetchSports = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('sports')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.warn('Error fetching sports table:', error.message);
        return;
      }
      if (data) {
        setSports(data as Sport[]);
      }
    } catch (err) {
      console.warn('Failed to fetch sports:', err);
    }
  }, []);

  // Initial load of cities and sports
  useEffect(() => {
    fetchCities();
    fetchSports();
  }, [fetchCities, fetchSports]);

  // Persist selected city to localStorage
  const handleCityChange = (cityVal: string) => {
    setSelectedCity(cityVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_CITY_KEY, cityVal);
    }
  };

  // 3. Browser geolocation "Near me" handler
  const handleNearMeClick = () => {
    setLocationError(null);

    // If already active, toggle off
    if (isNearMe) {
      setIsNearMe(false);
      setUserLocation(null);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        setIsNearMe(true);
        setSortOption('Nearest');
        setDetectingLocation(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setDetectingLocation(false);
        setLocationError(err.message || 'Unable to retrieve your location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 4. Execute search_turfs via rpc
  const executeSearch = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setSearchError(null);

    try {
      const pCity = selectedCity && selectedCity !== 'all' ? selectedCity : null;
      const pSportId = selectedSportId ? selectedSportId : null;
      const pMinPrice = minPrice.trim() !== '' && !isNaN(Number(minPrice)) ? Number(minPrice) : null;
      const pMaxPrice = maxPrice.trim() !== '' && !isNaN(Number(maxPrice)) ? Number(maxPrice) : null;
      const pQuery = searchQuery.trim() !== '' ? searchQuery.trim() : null;
      const pLat = isNearMe && userLocation ? userLocation.lat : null;
      const pLng = isNearMe && userLocation ? userLocation.lng : null;
      const pRadiusKm = isNearMe && userLocation ? 10 : null;
      const pSort = sortOption;

      const { data, error } = await supabase.rpc('search_turfs', {
        p_city: pCity,
        p_sport_id: pSportId,
        p_min_price: pMinPrice,
        p_max_price: pMaxPrice,
        p_query: pQuery,
        p_lat: pLat,
        p_lng: pLng,
        p_radius_km: pRadiusKm,
        p_sort: pSort,
      });

      if (error) {
        console.error('Error in search_turfs RPC:', error);
        setSearchError(error.message);
        setTurfs([]);
        setLoading(false);
        return;
      }

      let results: MarketplaceTurf[] = (data as MarketplaceTurf[]) || [];

      // Client-side fallback sorting to guarantee perfect ordering
      if (sortOption === 'Price low-high') {
        results = [...results].sort((a, b) => (a.min_price ?? Infinity) - (b.min_price ?? Infinity));
      } else if (sortOption === 'Price high-low') {
        results = [...results].sort((a, b) => (b.min_price ?? -Infinity) - (a.min_price ?? -Infinity));
      } else if (sortOption === 'Nearest' && isNearMe) {
        results = [...results].sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
      }

      setTurfs(results);
    } catch (err: any) {
      console.error('Unexpected error running search_turfs:', err);
      setSearchError(err?.message || 'Failed to search turfs.');
      setTurfs([]);
    } finally {
      setLoading(false);
    }
  }, [
    selectedCity,
    selectedSportId,
    minPrice,
    maxPrice,
    searchQuery,
    isNearMe,
    userLocation,
    sortOption,
  ]);

  // Debounced search trigger when filter states change
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch();
    }, 250);

    return () => clearTimeout(timer);
  }, [executeSearch]);

  // Handle direct venue slug jump
  const handleDirectJump = (e: React.FormEvent) => {
    e.preventDefault();
    if (directSlug.trim()) {
      navigate(`/t/${directSlug.trim().toLowerCase()}`);
    }
  };

  // Clear all filters
  const handleResetFilters = () => {
    setSelectedCity('all');
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_CITY_KEY, 'all');
    }
    setSelectedSportId(null);
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setIsNearMe(false);
    setUserLocation(null);
    setLocationError(null);
    setSortOption('Newest');
  };

  // Check if any filter is actively applied
  const hasActiveFilters =
    selectedCity !== 'all' ||
    selectedSportId !== null ||
    searchQuery.trim() !== '' ||
    minPrice.trim() !== '' ||
    maxPrice.trim() !== '' ||
    isNearMe;

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-24">
      {/* Hero / Marketplace Header */}
      <section className="relative overflow-hidden bg-neutral-900 text-white pt-10 pb-12 px-4 sm:px-6 lg:px-8 border-b border-neutral-800">
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20px 20px, #10b981 1.5%, transparent 0%)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="max-w-6xl mx-auto relative z-10 space-y-6">
          {/* Top Badge & Subtitle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>India's Turf Marketplace</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Find &amp; Book Sports Turfs
              </h1>
              <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-xl">
                Compare ground availability, prices, amenities, and reserve open time slots instantly.
              </p>
            </div>

            {/* Quick Actions for Facility Owners */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => navigate('/create-business')}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>List Your Turf</span>
              </button>

              {isStaffOrOwner && (
                <button
                  onClick={() => navigate('/admin')}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              )}
            </div>
          </div>

          {/* Primary Marketplace Search & City Bar */}
          <div className="bg-white dark:bg-neutral-800 rounded-3xl p-3 sm:p-4 shadow-xl border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
              {/* 1. City Picker from list_cities() */}
              <div className="md:col-span-4 relative">
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 min-h-[48px] focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mr-2" />
                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 leading-tight">
                      City
                    </label>
                    <select
                      value={selectedCity}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-neutral-900 dark:text-white focus:outline-none cursor-pointer truncate"
                      aria-label="Select City"
                    >
                      <option value="all">All Cities</option>
                      {cities.map((c) => (
                        <option key={c.city} value={c.city}>
                          {c.city} {c.state ? `(${c.state})` : ''} {c.turf_count != null ? `• ${c.turf_count} ${c.turf_count === 1 ? 'turf' : 'turfs'}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0 ml-1 pointer-events-none" />
                </div>
              </div>

              {/* 2. Search Box */}
              <div className="md:col-span-5 relative">
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2 min-h-[48px] focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                  <Search className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 leading-tight">
                      Search
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search turfs, grounds, or venues..."
                      className="w-full bg-transparent text-xs font-bold text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
                    />
                  </div>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Near Me Button */}
              <div className="md:col-span-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleNearMeClick}
                  disabled={detectingLocation}
                  className={`flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                    isNearMe
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400'
                      : 'bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700'
                  }`}
                  title="Search turfs within 10km radius"
                >
                  <Navigation
                    className={`w-4 h-4 ${
                      isNearMe
                        ? 'text-white'
                        : 'text-emerald-600 dark:text-emerald-400'
                    } ${detectingLocation ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {detectingLocation
                      ? 'Locating...'
                      : isNearMe
                      ? 'Within 10 km'
                      : 'Near me'}
                  </span>
                  {isNearMe && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                </button>

                {/* Mobile Filter Button */}
                <button
                  type="button"
                  onClick={() => setShowFiltersModal(!showFiltersModal)}
                  className="sm:hidden min-h-[48px] min-w-[48px] rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-200 cursor-pointer"
                  title="Filter options"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Geolocation feedback / error message */}
            {locationError && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>{locationError}</span>
                </div>
                <button
                  onClick={() => setLocationError(null)}
                  className="text-amber-600 hover:text-amber-800 text-[11px] font-bold underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {isNearMe && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Searching within <strong>10 km</strong> radius of your detected location.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsNearMe(false);
                    setUserLocation(null);
                  }}
                  className="text-rose-600 dark:text-rose-400 hover:underline font-bold text-[11px] cursor-pointer"
                >
                  Clear location
                </button>
              </div>
            )}

            {/* Secondary Controls: Price Range, Sort, Sport Chips */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Price Range (min/max) */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-neutral-400" />
                  Price (₹/hr):
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="Min"
                      className="w-20 min-h-[36px] pl-6 pr-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
                      aria-label="Minimum price"
                    />
                  </div>
                  <span className="text-neutral-400 text-xs">-</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Max"
                      className="w-20 min-h-[36px] pl-6 pr-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
                      aria-label="Maximum price"
                    />
                  </div>
                  {(minPrice || maxPrice) && (
                    <button
                      type="button"
                      onClick={() => {
                        setMinPrice('');
                        setMaxPrice('');
                      }}
                      className="text-[11px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1"
                      title="Clear price filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 self-end md:self-auto">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  Sort:
                </span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="min-h-[36px] px-3 py-1 text-xs font-semibold bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  aria-label="Sort options"
                >
                  <option value="Newest">Newest</option>
                  <option value="Price low-high">Price low-high</option>
                  <option value="Price high-low">Price high-low</option>
                  <option value="Nearest">Nearest</option>
                </select>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="min-h-[36px] px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Sport Chips from `sports` table */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 shrink-0 mr-1">
                  Sports:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSportId(null)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedSportId === null
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                  }`}
                >
                  All Sports
                </button>
                {sports.map((sp) => {
                  const isSelected = selectedSportId === sp.id;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => setSelectedSportId(isSelected ? null : sp.id)}
                      className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Tag className="w-3 h-3 opacity-60" />
                      <span>{sp.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Results Directory */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Results Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <span>Available Turfs</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold">
                {turfs.length} {turfs.length === 1 ? 'Ground' : 'Grounds'}
              </span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {selectedCity !== 'all' ? `Showing turfs in ${selectedCity}` : 'Showing turfs across all registered cities'}
              {selectedSportId ? ` • Filtered by sport` : ''}
              {isNearMe ? ` • Within 10 km` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <button
              onClick={() => executeSearch()}
              disabled={loading}
              className="min-h-[36px] px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Refresh search"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Backend Configuration Warning */}
        {!isSupabaseConfigured && (
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Supabase Connection Required</span>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                To load live turfs and run search RPC functions, please connect your Supabase credentials.
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

        {/* Error Alert */}
        {searchError && (
          <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-xs text-rose-800 dark:text-rose-300">
            <strong>Error loading marketplace:</strong> {searchError}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="py-24 text-center text-xs text-neutral-500 dark:text-neutral-400">
            <div className="w-10 h-10 rounded-full border-3 border-emerald-600 border-t-transparent animate-spin mx-auto mb-3" />
            <span className="font-semibold text-sm block text-neutral-700 dark:text-neutral-300">
              Searching grounds...
            </span>
            <span className="text-xs text-neutral-400">Executing search_turfs() with current parameters</span>
          </div>
        ) : turfs.length > 0 ? (
          /* Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {turfs.map((t) => {
              const photo = t.photos && t.photos.length > 0 ? t.photos[0] : null;
              const brandColor = t.brand_color || '#16a34a';

              return (
                <div
                  key={t.turf_id}
                  onClick={() => navigate(`/t/${t.tenant_slug}?turf=${t.turf_id}`)}
                  className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer group hover:border-emerald-500/50"
                >
                  <div>
                    {/* Photo or Styled Placeholder */}
                    <div className="relative h-48 w-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      {photo ? (
                        <img
                          src={photo}
                          alt={t.turf_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          className="w-full h-full flex flex-col items-center justify-center p-6 text-white relative"
                          style={{
                            background: `linear-gradient(135deg, ${brandColor} 0%, #0f172a 100%)`,
                          }}
                        >
                          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center mb-2 shadow-inner">
                            <Store className="w-7 h-7 text-white" />
                          </div>
                          <span className="text-xs font-mono tracking-wider opacity-80 uppercase">
                            {t.tenant_name}
                          </span>
                        </div>
                      )}

                      {/* Distance pill (if available) */}
                      {t.distance_km != null && (
                        <div className="absolute top-3 left-3 bg-neutral-900/85 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <Compass className="w-3 h-3 text-emerald-400" />
                          <span>
                            {t.distance_km < 1
                              ? `${Math.round(t.distance_km * 1000)} m away`
                              : `${t.distance_km.toFixed(1)} km away`}
                          </span>
                        </div>
                      )}

                      {/* City Pill */}
                      {t.city && (
                        <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md text-neutral-800 dark:text-neutral-100 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs">
                          <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{t.city}</span>
                        </div>
                      )}

                      {/* Price Badge */}
                      {t.min_price != null && (
                        <div className="absolute bottom-3 right-3 bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-md">
                          from ₹{t.min_price}/hr
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-3">
                      <div>
                        {/* Venue Name */}
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                          <span
                            className="w-2 h-2 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: brandColor }}
                          />
                          <span className="truncate">{t.tenant_name}</span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            (/t/{t.tenant_slug})
                          </span>
                        </div>

                        {/* Turf Name */}
                        <h3 className="text-lg font-black text-neutral-900 dark:text-white mt-1 group-hover:text-emerald-600 transition-colors">
                          {t.turf_name}
                        </h3>

                        {t.address && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-1">
                            {t.address}
                          </p>
                        )}
                      </div>

                      {/* Sports with "from ₹X/hr" */}
                      {t.sports && t.sports.length > 0 ? (
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                            Available Sports:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {t.sports.map((sp, idx) => {
                              const price = sp.price_per_hour ?? t.min_price;
                              return (
                                <span
                                  key={idx}
                                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                                >
                                  <span>{sp.name}</span>
                                  {price != null && (
                                    <span className="font-medium text-[10px] text-emerald-600 dark:text-emerald-400 ml-1">
                                      · from ₹{price}/hr
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ) : t.min_price != null ? (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                            from ₹{t.min_price}/hr
                          </span>
                        </div>
                      ) : null}

                      {/* Amenities pills */}
                      {t.amenities && t.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {t.amenities.slice(0, 4).map((am) => (
                            <span
                              key={am}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                            >
                              {am}
                            </span>
                          ))}
                          {t.amenities.length > 4 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-neutral-400">
                              +{t.amenities.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                      <div className="text-xs font-extrabold text-neutral-900 dark:text-white">
                        {t.min_price != null ? `from ₹${t.min_price}/hr` : 'Standard Rate'}
                      </div>

                      <button
                        type="button"
                        className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer group-hover:scale-102"
                      >
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>Check Slots</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State: Required Copy */
          <div className="mt-8 bg-white dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 p-8 sm:p-14 text-center max-w-xl mx-auto shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center mb-4">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
              No turfs found. Try another city or sport.
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed max-w-sm mx-auto">
              We couldn't find any grounds matching your current filters. Clear your parameters or choose a different city to see available arenas.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => handleCityChange('all')}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Show All Cities
              </button>
            </div>
          </div>
        )}

        {/* Quick Direct Jump Form at Bottom */}
        <div className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div>
            <span className="font-bold text-neutral-700 dark:text-neutral-300 block">
              Know your venue's direct link?
            </span>
            <span>Jump directly to any facility by entering its unique path slug.</span>
          </div>

          <form
            onSubmit={handleDirectJump}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-neutral-400">
                /t/
              </span>
              <input
                type="text"
                value={directSlug}
                onChange={(e) => setDirectSlug(e.target.value)}
                placeholder="venue-slug"
                className="min-h-[40px] pl-8 pr-3 py-1.5 font-mono text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-1.5 font-bold text-xs rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 cursor-pointer"
            >
              Go
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
