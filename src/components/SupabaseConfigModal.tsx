import React, { useState } from 'react';
import { supabaseUrl, supabaseAnonKey, isSupabaseConfigured, saveSupabaseConfig, clearSupabaseConfig } from '../lib/supabase';
import { KeyRound, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState(supabaseUrl);
  const [key, setKey] = useState(supabaseAnonKey);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('Please provide a valid Supabase URL starting with https://');
      return;
    }
    if (!key || key.length < 20) {
      setError('Please provide a valid Supabase anon public key');
      return;
    }
    setError(null);
    saveSupabaseConfig(url, key);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 text-base">Supabase Connection</h3>
              <p className="text-xs text-neutral-500">Live backend integration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSupabaseConfigured ? (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Connected to Supabase:</span>
              <div className="font-mono text-[11px] truncate mt-0.5">{supabaseUrl}</div>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Supabase Keys Required:</span>
              <p className="mt-0.5 text-amber-700 leading-relaxed">
                Connect your Supabase instance by entering your Project URL and Anon Key below.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Project URL (<code className="text-emerald-700">VITE_SUPABASE_URL</code>)
            </label>
            <input
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzproject.supabase.co"
              className="w-full text-base sm:text-xs font-mono px-3.5 py-2.5 min-h-[44px] border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Anon Public Key (<code className="text-emerald-700">VITE_SUPABASE_ANON_KEY</code>)
            </label>
            <textarea
              required
              rows={3}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full text-base sm:text-xs font-mono px-3.5 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="submit"
              className="w-full sm:flex-1 min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer flex items-center justify-center"
            >
              Save & Apply
            </button>
            {isSupabaseConfigured && (
              <button
                type="button"
                onClick={clearSupabaseConfig}
                className="w-full sm:w-auto min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-600 hover:text-rose-600 border border-neutral-200 hover:border-rose-200 transition-colors cursor-pointer flex items-center justify-center"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
