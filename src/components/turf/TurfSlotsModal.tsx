import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../lib/router';
import type { Tenant, Turf, AvailabilityRule } from '../../types/database';
import { getTenantThemeStyles, hexToRgba } from '../../lib/theme';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  ChevronRight,
  ArrowRight,
  DollarSign,
  Tag,
  LogIn,
  Check,
  RefreshCw,
  CreditCard,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface TurfSlotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  turf: Turf;
  tenant: Tenant;
}

interface GeneratedSlot {
  id: string;
  dayIndex: number;
  dayDate: Date;
  start: Date;
  end: Date;
  formattedStart: string;
  formattedEnd: string;
  isBusy: boolean;
  isPast: boolean;
}

interface ParsedRange {
  start: Date;
  end: Date;
}

interface BookingConfirmation {
  id: string;
  amount: number;
  turfName: string;
  startTime: string;
  dayString: string;
  upiId?: string | null;
  tenantName: string;
}

function parseRangeItem(item: any): ParsedRange | null {
  if (!item) return null;

  if (typeof item === 'object') {
    if (item.start && item.end) {
      const s = new Date(item.start);
      const e = new Date(item.end);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) return { start: s, end: e };
    }
    if (item.from && item.to) {
      const s = new Date(item.from);
      const e = new Date(item.to);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) return { start: s, end: e };
    }
    if (item.during) return parseRangeItem(item.during);
    if (item.busy_range) return parseRangeItem(item.busy_range);
    if (item.range) return parseRangeItem(item.range);

    const vals = Object.values(item);
    if (vals.length === 1 && typeof vals[0] === 'string') {
      return parseRangeItem(vals[0]);
    }
  }

  if (typeof item === 'string') {
    const cleaned = item.replace(/^[\[\(]/, '').replace(/[\]\)]$/, '');
    const parts = cleaned.split(',');
    if (parts.length === 2) {
      const sStr = parts[0].replace(/['"]/g, '').trim();
      const eStr = parts[1].replace(/['"]/g, '').trim();
      const s = new Date(sStr);
      const e = new Date(eStr);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        return { start: s, end: e };
      }
    }
  }

  return null;
}

function formatTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  const mStr = m < 10 ? '0' + m : m;
  return `${h}:${mStr} ${ampm}`;
}

export const TurfSlotsModal: React.FC<TurfSlotsModalProps> = ({
  isOpen,
  onClose,
  turf,
  tenant,
}) => {
  const { user } = useAuth();
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [busyRanges, setBusyRanges] = useState<ParsedRange[]>([]);
  const [futsalSportId, setFutsalSportId] = useState<number | string>(3);
  const [pricePerHour, setPricePerHour] = useState<number>(
    turf.hourly_rate ?? turf.price_per_hour ?? 500
  );
  const [liveUpiId, setLiveUpiId] = useState<string | null>(tenant.upi_id || null);

  const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Generate the next 7 days
  const next7Days = React.useMemo(() => {
    const list: Date[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const [activeDayTab, setActiveDayTab] = useState<number>(0);

  // Load rules, sports, pricing, busy ranges, and latest upi_id
  const loadData = useCallback(async () => {
    if (!isOpen || !turf?.id) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch availability rules for this turf
      const { data: rulesData, error: rulesErr } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('turf_id', turf.id)
        .order('open_time', { ascending: true });

      if (rulesErr) {
        console.error('Supabase error loading availability_rules:', rulesErr);
        setErrorMessage(rulesErr.message);
      } else {
        setRules((rulesData as AvailabilityRule[]) || []);
      }

      // 2. Fetch sports to find Futsal sport_id
      const { data: sportsData } = await supabase.from('sports').select('*');
      let foundSportId: number | string = 3;
      if (sportsData && sportsData.length > 0) {
        const futsalMatch = sportsData.find(
          (s: any) => s.name?.toLowerCase() === 'futsal'
        );
        if (futsalMatch) {
          foundSportId = futsalMatch.id;
          setFutsalSportId(futsalMatch.id);
        }
      }

      // 3. Fetch price from turf_sports (price_per_hour)
      const { data: tsData } = await supabase
        .from('turf_sports')
        .select('*')
        .eq('turf_id', turf.id);

      if (tsData && tsData.length > 0) {
        const futsalTs = tsData.find(
          (ts: any) => String(ts.sport_id) === String(foundSportId)
        );
        if (futsalTs && futsalTs.price_per_hour !== null) {
          setPricePerHour(Number(futsalTs.price_per_hour));
        } else if (tsData[0].price_per_hour !== null) {
          setPricePerHour(Number(tsData[0].price_per_hour));
        }
      }

      // 4. Fetch latest tenant upi_id
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('upi_id, name')
        .eq('id', turf.tenant_id)
        .single();

      if (tenantData?.upi_id !== undefined) {
        setLiveUpiId(tenantData.upi_id);
      }

      // 5. Fetch busy ranges from RPC get_busy_ranges(p_turf, p_from, p_to)
      const fromDate = next7Days[0];
      const toDate = new Date(next7Days[6].getTime() + 86400000);

      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_busy_ranges', {
        p_turf: turf.id,
        p_from: fromDate.toISOString(),
        p_to: toDate.toISOString(),
      });

      if (rpcErr) {
        console.error('Supabase RPC get_busy_ranges error:', rpcErr);
        setErrorMessage(rpcErr.message);
      } else if (rpcData && Array.isArray(rpcData)) {
        const parsed: ParsedRange[] = [];
        rpcData.forEach((item) => {
          const range = parseRangeItem(item);
          if (range) parsed.push(range);
        });
        setBusyRanges(parsed);
      } else {
        setBusyRanges([]);
      }
    } catch (err: any) {
      console.error('Unexpected error loading slots data:', err);
      setErrorMessage(err?.message || 'Failed to load availability slots.');
    } finally {
      setLoading(false);
    }
  }, [isOpen, turf?.id, turf.tenant_id, next7Days]);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setSelectedSlot(null);
      setConfirmation(null);
      setSuccessMessage(null);
    }
  }, [isOpen, loadData]);

  // Generate slots for a specific day
  const generateSlotsForDay = useCallback(
    (dayDate: Date, dayIndex: number): GeneratedSlot[] => {
      const now = new Date();
      const dayOfWeek = dayDate.getDay();

      const dayRules = rules.filter((r) => r.day_of_week === dayOfWeek);
      if (dayRules.length === 0) return [];

      const result: GeneratedSlot[] = [];

      dayRules.forEach((rule) => {
        const [openH, openM] = rule.open_time.split(':').map(Number);
        const [closeH, closeM] = rule.close_time.split(':').map(Number);

        const openMins = openH * 60 + openM;
        const closeMins = closeH * 60 + closeM;
        const interval = rule.slot_minutes || 60;

        for (let m = openMins; m + interval <= closeMins; m += interval) {
          const slotStart = new Date(dayDate);
          slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);

          const slotEnd = new Date(slotStart.getTime() + interval * 60000);

          // Check if slot overlaps with any busy range from RPC get_busy_ranges
          const isBusy = busyRanges.some((busy) => {
            return slotStart.getTime() < busy.end.getTime() && slotEnd.getTime() > busy.start.getTime();
          });

          const isPast = slotEnd.getTime() <= now.getTime();

          result.push({
            id: `${turf.id}-${slotStart.toISOString()}`,
            dayIndex,
            dayDate,
            start: slotStart,
            end: slotEnd,
            formattedStart: formatTime(slotStart),
            formattedEnd: formatTime(slotEnd),
            isBusy,
            isPast,
          });
        }
      });

      return result.sort((a, b) => a.start.getTime() - b.start.getTime());
    },
    [rules, busyRanges, turf.id]
  );

  // Handle slot booking
  const handleBookSlot = async () => {
    if (!selectedSlot) return;

    if (!user) {
      onClose();
      navigate(`/t/${tenant.slug}/login`);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const duringRange = `[${selectedSlot.start.toISOString()},${selectedSlot.end.toISOString()})`;

      // Insert into bookings without setting tenant_id
      const payload: any = {
        turf_id: turf.id,
        sport_id: Number(futsalSportId) || 3,
        customer_id: user.id,
        during: duringRange,
        status: 'pending',
        payment_status: 'unpaid',
        amount: pricePerHour,
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating booking:', error);
        setErrorMessage(error.message);
        setSubmitting(false);
        return;
      }

      const bookedId = data?.id || 'pending';

      // Set booking confirmation state
      setConfirmation({
        id: bookedId,
        amount: pricePerHour,
        turfName: turf.name,
        startTime: selectedSlot.formattedStart,
        dayString: selectedSlot.dayDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        upiId: liveUpiId,
        tenantName: tenant.name,
      });

      setSuccessMessage('Booking pending payment');
      setSelectedSlot(null);

      // Re-fetch busy ranges with get_busy_ranges
      const fromDate = next7Days[0];
      const toDate = new Date(next7Days[6].getTime() + 86400000);
      const { data: updatedRpc } = await supabase.rpc('get_busy_ranges', {
        p_turf: turf.id,
        p_from: fromDate.toISOString(),
        p_to: toDate.toISOString(),
      });

      if (updatedRpc && Array.isArray(updatedRpc)) {
        const parsed: ParsedRange[] = [];
        updatedRpc.forEach((item) => {
          const range = parseRangeItem(item);
          if (range) parsed.push(range);
        });
        setBusyRanges(parsed);
      }
    } catch (err: any) {
      console.error('Unexpected booking error:', err);
      setErrorMessage(err?.message || 'Failed to place booking.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const theme = getTenantThemeStyles(tenant.brand_color);

  // Generate UPI deep link if upi_id is present
  const upiLink = confirmation?.upiId
    ? `upi://pay?pa=${confirmation.upiId}&pn=${encodeURIComponent(
        confirmation.tenantName
      )}&am=${Number(confirmation.amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(
        'Booking ' + confirmation.turfName + ' ' + confirmation.startTime
      )}&tr=${confirmation.id}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Modal Top Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${tenant.brand_color || '#059669'} 0%, #111827 100%)`,
          }}
          className="p-5 text-white flex items-center justify-between shrink-0 shadow-xs"
        >
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-white">
              <Calendar className="w-3 h-3" />
              <span>Available Slots</span>
            </div>
            <h2 className="text-xl font-extrabold text-white leading-tight">
              {turf.name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-white/85">
              <span>Next 7 Days Schedule</span>
              <span>•</span>
              <span className="font-semibold text-emerald-300">
                ₹{pricePerHour}/hr (Futsal)
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Supabase Error Banner */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start justify-between gap-2 shadow-xs shrink-0">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Supabase Error:</span>
                <p className="mt-0.5 font-mono text-[11px] leading-relaxed">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CUSTOMER BOOKING CONFIRMATION & UPI PAYMENT SCREEN */}
        {confirmation ? (
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
            {/* Header Success Tag */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-neutral-900 tracking-tight">
                Booking pending payment
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Your reservation has been created with status <strong className="text-neutral-800">pending</strong> and payment <strong className="text-neutral-800">unpaid</strong>.
              </p>
            </div>

            {/* Booking Details Summary Card */}
            <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-neutral-600">
                <span>Venue:</span>
                <span className="font-bold text-neutral-900">{confirmation.tenantName}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span>Ground:</span>
                <span className="font-semibold text-neutral-900">{confirmation.turfName}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span>Slot Timing:</span>
                <span className="font-semibold text-neutral-900">
                  {confirmation.dayString} • {confirmation.startTime}
                </span>
              </div>
              <div className="flex justify-between items-center text-neutral-600 border-t border-neutral-200 pt-2 font-bold">
                <span className="text-neutral-900 text-sm">Total Amount:</span>
                <span className="text-emerald-700 text-base font-black">
                  ₹{Number(confirmation.amount).toFixed(2)}
                </span>
              </div>
            </div>

            {/* UPI Payment Action Area */}
            {confirmation.upiId ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      UPI Pay Link Ready
                    </span>
                    <span className="font-mono text-[11px] text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      {confirmation.upiId}
                    </span>
                  </div>

                  {/* Primary Pay Button */}
                  <a
                    href={upiLink || '#'}
                    className="w-full min-h-[44px] py-3.5 px-4 rounded-xl text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-md text-center flex items-center justify-center transition-all"
                  >
                    Pay ₹{Number(confirmation.amount).toFixed(2)} via UPI
                  </a>

                  {/* Copy UPI Option for desktop */}
                  <div className="flex flex-wrap items-center justify-between gap-1 pt-1 text-[11px] text-emerald-800">
                    <span>Pay directly or from any UPI app</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmation.upiId) {
                          navigator.clipboard.writeText(confirmation.upiId);
                          setCopiedUpi(true);
                          setTimeout(() => setCopiedUpi(false), 2500);
                        }
                      }}
                      className="min-h-[36px] inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy UPI ID</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Status Notice Requirement */}
                <p className="text-center text-xs font-semibold text-neutral-600">
                  Payment pending. The turf will confirm once paid.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Payment details not set. Contact the turf.</span>
                    <p className="text-amber-800 text-[11px] mt-0.5">
                      The facility owner hasn't configured a UPI ID yet. Please get in touch directly to complete your payment.
                    </p>
                  </div>
                </div>

                {/* Status Notice Requirement */}
                <p className="text-center text-xs font-semibold text-neutral-600">
                  Payment pending. The turf will confirm once paid.
                </p>
              </div>
            )}

            {/* Footer Done Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmation(null);
                  loadData();
                }}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer flex items-center justify-center"
              >
                Book Another Slot
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-bold text-white cursor-pointer shadow-xs flex items-center justify-center"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Day Navigation Tabs for Quick Jump */}
            <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-neutral-100 flex items-center gap-1.5 overflow-x-auto shrink-0 bg-neutral-50/80">
              {next7Days.map((day, idx) => {
                const isToday = idx === 0;
                const dayName = isToday
                  ? 'Today'
                  : day.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = day.getDate();
                const isActive = activeDayTab === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveDayTab(idx);
                      const el = document.getElementById(`day-section-${idx}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    style={isActive ? theme.buttonStyle : undefined}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex flex-col items-center min-w-[58px] ${
                      isActive
                        ? 'shadow-xs'
                        : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="text-[10px] uppercase">{dayName}</span>
                    <span className="text-sm font-extrabold">{dayNum}</span>
                  </button>
                );
              })}
            </div>

            {/* Main Scrollable Slots Content: One section per day */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {loading ? (
                <div className="py-16 text-center text-xs text-neutral-500">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto mb-2" />
                  <span>Checking availability and busy times...</span>
                </div>
              ) : (
                next7Days.map((dayDate, dayIndex) => {
                  const slots = generateSlotsForDay(dayDate, dayIndex);
                  const isToday = dayIndex === 0;
                  const formattedDayTitle = isToday
                    ? `Today - ${dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                    : dayIndex === 1
                    ? `Tomorrow - ${dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                    : dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

                  return (
                    <section
                      key={dayIndex}
                      id={`day-section-${dayIndex}`}
                      className="rounded-2xl border border-neutral-200/90 bg-neutral-50/50 p-4 space-y-3"
                    >
                      {/* Day Section Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <h3 className="font-extrabold text-neutral-900 text-sm">
                            {formattedDayTitle}
                          </h3>
                        </div>
                        <span className="text-[11px] font-semibold text-neutral-500">
                          {slots.length} {slots.length === 1 ? 'Slot' : 'Slots'}
                        </span>
                      </div>

                      {/* Slots Grid */}
                      {slots.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {slots.map((slot) => {
                            const isSelected = selectedSlot?.id === slot.id;
                            const isUnavailable = slot.isBusy || slot.isPast;

                            return (
                              <button
                                key={slot.id}
                                disabled={isUnavailable}
                                onClick={() => {
                                  setSelectedSlot(slot);
                                  setErrorMessage(null);
                                  setSuccessMessage(null);
                                }}
                                style={isSelected ? theme.buttonStyle : undefined}
                                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-20 ${
                                  isSelected
                                    ? 'shadow-md scale-[1.02] border-transparent ring-2 ring-offset-1 ring-emerald-500'
                                    : isUnavailable
                                    ? 'bg-neutral-100/90 border-neutral-200 text-neutral-400 cursor-not-allowed opacity-60'
                                    : 'bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-xs cursor-pointer text-neutral-800'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span
                                    className={`text-[11px] font-extrabold ${
                                      isSelected ? 'text-white' : isUnavailable ? 'text-neutral-400' : 'text-neutral-900'
                                    }`}
                                  >
                                    {slot.formattedStart}
                                  </span>
                                  {slot.isBusy ? (
                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-neutral-200 text-neutral-600 rounded">
                                      Busy
                                    </span>
                                  ) : slot.isPast ? (
                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-neutral-200 text-neutral-500 rounded">
                                      Past
                                    </span>
                                  ) : (
                                    <span
                                      className={`text-[10px] font-bold ${
                                        isSelected ? 'text-white/90' : 'text-emerald-700'
                                      }`}
                                    >
                                      ₹{pricePerHour}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between w-full text-[10px] pt-1 border-t border-neutral-100/60">
                                  <span
                                    className={
                                      isSelected ? 'text-white/80' : 'text-neutral-400'
                                    }
                                  >
                                    to {slot.formattedEnd}
                                  </span>
                                  {!isUnavailable && (
                                    <span
                                      className={`font-semibold ${
                                        isSelected ? 'text-white' : 'text-emerald-600'
                                      }`}
                                    >
                                      {isSelected ? 'Selected' : 'Available'}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-4 text-center text-xs text-neutral-400 italic">
                          No operating hours configured for this day in `availability_rules`.
                        </div>
                      )}
                    </section>
                  );
                })
              )}
            </div>

            {/* Selected Slot Footer Bar: Shows Book button */}
            {selectedSlot && (
              <div className="p-4 sm:p-5 bg-white border-t border-neutral-200 shadow-xl shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Selected Time Slot</span>
                  </div>
                  <div className="text-sm font-extrabold text-neutral-900">
                    {selectedSlot.dayDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    • {selectedSlot.formattedStart} - {selectedSlot.formattedEnd}
                  </div>
                  <div className="text-xs text-neutral-500">
                    Sport: <span className="font-semibold text-neutral-800">Futsal</span> • Rate:{' '}
                    <span className="font-extrabold text-emerald-700">₹{pricePerHour}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(null)}
                    className="w-full sm:w-auto min-h-[44px] px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer flex items-center justify-center order-2 sm:order-1"
                  >
                    Clear
                  </button>

                  {user ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleBookSlot}
                      style={theme.buttonStyle}
                      className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 order-1 sm:order-2"
                    >
                      {submitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Book Now (₹{pricePerHour})</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleBookSlot}
                      className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Sign In to Book (₹{pricePerHour})</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
