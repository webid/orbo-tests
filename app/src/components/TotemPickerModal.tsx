import { Sparkles, X, Image as ImageIcon } from 'lucide-react';
import { TOTEM_EFFECT_INFO, TOTEM_LANE_ORDER, TOTEM_TIER_COLORS, TOTEM_TIER_NAMES, totemsData } from '../data';
import { formatTotemEffect } from '../utils';
import { useOrboStore } from '../store';
import { TotemThumb } from './TotemThumb';

export const TotemPickerModal = () => {
  const totemPickerSlot = useOrboStore(s => s.totemPickerSlot);
  const setTotemPickerSlot = useOrboStore(s => s.setTotemPickerSlot);
  const config = useOrboStore(s => s.config);
  const setConfig = useOrboStore(s => s.setConfig);
  const setTotemImagesOn = useOrboStore(s => s.setTotemImagesOn);

  const totemImagesOn = config.totemImagesOn !== false;

  if (totemPickerSlot === null) return null;

  return (
    <div onClick={() => setTotemPickerSlot(null)} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div onClick={e => e.stopPropagation()} className="bg-[#111] rounded-lg border border-[#222] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
         <div className="p-4 border-b border-[#222] flex items-center justify-between">
            <h2 className="text-sm font-medium flex items-center">
               <Sparkles className="w-4 h-4 mr-2 text-[#888]" />
               Select Totem — Slot {totemPickerSlot + 1}
            </h2>
            <div className="flex items-center space-x-2">
               <button
                  onClick={() => setTotemImagesOn(!totemImagesOn)}
                  title={totemImagesOn ? 'Hide card images' : 'Show card images'}
                  className={`p-1.5 rounded transition-colors ${totemImagesOn ? 'text-[#ededed] bg-[#222] hover:bg-[#2a2a2a]' : 'text-[#888] hover:text-[#ededed] bg-[#1a1a1a] hover:bg-[#222]'}`}
               >
                  <ImageIcon className="w-4 h-4" />
               </button>
               <button onClick={() => setTotemPickerSlot(null)} className="p-1.5 text-[#888] hover:text-[#ededed] bg-[#1a1a1a] hover:bg-[#222] rounded transition-colors">
                  <X className="w-4 h-4" />
               </button>
            </div>
         </div>
         <div className="flex-1 overflow-y-auto p-4 bg-[#0a0a0a]">
            {[1, 2, 3, 4, 5, 6].map(tier => {
               const cards = totemsData
                  .filter(t => t.tier === tier)
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
                           return (
                              <button
                                 key={t.key}
                                 onClick={() => {
                                    const keys = [...(config.totemKeys || [null, null, null])];
                                    keys[totemPickerSlot] = t.key;
                                    setConfig({ totemKeys: keys });
                                    setTotemPickerSlot(null);
                                 }}
                                 className={`text-left bg-[#111] border p-2.5 rounded-md transition-colors ${totemImagesOn ? 'flex items-start space-x-2' : 'flex flex-col'} ${isSelected ? 'border-[#888] bg-[#1a1a1a]' : 'border-[#222] hover:border-[#444] hover:bg-[#1a1a1a]'}`}
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

                                 </div>
                              </button>
                           );
                        })}
                     </div>
                  </div>
               );
            })}
         </div>
      </div>
    </div>
  );
};
