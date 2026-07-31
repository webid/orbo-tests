import { useState } from 'react';
import { RefreshCw, X, Copy, Check } from 'lucide-react';
import { useOrboStore } from '../store';

export const SyncModal = () => {
  const syncModalOpen = useOrboStore(s => s.syncModalOpen);
  const setSyncModalOpen = useOrboStore(s => s.setSyncModalOpen);
  const syncInput = useOrboStore(s => s.syncInput);
  const setSyncInput = useOrboStore(s => s.setSyncInput);
  const copied = useOrboStore(s => s.copied);
  const setCopied = useOrboStore(s => s.setCopied);
  const config = useOrboStore(s => s.config);
  const slots = useOrboStore(s => s.slots);
  const setConfig = useOrboStore(s => s.setConfig);
  const setSlots = useOrboStore(s => s.setSlots);

  const [error, setError] = useState(false);

  if (!syncModalOpen) return null;

  const exportData = () => {
    const payload = { config, slots };
    return btoa(encodeURIComponent(JSON.stringify(payload)));
  };

  const handleImport = () => {
    try {
      const decoded = JSON.parse(decodeURIComponent(atob(syncInput.trim())));
      if (decoded.config && decoded.slots) {
        decoded.config.luckLevel = decoded.config.luckLevel ?? null;
        decoded.config.totemImagesOn = decoded.config.totemImagesOn !== false;
        setConfig(decoded.config);
        setSlots(decoded.slots);
        setSyncModalOpen(false);
        setSyncInput('');
        setError(false);
      } else {
        setError(true);
      }
    } catch (e) {
      console.error(e);
      setError(true);
    }
  };

  return (
    <div onClick={() => setSyncModalOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div onClick={e => e.stopPropagation()} className="bg-[#111] rounded-lg border border-[#222] w-full max-w-xl flex flex-col shadow-2xl">
        <div className="p-4 border-b border-[#222] flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center">
            <RefreshCw className="w-4 h-4 mr-2 text-[#888]" />
            Sync Setup
          </h2>
          <button onClick={() => setSyncModalOpen(false)} className="p-1.5 text-[#888] hover:text-[#ededed] bg-[#1a1a1a] hover:bg-[#222] rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[#666]">Export Code</label>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportData());
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center space-x-1 text-[10px] font-medium text-[#888] hover:text-[#ededed] transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              readOnly
              value={exportData()}
              className="w-full h-24 bg-[#0a0a0a] border border-[#222] rounded-md p-3 font-mono text-[10px] text-[#888] focus:outline-none resize-none break-all"
            />
            <p className="text-[10px] text-[#666] leading-relaxed">
              Share this code to let others import your exact army, boss and settings.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[#666]">Import Code</label>
            <textarea
              value={syncInput}
              onChange={e => { setSyncInput(e.target.value); setError(false); }}
              placeholder="Paste code here..."
              className={`w-full h-24 bg-[#0a0a0a] border rounded-md p-3 font-mono text-[10px] text-[#ededed] focus:outline-none resize-none break-all transition-colors ${error ? 'border-red-500/50' : 'border-[#222] focus:border-[#444]'}`}
            />
            {error && <p className="text-[10px] text-red-500">Invalid code format.</p>}
            <button
              onClick={handleImport}
              disabled={!syncInput.trim()}
              className="w-full py-2.5 bg-[#ededed] hover:bg-white disabled:opacity-30 disabled:hover:bg-[#ededed] text-black text-[10px] uppercase tracking-wider font-semibold rounded transition-colors"
            >
              Import Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
