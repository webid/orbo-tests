import { DownloadCloud, X, Copy, Upload } from 'lucide-react';
import { bossesData } from '../data';
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
  const setToast = useOrboStore(s => s.setToast);

  if (!syncModalOpen) return null;

  const exportData = () => {
    try {
      // Strip legacy manual % fields so exports only carry totemKeys.
      const cleanConfig: any = { ...config };
      delete cleanConfig.orboDamagePct;
      delete cleanConfig.attackSpeedPct;
      delete cleanConfig.energyMaxPct;
      return btoa(encodeURIComponent(JSON.stringify({ config: cleanConfig, slots })));
    } catch (e) {
      return "";
    }
  };

  const handleCopy = () => {
    const data = exportData();
    if (!data) return;
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    if (!syncInput.trim()) return;
    try {
      let decodedString = atob(syncInput.trim().replace(/\s/g, ''));
      try {
        decodedString = decodeURIComponent(decodedString);
      } catch (e) {
        // Fallback for legacy codes
      }
      const decoded = JSON.parse(decodedString);
      // Backfill tap/totem modifier fields for save codes exported before they existed.
      // Old codes carried manual % fields; those can't be mapped back to specific
      // cards, so imports without totemKeys start with empty slots.
      if (decoded.config) {
        decoded.config.overchargeLevel = decoded.config.overchargeLevel ?? 0;
        decoded.config.surgeLevel = decoded.config.surgeLevel ?? 0;
        decoded.config.totemKeys = Array.isArray(decoded.config.totemKeys) && decoded.config.totemKeys.length === 3
          ? decoded.config.totemKeys
          : [null, null, null];
        decoded.config.luckLevel = decoded.config.luckLevel ?? null;
        decoded.config.totemImagesOn = decoded.config.totemImagesOn !== false;
        delete decoded.config.orboDamagePct;
        delete decoded.config.attackSpeedPct;
        delete decoded.config.energyMaxPct;
      }
      if (decoded.config && decoded.slots) {
        setConfig(decoded.config);
        setSlots(decoded.slots);
        setSyncModalOpen(false);
        setSyncInput('');
        // Feedback toast, e.g. "Imported: 8 creatures, Boss 26 (Ashen Necropolis), Luck 58"
        const filled = decoded.slots.filter((s: any) => s && s.creatureKey).length;
        const boss = bossesData.find(b => b.bossNumber === decoded.config.bossNumber);
        const bossPart = boss
          ? `Boss ${boss.bossNumber} (${boss.biomeName})`
          : (decoded.config.bossNumber ? `Boss ${decoded.config.bossNumber}` : 'Custom boss');
        const luckPart = decoded.config.luckLevel != null ? `, Luck ${decoded.config.luckLevel}` : '';
        setToast(`Imported: ${filled} creature${filled === 1 ? '' : 's'}, ${bossPart}${luckPart}`);
      } else {
        alert('Invalid save code format.');
      }
    } catch {
      alert('Failed to parse save code. Please ensure it is copied correctly.');
    }
  };

  return (
    <div onClick={() => {setSyncModalOpen(false); setSyncInput('');}} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div onClick={e => e.stopPropagation()} className="bg-[#111] rounded-lg border border-[#222] w-full max-w-md flex flex-col shadow-2xl overflow-hidden relative">
         <div className="p-4 border-b border-[#222] flex items-center justify-between">
            <h2 className="text-sm font-medium flex items-center">
               <DownloadCloud className="w-4 h-4 mr-2 text-[#888]" />
               Sync Data
            </h2>
            <button onClick={() => {setSyncModalOpen(false); setSyncInput('');}} className="p-1.5 text-[#888] hover:text-[#ededed] bg-[#1a1a1a] hover:bg-[#222] rounded transition-colors">
               <X className="w-4 h-4" />
            </button>
         </div>
         <div className="p-5 space-y-6">
            <div>
               <label className="text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-2 block">Export Save Code</label>
               <div className="flex space-x-2">
                  <input
                     type="text"
                     readOnly
                     value={exportData()}
                     className="flex-1 bg-[#0a0a0a] border border-[#222] rounded p-2 text-xs font-mono text-[#666] focus:outline-none"
                     onClick={e => e.currentTarget.select()}
                  />
                  <button onClick={handleCopy} className="px-3 py-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded text-xs text-[#ededed] font-medium transition-colors flex items-center shrink-0">
                     {copied ? "Copied!" : <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy</>}
                  </button>
               </div>
               <p className="text-[10px] text-[#666] mt-2 leading-relaxed">Copy this code to load your army on another device.</p>
            </div>

            <div className="h-px w-full bg-[#222]" />

            <div>
               <label className="text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-2 block">Import Save Code</label>
               <div className="flex space-x-2">
                  <input
                     type="text"
                     placeholder="Paste your code here..."
                     value={syncInput}
                     onChange={e => setSyncInput(e.target.value)}
                     className="flex-1 bg-[#0a0a0a] border border-[#222] rounded p-2 text-xs font-mono text-[#ededed] focus:outline-none focus:border-[#444] transition-colors"
                  />
                  <button onClick={handleImport} className="px-3 py-2 bg-[#ededed] hover:bg-white border border-transparent rounded text-xs text-black font-medium transition-colors flex items-center shrink-0">
                     <Upload className="w-3.5 h-3.5 mr-1" /> Import
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
