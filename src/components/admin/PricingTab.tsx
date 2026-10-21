import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Tenant, Turf, Sport, TurfSport } from '../../types/database';
import {
  DollarSign,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Sparkles,
  Users,
  Clock,
  ArrowRight,
  Info,
  Check,
  Dumbbell,
} from 'lucide-react';

interface PricingTabProps {
  currentTenant: Tenant;
  turfs: Turf[];
}

interface SportRowState {
  sport_id: string | number;
  sport_name: string;
  price_per_hour: string;
  peak_price: string;
  min_duration_minutes: string;
  capacity: string;
  isDirty: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
}

// Fallback baseline for sports to ensure instant visibility
const DEFAULT_SPORTS: Sport[] = [
  { id: 1, name: 'Cricket' },
  { id: 2, name: 'Football' },
  { id: 3, name: 'Futsal' },
  { id: 4, name: 'Pickleball' },
  { id: 5, name: 'Badminton' },
];

export const PricingTab: React.FC<PricingTabProps> = ({ currentTenant, turfs }) => {
  const [selectedTurfId, setSelectedTurfId] = useState<string>(turfs[0]?.id || '');
  const [selectedSportId, setSelectedSportId] = useState<string>('all');
  const [sports, setSports] = useState<Sport[]>(DEFAULT_SPORTS);
  const [turfSports, setTurfSports] = useState<TurfSport[]>([]);
  const [rowStates, setRowStates] = useState<Record<string, SportRowState>>({});
  const [loading, setLoading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If turfs change or initial load, set selected turf
  useEffect(() => {
    if (!selectedTurfId && turfs.length > 0) {
      setSelectedTurfId(turfs[0].id);
    }
  }, [turfs, selectedTurfId]);

  // Load sports and current turf_sports
  const loadPricingData = async (turfId: string) => {
    if (!turfId) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch all available sports from `sports` table (Cricket, Football, Futsal, Pickleball, Badminton)
      const { data: sportsData, error: sportsErr } = await supabase
        .from('sports')
        .select('*')
        .order('id', { ascending: true });

      let availableSports = DEFAULT_SPORTS;
      if (sportsErr) {
        console.warn('Could not query sports table, using sports list:', sportsErr.message);
      } else if (sportsData && sportsData.length > 0) {
        availableSports = sportsData as Sport[];
      }
      setSports(availableSports);

      // 2. Fetch existing turf_sports for this turf and tenant
      // Do NOT filter sports dropdown by existing turf_sports rows.
      const { data: tsData, error: tsErr } = await supabase
        .from('turf_sports')
        .select('*')
        .eq('turf_id', turfId)
        .eq('tenant_id', currentTenant.id);

      if (tsErr) {
        console.error('Supabase error loading turf_sports:', tsErr);
        setErrorMessage(tsErr.message);
      }

      const existingTurfSports = (tsData as TurfSport[]) || [];
      setTurfSports(existingTurfSports);

      // 3. Build row state for EVERY sport from the sports table
      const map: Record<string, SportRowState> = {};
      const existingMap = new Map<string, TurfSport>();
      existingTurfSports.forEach((ts) => {
        existingMap.set(String(ts.sport_id), ts);
      });

      availableSports.forEach((sport) => {
        const sportKey = String(sport.id);
        const existing = existingMap.get(sportKey);
        map[sportKey] = {
          sport_id: sport.id,
          sport_name: sport.name,
          price_per_hour:
            existing?.price_per_hour !== null && existing?.price_per_hour !== undefined
              ? String(existing.price_per_hour)
              : '',
          peak_price:
            existing?.peak_price !== null && existing?.peak_price !== undefined
              ? String(existing.peak_price)
              : '',
          min_duration_minutes:
            existing?.min_duration_minutes !== null && existing?.min_duration_minutes !== undefined
              ? String(existing.min_duration_minutes)
              : '60',
          capacity:
            existing?.capacity !== null && existing?.capacity !== undefined
              ? String(existing.capacity)
              : '',
          isDirty: false,
          isSaving: false,
          saveSuccess: false,
        };
      });

      setRowStates(map);
    } catch (err: any) {
      console.error('Failed to load pricing data:', err);
      setErrorMessage(err?.message || 'Error querying pricing and sports data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTurfId) {
      loadPricingData(selectedTurfId);
    }
  }, [selectedTurfId, currentTenant.id]);

  const handleFieldChange = (
    sportId: string | number,
    field: 'price_per_hour' | 'peak_price' | 'min_duration_minutes' | 'capacity',
    value: string
  ) => {
    const key = String(sportId);
    setRowStates((prev) => {
      const current = prev[key];
      if (!current) return prev;
      return {
        ...prev,
        [key]: {
          ...current,
          [field]: value,
          isDirty: true,
          saveSuccess: false,
        },
      };
    });
  };

  const handleSaveRow = async (sportId: string | number) => {
    const key = String(sportId);
    const row = rowStates[key];
    if (!row || !selectedTurfId) return;

    setErrorMessage(null);
    setRowStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], isSaving: true, saveSuccess: false },
    }));

    try {
      const parsedSportId = !isNaN(Number(sportId)) ? Number(sportId) : sportId;
      const payload = {
        turf_id: selectedTurfId,
        sport_id: parsedSportId,
        tenant_id: currentTenant.id,
        price_per_hour: row.price_per_hour !== '' ? Number(row.price_per_hour) : null,
        peak_price: row.peak_price !== '' ? Number(row.peak_price) : null,
        min_duration_minutes: row.min_duration_minutes !== '' ? Number(row.min_duration_minutes) : 60,
        capacity: row.capacity !== '' ? Number(row.capacity) : null,
      };

      // Upsert into turf_sports table on turf_id + sport_id
      const { data, error } = await supabase
        .from('turf_sports')
        .upsert(payload, { onConflict: 'turf_id,sport_id' });

      if (error) {
        console.error('Supabase error upserting turf_sports:', error);
        setErrorMessage(error.message);
        setRowStates((prev) => ({
          ...prev,
          [key]: { ...prev[key], isSaving: false },
        }));
        return;
      }

      setRowStates((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          isSaving: false,
          isDirty: false,
          saveSuccess: true,
        },
      }));

      // Reload turf_sports data to sync state
      const { data: updatedTs } = await supabase
        .from('turf_sports')
        .select('*')
        .eq('turf_id', selectedTurfId)
        .eq('tenant_id', currentTenant.id);

      if (updatedTs) {
        setTurfSports(updatedTs as TurfSport[]);
      }

      setTimeout(() => {
        setRowStates((prev) => ({
          ...prev,
          [key]: { ...prev[key], saveSuccess: false },
        }));
      }, 3000);
    } catch (err: any) {
      console.error('Unexpected error saving turf sport:', err);
      setErrorMessage(err?.message || 'Failed to save pricing.');
      setRowStates((prev) => ({
        ...prev,
        [key]: { ...prev[key], isSaving: false },
      }));
    }
  };

  const handleSaveAll = async () => {
    if (!selectedTurfId) return;
    setSavingAll(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const rowsToSave = Object.values(rowStates).filter((r) => r.isDirty || r.price_per_hour !== '');

    if (rowsToSave.length === 0) {
      setSavingAll(false);
      setSuccessMessage('No pricing changes to save.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    try {
      const payloads = rowsToSave.map((row) => {
        const parsedSportId = !isNaN(Number(row.sport_id)) ? Number(row.sport_id) : row.sport_id;
        return {
          turf_id: selectedTurfId,
          sport_id: parsedSportId,
          tenant_id: currentTenant.id,
          price_per_hour: row.price_per_hour !== '' ? Number(row.price_per_hour) : null,
          peak_price: row.peak_price !== '' ? Number(row.peak_price) : null,
          min_duration_minutes: row.min_duration_minutes !== '' ? Number(row.min_duration_minutes) : 60,
          capacity: row.capacity !== '' ? Number(row.capacity) : null,
        };
      });

      const { data, error } = await supabase
        .from('turf_sports')
        .upsert(payloads, { onConflict: 'turf_id,sport_id' });

      if (error) {
        console.error('Supabase error bulk upserting turf_sports:', error);
        setErrorMessage(error.message);
        setSavingAll(false);
        return;
      }

      setSuccessMessage('All sport prices saved successfully!');
      await loadPricingData(selectedTurfId);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Unexpected error in bulk save:', err);
      setErrorMessage(err?.message || 'Error saving all pricing rows.');
    } finally {
      setSavingAll(false);
    }
  };

  const selectedTurf = turfs.find((t) => t.id === selectedTurfId);

  // Filter sports to display based on the Sport dropdown
  const displayedSports = selectedSportId === 'all'
    ? sports
    : sports.filter((s) => String(s.id) === selectedSportId);

  const selectedSportObj = sports.find((s) => String(s.id) === selectedSportId);

  if (turfs.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-neutral-200 p-8 sm:p-12 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-neutral-900 mb-1">No Turfs Available</h3>
        <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
          You need at least one turf registered in <strong>{currentTenant.name}</strong> before configuring sport pricing.
        </p>
        <p className="text-[11px] text-neutral-400">
          Switch to the <strong>Turfs</strong> tab to add your first pitch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header & Controls: Turf dropdown & Sport dropdown */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900 flex items-center gap-2 flex-wrap">
            <span>Sport Rates &amp; Pricing</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              `turf_sports`
            </span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
            Configure hourly rates, peak pricing, and player capacity per sport for each turf.
          </p>
        </div>

        {/* Dual Selectors: Select Turf & Select Sport */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Turf Selector Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 flex-1 sm:flex-none">
            <label className="text-xs font-bold text-neutral-600 shrink-0">Turf:</label>
            <select
              value={selectedTurfId}
              onChange={(e) => setSelectedTurfId(e.target.value)}
              className="w-full sm:w-48 text-xs font-semibold px-3 py-2.5 min-h-[44px] bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            >
              {turfs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sport Selector Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 flex-1 sm:flex-none">
            <label className="text-xs font-bold text-neutral-600 shrink-0">Sport:</label>
            <select
              id="sport-dropdown"
              value={selectedSportId}
              onChange={(e) => setSelectedSportId(e.target.value)}
              className="w-full sm:w-48 text-xs font-semibold px-3 py-2.5 min-h-[44px] bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            >
              <option value="all">All Sports ({sports.length})</option>
              {sports.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={() => loadPricingData(selectedTurfId)}
            className="min-h-[44px] min-w-[44px] p-2.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 rounded-xl transition-colors cursor-pointer shrink-0 border border-neutral-200 bg-white shadow-2xs flex items-center justify-center self-end sm:self-auto"
            title="Refresh pricing"
            aria-label="Refresh pricing"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-bold">Supabase Error:</span>
            <p className="mt-0.5 font-mono text-[11px] leading-relaxed break-all">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold break-words">{successMessage}</span>
        </div>
      )}

      {/* Active Context Banner */}
      {selectedTurf && (
        <div className="p-4 bg-neutral-900 text-white rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="break-words">
              Turf: <strong className="text-emerald-400">{selectedTurf.name}</strong>
            </span>
            <span className="text-neutral-400">•</span>
            <span className="break-words">
              Sport:{' '}
              <strong className="text-white">
                {selectedSportId === 'all' ? 'All Sports' : selectedSportObj?.name}
              </strong>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {selectedSportId !== 'all' && (
              <button
                onClick={() => setSelectedSportId('all')}
                className="w-full sm:w-auto min-h-[44px] px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer flex items-center justify-center"
              >
                Show All Sports
              </button>
            )}
            <button
              onClick={handleSaveAll}
              disabled={savingAll || loading}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingAll ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 shrink-0" />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Sports Pricing Table on Desktop / Stacked Cards on Mobile */}
      {loading ? (
        <div className="py-16 text-center text-xs text-neutral-500">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto mb-2" />
          <span>Loading sports and pricing from Supabase...</span>
        </div>
      ) : displayedSports.length > 0 ? (
        <>
          {/* MOBILE VIEW: Stacked Cards (visible below lg) */}
          <div className="block lg:hidden space-y-4">
            {displayedSports.map((sport) => {
              const sportKey = String(sport.id);
              const state = rowStates[sportKey] || {
                sport_id: sport.id,
                sport_name: sport.name,
                price_per_hour: '',
                peak_price: '',
                min_duration_minutes: '60',
                capacity: '',
                isDirty: false,
                isSaving: false,
                saveSuccess: false,
              };

              const isConfigured = turfSports.some(
                (ts) => String(ts.sport_id) === sportKey && ts.price_per_hour !== null
              );

              return (
                <div
                  key={sport.id}
                  className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3.5 transition-colors ${
                    state.isDirty ? 'border-amber-300 bg-amber-50/20' : 'border-neutral-200'
                  }`}
                >
                  {/* Card Header: Sport Name & Configuration Badge */}
                  <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-100">
                        {sport.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-neutral-900 text-sm">
                          {sport.name}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          Sport ID: {sport.id}
                        </div>
                      </div>
                    </div>

                    {isConfigured ? (
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Configured
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                        Not Set
                      </span>
                    )}
                  </div>

                  {/* Form Inputs: Stacked & Full Width on Mobile with 44px min-height */}
                  <div className="space-y-3">
                    {/* Standard Price */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Standard Price ($/hr)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-bold">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={state.price_per_hour}
                          onChange={(e) =>
                            handleFieldChange(sport.id, 'price_per_hour', e.target.value)
                          }
                          placeholder="0.00"
                          className="w-full text-sm font-semibold pl-7 pr-3 py-2.5 min-h-[44px] bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Peak Price */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Peak Price ($/hr)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-bold">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={state.peak_price}
                          onChange={(e) =>
                            handleFieldChange(sport.id, 'peak_price', e.target.value)
                          }
                          placeholder="e.g. 50.00"
                          className="w-full text-sm font-semibold pl-7 pr-3 py-2.5 min-h-[44px] bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Min Duration */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Min Duration (mins)
                      </label>
                      <select
                        value={state.min_duration_minutes || '60'}
                        onChange={(e) =>
                          handleFieldChange(sport.id, 'min_duration_minutes', e.target.value)
                        }
                        className="w-full text-sm font-medium px-3 py-2.5 min-h-[44px] bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="30">30 Mins</option>
                        <option value="45">45 Mins</option>
                        <option value="60">60 Mins (1 hr)</option>
                        <option value="90">90 Mins (1.5 hrs)</option>
                        <option value="120">120 Mins (2 hrs)</option>
                      </select>
                    </div>

                    {/* Capacity */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Max Capacity (Players)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={state.capacity}
                        onChange={(e) => handleFieldChange(sport.id, 'capacity', e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full text-sm font-medium px-3 py-2.5 min-h-[44px] bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Card Save Button: Full Width & 44px on Mobile */}
                  <button
                    type="button"
                    onClick={() => handleSaveRow(sport.id)}
                    disabled={state.isSaving}
                    className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                      state.saveSuccess
                        ? 'bg-emerald-600 text-white'
                        : state.isDirty
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                    }`}
                  >
                    {state.isSaving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : state.saveSuccess ? (
                      <>
                        <Check className="w-4 h-4 shrink-0" />
                        <span>Saved Successfully</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 shrink-0" />
                        <span>Save {sport.name} Rates</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW: Table Grid (visible on lg and above) */}
          <div className="hidden lg:block bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
            {/* Desktop Table Header */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-neutral-50 border-b border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              <div className="col-span-3">Sport from `sports`</div>
              <div className="col-span-2">Standard Price ($/hr)</div>
              <div className="col-span-2">Peak Price ($/hr)</div>
              <div className="col-span-2">Min Duration (mins)</div>
              <div className="col-span-2">Capacity (players)</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            <div className="divide-y divide-neutral-100">
              {displayedSports.map((sport) => {
                const sportKey = String(sport.id);
                const state = rowStates[sportKey] || {
                  sport_id: sport.id,
                  sport_name: sport.name,
                  price_per_hour: '',
                  peak_price: '',
                  min_duration_minutes: '60',
                  capacity: '',
                  isDirty: false,
                  isSaving: false,
                  saveSuccess: false,
                };

                const isConfigured = turfSports.some(
                  (ts) => String(ts.sport_id) === sportKey && ts.price_per_hour !== null
                );

                return (
                  <div
                    key={sport.id}
                    className={`px-5 py-3 transition-colors ${
                      state.isDirty ? 'bg-amber-50/40' : 'hover:bg-neutral-50/60'
                    }`}
                  >
                    <div className="grid grid-cols-12 gap-3 items-center">
                      {/* Sport Info */}
                      <div className="col-span-3 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {sport.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-neutral-900 text-xs sm:text-sm truncate">
                            {sport.name}
                          </div>
                          {isConfigured ? (
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Saved in turf_sports
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-400">
                              Not configured
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Standard Price */}
                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={state.price_per_hour}
                            onChange={(e) =>
                              handleFieldChange(sport.id, 'price_per_hour', e.target.value)
                            }
                            placeholder="0.00"
                            className="w-full text-xs font-semibold pl-6 pr-2.5 py-2 min-h-[38px] bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Peak Price */}
                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={state.peak_price}
                            onChange={(e) =>
                              handleFieldChange(sport.id, 'peak_price', e.target.value)
                            }
                            placeholder="e.g. 50.00"
                            className="w-full text-xs font-semibold pl-6 pr-2.5 py-2 min-h-[38px] bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Min Duration */}
                      <div className="col-span-2">
                        <select
                          value={state.min_duration_minutes || '60'}
                          onChange={(e) =>
                            handleFieldChange(sport.id, 'min_duration_minutes', e.target.value)
                          }
                          className="w-full text-xs font-medium px-2.5 py-2 min-h-[38px] bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="30">30 Mins</option>
                          <option value="45">45 Mins</option>
                          <option value="60">60 Mins (1 hr)</option>
                          <option value="90">90 Mins (1.5 hrs)</option>
                          <option value="120">120 Mins (2 hrs)</option>
                        </select>
                      </div>

                      {/* Capacity */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          value={state.capacity}
                          onChange={(e) => handleFieldChange(sport.id, 'capacity', e.target.value)}
                          placeholder="e.g. 10"
                          className="w-full text-xs font-medium px-2.5 py-2 min-h-[38px] bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Action Button */}
                      <div className="col-span-1 flex items-center justify-end">
                        <button
                          onClick={() => handleSaveRow(sport.id)}
                          disabled={state.isSaving}
                          className={`px-3 py-2 min-h-[38px] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            state.saveSuccess
                              ? 'bg-emerald-600 text-white'
                              : state.isDirty
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                          }`}
                          title="Upsert into turf_sports (turf_id + sport_id)"
                        >
                          {state.isSaving ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : state.saveSuccess ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-3xl border border-dashed border-neutral-300 p-8 text-center max-w-lg mx-auto">
          <p className="text-xs text-neutral-500">
            No sports registered in the <code className="bg-neutral-100 px-1 rounded">sports</code> table.
          </p>
        </div>
      )}
    </div>
  );
};
