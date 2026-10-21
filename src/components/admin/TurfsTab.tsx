import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Tenant, Turf } from '../../types/database';
import {
  Plus,
  Edit2,
  Trash2,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Layers,
  X,
  Check,
  Building,
  RefreshCw,
  GitFork,
} from 'lucide-react';

interface TurfsTabProps {
  currentTenant: Tenant;
  turfs: Turf[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export const TurfsTab: React.FC<TurfsTabProps> = ({
  currentTenant,
  turfs,
  loading,
  onRefresh,
}) => {
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingTurf, setEditingTurf] = useState<Turf | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [parentTurfId, setParentTurfId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Deletion state
  const [deletingTurfId, setDeletingTurfId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Error and feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const openAddModal = () => {
    setModalMode('add');
    setEditingTurf(null);
    setName('');
    setAddress(currentTenant.address || '');
    setIsActive(true);
    setParentTurfId('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const openEditModal = (turf: Turf) => {
    setModalMode('edit');
    setEditingTurf(turf);
    setName(turf.name || '');
    setAddress(turf.address || '');
    setIsActive(turf.is_active ?? true);
    setParentTurfId(turf.parent_turf_id || '');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingTurf(null);
    setErrorMessage(null);
  };

  const handleSaveTurf = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Turf name is required.');
      return;
    }

    setSubmitting(true);

    try {
      if (modalMode === 'add') {
        const payload: Partial<Turf> = {
          tenant_id: currentTenant.id,
          name: trimmedName,
          address: address.trim() || null,
          is_active: isActive,
          parent_turf_id: parentTurfId ? parentTurfId : null,
        };

        const { error } = await supabase.from('turfs').insert(payload);

        if (error) {
          console.error('Supabase error inserting turf:', error);
          setErrorMessage(error.message);
          setSubmitting(false);
          return;
        }

        setSuccessMessage(`Turf "${trimmedName}" created successfully!`);
      } else if (modalMode === 'edit' && editingTurf) {
        const updates: Partial<Turf> = {
          name: trimmedName,
          address: address.trim() || null,
          is_active: isActive,
          parent_turf_id: parentTurfId ? parentTurfId : null,
        };

        const { error } = await supabase
          .from('turfs')
          .update(updates)
          .eq('id', editingTurf.id)
          .eq('tenant_id', currentTenant.id);

        if (error) {
          console.error('Supabase error updating turf:', error);
          setErrorMessage(error.message);
          setSubmitting(false);
          return;
        }

        setSuccessMessage(`Turf "${trimmedName}" updated successfully!`);
      }

      await onRefresh();
      closeModal();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Unexpected error in turf operation:', err);
      setErrorMessage(err?.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTurf = async () => {
    if (!deletingTurfId) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('turfs')
        .delete()
        .eq('id', deletingTurfId)
        .eq('tenant_id', currentTenant.id);

      if (error) {
        console.error('Supabase error deleting turf:', error);
        setErrorMessage(error.message);
        setSubmitting(false);
        return;
      }

      setDeleteConfirmOpen(false);
      setDeletingTurfId(null);
      setSuccessMessage('Turf deleted successfully.');
      await onRefresh();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Unexpected error deleting turf:', err);
      setErrorMessage(err?.message || 'Failed to delete turf.');
    } finally {
      setSubmitting(false);
    }
  };

  // Build parent lookup map for displaying parent names
  const turfMap = new Map<string, Turf>();
  turfs.forEach((t) => turfMap.set(t.id, t));

  // Eligible parent turfs (cannot be self when editing)
  const eligibleParents = turfs.filter((t) => !editingTurf || t.id !== editingTurf.id);

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900 flex items-center gap-2 flex-wrap">
            <span>Turfs &amp; Grounds</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {turfs.length} Registered
            </span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
            Manage your physical grounds, zones, and subdivisions for <strong className="text-neutral-800">{currentTenant.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => onRefresh()}
            className="min-h-[44px] min-w-[44px] p-2.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 rounded-xl transition-colors cursor-pointer border border-neutral-200 bg-white shadow-2xs flex items-center justify-center shrink-0"
            title="Refresh list from Supabase"
            aria-label="Refresh list from Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Turf</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start justify-between gap-3 shadow-xs">
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

      {/* Global Success Banner */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Turfs List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-neutral-500">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto mb-2" />
          <span>Fetching turfs for {currentTenant.name}...</span>
        </div>
      ) : turfs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {turfs.map((turf) => {
            const parent = turf.parent_turf_id ? turfMap.get(turf.parent_turf_id) : null;
            return (
              <div
                key={turf.id}
                className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Status & Zone Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        turf.is_active !== false
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          turf.is_active !== false ? 'bg-emerald-500' : 'bg-neutral-400'
                        }`}
                      />
                      {turf.is_active !== false ? 'Active' : 'Inactive'}
                    </span>

                    {parent ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md truncate max-w-[150px]"
                        title={`Child zone inside: ${parent.name}`}
                      >
                        <GitFork className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="truncate">{parent.name}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-400 font-medium">Main Pitch</span>
                    )}
                  </div>

                  {/* Turf Name */}
                  <h3 className="text-base font-bold text-neutral-900 leading-snug">
                    {turf.name}
                  </h3>

                  {/* Address */}
                  {turf.address ? (
                    <div className="flex items-start gap-1.5 text-xs text-neutral-500 mt-1.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{turf.address}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-neutral-400 italic mt-1.5">
                      No address specified
                    </div>
                  )}

                  {/* ID / Metadata */}
                  <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                    <span>ID: {turf.id.slice(0, 8)}...</span>
                    {turf.sport_type && (
                      <span className="font-sans font-medium text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">
                        {turf.sport_type}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions: Edit & Delete */}
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(turf)}
                    className="flex-1 sm:flex-none min-h-[44px] px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => {
                      setDeletingTurfId(turf.id);
                      setDeleteConfirmOpen(true);
                      setErrorMessage(null);
                    }}
                    className="flex-1 sm:flex-none min-h-[44px] px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-dashed border-neutral-300 p-8 sm:p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900 mb-1">No Turfs Registered</h3>
          <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
            Get started by adding your first pitch, court, or sub-zone for <strong>{currentTenant.name}</strong>.
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Turf</span>
          </button>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  {modalMode === 'add' ? <Plus className="w-5 h-5" /> : <Edit2 className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-base">
                    {modalMode === 'add' ? 'Add New Turf' : 'Edit Turf'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Tenant: <span className="font-mono">{currentTenant.slug}</span>
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

            <form onSubmit={handleSaveTurf} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Turf Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pitch A (11-a-side) or Court 1"
                  className="w-full text-sm px-3.5 py-2.5 min-h-[44px] bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Location / Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Gate 3, Sports Complex, City Center"
                    className="w-full text-sm pl-9 pr-3.5 py-2.5 min-h-[60px] bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Optional Parent Turf dropdown (zones) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Parent Turf (Optional Zone Configuration)
                </label>
                <select
                  value={parentTurfId}
                  onChange={(e) => setParentTurfId(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 min-h-[44px] bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">None (Independent pitch / Main ground)</option>
                  {eligibleParents.map((t) => (
                    <option key={t.id} value={t.id}>
                      Inside: {t.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  Use this to define a subdivision (e.g. a 5-a-side pitch located inside an 11-a-side main arena).
                </p>
              </div>

              {/* Active Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-neutral-50 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 text-emerald-600 rounded-md focus:ring-emerald-500 shrink-0"
                  />
                  <div>
                    <div className="text-xs font-bold text-neutral-800">
                      Turf Active for Booking
                    </div>
                    <div className="text-[11px] text-neutral-500 leading-relaxed">
                      When inactive, this turf will not accept reservations or display open slots.
                    </div>
                  </div>
                </label>
              </div>

              {/* Buttons */}
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
                      <span>{modalMode === 'add' ? 'Create Turf' : 'Save Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 mb-1">Delete Turf?</h3>
            <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
              Are you sure you want to delete this turf? Any linked pricing rules and availability slots in Supabase will be affected.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeletingTurfId(null);
                }}
                disabled={submitting}
                className="w-full sm:flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 cursor-pointer flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTurf}
                disabled={submitting}
                className="w-full sm:flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
