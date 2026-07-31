// ---------------------------------------------------------------------------
// Orbo Command Center — thin orchestrator.
// State lives in the Zustand store (./store), game data in ./data,
// the battle math in ./calc, and all UI in ./components.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, lazy, Suspense } from 'react';
import { Calculator, Search, Sparkles, DownloadCloud } from 'lucide-react';

import { calculateRequirements } from './calc';
import { useOrboStore } from './store';

import { ArmyGrid } from './components/ArmyGrid';
import { BattleConfig } from './components/BattleConfig';
import { BossModal } from './components/BossModal';
import { CreatureModal } from './components/CreatureModal';
import { LuckTableModal } from './components/LuckTableModal';
import { StatCard } from './components/StatCard';
import { SyncModal } from './components/SyncModal';
import { TapTotemPanel } from './components/TapTotemPanel';
import { TotemPickerModal } from './components/TotemPickerModal';
import { UpdateBanner } from './components/UpdateBanner';
import { UpgradeSimulator } from './components/UpgradeSimulator';

// Recharts is heavy — only load it when the Explorer is actually opened.
const ExplorerModal = lazy(() =>
  import('./components/ExplorerModal').then(m => ({ default: m.ExplorerModal }))
);

export default function App() {
  const config = useOrboStore(s => s.config);
  const slots = useOrboStore(s => s.slots);
  const modalTarget = useOrboStore(s => s.modalTarget);
  const setModalTarget = useOrboStore(s => s.setModalTarget);
  const syncModalOpen = useOrboStore(s => s.syncModalOpen);
  const setSyncModalOpen = useOrboStore(s => s.setSyncModalOpen);
  const setLuckModalOpen = useOrboStore(s => s.setLuckModalOpen);
  const explorerBase = useOrboStore(s => s.explorerBase);
  const setUpdateAvailable = useOrboStore(s => s.setUpdateAvailable);
  const closeAllModals = useOrboStore(s => s.closeAllModals);

  // Battle math — memoized so it only re-runs when config or slots change,
  // not on every unrelated UI state update.
  const results = useMemo(() => calculateRequirements(config, slots), [config, slots]);

  // Version Check Poller
  useEffect(() => {
    let currentHash: string | null = null;
    let isChecking = false;

    const checkVersion = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const res = await fetch(import.meta.env.BASE_URL + 'index.html?t=' + Date.now(), { cache: 'no-store' });
        const html = await res.text();
        const scriptMatch = html.match(/src="([^"]+)"/);
        const newHash = scriptMatch ? scriptMatch[1] : html;

        if (currentHash === null) {
          currentHash = newHash;
        } else if (currentHash !== newHash) {
          setUpdateAvailable(true);
        }
      } catch (err) {
        console.error("Version check failed", err);
      } finally {
        isChecking = false;
      }
    };

    const interval = setInterval(checkVersion, 60000); // Check every 60 seconds
    setTimeout(checkVersion, 3000);

    window.addEventListener('focus', checkVersion);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkVersion);
    };
  }, [setUpdateAvailable]);

  // Escape closes any open modal.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAllModals();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeAllModals]);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#ededed] p-6 md:p-10 font-sans selection:bg-[#333]">

      {/* Modals */}
      <BossModal />
      <TotemPickerModal />
      <CreatureModal />
      <SyncModal />
      <LuckTableModal />
      {explorerBase && (
        <Suspense fallback={null}>
          <ExplorerModal />
        </Suspense>
      )}
      <UpdateBanner />

      <div className={`max-w-6xl mx-auto space-y-6 ${modalTarget !== null || syncModalOpen ? 'pointer-events-none' : ''}`}>

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#222] pb-5 gap-4 sm:gap-0">
           <div className="flex items-center space-x-3">
             <Calculator className="w-5 h-5 text-[#888]" />
             <h1 className="text-xl font-medium tracking-tight text-[#ededed]">Orbo Command Center</h1>
           </div>

           <div className="flex space-x-2 w-full sm:w-auto">
             <button onClick={() => setModalTarget('explorer_base')} className="flex-1 sm:flex-none justify-center flex items-center px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold rounded bg-[#111] border border-[#222] hover:bg-[#1a1a1a] text-[#888] hover:text-[#ededed] transition-colors shadow-sm">
               <Search className="w-3.5 h-3.5 mr-1.5" />
               Explorer
             </button>
             <button onClick={() => setLuckModalOpen(true)} className="flex-1 sm:flex-none justify-center flex items-center px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold rounded border border-[#222] bg-[#111] hover:bg-[#1a1a1a] text-[#888] hover:text-[#ededed] transition-colors shadow-sm">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Luck
             </button>
             <button onClick={() => setSyncModalOpen(true)} className="flex-1 sm:flex-none justify-center flex items-center px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold rounded border border-[#222] bg-[#111] hover:bg-[#1a1a1a] text-[#888] hover:text-[#ededed] transition-colors shadow-sm">
                <DownloadCloud className="w-3.5 h-3.5 mr-1.5" />
                Sync
             </button>
           </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          <div className="lg:col-span-6 space-y-6">
            <BattleConfig results={results} />
            <TapTotemPanel results={results} />
            <ArmyGrid />
          </div>

          <div className="lg:col-span-6 space-y-6 flex flex-col">
            <div className="grid grid-cols-2 gap-4">
               <StatCard
                 title="Target Real DPS"
                 value={results.targetTotalDps.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                 subValue="baseline goal"
               />
               <StatCard
                 title="Current Real DPS"
                 value={results.currentTotalDps.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                 subValue={
                   <div className="flex flex-col w-full mt-1">
                      <span className="text-[#888] text-xs">Gap: {(results.targetTotalDps - results.currentTotalDps).toLocaleString(undefined, { maximumFractionDigits: 1 })} DPS</span>
                      <div className="flex justify-between items-center text-[10px] text-[#666] border-t border-[#222] pt-1.5 mt-1.5">
                         <span>Army: {results.currentArmyDps.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                         <span>Clicks: {(results.currentTotalDps - results.currentArmyDps).toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                      </div>
                   </div>
                 }
                 good={results.currentTotalDps >= results.targetTotalDps}
               />
            </div>

            <UpgradeSimulator results={results} />
          </div>
        </div>
      </div>
    </div>
  );
}
