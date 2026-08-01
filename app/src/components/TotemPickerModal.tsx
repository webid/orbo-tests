import { Search, Sparkles, X, Image as ImageIcon } from 'lucide-react';
import { TOTEM_EFFECT_INFO, TOTEM_LANE_ORDER, TOTEM_TIER_COLORS, TOTEM_TIER_NAMES, totemsData, totemsDict } from '../data';
import { formatTotemEffect } from '../utils';
import { useOrboStore } from '../store';
import type { Totem } from '../types';
import { TotemThumb } from './TotemThumb';

// Short labels for the delta badges (vs. the longer picker labels).
const EFFECT_SHORT: Record<string, string> = {
  orboDamageMult: 'dmg',
  orboAttackSpeedMult: 'speed',
  energyMaxMult: 'energy max',
  energyRegenMult: 'energy regen',
  freeTapChance: 'free tap',
  tapCritChance: 'tap crit',
  tapCritMultBonus: 'tap crit mult',
  apexOrboDamageMult: 'apex dmg',
  apexOrboCritChance: 'apex crit',
  apexOrboCritMult: 'apex crit mult',
  runtOrboDamageMult: 'runt dmg',
  runtOrboCritChance: 'runt crit',
  runtOrboCritMult: 'runt crit mult',
};

// Aggregate value of one effect key on a card (mult stack or additive sum).
const getEffectValue = (t: Totem, key: string): number => {
  const info = TOTEM_EFFECT_INFO[key];
  const matches = t.effects.filter(e => e.key === key);
  return info?.stack === 'mult'
    ? matches.reduce((a, e) => a * e.value, 1)
    : matches.reduce((a, e) => a + e.value, 0);
};

export const TotemPickerModal = () => {
  const totemPickerSlot = useOrboStore(s => s.totemPickerSlot);
  const setTotemPickerSlot = useOrboStore(s => s.setTotemPickerSlot);
  const config = useOrboStore(s => s.config);
  const setConfig = useOrboStore(s => s.setConfig);
  const setTotemImagesOn = useOrboStore(s => s.setTotemImagesOn);
  const totemSearch = useOrboStore(s => s.totemSearch);
  const setTotemSearch = useOrboStore(s => s.setTotemSearch);

  const totemImagesOn = config.totemImagesOn !== false;

  if (totemPickerSlot === null) return null;

  const close = () => {
    setTotemPickerSlot(null);
    setTotemSearch('');
  };

  const selectTotem = (key: string) => {
    const keys = [...(config.totemKeys || [null, null, null])];
    keys[totemPickerSlot] = key;
    setConfig({ totemKeys: keys });
    setTotemPickerSlot(null);
    setTotemSearch('');
  };

  const currentKey = (config.totemKeys || [])[totemPickerSlot];
  const currentTotem = currentKey ? totemsDict[currentKey] : null;

  const q = totemSearch.trim().toLowerCase();
  const matchesSearch = (t: Totem) => !q ||
    t.name.toLowerCase().includes(q) ||
    t.lane.toLowerCase().includes(q) ||
    t.effects.some(e => !!e.key && (TOTEM_EFFECT_INFO[e.key]?.label || '').toLowerCase().includes(q));

  // The game lets you own duplicate cards but only one of each can be
  // equipped across the three slots, so cards used in another slot are
  // disabled here (and skipped by the Enter-to-pick shortcut).
  const isEquippedElsewhere = (key: string) =>
    (config.totemKeys || []).some((k, i) => k === key && i !== totemPickerSlot);

  // Enter selects the first search result (tier order, then lane order).
  const firstFiltered = totemsData
    .filter(t => matchesSearch(t) && !isEquippedElsewhere(t.key))
    .sort((a, b) => a.tier - b.tier || (TOTEM_LANE_ORDER[a.lane] || 99) - (TOTEM_LANE_ORDER[b.lane] || 99))[0];

  // Battle-relevant deltas of a candidate card vs the totem in this slot.
  const getDeltas = (candidate: Totem) => {
    if (!currentTotem || currentTotem.key === candidate.key) return [];
    const keys = Array.from(new Set(
      [...currentTotem.effects.map(e => e.key), ...candidate.effects.map(e => e.key)]
        .filter((k): k is string => !!k && !!TOTEM_EFFECT_INFO[k]?.battle)
    ));
    return keys.map(key => {
      const info = TOTEM_EFFECT_INFO[key];
      const cur = getEffectValue(currentTotem, key);
      const cand = getEffectValue(candidate, key);
      const label = EFFECT_SHORT[key] || info.label;
      let up: boolean;
      let mag: string;
      if (info.stack === 'mult') {
        const ratio = cand / cur;
        if (Math.abs(ratio - 1) < 1e-9) return null;
        up = ratio > 1;
        mag = `${Math.round(Math.abs(ratio - 1) * 100)}%`;
      } else {
        const diff = cand - cur;
        if (Math.abs(diff) < 1e-9) return null;
        up = diff > 0;
        mag = info.format === 'pct'
          ? `${Math.round(Math.abs(diff) * 1000) / 10}%`
          : `${Math.round(Math.abs(diff) * 100) / 100}`;
      }
      return { key, up, text: `${up ? '+' : '\u2212'}${mag} ${label}` };
    }).filter((d): d is { key: string; up: boolean; text: string } => d !== null);
  };

  return (
    <div onClick={close} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div onClick={e => e.stopPropagation()} className="bg-[#111] rounded-lg border border-[#222] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
         <div className="p-4 border-b border-[#222] flex items-center justify-between">
            <h2 className="text-sm font-medium flex items-center">
               <Sparkles className="w-4 h-4 mr-2 text-[#888]" />
               Select Totem — Slot {totemPickerSlot + 1}
               {currentTotem && <span className="ml-2 text-[10px] font-normal text-[#666]">(current: {currentTotem.name})</span>}
            </h2>
            <div className="flex items-center space-x-2">
               <button
                  onClick={() => setTotemImagesOn(!totemImagesOn)}
                  title={totemImagesOn ? 'Hide card images' : 'Show card images'}
                  className={`p-1.5 rounded transition-colors ${totemImagesOn ? 'text-[#ededed] bg-[#222] hover:bg-[#2a2a2a]' : 'text-[#888] hover:text-[#ededed] bg-[#1a1a1a] hover:bg-[#222]'}`}
               >
                  <ImageIcon className="w-4 h-4" />
               </button>
               <button onClick={close} className="p-1.5 text-[#888] hover:text-[#ededed] bg-[#1a1a1a] hover:bg-[#222] rounded transition-colors">
                  <X className="w-4 h-4" />
               </button>
            </div>
         </div>
         <div className="p-3 border-b border-[#222] bg-[#0a0a0a]">
            <div className="relative">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
               <input
                  autoFocus
                  type="text"
                  placeholder="Search totems by name, lane or effect... (Enter picks the first match)"
                  value={totemSearch}
                  onChange={e => setTotemSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && firstFiltered) selectTotem(firstFiltered.key);
                  }}
                  className="w-full bg-[#111] border border-[#222] rounded-md py-2 pl-9 pr-3 text-sm text-[#ededed] focus:outline-none focus:border-[#444] transition-colors"
               />
            </div>
         </div>
         <div className="flex-1 overflow-y-auto p-4 bg-[#0a0a0a]">
            {[1, 2, 3, 4, 5, 6].map(tier => {
               const cards = totemsData
                  .filter(t => t.tier === tier && matchesSearch(t))
                  .sort((a, b) => (TOTEM_LANE_ORDER[a.lane] || 99) - (TOTEM_LANE_ORDER[b.lane] || 99));
               if (cards.length === 0) return null;
               return (
                  <div key={tier} className={tier > 1 ? 'mt-5' : ''}>
                     <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 border-b border-[#222] pb-1" style={{ color: TOTEM_TIER_COLORS[tier] }}>
                        Tier {tier} — {TOTEM_TIER_NAMES[tier]}
                     </h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                        {cards.map(t => {
                           const isSelected = (config.totemKeys || [])[totemPickerSlot] === t.key;
                           const equippedElsewhere = isEquippedElsewhere(t.key);
                           const deltas = getDeltas(t);
                           return (
                              <button
                                 key={t.key}
                                 disabled={equippedElsewhere}
                                 onClick={() => selectTotem(t.key)}
                                 className={`text-left bg-[#111] border p-2.5 rounded-md transition-colors ${totemImagesOn ? 'flex items-start space-x-2' : 'flex flex-col'} ${equippedElsewhere ? 'opacity-40 cursor-not-allowed border-[#222]' : isSelected ? 'border-[#888] bg-[#1a1a1a]' : 'border-[#222] hover:border-[#444] hover:bg-[#1a1a1a]'}`}
                              >
                                 {totemImagesOn && <TotemThumb totem={t} size={44} />}
                                 <div className="flex flex-col min-w-0 flex-1">
                                 <div className="flex items-center justify-between w-full mb-1.5">
                                    <div className="flex items-center space-x-1.5 min-w-0">
                                       <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TOTEM_TIER_COLORS[t.tier] }} />
                                       <span className="text-[11px] font-medium text-[#ededed] leading-tight truncate">{t.name}</span>
                                    </div>
                                    <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] shrink-0 ml-1">{t.lane}</span>
                                 </div>
                                 <div className="flex flex-col items-start space-y-0.5">
                                    {t.effects.map((e, i) => (
                                       <span key={i} className={`text-[9px] font-mono ${e.key && TOTEM_EFFECT_INFO[e.key]?.battle ? 'text-emerald-500/80' : 'text-[#666]'}`}>
                                          {formatTotemEffect(e)}
                                       </span>
                                    ))}
                                 </div>
                                 {deltas.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                       {deltas.map(d => (
                                          <span
                                             key={d.key}
                                             className={`text-[8px] font-mono px-1 py-px rounded border ${d.up ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-red-500/10 border-red-500/25 text-red-400'}`}
                                          >
                                             {d.text}
                                          </span>
                                       ))}
                                    </div>
                                 )}
                                 {equippedElsewhere && <span className="text-[8px] uppercase tracking-wide text-[#555] mt-1">Equipped</span>}

                                 </div>
                              </button>
                           );
                        })}
                     </div>
                  </div>
               );
            })}
            {!totemsData.some(matchesSearch) && (
               <div className="py-8 text-center text-[#666] text-sm">
                  No matching totems.
               </div>
            )}
         </div>
      </div>
    </div>
  );
};
