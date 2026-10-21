import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Tenant, Turf, AvailabilityRule } from '../../types/database';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  Check,
  Layers,
  Sparkles,
  Copy,
} from 'lucide-react';

interface SlotsTabProps {
  currentTenant: Tenant;
  turfs: Turf[];
}

const DAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export const SlotsTab: React.FC<SlotsTabProps> = ({ currentTenant, turfs }) => {
  const [selectedTurfId, setSelectedTurfId] = useState<string>(turfs[0]?.id || '');
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingRule, setEditingRule] = useState<AvailabilityRule | null>(null);

  // Form State
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Monday default
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // For batch creation
  const [openTime, setOpenTime] = useState('06:00');
  const [closeTime, setCloseTime] = useState('23:00');
  const [slotMinutes, setSlotMinutes] = useState(60);

  // Deletion State
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  // Messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTurfId && turfs.length > 0) {
      setSelectedTurfId(turfs[0].id);
    }
  }, [turfs, selectedTurfId]);

  const loadRules = async (turfId: string) => {
    if (!turfId) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('turf_id', turfId)
        .order('day_of_week', { ascending: true })
        .order('open_time', { ascending: true });

      if (error) {
        console.error('Supabase error loading availability_rules:', error);
        setErrorMessage(error.message);
        setRules([]);
      } else {
        setRules((data as AvailabilityRule[]) || []);
      }
    } catch (err: any) {
      console.error('Failed to load rules:', err);
      setErrorMessage(err?.message || 'Error querying availability rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTurfId) {
      loadRules(selectedTurfId);
    }
  }, [selectedTurfId]);

  const openAddModal = (defaultDay?: number) => {
    setModalMode('add');
    setEditingRule(null);
    const day = defaultDay !== undefined ? defaultDay : 1;
    setDayOfWeek(day);
    setSelectedDays([day]);
    setOpenTime('06:00');
    setCloseTime('23:00');
    setSlotMinutes(60);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const openEditModal = (rule: AvailabilityRule) => {
    setModalMode('edit');
    setEditingRule(rule);
    setDayOfWeek(rule.day_of_week);
    setSelectedDays([rule.day_of_week]);
    // Format times to HH:MM if with seconds
    setOpenTime(rule.open_time.slice(0, 5));
    setCloseTime(rule.close_time.slice(0, 5));
    setSlotMinutes(rule.slot_minutes);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingRule(null);
    setErrorMessage(null);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTurfId) return;

    if (openTime >= closeTime) {
      setErrorMessage('Close time must be later than open time.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (modalMode === 'add') {
        // Support inserting for all selected days
        const payloads = selectedDays.map((d) => ({
          turf_id: selectedTurfId,
          tenant_id: currentTenant.id,
          day_of_week: d,
          open_time: openTime,
          close_time: closeTime,
          slot_minutes: Number(slotMinutes),
        }));

        const { error } = await supabase.from('availability_rules').insert(payloads);

        if (error) {
          console.error('Supabase error inserting rule:', error);
          setErrorMessage(error.message);
          setSubmitting(false);
          return;
        }

        setSuccessMessage(`Availability rule(s) added successfully!`);
      } else if (modalMode === 'edit' && editingRule?.id) {
        const updatePayload = {
          day_of_week: dayOfWeek,
          open_time: openTime,
          close_time: closeTime,
          slot_minutes: Number(slotMinutes),
        };

        const { error } = await supabase
          .from('availability_rules')
          .update(updatePayload)
          .eq('id', editingRule.id);

        if (error) {
          console.error('Supabase error updating rule:', error);
          setErrorMessage(error.message);
          setSubmitting(false);
          return;
        }

        setSuccessMessage('Availability rule updated!');
      }

      await loadRules(selectedTurfId);
      closeModal();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Unexpected error saving rule:', err);
      setErrorMessage(err?.message || 'Failed to save availability rule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('availability_rules')
        .delete()
        .eq('id', ruleId);

      if (error) {
        console.error('Supabase error deleting rule:', error);
        setErrorMessage(error.message);
        setSubmitting(false);
        return;
      }

      setDeletingRuleId(null);
      setSuccessMessage('Availability rule deleted.');
      await loadRules(selectedTurfId);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Unexpected error deleting rule:', err);
      setErrorMessage(err?.message || 'Failed to delete rule.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTurf = turfs.find((t) => t.id === selectedTurfId);

  // Group rules by day_of_week (0..6)
  const rulesByDay: Record<number, AvailabilityRule[]> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
  };
  rules.forEach((r) => {
    if (rulesByDay[r.day_of_week]) {
      rulesByDay[r.day_of_week].push(r);
    }
  });

  if (turfs.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-neutral-200 p-8 sm:p-12 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-neutral-900 mb-1">No Turfs Available</h3>
        <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
          You need at least one turf registered in <strong>{currentTenant.name}</strong> before configuring availability rules.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Header & Turf Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900 flex items-center gap-2 flex-wrap">
            <span>Weekly Availability Slots</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              `availability_rules`
            </span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
            Define operating windows, open/close hours, and slot intervals for each day of the week.
          </p>
        </div>

        {/* Turf Selector & Add Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <select
              value={selectedTurfId}
              onChange={(e) => setSelectedTurfId(e.target.value)}
              className="flex-1 sm:w-56 text-xs font-semibold px-3 py-2.5 min-h-[44px] bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            >
              {turfs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => loadRules(selectedTurfId)}
              className="min-h-[44px] min-w-[44px] p-2.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 rounded-xl transition-colors cursor-pointer border border-neutral-200 bg-white shadow-2xs flex items-center justify-center shrink-0"
              title="Refresh rules"
              aria-label="Refresh rules"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <button
            onClick={() => openAddModal()}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Rule</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Supabase Error:</span>
            <p className="mt-0.5 font-mono text-[11px] leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Days Schedule Grid (Sunday - Saturday) */}
      {loading ? (
        <div className="py-16 text-center text-xs text-neutral-500">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto mb-2" />
          <span>Loading weekly availability rules...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {DAYS.map((day) => {
            const dayRules = rulesByDay[day.value] || [];
            const isWeekend = day.value === 0 || day.value === 6;

            return (
              <div
                key={day.value}
                className={`bg-white rounded-2xl border p-4 transition-all shadow-2xs ${
                  dayRules.length > 0
                    ? 'border-neutral-200'
                    : 'border-dashed border-neutral-300 bg-neutral-50/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
                  {/* Day Info */}
                  <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-40">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 ${
                          isWeekend
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {day.short}
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 text-sm">{day.label}</h4>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          day_of_week: {day.value}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rules for this Day */}
                  <div className="flex-1 w-full sm:w-auto min-w-0">
                    {dayRules.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {dayRules.map((rule) => (
                          <div
                            key={rule.id}
                            className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-2 flex items-center gap-2.5 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                              <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>
                                {rule.open_time.slice(0, 5)} - {rule.close_time.slice(0, 5)}
                              </span>
                            </div>

                            <span className="text-[10px] bg-white border border-neutral-200 text-neutral-600 px-2 py-0.5 rounded-md font-semibold">
                              {rule.slot_minutes}m slots
                            </span>

                            <div className="flex items-center gap-0.5 pl-1 border-l border-neutral-200">
                              <button
                                onClick={() => openEditModal(rule)}
                                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-white"
                                title="Edit rule"
                                aria-label="Edit rule"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => rule.id && handleDeleteRule(rule.id)}
                                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-white"
                                title="Delete rule"
                                aria-label="Delete rule"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-neutral-400 italic">
                        No availability configured (Closed on this day)
                      </div>
                    )}
                  </div>

                  {/* Quick Add for this day - full width on mobile with min-h-44 */}
                  <button
                    onClick={() => openAddModal(day.value)}
                    className="w-full sm:w-auto min-h-[44px] px-3.5 py-2.5 text-xs font-semibold text-neutral-700 hover:text-emerald-700 bg-neutral-100 hover:bg-emerald-50 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Add Hours</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT RULE MODAL */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-base">
                    {modalMode === 'add' ? 'Add Availability Rule' : 'Edit Rule'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Turf: <span className="font-semibold">{selectedTurf?.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-mono text-[11px] leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveRule} className="space-y-4">
              {/* Day selection */}
              {modalMode === 'add' ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                    Select Days of Week (`day_of_week`)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {DAYS.map((d) => {
                      const isSelected = selectedDays.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (selectedDays.length > 1) {
                                setSelectedDays(selectedDays.filter((x) => x !== d.value));
                              }
                            } else {
                              setSelectedDays([...selectedDays, d.value]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                        >
                          {d.short}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedDays([1, 2, 3, 4, 5])}
                      className="text-emerald-700 hover:underline font-semibold"
                    >
                      Weekdays (Mon-Fri)
                    </button>
                    <span className="text-neutral-300">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDays([0, 6])}
                      className="text-emerald-700 hover:underline font-semibold"
                    >
                      Weekends (Sat-Sun)
                    </button>
                    <span className="text-neutral-300">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}
                      className="text-emerald-700 hover:underline font-semibold"
                    >
                      All 7 Days
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Day of Week (`day_of_week`)
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full text-xs font-semibold px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {DAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label} (day_of_week = {d.value})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Open & Close Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Open Time
                  </label>
                  <input
                    type="time"
                    required
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full text-sm font-bold px-3 py-2.5 min-h-[44px] bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Close Time
                  </label>
                  <input
                    type="time"
                    required
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full text-sm font-bold px-3 py-2.5 min-h-[44px] bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Slot Duration */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Slot Duration (`slot_minutes`)
                </label>
                <select
                  value={slotMinutes}
                  onChange={(e) => setSlotMinutes(Number(e.target.value))}
                  className="w-full text-sm font-semibold px-3 py-2.5 min-h-[44px] bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes (Standard 1 Hour)</option>
                  <option value={90}>90 Minutes (1.5 Hours)</option>
                  <option value={120}>120 Minutes (2 Hours)</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{modalMode === 'add' ? 'Save Rules' : 'Save Changes'}</span>
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
