import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Tenant } from '../../types/database';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Save,
  QrCode,
  Info,
  Check,
  Building,
  HelpCircle,
} from 'lucide-react';

interface SettingsTabProps {
  currentTenant: Tenant;
  onTenantUpdated?: (updated: Tenant) => void;
}

export const UPI_REGEX = /^[a-zA-Z0-9._-]{2,255}@[a-zA-Z]{2,64}$/;

export const SettingsTab: React.FC<SettingsTabProps> = ({
  currentTenant,
  onTenantUpdated,
}) => {
  const [upiId, setUpiId] = useState(currentTenant.upi_id || '');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync if currentTenant changes
  useEffect(() => {
    setUpiId(currentTenant.upi_id || '');
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [currentTenant.id, currentTenant.upi_id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = upiId.trim();

    // If non-empty, validate format: ^[a-zA-Z0-9._-]{2,255}@[a-zA-Z]{2,64}$
    if (trimmed && !UPI_REGEX.test(trimmed)) {
      setErrorMessage(
        'Invalid UPI ID format. It should follow pattern like turf@okaxis, business@icici, or 9876543210@paytm.'
      );
      return;
    }

    setSaving(true);

    try {
      // Save with update on `tenants` where id = current tenant
      const { data, error } = await supabase
        .from('tenants')
        .update({ upi_id: trimmed || null })
        .eq('id', currentTenant.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating tenant upi_id:', error);
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }

      setSuccessMessage('UPI payment settings saved successfully!');
      if (data && onTenantUpdated) {
        onTenantUpdated(data as Tenant);
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Unexpected error updating tenant:', err);
      setErrorMessage(err?.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const isValidFormat = !upiId.trim() || UPI_REGEX.test(upiId.trim());

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <span>Venue Payment Settings</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
            Manual UPI
          </span>
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure payment details for <strong className="text-neutral-800">{currentTenant.name}</strong>. Customers will use this UPI ID to send slot reservation payments.
        </p>
      </div>

      {/* Supabase Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Error:</span>
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

      {/* Settings Form Card */}
      <div className="bg-white rounded-3xl border border-neutral-200 p-4 sm:p-8 shadow-xs">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
              UPI ID (<span className="text-emerald-700 font-mono">tenants.upi_id</span>)
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={upiId}
                onChange={(e) => {
                  setUpiId(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="e.g. turf@okaxis or business@hdfcbank"
                className={`w-full text-sm pl-10 pr-3 py-2.5 min-h-[44px] bg-neutral-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 font-mono transition-colors ${
                  !isValidFormat
                    ? 'border-rose-300 focus:ring-rose-500 text-rose-900'
                    : 'border-neutral-300 focus:ring-emerald-500'
                }`}
              />
            </div>
            {!isValidFormat && (
              <p className="text-[11px] text-rose-600 mt-1 leading-relaxed">
                Format must match standard UPI ID: <code>username@bank</code> (e.g. <code>turf@okaxis</code>).
              </p>
            )}
            <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">
              When set, customers will see a <strong>"Pay via UPI"</strong> button after reserving a slot that links to their UPI app (Google Pay, PhonePe, Paytm, etc.).
            </p>
          </div>

          {/* Live Preview Box */}
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2 text-xs">
            <div className="font-bold text-neutral-800 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Customer Experience Preview</span>
            </div>
            {upiId.trim() && isValidFormat ? (
              <div className="space-y-1.5 text-neutral-600">
                <p>
                  Customers booking on <strong>/t/{currentTenant.slug}</strong> will see:
                </p>
                <div className="p-3 bg-white border border-neutral-200 rounded-xl font-mono text-[11px] text-emerald-800 break-all leading-relaxed">
                  upi://pay?pa={upiId.trim()}&pn={encodeURIComponent(currentTenant.name)}&am=500.00&cu=INR&tn=...
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Payment status will start as <span className="font-semibold text-amber-700">unpaid</span>, and you can confirm it with 1 click in the <strong>Bookings</strong> tab.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Without a UPI ID, customers will see <em>"Payment details not set. Contact the turf."</em> after reserving.
              </p>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving || !isValidFormat}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 shrink-0" />
                  <span>Save Payment Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
