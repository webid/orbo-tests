import { TrendingUp, ChevronDown, Zap, Skull } from 'lucide-react';
import { creaturesDict } from '../data';
import { compactNumK, getCreatureImageUrl } from '../utils';
import { useOrboStore } from '../store';
import type { CalcResults } from '../types';

export const UpgradeSimulator = ({ results }: { results: CalcResults }) => {
  const config = useOrboStore(s => s.config);
  const expandedSteps = useOrboStore(s => s.expandedSteps);
  const toggleStep = useOrboStore(s => s.toggleStep);

  return (
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
            {results.effectiveArmyDps > results.currentArmyDps + 0.001 && (
              <p className="text-[10px] font-mono text-emerald-500/70 mt-0.5" title="Expected value incl. runt (weakest) and apex (strongest) totem passives">
                w/ passives: {results.effectiveArmyDps.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </p>
            )}
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
                                    <img src={getCreatureImageUrl(c)} alt={c.name} loading="lazy" className="w-full h-full object-cover scale-110" />
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
                                           (goal Lv {step.endLevel}, {step.details.length} upgrades)
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
  );
};
