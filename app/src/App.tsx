import { useState, useEffect } from 'react';
import { Calculator, Sword, Zap, TrendingUp, Skull, Users, Search, X, Plus, DownloadCloud, Copy, Upload, Target, ChevronRight } from 'lucide-react';
import creaturesData from './orbo-creatures.json';
import bossesData from './orbo-bosses.json';

const creaturesDict = creaturesData.reduce((acc, c) => {
  acc[c.key] = c;
  return acc;
}, {} as Record<string, any>);

type ArmySlotInfo = {
  creatureKey: string | null;
  level: number;
};

const loadState = (key: string, fallback: any) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

export default function App() {
  const [config, setConfig] = useState(() => loadState('orbo_config', {
    clickPercent: 0.35,
    clickFixed: 57,
    bossEnergy: 2550000,
    battleDuration: 30,
    maxClicks: 82,
    bossNumber: 11
  }));

  const [slots, setSlots] = useState<ArmySlotInfo[]>(() => loadState('orbo_army', Array(8).fill({ creatureKey: null, level: 1 })));
  
  useEffect(() => {
    if (config.bossNumber === undefined) {
      const match = bossesData.find(b => b.hp === config.bossEnergy);
      if (match) {
        setConfig((prev: any) => ({ ...prev, bossNumber: match.bossNumber }));
      }
    }
  }, [config.bossNumber, config.bossEnergy]);

  const [modalTarget, setModalTarget] = useState<'all' | 'empty' | number | null>(null);
  const [bossModalOpen, setBossModalOpen] = useState(false);
  const [bossSearch, setBossSearch] = useState('');
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncInput, setSyncInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');

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
          if (window.confirm("A new version of Orbo Army Optimizer is available! Click OK to reload and apply the update.")) {
            window.location.reload();
          }
        }
      } catch (err) {
        console.error("Version check failed", err);
      } finally {
        isChecking = false;
      }
    };

    const interval = setInterval(checkVersion, 60000); // Check every 60 seconds
    setTimeout(checkVersion, 3000);
    return () => clearInterval(interval);
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('orbo_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('orbo_army', JSON.stringify(slots));
  }, [slots]);

  const exportData = () => {
    return btoa(JSON.stringify({ config, slots }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportData());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    if (!syncInput.trim()) return;
    try {
      const decoded = JSON.parse(atob(syncInput.trim()));
      if (decoded.config && decoded.slots) {
        setConfig(decoded.config);
        setSlots(decoded.slots);
        setSyncModalOpen(false);
        setSyncInput('');
      } else {
        alert('Invalid save code format.');
      }
    } catch {
      alert('Failed to parse save code. Please ensure it is copied correctly.');
    }
  };

  const calculateRequirements = () => {
    const currentArmyDps = slots.reduce((total, slot) => {
      if (!slot.creatureKey) return total;
      const c = creaturesDict[slot.creatureKey];
      if (!c?.levels[slot.level - 1]) return total;
      return total + c.levels[slot.level - 1].dps;
    }, 0);

    const targetTotalDps = config.bossEnergy / config.battleDuration;
    
    const requiredArmyDps = (config.bossEnergy - (config.clickFixed * config.maxClicks)) / 
                            (config.battleDuration + (config.clickPercent * config.maxClicks));
    
    const gap = requiredArmyDps - currentArmyDps;
    const currentClickDps = (currentArmyDps * config.clickPercent) + config.clickFixed;
    const currentTotalDps = currentArmyDps + (currentClickDps * config.maxClicks / config.battleDuration);

    let remainingGap = gap;
    let simulatedSlots = slots.map(s => ({ ...s }));
    let totalCost = 0;
    
    type UpgradeHistory = { slotIndex: number; creatureKey: string; startLevel: number; endLevel: number; totalCost: number; totalDpsGain: number };
    const history: UpgradeHistory[] = [];

    let canUpgrade = true;

    while (remainingGap > 0 && canUpgrade) {
      let bestEfficiency = -1;
      let bestSlotIdx = -1;
      let bestCost = 0;
      let bestDpsGain = 0;

      for (let i = 0; i < 8; i++) {
        const slot = simulatedSlots[i];
        if (!slot.creatureKey) continue;
        const c = creaturesDict[slot.creatureKey];
        const currentData = c.levels[slot.level - 1];
        const nextData = c.levels[slot.level];

        if (!nextData) continue;

        const cost = currentData.foodCost;
        if (cost <= 0) continue;

        const dpsGain = nextData.dps - currentData.dps;
        const efficiency = dpsGain / cost;

        if (efficiency > bestEfficiency) {
          bestEfficiency = efficiency;
          bestSlotIdx = i;
          bestCost = cost;
          bestDpsGain = dpsGain;
        }
      }

      if (bestSlotIdx === -1) {
        canUpgrade = false;
        break;
      }

      const chosenSlot = simulatedSlots[bestSlotIdx];
      const existing = history.find(h => h.slotIndex === bestSlotIdx);
      if (existing) {
        existing.endLevel = chosenSlot.level + 1;
        existing.totalCost += bestCost;
        existing.totalDpsGain += bestDpsGain;
      } else {
        history.push({
          slotIndex: bestSlotIdx,
          creatureKey: chosenSlot.creatureKey!,
          startLevel: chosenSlot.level,
          endLevel: chosenSlot.level + 1,
          totalCost: bestCost,
          totalDpsGain: bestDpsGain
        });
      }

      chosenSlot.level += 1;
      totalCost += bestCost;
      remainingGap -= bestDpsGain;
    }

    return {
      targetTotalDps,
      requiredArmyDps,
      gap,
      remainingGap,
      currentArmyDps,
      currentTotalDps,
      upgradePlan: history,
      totalFoodCost: totalCost
    };
  };

  const results = calculateRequirements();

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'clickPercentForm') {
      setConfig((prev: any) => ({ ...prev, clickPercent: parseFloat(value) / 100 }));
    } else {
      setConfig((prev: any) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    }
  };

  const updateSlotLevel = (index: number, newLevel: number) => {
    const cKey = slots[index].creatureKey;
    if (!cKey) return;
    const maxLevel = creaturesDict[cKey].levels.length;
    const clamped = Math.max(1, Math.min(newLevel, maxLevel));
    
    setSlots(prev => {
      const copy = [...prev];
      copy[index].level = clamped;
      return copy;
    });
  };

  const removeSlot = (index: number) => {
    setSlots(prev => {
      const copy = [...prev];
      copy[index] = { creatureKey: null, level: 1 };
      return copy;
    });
  };

  const assignCreature = (creatureKey: string) => {
    setSlots(prev => {
      const copy = [...prev];
      if (modalTarget === 'all') {
        for (let i = 0; i < 8; i++) copy[i] = { creatureKey, level: 1 };
      } else if (modalTarget === 'empty') {
        for (let i = 0; i < 8; i++) {
          if (!copy[i].creatureKey) copy[i] = { creatureKey, level: 1 };
        }
      } else if (typeof modalTarget === 'number') {
        copy[modalTarget] = { creatureKey, level: 1 };
      }
      return copy;
    });
    setModalTarget(null);
    setSearch('');
  };

  const filteredCreatures = creaturesData.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || c.tier.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-[#ededed] p-6 md:p-10 font-sans selection:bg-[#333]">
      
      {/* Boss Select Modal */}
      {bossModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] rounded-lg border border-[#222] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
             <div className="p-4 border-b border-[#222] flex items-center justify-between">
                <h2 className="text-sm font-medium flex items-center">
                   <Target className="w-4 h-4 mr-2 text-[#888]" />
                   Select Target Boss
                </h2>
                <button onClick={() => setBossModalOpen(false)} className="p-1.5 text-[#888] hover:text-[#ededed] bg-[#1a1a1a] hover:bg-[#222] rounded transition-colors">
                   <X className="w-4 h-4" />
                </button>
             </div>
             <div className="p-3 border-b border-[#222] bg-[#0a0a0a]">
                <div className="relative">
                   <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                   <input 
                      type="text" 
                      placeholder="Search bosses or floors..." 
                      value={bossSearch}
                      onChange={e => setBossSearch(e.target.value)}
                      className="w-full bg-[#111] border border-[#222] rounded-md py-2 pl-9 pr-3 text-sm text-[#ededed] focus:outline-none focus:border-[#444] transition-colors"
                   />
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#0a0a0a]">
                {bossesData.filter(b => b.biomeName.toLowerCase().includes(bossSearch.toLowerCase()) || b.floor.toString().includes(bossSearch)).map(b => (
                  <div key={b.bossNumber} onClick={() => {
                     setConfig((prev: any) => ({ ...prev, bossEnergy: b.hp, bossNumber: b.bossNumber, battleDuration: b.timer }));
                     setBossModalOpen(false);
                     setBossSearch('');
                  }} className={`group cursor-pointer bg-[#111] hover:bg-[#1a1a1a] border flex flex-col items-center justify-between text-center transition-colors shadow-sm p-4 rounded-xl h-full ${config.bossNumber === b.bossNumber ? 'border-[#888]' : 'border-[#222] hover:border-[#444]'}`}>
                     <div className="w-full h-14 flex items-center justify-center shrink-0 mb-2">
                        <img src={`https://orbo.tnkrshd.com/bosses/${b.biome}.png`} alt={b.biomeName} className="max-w-[85%] max-h-full object-contain drop-shadow-md" />
                     </div>
                     <div className="flex flex-col items-center w-full mt-auto">
                        <p className="font-semibold text-[11px] text-[#ededed] leading-tight mb-1">{b.biomeName}</p>
                        <p className="text-[10px] text-[#888] font-mono">Floor {b.floor}</p>
                        <p className="text-[10px] text-[#666] font-mono mt-0.5">{b.hp.toLocaleString()} HP</p>
                     </div>
                  </div>
                ))}
                {bossesData.filter(b => b.biomeName.toLowerCase().includes(bossSearch.toLowerCase()) || b.floor.toString().includes(bossSearch)).length === 0 && (
                   <div className="col-span-full py-8 text-center text-[#666] text-sm">
                      No matching bosses.
                   </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Creature Select Modal Overlay */}
      {modalTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] rounded-lg border border-[#222] w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
             <div className="p-4 border-b border-[#222] flex items-center justify-between">
                <h2 className="text-sm font-medium flex items-center">
                   <Users className="w-4 h-4 mr-2 text-[#888]" />
                   Select a Creature
                </h2>
                <button onClick={() => setModalTarget(null)} className="p-1.5 text-[#888] hover:text-[#ededed] bg-[#1a1a1a] hover:bg-[#222] rounded transition-colors">
                   <X className="w-4 h-4" />
                </button>
             </div>
             <div className="p-3 border-b border-[#222] bg-[#0a0a0a]">
                <div className="relative">
                   <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                   <input 
                      type="text" 
                      placeholder="Search creatures..." 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full bg-[#111] border border-[#222] rounded-md py-2 pl-9 pr-3 text-sm text-[#ededed] focus:outline-none focus:border-[#444] transition-colors"
                   />
                </div>
             </div>
             <div className="p-4 overflow-y-auto grid grid-cols-3 md:grid-cols-5 gap-3 bg-[#0a0a0a]">
                {filteredCreatures.map(c => (
                  <button key={c.key} onClick={() => assignCreature(c.key)} className="group bg-[#111] hover:bg-[#1a1a1a] border border-[#222] hover:border-[#444] p-3 rounded-md flex flex-col items-center text-center transition-colors">
                     <div className="w-10 h-10 mb-2 rounded bg-[#0a0a0a] overflow-hidden border border-[#222] shrink-0">
                        <img src={`https://orbo.tnkrshd.com/creatures/${c.key}/${c.image}`} alt={c.name} className="w-full h-full object-cover" />
                     </div>
                     <p className="font-medium text-[11px] text-[#ededed] leading-tight mb-1">{c.name}</p>
                     <p className="text-[9px] text-[#666] capitalize">{c.tier}</p>
                  </button>
                ))}
                {filteredCreatures.length === 0 && (
                   <div className="col-span-full py-8 text-center text-[#666] text-sm">
                      No matching creatures.
                   </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Sync / Export Modal */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] rounded-lg border border-[#222] w-full max-w-md flex flex-col shadow-2xl overflow-hidden relative">
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
      )}

      <div className={`max-w-6xl mx-auto space-y-6 ${(modalTarget !== null || syncModalOpen) ? 'pointer-events-none' : ''}`}>
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#222] pb-5">
           <div className="flex items-center space-x-3">
             <Calculator className="w-5 h-5 text-[#888]" />
             <h1 className="text-xl font-medium tracking-tight text-[#ededed]">DPS Auto-Calculator</h1>
           </div>
           
           <button onClick={() => setSyncModalOpen(true)} className="flex items-center px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold rounded border border-[#222] bg-[#111] hover:bg-[#1a1a1a] text-[#888] hover:text-[#ededed] transition-colors shadow-sm">
              <DownloadCloud className="w-3.5 h-3.5 mr-1.5" />
              Sync
           </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-6 space-y-6">
             
            {/* Battle Configuration */}
            <div className="bg-[#111] rounded-lg border border-[#222]">
              <div className="p-3.5 border-b border-[#222]">
                <h2 className="text-xs uppercase tracking-wider font-semibold text-[#888] flex items-center">
                  <SettingsIcon className="w-3.5 h-3.5 mr-2" />
                  Battle Config
                </h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <div className="col-span-2">
                   <label className="text-[10px] font-semibold uppercase tracking-wider text-[#666] mb-1.5 block">Target Boss</label>
                   <button onClick={() => setBossModalOpen(true)} className="w-full bg-[#0a0a0a] border border-[#222] hover:border-[#444] rounded-md p-3 flex items-center justify-between transition-colors text-left group">
                      <div className="flex items-center">
                         <div className="w-10 h-10 rounded overflow-hidden border border-[#333] bg-[#1a1a1a] shrink-0 mr-3">
                            <img src={config.bossNumber ? `https://orbo.tnkrshd.com/bosses/${bossesData.find(b => b.bossNumber === config.bossNumber)?.biome}.png` : 'https://orbo.tnkrshd.com/bosses/grasslands.png'} alt="" className="w-full h-full object-cover scale-[1.15]" />
                         </div>
                         <div>
                            <p className="text-sm font-medium text-[#ededed] group-hover:text-white transition-colors">{config.bossNumber ? `Floor ${bossesData.find(b => b.bossNumber === config.bossNumber)?.floor} - ${bossesData.find(b => b.bossNumber === config.bossNumber)?.biomeName}` : 'Custom Boss'}</p>
                            <p className="text-[10px] font-mono text-[#888] mt-0.5">{config.bossEnergy.toLocaleString()} HP / {config.battleDuration}s</p>
                         </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#444] group-hover:text-[#888] transition-colors" />
                   </button>
                </div>
                <div className="col-span-2 h-px bg-[#222] mt-1 mb-2" />
                <div className="col-span-2 grid grid-cols-3 gap-3">
                   <InputRow label="Click DPS (%)" name="clickPercentForm" value={config.clickPercent * 100} onChange={handleConfigChange} />
                   <InputRow label="Max Clicks" name="maxClicks" value={config.maxClicks} onChange={handleConfigChange} />
                   <InputRow 
                      label="Total Click Power" 
                      name="totalClickPower" 
                      value={Math.round(results.currentArmyDps * config.clickPercent + config.clickFixed)} 
                      onChange={(e: any) => {
                         const val = parseFloat(e.target.value);
                         const totalPower = isNaN(val) ? 0 : val;
                         const fixed = totalPower - (results.currentArmyDps * config.clickPercent);
                         setConfig((prev: any) => ({ ...prev, clickFixed: fixed }));
                      }} 
                   />
                </div>
              </div>
            </div>

            {/* Army Builder */}
            <div className="bg-[#111] rounded-lg border border-[#222]">
               <div className="p-3.5 border-b border-[#222] flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-wider font-semibold text-[#888] flex items-center">
                    <Sword className="w-3.5 h-3.5 mr-2" />
                    Army Composition
                  </h2>
                  <div className="flex space-x-2">
                     <button onClick={() => setModalTarget('empty')} disabled={!slots.some(s => !s.creatureKey)} className="px-2.5 py-1 text-[10px] uppercase tracking-wide font-medium rounded bg-[#222] hover:bg-[#333] text-[#ededed] transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:disabled:bg-[#222]">
                        Fill Empty
                     </button>
                     <button onClick={() => setModalTarget('all')} className="px-2.5 py-1 text-[10px] uppercase tracking-wide font-medium rounded bg-[#ededed] hover:bg-white text-black transition-colors">
                        Assign All
                     </button>
                  </div>
               </div>
               
               <div className="p-4 grid grid-cols-4 gap-3">
                  {slots.map((slot, idx) => {
                     const isAssigned = !!slot.creatureKey;
                     const c = isAssigned ? creaturesDict[slot.creatureKey!] : null;
                     const dps = c?.levels[slot.level - 1]?.dps || 0;
                     const maxLevel = c?.levels.length || 1;

                     return (
                        <div key={idx} className="bg-[#0a0a0a] border border-[#222] rounded-md flex flex-col relative group overflow-hidden hover:border-[#444] transition-colors">
                           {isAssigned ? (
                              <>
                                 <button onClick={() => removeSlot(idx)} className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur border border-[#333] text-[#888] rounded-md p-0.5 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 w-5 h-5 flex justify-center items-center">
                                    <X className="w-3 h-3" />
                                 </button>
                                 <div onClick={() => setModalTarget(idx)} className="w-full aspect-square bg-[#111] overflow-hidden cursor-pointer relative transition-opacity group-hover:opacity-90 flex items-center justify-center p-2 pb-6">
                                    <img src={`https://orbo.tnkrshd.com/creatures/${c.key}/${c.image}`} alt={c.name} className="w-full h-full object-contain" />
                                    <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                                    <div className="absolute bottom-1.5 left-2 flex items-center space-x-1">
                                       <span className="text-[9px] uppercase tracking-wider text-[#a1a1aa] font-bold drop-shadow-md">Lv</span>
                                       <input 
                                          type="number" 
                                          value={slot.level || ''} 
                                          onChange={e => updateSlotLevel(idx, parseInt(e.target.value) || 1)}
                                          min={1} max={maxLevel}
                                          className="w-10 bg-black/50 border border-[#333] backdrop-blur text-[10px] font-mono text-center text-white focus:outline-none focus:border-[#555] rounded-sm py-0.5"
                                          onClick={e => e.stopPropagation()}
                                       />
                                    </div>
                                 </div>
                                 <div className="w-full p-2 flex flex-col border-t border-[#222]">
                                    <p className="text-[11px] font-medium truncate text-[#ededed] w-full" title={c.name}>{c.name}</p>
                                    <p className="text-[10px] text-[#888] font-mono mt-0.5">
                                      {dps.toLocaleString(undefined, { maximumFractionDigits: 1 })} DPS
                                    </p>
                                 </div>
                              </>
                           ) : (
                              <>
                                 <button onClick={() => setModalTarget(idx)} className="w-full aspect-square bg-[#0a0a0a] hover:bg-[#111] flex flex-col items-center justify-center text-[#555] transition-colors cursor-pointer">
                                    <Plus className="w-5 h-5 mb-1" />
                                 </button>
                                 <div className="w-full p-2 flex flex-col border-t border-[#222]">
                                    <p className="text-[11px] font-medium text-[#444] w-full">Empty Unit</p>
                                    <p className="text-[10px] text-transparent font-mono mt-0.5">0 DPS</p>
                                 </div>
                              </>
                           )}
                        </div>
                     )
                  })}
               </div>
            </div>

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

            <div className="bg-[#111] rounded-lg border border-[#222] flex flex-col flex-1">
              <div className="p-5 border-b border-[#222]">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-[#888] mb-5 flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-2" />
                  Optimization Simulator
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#666] mb-1">Required Army DPS</p>
                    <p className="text-xl font-mono text-[#ededed]">
                      {results.requiredArmyDps.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-[#666] mb-1">Current Army DPS</p>
                    <p className="text-lg font-mono text-[#888]">
                      {results.currentArmyDps.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </p>
                  </div>
                </div>

                <div className="bg-[#0a0a0a] p-3 rounded-md border border-[#222] flex justify-between items-center">
                   <p className="text-xs font-medium text-[#888]">Total Food Cost</p>
                   <p className="text-xl font-mono font-medium text-[#ededed]">
                      {results.totalFoodCost.toLocaleString()}
                   </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[400px]">
                 {results.gap <= 0 ? (
                    <div className="text-center py-10 flex flex-col items-center text-[#888]">
                       <Zap className="w-8 h-8 mb-3 opacity-50" />
                       <h4 className="text-sm font-medium text-[#ededed]">Target Achieved</h4>
                       <p className="text-xs mt-1">Boss defeated in {config.battleDuration}s.</p>
                    </div>
                 ) : results.upgradePlan.length === 0 ? (
                    <div className="text-center py-10 flex flex-col items-center text-[#888]">
                       <Skull className="w-8 h-8 mb-3 opacity-50" />
                       <h4 className="text-sm font-medium text-[#ededed]">Max Level Reached</h4>
                       <p className="text-xs mt-1">Short by {results.remainingGap.toLocaleString(undefined, { maximumFractionDigits: 1 })} DPS.</p>
                    </div>
                 ) : (
                    <div>
                        <div className="space-y-3 relative before:absolute before:top-4 before:bottom-4 before:left-[13px] before:w-px before:bg-[#333] pl-9 ml-1">
                           {results.upgradePlan.map((step, idx) => {
                              const c = creaturesDict[step.creatureKey];
                              return (
                                 <div key={idx} className="bg-[#0a0a0a] border border-[#222] p-2.5 rounded-md flex items-center relative">
                                    <div className="absolute top-1/2 -translate-y-1/2 -left-[35px] w-6 h-6 rounded-full bg-[#111] border border-[#444] flex items-center justify-center text-[10px] font-bold text-[#ededed] shadow-sm z-10">
                                       {idx + 1}
                                    </div>
                                    <div className="w-8 h-8 rounded shrink-0 overflow-hidden border border-[#222] bg-[#1a1a1a]">
                                       <img src={`https://orbo.tnkrshd.com/creatures/${c.key}/${c.image}`} alt={c.name} className="w-full h-full object-cover scale-110" />
                                   </div>
                                   <div className="ml-3 flex-1">
                                      <p className="text-xs font-medium text-[#ededed]">
                                         {c.name} <span className="text-[#666] font-normal ml-1">Slot {step.slotIndex + 1}</span>
                                      </p>
                                      <p className="text-[10px] text-[#888] font-mono mt-0.5">
                                         Lv {step.startLevel} → Lv {step.endLevel}
                                      </p>
                                   </div>
                                   <div className="text-right ml-3">
                                      <p className="text-[9px] uppercase tracking-wider text-[#666] mb-0.5">Cost</p>
                                      <p className="text-xs font-mono text-[#ededed]">{step.totalCost.toLocaleString()}</p>
                                   </div>
                                </div>
                             )
                          })}
                       </div>
                    </div>
                 )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const InputRow = ({ label, name, value, onChange }: any) => (
  <div className="flex flex-col space-y-1.5">
    <label className="text-[10px] font-semibold uppercase tracking-wider text-[#666]">{label}</label>
    <input 
      type="number" 
      name={name}
      value={value}
      onChange={onChange}
      className="w-full bg-[#0a0a0a] border border-[#222] rounded-md py-1.5 px-3 font-mono text-sm text-[#ededed] focus:outline-none focus:border-[#444] transition-colors"
    />
  </div>
);

const StatCard = ({ title, value, subValue, good }: any) => (
  <div className="bg-[#111] p-4 rounded-lg border border-[#222] flex flex-col justify-center">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#666] mb-1">{title}</p>
    <p className={`text-2xl font-mono tracking-tight ${good === true ? 'text-emerald-500/80' : good === false ? 'text-red-500/80' : 'text-[#ededed]'}`}>
      {value}
    </p>
    <div className="w-full text-xs text-[#888]">{subValue}</div>
  </div>
);
