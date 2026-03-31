import { useState, useEffect } from 'react';
import { Calculator, Sword, Zap, TrendingUp, Skull, Users, Search, X, Plus, DownloadCloud, Copy, Upload, Target, ChevronRight, ChevronDown, Star, HelpCircle, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, Legend, ComposedChart } from 'recharts';
import creaturesData from './orbo-creatures.json';
import bossesData from './orbo-bosses.json';
import luckData from './orbo-luck.json';

const creaturesDict = creaturesData.reduce((acc, c) => {
  acc[c.key] = c;
  return acc;
}, {} as Record<string, any>);

const TIER_COLORS: Record<string, string> = {
  common:     '#9ca3af',
  uncommon:   '#22c55e',
  scarce:     '#3b82f6',
  rare:       '#a855f7',
  esoteric:   '#f97316',
  mythic:     '#ef4444',
  relic:      '#eab308',
  untouched:  '#06b6d4',
  phaseBound: '#8b5cf6',
  lightSworn: '#fbbf24',
  voidBorn:   '#6b7280',
};

const getTierColor = (tier: string) => TIER_COLORS[tier] ?? '#444';

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

const compactNum = (num: number | string, decimals: number = 1): string => {
  if (num === undefined || num === null || isNaN(Number(num))) return String(num);
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: decimals
  }).format(Number(num));
};

// Like compactNum but stays in K (e.g. 1,170K) rather than jumping to M.
// Useful for food costs where full-K precision is more readable.
const compactNumK = (num: number): string => {
  if (!num || isNaN(num)) return '0';
  if (num < 1_000) return Math.round(num).toLocaleString();
  if (num < 1_000_000_000) return Math.round(num / 1_000).toLocaleString() + 'K';
  return compactNum(num, 1);
};

const getValidFoodCost = (c: any, levelIdx: number) => {
  if (!c || !c.levels || !c.levels[levelIdx]) return 0;
  let cost = c.levels[levelIdx].foodCost || 0;
  const currentStage = c.levels[levelIdx].stage;
  const nextStage = c.levels[levelIdx + 1]?.stage;
  if (currentStage && nextStage && nextStage > currentStage) {
    cost = cost * nextStage;
  }
  return cost;
};

const getCreatureImageUrl = (c: any, absoluteLevel?: number) => {
  const tierMap: Record<string, string> = {
    'common': '1-common',
    'uncommon': '2-uncommon',
    'scarce': '3-scarce',
    'rare': '4-rare',
    'esoteric': '5-esoteric',
    'mythic': '6-mythic',
    'relic': '7-relic',
    'untouched': '8-untouched',
    'phaseBound': '9-phase-bound',
    'lightSworn': '10-light-sworn',
    'voidBorn': '11-void-born'
  };
  const prefix = tierMap[c.tier] || c.tier;
  
  let imgName = c.image || 'base.png';
  if (absoluteLevel) {
    const stageIndex = c.levels[absoluteLevel - 1]?.stage || 1;
    if (stageIndex === 2) imgName = 'evo1.png';
    if (stageIndex === 3) imgName = 'evo2.png';
    if (stageIndex === 4) imgName = 'final.png';
  }
  
  return `https://orbo.shadow.club/orbos/${prefix}/${c.key}/${imgName}`;
};

export default function App() {
  const [config, setConfig] = useState(() => {
    let saved = loadState('orbo_config', null);
    if (!saved) {
      return {
        clickPercent: "35",
        clickFixed: 57,
        bossEnergy: 2550000,
        battleDuration: 30,
        maxClicks: 82,
        bossNumber: 11,
        selectedBoss: null
      };
    }
    if (typeof saved.clickPercent === 'number' && saved.clickPercent <= 1) {
      saved.clickPercent = (saved.clickPercent * 100).toString();
    } else if (typeof saved.clickPercent === 'number') {
      saved.clickPercent = saved.clickPercent.toString();
    }
    return saved;
  });

  const [slots, setSlots] = useState<ArmySlotInfo[]>(() => loadState('orbo_army', Array(8).fill({ creatureKey: null, level: 1 })));
  
  useEffect(() => {
    if (config.bossNumber === undefined) {
      const match = bossesData.find(b => b.hp === config.bossEnergy);
      if (match) {
        setConfig((prev: any) => ({ ...prev, bossNumber: match.bossNumber }));
      }
    }
  }, [config.bossNumber, config.bossEnergy]);

  const [modalTarget, setModalTarget] = useState<'all' | 'empty' | number | 'explorer_base' | 'explorer_compare' | null>(null);
  const [bossModalOpen, setBossModalOpen] = useState(false);
  const [bossSearch, setBossSearch] = useState('');
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncInput, setSyncInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [luckModalOpen, setLuckModalOpen] = useState(false);
  const [explorerBase, setExplorerBase] = useState<string | null>(null);
  const [explorerCompare, setExplorerCompare] = useState<string | null>(null);

  const toggleStep = (idx: number) => {
    setExpandedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

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
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('orbo_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('orbo_army', JSON.stringify(slots));
  }, [slots]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBossModalOpen(false);
        setModalTarget(null);
        setSyncModalOpen(false);
        setLuckModalOpen(false);
        setExplorerBase(null);
        setExplorerCompare(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const exportData = () => {
    try {
      return btoa(encodeURIComponent(JSON.stringify({ config, slots })));
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
      let decodedString = atob(syncInput.trim());
      try {
        decodedString = decodeURIComponent(decodedString);
      } catch (e) {
        // Fallback for legacy codes
      }
      const decoded = JSON.parse(decodedString);
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

    const clickPctNum = (parseFloat(config.clickPercent) || 0) / 100;
    
    const targetTotalDps = config.bossEnergy / config.battleDuration;
    
    const requiredArmyDps = (config.bossEnergy - (config.clickFixed * config.maxClicks)) / 
                            (config.battleDuration + (clickPctNum * config.maxClicks));
    
    const gap = requiredArmyDps - currentArmyDps;
    const currentClickDps = (currentArmyDps * clickPctNum) + config.clickFixed;
    const currentTotalDps = currentArmyDps + (currentClickDps * config.maxClicks / config.battleDuration);

    let remainingGap = gap;
    let simulatedSlots = slots.map(s => ({ ...s }));
    let totalCost = 0;
    
    type UpgradeHistory = { 
      slotIndex: number; 
      creatureKey: string; 
      startLevel: number; 
      endLevel: number; 
      totalCost: number; 
      totalDpsGain: number;
      details: { level: number; cost: number }[];
    };
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

        let cost = currentData.foodCost;
        if (nextData.stage && currentData.stage && nextData.stage > currentData.stage) {
          cost = currentData.foodCost * nextData.stage;
        }

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
        existing.details.push({ level: chosenSlot.level, cost: bestCost });
      } else {
        history.push({
          slotIndex: bestSlotIdx,
          creatureKey: chosenSlot.creatureKey!,
          startLevel: chosenSlot.level,
          endLevel: chosenSlot.level + 1,
          totalCost: bestCost,
          totalDpsGain: bestDpsGain,
          details: [{ level: chosenSlot.level, cost: bestCost }]
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
      setConfig((prev: any) => ({ ...prev, clickPercent: value }));
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
    if (modalTarget === 'explorer_base') {
      setExplorerBase(creatureKey);
      setModalTarget(null);
      setSearch('');
      return;
    }
    if (modalTarget === 'explorer_compare') {
      setExplorerCompare(creatureKey);
      setModalTarget(null);
      setSearch('');
      return;
    }
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

  const tierRank: Record<string, number> = {
    'common': 1,
    'uncommon': 2,
    'scarce': 3,
    'rare': 4,
    'esoteric': 5,
    'mythic': 6,
    'relic': 7,
    'untouched': 8,
    'phaseBound': 9,
    'lightSworn': 10,
    'voidBorn': 11
  };

  const getCreatureMaxDps = (c: any) => {
    if (!c.levels || c.levels.length === 0) return 0;
    return c.levels[c.levels.length - 1].dps;
  };

  const filteredCreatures = creaturesData.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || c.tier.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const tA = tierRank[a.tier] || 99;
    const tB = tierRank[b.tier] || 99;
    if (tA !== tB) return tA - tB;
    return getCreatureMaxDps(b) - getCreatureMaxDps(a);
  });

  const groupedCreatures = filteredCreatures.reduce((acc, c) => {
    const lastGroup = acc[acc.length - 1];
    if (lastGroup && lastGroup.tier === c.tier) {
      lastGroup.creatures.push(c);
    } else {
      acc.push({ tier: c.tier, creatures: [c] });
    }
    return acc;
  }, [] as { tier: string, creatures: typeof creaturesData }[]);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#ededed] p-6 md:p-10 font-sans selection:bg-[#333]">
      
      {/* Boss Select Modal */}
      {bossModalOpen && (
        <div onClick={() => setBossModalOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div onClick={e => e.stopPropagation()} className="bg-[#111] rounded-lg border border-[#222] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
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
                      autoFocus
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
        <div onClick={() => setModalTarget(null)} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div onClick={e => e.stopPropagation()} className="bg-[#111] rounded-lg border border-[#222] w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
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
                      autoFocus
                      type="text" 
                      placeholder="Search creatures..." 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full bg-[#111] border border-[#222] rounded-md py-2 pl-9 pr-3 text-sm text-[#ededed] focus:outline-none focus:border-[#444] transition-colors"
                   />
                </div>
             </div>
             <div className="p-4 overflow-y-auto bg-[#0a0a0a]">
                {groupedCreatures.map((group, idx) => (
                   <div key={group.tier} className={idx > 0 ? 'mt-4' : ''}>
                      <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3 border-b border-[#222] pb-1">{group.tier.replace(/([A-Z])/g, ' $1').trim()}</h3>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                         {group.creatures.map(c => (
                            <button key={c.key} onClick={() => assignCreature(c.key)} style={{ borderTop: `3px solid ${getTierColor(c.tier)}` }} className="group bg-[#111] hover:bg-[#1a1a1a] border border-[#222] hover:border-[#444] p-3 rounded-md flex flex-col items-center text-center transition-colors">
                               <div className="w-10 h-10 mb-2 rounded bg-[#0a0a0a] overflow-hidden border border-[#222] shrink-0">
                                  <img src={getCreatureImageUrl(c)} alt={c.name} className="w-full h-full object-cover" />
                               </div>
                               <p className="font-medium text-[11px] text-[#ededed] leading-tight mb-1">{c.name}</p>
                               <p className="text-[9px] text-[#666] capitalize">{c.tier.replace(/([A-Z])/g, ' $1').trim()}</p>
                            </button>
                         ))}
                      </div>
                   </div>
                ))}
                {filteredCreatures.length === 0 && (
                   <div className="py-8 text-center text-[#666] text-sm">
                      No matching creatures.
                   </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Sync / Export Modal */}
      {syncModalOpen && (
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
      )}

      {/* Luck Table Modal */}
      {luckModalOpen && (
        <div onClick={() => setLuckModalOpen(false)} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div onClick={e => e.stopPropagation()} className="bg-[#111] rounded-lg border border-[#222] w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#222] flex items-center justify-between shrink-0">
              <h2 className="text-sm font-medium flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-[#888]" />
                Luck Table
              </h2>
              <button onClick={() => setLuckModalOpen(false)} className="p-1.5 text-[#888] hover:text-[#ededed] bg-[#1a1a1a] hover:bg-[#222] rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <div className="px-4 py-2.5 border-b border-[#222] bg-[#0d0d0d] shrink-0">
              <p className="text-[11px] text-[#666] leading-relaxed">
                Upgrade luck with gold to increase spawn rates for rarer creatures. <span className="text-[#444]">Cost</span> is the gold required to reach that level. <span className="text-[#444]">Cumulative</span> is the total gold spent from level 1.
              </p>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#111] border-b border-[#333]">
                    <th className="sticky left-0 z-20 bg-[#111] text-left px-3 py-2.5 font-semibold text-[#666] uppercase tracking-wider whitespace-nowrap w-10">Lv</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-[#666] uppercase tracking-wider whitespace-nowrap">Cost</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-[#555] uppercase tracking-wider whitespace-nowrap">Cumulative</th>
                    <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: TIER_COLORS.common }}>Common</th>
                    <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: TIER_COLORS.uncommon }}>Uncommon</th>
                    <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: TIER_COLORS.scarce }}>Scarce</th>
                    <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: TIER_COLORS.rare }}>Rare</th>
                    <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: TIER_COLORS.esoteric }}>Esoteric</th>
                    <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: TIER_COLORS.mythic }}>Mythic</th>
                    <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: TIER_COLORS.relic }}>Relic</th>
                    <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: TIER_COLORS.untouched }}>Untouched</th>
                    <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: TIER_COLORS.phaseBound }}>Phase Bound</th>
                    <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: TIER_COLORS.lightSworn }}>Light Sworn</th>
                    <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: TIER_COLORS.voidBorn }}>Void Born</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let cumulative = 0;
                    return (luckData as any[]).map((row: any, idx: number) => {
                      cumulative += row.cost;
                      const r = row.spawnRates;
                      const fmt = (v: number) => v === 0 ? <span className="text-[#333]">—</span> : v < 0.01 ? v.toFixed(4)+'%' : v < 0.1 ? v.toFixed(4)+'%' : v < 1 ? v.toFixed(2)+'%' : v.toFixed(1)+'%';
                      const isEven = idx % 2 === 0;
                      return (
                        <tr key={row.level} className={`border-b border-[#1a1a1a] ${isEven ? 'bg-[#0a0a0a]' : 'bg-[#0d0d0d]'} hover:bg-[#141414] transition-colors`}>
                          <td className={`sticky left-0 z-[1] px-3 py-2 font-mono font-semibold text-[#ededed] ${isEven ? 'bg-[#0a0a0a]' : 'bg-[#0d0d0d]'} border-r border-[#222]`}>{row.level}</td>
                          <td className="px-3 py-2 font-mono text-right text-[#888] whitespace-nowrap">
                            {row.cost === 0 ? <span className="text-[#444]">—</span> : compactNum(row.cost, 2)}
                          </td>
                          <td className="px-3 py-2 font-mono text-right text-[#555] whitespace-nowrap">{compactNum(cumulative, 2)}</td>
                          <td className="px-3 py-2 font-mono text-right" style={{ color: TIER_COLORS.common }}>{fmt(r.common)}</td>
                          <td className="px-3 py-2 font-mono text-right" style={{ color: TIER_COLORS.uncommon }}>{fmt(r.uncommon)}</td>
                          <td className="px-3 py-2 font-mono text-right" style={{ color: TIER_COLORS.scarce }}>{fmt(r.scarce)}</td>
                          <td className="px-3 py-2 font-mono text-right" style={{ color: TIER_COLORS.rare }}>{fmt(r.rare)}</td>
                          <td className="px-3 py-2 font-mono text-right" style={{ color: TIER_COLORS.esoteric }}>{fmt(r.esoteric)}</td>
                          <td className="px-3 py-2 font-mono text-right" style={{ color: TIER_COLORS.mythic }}>{fmt(r.mythic)}</td>
                          <td className="px-3 py-2 font-mono text-right" style={{ color: TIER_COLORS.relic }}>{fmt(r.relic)}</td>
                          <td className="px-3 py-2 font-mono text-right" style={{ color: TIER_COLORS.untouched }}>{fmt(r.untouched)}</td>
                          <td className="px-3 py-2 font-mono text-right" style={{ color: TIER_COLORS.phaseBound }}>{fmt(r.phaseBound)}</td>
                          <td className="px-3 py-2 font-mono text-right" style={{ color: TIER_COLORS.lightSworn }}>{fmt(r.lightSworn)}</td>
                          <td className="px-3 py-2 font-mono text-right" style={{ color: TIER_COLORS.voidBorn }}>{fmt(r.voidBorn)}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {updateAvailable && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#111] border border-[#333] shadow-2xl rounded-lg p-3 sm:p-4 flex items-center space-x-4 animate-in slide-in-from-top-4 fade-in duration-300">
          <div>
            <h3 className="text-sm font-semibold text-[#ededed]">Update Available</h3>
            <p className="text-xs text-[#888] mt-0.5">A new version has been deployed. Reload to apply.</p>
          </div>
          <button onClick={() => window.location.reload()} className="px-3 py-1.5 bg-[#ededed] hover:bg-white text-black text-[10px] uppercase tracking-wider font-semibold rounded transition-colors shrink-0">
            Reload Now
          </button>
        </div>
      )}

      {/* Explorer Stats Modal */}
      {explorerBase && (
        <div onClick={() => { setExplorerBase(null); setExplorerCompare(null); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div onClick={e => e.stopPropagation()} className="bg-[#111] rounded-lg border border-[#222] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
             <div className="p-4 border-b border-[#222] flex items-center justify-between">
                <h2 className="text-sm font-medium flex items-center">
                   <Search className="w-4 h-4 mr-2 text-[#888]" />
                   Creature Explorer
                </h2>
                <button onClick={() => { setExplorerBase(null); setExplorerCompare(null); }} className="p-1.5 text-[#888] hover:text-[#ededed] bg-[#1a1a1a] hover:bg-[#222] rounded transition-colors">
                   <X className="w-4 h-4" />
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#0a0a0a] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-4">
                   <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded bg-[#111] overflow-hidden border border-[#222] shrink-0 p-1">
                         <img src={getCreatureImageUrl(creaturesDict[explorerBase])} alt="" className="w-full h-full object-contain" />
                      </div>
                      <div>
                         <h3 className="text-xl font-bold text-[#ededed] leading-tight">{creaturesDict[explorerBase].name}</h3>
                         <div className="flex space-x-2 mt-1 text-xs">
                            <span className="text-[#888] capitalize">Tier: <span className="text-[#ededed]">{creaturesDict[explorerBase].tier.replace(/([A-Z])/g, ' $1').trim()}</span></span>
                            {creaturesDict[explorerBase].aspect && creaturesDict[explorerBase].aspect.toLowerCase() !== 'null' && (
                               <>
                                  <span className="text-[#444]">|</span>
                                  <span className="text-[#888] capitalize">Aspect: <span className="text-[#ededed]">{creaturesDict[explorerBase].aspect}</span></span>
                               </>
                            )}
                         </div>
                      </div>
                   </div>

                   <div className="flex items-center space-x-4 justify-end sm:justify-auto pt-4 border-t border-[#222] sm:border-0 sm:pt-0">
                      {explorerCompare ? (
                         <>
                            <div className="flex items-center space-x-4 text-right">
                               <div>
                                  <h3 className="text-xl font-bold text-[#ededed] leading-tight">{creaturesDict[explorerCompare].name}</h3>
                                  <div className="flex space-x-2 justify-end mt-1 text-xs">
                                     <span className="text-[#888] capitalize">Tier: <span className="text-[#ededed]">{creaturesDict[explorerCompare].tier.replace(/([A-Z])/g, ' $1').trim()}</span></span>
                                     {creaturesDict[explorerCompare].aspect && creaturesDict[explorerCompare].aspect.toLowerCase() !== 'null' && (
                                        <>
                                           <span className="text-[#444]">|</span>
                                           <span className="text-[#888] capitalize">Aspect: <span className="text-[#ededed]">{creaturesDict[explorerCompare].aspect}</span></span>
                                        </>
                                     )}
                                  </div>
                               </div>
                               <div className="w-16 h-16 rounded bg-[#111] overflow-hidden border border-[#222] shrink-0 p-1">
                                  <img src={getCreatureImageUrl(creaturesDict[explorerCompare])} alt="" className="w-full h-full object-contain" />
                               </div>
                            </div>
                            <button onClick={() => setExplorerCompare(null)} className="p-1.5 px-3 text-[#888] hover:text-[#ededed] bg-[#1a1a1a] border border-[#222] hover:bg-[#222] rounded flex items-center transition-colors text-[10px] uppercase font-semibold">
                               <X className="w-3 h-3 mr-1.5" /> Remove
                            </button>
                         </>
                      ) : (
                         <button onClick={() => setModalTarget('explorer_compare')} className="px-4 py-2 bg-[#111] border border-[#222] hover:border-[#444] rounded text-xs text-[#ededed] font-medium transition-colors flex items-center">
                            <Plus className="w-4 h-4 mr-1.5 text-[#888]" /> Add to Compare
                         </button>
                      )}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-[#111] border border-[#222] p-4 rounded-lg flex flex-col h-[350px]">
                      <h4 className="text-xs uppercase tracking-wider font-semibold text-[#888] mb-4">DPS Evolution</h4>
                      <div className="flex-1 min-h-0 w-full text-[10px]">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={
                                (() => {
                                   const bC = creaturesDict[explorerBase];
                                   const cC = explorerCompare ? creaturesDict[explorerCompare] : null;
                                   const maxLevel = Math.max(bC.levels.length, cC ? cC.levels.length : 0);
                                   const data = [];
                                   for (let i = 0; i < maxLevel; i++) {
                                      data.push({
                                         level: i + 1,
                                         baseDps: bC.levels[i] ? bC.levels[i].dps : undefined,
                                         compDps: cC && cC.levels[i] ? cC.levels[i].dps : undefined
                                      });
                                   }
                                   return data;
                                })()
                            }
                            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                               <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                               <XAxis dataKey="level" tick={{ fontSize: 9, fill: '#666' }} stroke="#333" minTickGap={20} />
                               <YAxis tickFormatter={(val) => compactNum(val)} tick={{ fontSize: 9, fill: '#666' }} stroke="#333" />
                               <Tooltip 
                                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '11px', borderRadius: '6px' }}
                                  itemStyle={{ color: '#ededed', fontWeight: 500 }}
                                  labelStyle={{ color: '#888', marginBottom: '4px' }}
                               />
                               {explorerCompare && <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />}
                               <Line name={creaturesDict[explorerBase].name} type="monotone" dataKey="baseDps" stroke="#8B5CF6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#8B5CF6' }} />
                               {explorerCompare && <Line name={creaturesDict[explorerCompare].name} type="monotone" dataKey="compDps" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#10B981' }} />}
                            </LineChart>
                         </ResponsiveContainer>
                      </div>
                   </div>

                   <div className="bg-[#111] border border-[#222] p-4 rounded-lg flex flex-col h-[350px]">
                      <h4 className="text-xs uppercase tracking-wider font-semibold text-[#888] mb-4">Food Cost & Accumulation</h4>
                      <div className="flex-1 min-h-0 w-full text-[10px]">
                         <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={
                                (() => {
                                   const bC = creaturesDict[explorerBase];
                                   const cC = explorerCompare ? creaturesDict[explorerCompare] : null;
                                   const maxLevel = Math.max(bC.levels.length, cC ? cC.levels.length : 0);
                                   const data = [];
                                   let bCumul = 0, cCumul = 0;
                                   for (let i = 0; i < maxLevel; i++) {
                                      const bCost = i === 0 ? 0 : (bC.levels[i - 1] ? getValidFoodCost(bC, i - 1) : 0);
                                      const cCost = i === 0 ? 0 : (cC && cC.levels[i - 1] ? getValidFoodCost(cC, i - 1) : 0);
                                      if (bC.levels[i]) bCumul += bCost;
                                      if (cC && cC.levels[i]) cCumul += cCost;
                                      data.push({
                                         level: i + 1,
                                         baseCost: bC.levels[i] ? bCost : undefined,
                                         baseCumul: bC.levels[i] ? bCumul : undefined,
                                         compCost: cC && cC.levels[i] ? cCost : undefined,
                                         compCumul: cC && cC.levels[i] ? cCumul : undefined
                                      });
                                   }
                                   return data;
                                })()
                            }
                            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                               <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                               <XAxis dataKey="level" tick={{ fontSize: 9, fill: '#666' }} stroke="#333" minTickGap={20} />
                               <YAxis yAxisId="left" tickFormatter={(val) => compactNum(val, 0)} tick={{ fontSize: 9, fill: '#666' }} stroke="#333" />
                               <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => compactNum(val, 0)} tick={{ fontSize: 9, fill: '#666' }} stroke="#333" />
                               <Tooltip 
                                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '11px', borderRadius: '6px' }}
                                  itemStyle={{ color: '#ededed', fontWeight: 500 }}
                                  labelStyle={{ color: '#888', marginBottom: '4px' }}
                                  formatter={(value: any) => value.toLocaleString()}
                               />
                               {explorerCompare && <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />}
                               <Bar yAxisId="left" name={creaturesDict[explorerBase].name + " (Lvl Cost)"} dataKey="baseCost" fill="#4C1D95" opacity={0.8} />
                               {explorerCompare && <Bar yAxisId="left" name={creaturesDict[explorerCompare].name + " (Lvl Cost)"} dataKey="compCost" fill="#047857" opacity={0.8} />}
                               <Line yAxisId="right" name={creaturesDict[explorerBase].name + " (Total)"} type="monotone" dataKey="baseCumul" stroke="#A78BFA" strokeWidth={2} dot={false} />
                               {explorerCompare && <Line yAxisId="right" name={creaturesDict[explorerCompare].name + " (Total)"} type="monotone" dataKey="compCumul" stroke="#34D399" strokeWidth={2} dot={false} />}
                            </ComposedChart>
                         </ResponsiveContainer>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   {explorerCompare && (
                       <div className="bg-[#111] border border-[#222] p-4 rounded-lg">
                          <h4 className="text-xs uppercase tracking-wider font-semibold text-[#888] mb-3 flex items-center">
                             <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Relative Performance Insights
                          </h4>
                          <div className="text-[13px] text-[#ededed] space-y-3 leading-relaxed">
                             {(() => {
                                const bC = creaturesDict[explorerBase];
                                const cC = creaturesDict[explorerCompare];
                                const baseMax = bC.levels[bC.levels.length - 1].dps;
                                const compMax = cC.levels[cC.levels.length - 1].dps;
                                const compSurpassIdx = cC.levels.findIndex((l: any) => l.dps > baseMax);
                                const baseSurpassIdx = bC.levels.findIndex((l: any) => l.dps > compMax);
                                
                                let insightText = null;
                                
                                if (compSurpassIdx !== -1) {
                                   let costToSurpass = 0;
                                   for (let i = 0; i < compSurpassIdx; i++) costToSurpass += getValidFoodCost(cC, i);
                                   insightText = (
                                      <p>
                                         <span className="font-semibold text-[#10B981]">{cC.name}</span> surpasses <span className="font-semibold text-[#8B5CF6]">{bC.name}</span>'s maximum possible DPS ({compactNum(baseMax, 2)}) reaching this threshold at <span className="font-bold underline">Level {compSurpassIdx + 1}</span>, requiring a total investment of <span className="font-bold">{compactNum(costToSurpass, 2)} food</span>.
                                      </p>
                                   );
                                } else if (baseSurpassIdx !== -1) {
                                   let costToSurpass = 0;
                                   for (let i = 0; i < baseSurpassIdx; i++) costToSurpass += getValidFoodCost(bC, i);
                                   insightText = (
                                      <p>
                                         <span className="font-semibold text-[#8B5CF6]">{bC.name}</span> surpasses <span className="font-semibold text-[#10B981]">{cC.name}</span>'s maximum possible DPS ({compactNum(compMax, 2)}) reaching this threshold at <span className="font-bold underline">Level {baseSurpassIdx + 1}</span>, requiring a total investment of <span className="font-bold">{compactNum(costToSurpass, 2)} food</span>.
                                      </p>
                                   );
                                } else {
                                   insightText = (
                                      <p>Both creatures have identical maximum DPS potential at their highest levels.</p>
                                   );
                                }
                                
                                return (
                                   <>
                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-[#222] mb-3">
                                      <div>
                                         <p className="text-[#888] text-[10px] uppercase tracking-wider mb-1">{bC.name} Max Output</p>
                                         <p className="font-semibold text-[#8B5CF6]">{compactNum(baseMax, 2)} DPS <span className="text-[#666] font-normal text-xs">(Lvl {bC.levels.length})</span></p>
                                      </div>
                                      <div>
                                         <p className="text-[#888] text-[10px] uppercase tracking-wider mb-1">{cC.name} Max Output</p>
                                         <p className="font-semibold text-[#10B981]">{compactNum(compMax, 2)} DPS <span className="text-[#666] font-normal text-xs">(Lvl {cC.levels.length})</span></p>
                                      </div>
                                   </div>
                                   {insightText}
                                </>
                                );
                             })()}
                          </div>
                       </div>
                   )}
                   
                   {explorerCompare && slots.some(s => s.creatureKey !== null) && (
                       <div className="bg-[#111] border border-[#222] p-4 rounded-lg">
                          <h4 className="text-xs uppercase tracking-wider font-semibold text-[#10B981] mb-3 flex items-center">
                             <Star className="w-3.5 h-3.5 mr-1.5" /> Army Optimizations
                          </h4>
                          <div className="text-[13px] text-[#ededed] space-y-3 leading-relaxed">
                             {(() => {
                                const suggestions: React.ReactNode[] = [];
                                
                                const analyzeSynergy = (evalCKey: string, isCompare: boolean) => {
                                   const evalC = creaturesDict[evalCKey];
                                   if (!evalC) return;
                                   
                                   slots.forEach((s, idx) => {
                                      if (!s.creatureKey || s.creatureKey === evalCKey) return;
                                      const currentC = creaturesDict[s.creatureKey];
                                      if (!currentC) return;
                                      
                                      const currentLvl = s.level;
                                      const currentStats = currentC.levels[currentLvl - 1];
                                      if (!currentStats) return;
                                      const currentDps = currentStats.dps;
                                      
                                      const surpassIdx = evalC.levels.findIndex((l: any) => l.dps > currentDps);
                                      if (surpassIdx !== -1) {
                                         const surpassLvl = surpassIdx + 1;
                                         
                                         // Provide tip if it can easily surpass for a vastly lower level
                                         if (surpassLvl <= currentLvl - 3) {
                                            let costToSurpass = 0;
                                            for (let i = 0; i < surpassIdx; i++) costToSurpass += getValidFoodCost(evalC, i);
                                            
                                            suggestions.push(
                                               <div key={`${evalCKey}-${idx}`} className="bg-[#1a1a1a] p-3 rounded border border-[#333] flex items-start space-x-3">
                                                  <div className="w-8 h-8 rounded bg-[#111] overflow-hidden border border-[#222] shrink-0 mt-0.5">
                                                     <img src={getCreatureImageUrl(evalC)} alt="" className="w-full h-full object-contain" />
                                                  </div>
                                                  <p>
                                                     <span className="font-semibold text-white">Hint (Slot {idx + 1}):</span> Your equipped <span className="font-medium text-[#888]">{currentC.name} (Lvl {currentLvl})</span> outputs {compactNum(currentDps, 2)} DPS. 
                                                     <span className={`font-semibold ${isCompare ? 'text-[#047857]' : 'text-[#8B5CF6]'}`}> {evalC.name}</span> surpasses this at just <span className="font-bold underline">Level {surpassLvl}</span> 
                                                     {' '}(Total Cost: {compactNum(costToSurpass, 2)} food).
                                                  </p>
                                               </div>
                                            );
                                         }
                                      }
                                   });
                                };
                                
                                analyzeSynergy(explorerBase, false);
                                if (explorerCompare) analyzeSynergy(explorerCompare, true);
                                
                                if (suggestions.length === 0) {
                                   return <p className="text-[#666] italic">Your current army loadout is highly optimized compared to these specific creatures.</p>;
                                }
                                
                                return <div className="space-y-3">{suggestions}</div>;
                             })()}
                          </div>
                       </div>
                   )}
                   
                   {!explorerCompare && (
                      <div className="space-y-4">
                         <div className="flex items-center space-x-2 border-b border-[#222] pb-2 mt-4">
                            <Star className="w-4 h-4 text-[#8B5CF6]" />
                            <h4 className="text-sm uppercase tracking-wider font-semibold text-[#ededed]">Evolution Stage Breakdown</h4>
                         </div>
                         <div className="space-y-6">
                            {(() => {
                               const bC = creaturesDict[explorerBase];
                               const stagesData: Record<number, any[]> = {};
                               bC.levels.forEach((lvl: any, idx: number) => {
                                  const stageNum = lvl.stage || 1;
                                  if (!stagesData[stageNum]) stagesData[stageNum] = [];
                                  
                                  const stageLevelsSoFar = stagesData[stageNum];
                                  const prevCumul = stageLevelsSoFar.length > 0 ? stageLevelsSoFar[stageLevelsSoFar.length - 1].stageCumul : 0;
                                  
                                  const actualLevelCost = idx === 0 ? 0 : getValidFoodCost(bC, idx - 1);
                                  
                                  stagesData[stageNum].push({
                                     ...lvl,
                                     absoluteLevel: idx + 1,
                                     relativeLevel: stageLevelsSoFar.length + 1,
                                     actualFoodCost: actualLevelCost,
                                     stageCumul: prevCumul + actualLevelCost
                                  });
                               });
                               
                               return Object.entries(stagesData).map(([stageNumStr, stageLevels]) => {
                                  const stageNum = parseInt(stageNumStr);
                                  const stageImgUrl = getCreatureImageUrl(bC, stageLevels[0].absoluteLevel);
                                  const totalStageCost = stageLevels[stageLevels.length - 1].stageCumul;
                                  
                                  return (
                                     <div key={stageNum} className="bg-[#111] border border-[#222] p-4 sm:p-5 rounded-lg">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-[#222] pb-4">
                                           <div className="flex items-center space-x-4">
                                              <div className="w-12 h-12 rounded bg-[#0a0a0a] overflow-hidden border border-[#222] shrink-0 p-1">
                                                 <img src={stageImgUrl} alt={`Stage ${stageNum}`} className="w-full h-full object-contain" />
                                              </div>
                                              <div>
                                                 <h5 className="font-bold text-[#ededed] text-lg leading-tight mb-1">Stage {stageNum}</h5>
                                                 <p className="text-[11px] text-[#888] uppercase tracking-wider">Levels {stageLevels[0].absoluteLevel} - {stageLevels[stageLevels.length - 1].absoluteLevel}</p>
                                              </div>
                                           </div>
                                           <div className="sm:text-right">
                                              <p className="text-[10px] text-[#888] uppercase tracking-wider mb-1">Total Stage Cost</p>
                                              <p className="text-sm font-semibold text-[#34D399]">{totalStageCost.toLocaleString()} <span className="text-xs text-[#666] font-normal">food</span></p>
                                           </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                           <div className="h-[200px] flex flex-col">
                                              <h6 className="text-[10px] uppercase tracking-wider font-semibold text-[#666] mb-3">DPS Evolution <span className="text-[#444] lowercase">(Stage Internal)</span></h6>
                                              <div className="flex-1 min-h-0 w-full text-[9px]">
                                                 <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={stageLevels} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                                       <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                                       <XAxis dataKey="absoluteLevel" tick={{ fontSize: 9, fill: '#666' }} stroke="#333" />
                                                       <YAxis tickFormatter={(val) => compactNum(val)} tick={{ fontSize: 9, fill: '#666' }} stroke="#333" width={40} />
                                                       <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '10px', borderRadius: '4px' }} itemStyle={{ color: '#8B5CF6', fontWeight: 500 }} labelStyle={{ color: '#888', marginBottom: '2px' }} />
                                                       <Line name="DPS" type="monotone" dataKey="dps" stroke="#8B5CF6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#8B5CF6' }} />
                                                    </LineChart>
                                                 </ResponsiveContainer>
                                              </div>
                                           </div>
                                           
                                           <div className="h-[200px] flex flex-col">
                                              <h6 className="text-[10px] uppercase tracking-wider font-semibold text-[#666] mb-3">Food Cost <span className="text-[#444] lowercase">(Stage Internal)</span></h6>
                                              <div className="flex-1 min-h-0 w-full text-[9px]">
                                                 <ResponsiveContainer width="100%" height="100%">
                                                    <ComposedChart data={stageLevels} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                                       <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                                       <XAxis dataKey="absoluteLevel" tick={{ fontSize: 9, fill: '#666' }} stroke="#333" />
                                                       <YAxis yAxisId="left" tickFormatter={(val) => compactNum(val, 0)} tick={{ fontSize: 9, fill: '#666' }} stroke="#333" width={40} />
                                                       <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => compactNum(val, 0)} tick={{ fontSize: 9, fill: '#666' }} stroke="#333" width={40} />
                                                       <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '10px', borderRadius: '4px' }} itemStyle={{ color: '#ededed', fontWeight: 500 }} labelStyle={{ color: '#888', marginBottom: '2px' }} formatter={(val: any) => val.toLocaleString()} />
                                                       <Bar yAxisId="left" name="Lvl Cost" dataKey="actualFoodCost" fill="#4C1D95" opacity={0.8} />
                                                       <Line yAxisId="right" name="Stage Accum" type="monotone" dataKey="stageCumul" stroke="#A78BFA" strokeWidth={2} dot={false} />
                                                    </ComposedChart>
                                                 </ResponsiveContainer>
                                              </div>
                                           </div>
                                        </div>
                                     </div>
                                  );
                               });
                            })()}
                         </div>
                      </div>
                   )}
                </div>

             </div>
          </div>
        </div>
      )}

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
                   <InputRow 
                      label="Click DPS (%)" 
                      name="clickPercentForm" 
                      value={config.clickPercent} 
                      onChange={handleConfigChange} 
                      tooltip="You need to get this value from your profile page under attributes. In the game UI, it's called 'Orbo DPS → Click'"
                      tooltipAlign="left"
                   />
                   <InputRow 
                      label="Max Clicks" 
                      name="maxClicks" 
                      value={config.maxClicks} 
                      onChange={handleConfigChange} 
                      tooltip="Adjust to your liking, 82 is just what the dev suggests :D"
                      tooltipAlign="center"
                   />
                   <InputRow 
                      label="Total Click Power" 
                      name="totalClickPower" 
                      tooltip="You need to get this value from your profile page under attributes. In the game UI, it's called 'Power'"
                      tooltipAlign="right"
                      value={Math.round(results.currentArmyDps * ((parseFloat(config.clickPercent) || 0) / 100) + config.clickFixed)} 
                      onChange={(e: any) => {
                         const val = parseFloat(e.target.value);
                         const totalPower = isNaN(val) ? 0 : val;
                         const fixed = totalPower - (results.currentArmyDps * ((parseFloat(config.clickPercent) || 0) / 100));
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
               
               <div className="p-2 sm:p-3 grid grid-cols-4 gap-1.5 sm:gap-2">
                  {slots.map((slot, idx) => {
                     const isAssigned = !!slot.creatureKey;
                     const c = isAssigned ? creaturesDict[slot.creatureKey!] : null;
                     const dps = c?.levels[slot.level - 1]?.dps || 0;
                     const maxLevel = c?.levels.length || 1;
                     
                     const stageIndex = c?.levels[slot.level - 1]?.stage || 1;
                     const starsCount = stageIndex - 1;
                     const relativeLevel = slot.level <= 20 ? slot.level : ((slot.level - 1) % 20) + 1;

                     const cycleStage = (e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        let nextStage = stageIndex + 1;
                        if (nextStage > 4) nextStage = 1;

                        // Ensure they have the necessary absolute level logic
                        let absolute = (nextStage - 1) * 20 + relativeLevel;
                        
                        // If cycling to Stage 4 but max level is only 60, bump them back to Stage 1. 
                        if ((nextStage - 1) * 20 + 1 > maxLevel) {
                           absolute = relativeLevel;
                        } else if (absolute > maxLevel) {
                           absolute = maxLevel;
                        }
                        
                        updateSlotLevel(idx, absolute);
                     };

                     return (
                        <div 
                           key={idx} 
                           draggable
                           onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', idx.toString());
                              setDraggedIndex(idx);
                           }}
                           onDragEnd={() => setDraggedIndex(null)}
                           onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                           }}
                           onDrop={(e) => {
                              e.preventDefault();
                              const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                              if (isNaN(fromIdx) || fromIdx === idx) return;

                              setSlots(prev => {
                                 const newSlots = [...prev];
                                 const temp = newSlots[idx];
                                 newSlots[idx] = newSlots[fromIdx];
                                 newSlots[fromIdx] = temp;
                                 return newSlots;
                              });
                              setDraggedIndex(null);
                           }}
                           className={`bg-[#0a0a0a] border border-[#222] rounded-md flex flex-col relative group overflow-hidden transition-all hover:border-[#444] ${isAssigned ? 'cursor-grab active:cursor-grabbing' : ''} ${draggedIndex === idx ? 'opacity-40 border-dashed scale-95' : ''}`}
                           style={isAssigned && c ? { borderTop: `3px solid ${getTierColor(c.tier)}` } : undefined}
                        >
                           {isAssigned ? (
                              <>
                                 <button onClick={(e) => { e.stopPropagation(); removeSlot(idx); }} className="absolute top-1 right-1 bg-black/60 backdrop-blur border border-[#333] text-[#888] rounded p-0.5 hover:text-white opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity z-10 w-4 h-4 flex justify-center items-center">
                                    <X className="w-2.5 h-2.5" />
                                 </button>
                                 <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setExplorerBase(c!.key); }} className="absolute top-1 right-6 bg-black/60 backdrop-blur border border-[#333] text-[#888] rounded p-0.5 hover:text-[#ededed] opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity z-10 w-4 h-4 flex justify-center items-center" title="View in Explorer">
                                    <Search className="w-2.5 h-2.5" />
                                 </button>
                                 <div className="w-full aspect-square bg-[#111] overflow-hidden relative flex items-center justify-center p-1.5 pb-4">
                                    <img src={getCreatureImageUrl(c, slot.level)} alt={c.name} className="w-full h-full object-contain" />
                                    <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
                                    
                                    <button 
                                       onClick={cycleStage}
                                       className="absolute top-1 left-1.5 flex space-x-0.5 z-10 p-0.5 hover:bg-black/50 rounded transition-colors"
                                       title="Cycle Stage"
                                    >
                                       {starsCount === 0 ? (
                                          <Star className="w-2.5 h-2.5 text-[#444] opacity-80" />
                                       ) : (
                                          Array.from({ length: starsCount }).map((_, i) => (
                                             <Star key={i} className="w-2.5 h-2.5 fill-yellow-400 text-yellow-500 drop-shadow-md" />
                                          ))
                                       )}
                                    </button>

                                    <div className="absolute bottom-1 left-1.5 flex items-center space-x-1">
                                       <span className="text-[7px] uppercase tracking-wider text-yellow-400 font-bold drop-shadow-md z-10 pointer-events-none">lv.</span>
                                       <LevelInput 
                                          absoluteLevel={slot.level || 1} 
                                          maxLevel={maxLevel} 
                                          onChange={(val: number) => updateSlotLevel(idx, val)} 
                                       />
                                    </div>
                                 </div>
                                 <button onClick={(e) => { e.stopPropagation(); setExplorerBase(c!.key); }} className="w-full p-1.5 flex flex-col border-t border-[#222] text-left hover:bg-[#1a1a1a] active:bg-[#222] transition-colors" title="View in Explorer">
                                    <p className="text-[9px] font-medium truncate text-[#ededed] w-full" title={c.name}>{c.name}</p>
                                    <p className="text-[8.5px] text-[#888] font-mono mt-0.5 truncate leading-tight">
                                      {dps.toLocaleString(undefined, { maximumFractionDigits: 1 })} DPS
                                    </p>
                                 </button>
                              </>
                           ) : (
                              <>
                                 <button onClick={() => setModalTarget(idx)} className="w-full aspect-square bg-[#0a0a0a] hover:bg-[#111] flex flex-col items-center justify-center text-[#555] transition-colors cursor-pointer">
                                    <Plus className="w-4 h-4 mb-0.5" />
                                 </button>
                                 <div className="w-full p-1.5 flex flex-col border-t border-[#222]">
                                    <p className="text-[9px] font-medium text-[#444] w-full truncate">Empty Unit</p>
                                    <p className="text-[8.5px] text-transparent font-mono mt-0.5 leading-tight">0 DPS</p>
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
                         <p className="text-[10px] text-[#555] mb-3 px-1 leading-relaxed">
                           Each step is the <span className="text-[#888]">next best level-up</span>. Do one level at a time, the order will shift as your army improves.
                         </p>
                        <div className="space-y-3 relative before:absolute before:top-4 before:bottom-4 before:left-[13px] before:w-px before:bg-[#333] pl-9 ml-1">
                           {results.upgradePlan.map((step, idx) => {
                              const c = creaturesDict[step.creatureKey];
                               const nextLevel = step.details[0].level;
                               const nextLevelDpsGain = c.levels[nextLevel] && c.levels[nextLevel - 1]
                                 ? c.levels[nextLevel].dps - c.levels[nextLevel - 1].dps : 0;
                              return (
                                  <div key={idx} className="bg-[#0a0a0a] border border-[#222] rounded-md relative flex flex-col transition-colors hover:border-[#333]">
                                     <div onClick={() => toggleStep(idx)} className="p-2.5 flex items-center flex-wrap gap-y-2 cursor-pointer transition-colors rounded-md relative">
                                        <div className="absolute top-1/2 -translate-y-1/2 -left-[35px] w-6 h-6 rounded-full bg-[#111] border border-[#444] flex items-center justify-center text-[10px] font-bold text-[#ededed] shadow-sm z-10">
                                           {idx + 1}
                                        </div>
                                        <div className="w-8 h-8 rounded shrink-0 overflow-hidden border border-[#222] bg-[#1a1a1a]">
                                            <img src={getCreatureImageUrl(c)} alt={c.name} className="w-full h-full object-cover scale-110" />
                                        </div>
                                        <div className="ml-3 flex-1 min-w-0">
                                           <p className="text-xs font-medium text-[#ededed]">
                                              {c.name} <span className="text-[#666] font-normal ml-1">Slot {step.slotIndex + 1}</span>
                                           </p>
                                            <div className="flex items-center mt-0.5 space-x-1.5 flex-wrap gap-y-0.5">
                                               <p className="text-[10px] font-mono font-semibold text-[#ededed]">
                                                  Lv {nextLevel} → {nextLevel + 1}
                                               </p>
                                               {step.details.length > 1 && (
                                                 <span className="text-[9px] text-[#555] font-mono">
                                                   (goal Lv {step.endLevel}, {step.details.length} upgrades)
                                                 </span>
                                               )}
                                               <div className="bg-[#222] h-3 px-1 rounded flex items-center justify-center border border-[#333]">
                                                 <ChevronDown className={`w-2.5 h-2.5 text-[#888] transition-transform duration-200 ${expandedSteps[idx] ? 'rotate-180' : ''}`} />
                                               </div>
                                            </div>
                                        </div>
                                        <div className="flex items-start justify-end space-x-3 w-full sm:w-auto sm:ml-3 pl-11 sm:pl-0">
                                           <div className="text-right">
                                              <p className="text-[9px] uppercase tracking-wider text-[#555] mb-0.5">Next</p>
                                               <p className="text-[11px] font-mono text-[#888]">{compactNumK(step.details[0].cost)}</p>
                                              <p className="text-[9px] font-mono text-[#22c55e] mt-0.5">+{nextLevelDpsGain.toLocaleString(undefined, { maximumFractionDigits: 1 })} DPS</p>
                                           </div>
                                           <div className="text-right border-l border-[#222] pl-3">
                                              <p className="text-[9px] uppercase tracking-wider text-[#666] mb-0.5">Total</p>
                                               <p className="text-[11px] font-mono text-[#ededed]">{compactNumK(step.totalCost)}</p>
                                              <p className="text-[9px] font-mono text-[#22c55e] mt-0.5">+{step.totalDpsGain.toLocaleString(undefined, { maximumFractionDigits: 1 })} DPS</p>
                                           </div>
                                        </div>
                                     </div>
                                     
                                     {expandedSteps[idx] && (
                                        <div className="border-t border-[#222] bg-[#0c0c0c] rounded-b-md p-3 space-y-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                           <div className="flex items-center justify-between text-[8px] uppercase tracking-wider text-[#555] mb-2 border-b border-[#222] pb-1.5">
                                              <span>All Planned Upgrades</span>
                                              <div className="flex space-x-6">
                                                <span>+DPS</span>
                                                <span>Food Cost</span>
                                              </div>
                                           </div>
                                           {step.details.map((d, dIdx) => (
                                              <div key={dIdx} className="flex items-center justify-between text-[10px] font-mono">
                                                 <div className="flex items-center space-x-2">
                                                    <div className="w-1 h-1 rounded-full bg-[#333]" />
                                                    <span className="text-[#888]">Lv {d.level} → {d.level + 1}</span>
                                                 </div>
                                                 <div className="flex space-x-6">
                                                   <span className="text-[#22c55e]">+{(() => {
                                                     const g = c.levels[d.level] && c.levels[d.level - 1]
                                                       ? c.levels[d.level].dps - c.levels[d.level - 1].dps : 0;
                                                     return g.toLocaleString(undefined, { maximumFractionDigits: 1 });
                                                   })()}</span>
                                                   <span className="text-[#ededed]">{d.cost.toLocaleString()}</span>
                                                 </div>
                                              </div>
                                           ))}
                                        </div>
                                     )}
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

const LevelInput = ({ absoluteLevel, maxLevel, onChange }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const [tempVal, setTempVal] = useState(absoluteLevel.toString());

  useEffect(() => {
    if (!isFocused) setTempVal(absoluteLevel.toString());
  }, [absoluteLevel, isFocused]);

  const relativeLevel = absoluteLevel <= 20 ? absoluteLevel : ((absoluteLevel - 1) % 20) + 1;
  const displayVal = isFocused ? tempVal : relativeLevel;

  return (
    <input 
      type="number" 
      value={displayVal} 
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        setIsFocused(false);
        let val = parseInt(e.target.value) || 1;
        if (val < 1) val = 1;
        if (val > maxLevel) val = maxLevel;
        onChange(val);
      }}
      onChange={(e) => setTempVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className={`bg-black/50 border border-[#333] backdrop-blur text-[9px] font-mono text-center text-yellow-500 focus:outline-none focus:border-yellow-500/50 transition-all rounded-sm py-px [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isFocused ? 'w-9 absolute left-3 z-30 shadow-xl' : 'w-7'}`}
      onClick={e => e.stopPropagation()}
    />
  );
};

const InputRow = ({ label, name, value, onChange, tooltip, tooltipAlign = 'left' }: any) => {
  const alignClass = tooltipAlign === 'left' ? 'left-[-4px] sm:left-1/2 sm:-translate-x-1/2' 
                   : tooltipAlign === 'right' ? 'right-[-12px] sm:left-1/2 sm:-translate-x-1/2 sm:right-auto' 
                   : 'left-1/2 -translate-x-1/2';

  return (
    <div className="flex flex-col space-y-1.5">
      <div className="flex items-center space-x-1.5 relative group z-10 cursor-help" tabIndex={0}>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-[#666] cursor-help">{label}</label>
        {tooltip && (
          <div className="relative">
            <HelpCircle className="w-3 h-3 text-[#555] group-hover:text-[#888] transition-colors" />
            <div className={`absolute bottom-full mb-2 hidden group-hover:block group-focus:block active:block w-44 sm:w-48 p-2 bg-[#222] border border-[#333] text-[9.5px] text-[#ccc] rounded shadow-xl z-[100] normal-case tracking-normal leading-relaxed pointer-events-none ${alignClass}`}>
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <input 
        type="number" 
        name={name}
        value={value}
        onChange={onChange}
        className="w-full bg-[#0a0a0a] border border-[#222] rounded-md py-1.5 px-3 font-mono text-sm text-[#ededed] focus:outline-none focus:border-[#444] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
};

const StatCard = ({ title, value, subValue, good }: any) => (
  <div className="bg-[#111] p-4 rounded-lg border border-[#222] flex flex-col justify-center">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#666] mb-1">{title}</p>
    <p className={`text-2xl font-mono tracking-tight ${good === true ? 'text-emerald-500/80' : good === false ? 'text-red-500/80' : 'text-[#ededed]'}`}>
      {value}
    </p>
    <div className="w-full text-xs text-[#888]">{subValue}</div>
  </div>
);
