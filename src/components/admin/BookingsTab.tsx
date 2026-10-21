import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Tenant, Turf, Booking } from '../../types/database';
import {
  CalendarDays,
  RefreshCw,
  AlertCircle,
  Clock,
  User,
  Phone,
  Mail,
  DollarSign,
  Tag,
  CheckCircle,
  XCircle,
  Hourglass,
  Calendar,
  Layers,
  CreditCard,
  Check,
} from 'lucide-react';

interface BookingsTabProps {
  currentTenant: Tenant;
  turfs: Turf[];
}

export const BookingsTab: React.FC<BookingsTabProps> = ({ currentTenant, turfs }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const turfIds = turfs.map((t) => t.id);

      // Query bookings for this tenant
      let query = supabase
        .from('bookings')
        .select('*, turfs(*), sports(*)')
        .order('created_at', { ascending: false });

      if (turfIds.length > 0) {
        query = query.or(`tenant_id.eq.${currentTenant.id},turf_id.in.(${turfIds.join(',')})`);
      } else {
        query = query.eq('tenant_id', currentTenant.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error loading bookings:', error);
        setErrorMessage(error.message);
        setBookings([]);
      } else {
        setBookings((data as unknown as Booking[]) || []);
      }
    } catch (err: any) {
      console.error('Unexpected error querying bookings:', err);
      setErrorMessage(err?.message || 'Error querying bookings.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [currentTenant.id, turfs]);

  // Handle Mark as Paid
  const handleMarkAsPaid = async (bookingId: string) => {
    setUpdatingId(bookingId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // update bookings set payment_status = 'paid', status = 'confirmed' where id = booking id
      const { data, error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          status: 'confirmed',
        })
        .eq('id', bookingId);

      if (error) {
        console.error('Supabase error marking booking as paid:', error);
        setErrorMessage(error.message);
        setUpdatingId(null);
        return;
      }

      setSuccessMessage('Booking marked as paid and confirmed successfully!');
      await fetchBookings();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error('Unexpected error marking paid:', err);
      setErrorMessage(err?.message || 'Failed to update payment status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'unpaid') return b.payment_status === 'unpaid';
    if (statusFilter === 'paid') return b.payment_status === 'paid';
    return b.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  const getStatusBadge = (status?: string | null) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'confirmed' || s === 'approved' || s === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-3 h-3" />
          Confirmed
        </span>
      );
    }
    if (s === 'canceled' || s === 'cancelled' || s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3" />
          Canceled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <Hourglass className="w-3 h-3" />
        {status || 'Pending'}
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus?: string | null) => {
    const ps = (paymentStatus || 'unpaid').toLowerCase();
    if (ps === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
          <Check className="w-3 h-3" />
          Paid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
        Unpaid
      </span>
    );
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900 flex items-center gap-2 flex-wrap">
            <span>Bookings &amp; Reservations</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {bookings.length} Total
            </span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
            Manage reservations and verify UPI payments for <strong className="text-neutral-800">{currentTenant.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none sm:w-48 text-xs font-semibold px-3 py-2.5 min-h-[44px] bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          >
            <option value="all">All Bookings ({bookings.length})</option>
            <option value="unpaid">Unpaid Only</option>
            <option value="paid">Paid Only</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="canceled">Canceled</option>
          </select>

          <button
            onClick={fetchBookings}
            className="min-h-[44px] min-w-[44px] p-2.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0 border border-neutral-200 bg-white shadow-2xs"
            title="Refresh bookings"
            aria-label="Refresh bookings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Supabase Error Banner */}
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
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold break-words">{successMessage}</span>
        </div>
      )}

      {/* Bookings List / Stacked Cards */}
      {loading ? (
        <div className="py-16 text-center text-xs text-neutral-500">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto mb-2" />
          <span>Fetching bookings from Supabase...</span>
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="space-y-3 sm:space-y-0 sm:bg-white sm:rounded-2xl sm:border sm:border-neutral-200 sm:overflow-hidden sm:shadow-xs sm:divide-y sm:divide-neutral-100">
          {filteredBookings.map((b) => {
            const turfName = b.turfs?.name || 'Assigned Turf';
            const sportName = b.sports?.name || 'Futsal';
            const isUnpaid = b.payment_status !== 'paid';
            const isUpdating = updatingId === b.id;

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 shadow-2xs sm:shadow-none hover:bg-neutral-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Turf, Sport, Customer, Status */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-neutral-900 text-sm break-words">{turfName}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-md">
                      {sportName}
                    </span>
                    {getStatusBadge(b.status)}
                    {getPaymentBadge(b.payment_status)}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1.5 sm:gap-3 text-xs text-neutral-600 pt-0.5">
                    <span className="flex items-center gap-1.5 font-medium text-neutral-800 break-words">
                      <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{b.customer_name || (b.customer_id ? `Customer: ${b.customer_id.slice(0, 8)}...` : 'Customer')}</span>
                    </span>
                    {b.customer_email && (
                      <span className="flex items-center gap-1.5 text-neutral-500 font-mono text-[11px] break-all">
                        <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{b.customer_email}</span>
                      </span>
                    )}
                    {b.customer_phone && (
                      <span className="flex items-center gap-1.5 text-neutral-500 text-[11px] break-words">
                        <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{b.customer_phone}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Date, Time, Amount, Action */}
                <div className="flex flex-col sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100 shrink-0 gap-2.5">
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {(() => {
                          if (b.booking_date) return b.booking_date;
                          if (b.during) {
                            const cleaned = b.during.replace(/^[\[\(]/, '').replace(/[\]\)]$/, '');
                            const parts = cleaned.split(',');
                            if (parts[0]) return parts[0].replace(/['"]/g, '').slice(0, 10);
                          }
                          if (b.start_time) return b.start_time.slice(0, 10);
                          return 'Scheduled Date';
                        })()}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="text-base sm:text-sm font-extrabold text-neutral-900">
                      ₹{Number(b.amount ?? b.total_price ?? 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="text-[11px] text-neutral-500 font-mono">
                    {(() => {
                      if (b.during) {
                        const cleaned = b.during.replace(/^[\[\(]/, '').replace(/[\]\)]$/, '');
                        const parts = cleaned.split(',');
                        if (parts.length === 2) {
                          const s = parts[0].replace(/['"]/g, '').trim().slice(11, 16);
                          const e = parts[1].replace(/['"]/g, '').trim().slice(11, 16);
                          return `Start: ${s} (to ${e})`;
                        }
                      }
                      if (b.start_time || b.end_time) {
                        return `Start: ${b.start_time ? b.start_time.slice(11, 16) : ''}`;
                      }
                      return '';
                    })()}
                  </div>

                  {/* "Mark as paid" button on unpaid bookings - full width & min 44px on mobile */}
                  {isUnpaid ? (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleMarkAsPaid(b.id)}
                      className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 shrink-0" />
                          <span>Mark as Paid</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full sm:w-auto min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Verified Paid</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-dashed border-neutral-300 p-8 sm:p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center mb-3">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900 mb-1">No Bookings Found</h3>
          <p className="text-xs text-neutral-500 leading-relaxed mb-3 break-words">
            There are currently no reservations matching the filter for <strong>{currentTenant.name}</strong>.
          </p>
        </div>
      )}
    </div>
  );
};

