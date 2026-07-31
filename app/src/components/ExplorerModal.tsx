import { X, Search, Plus, TrendingUp, Star } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { creaturesDict } from '../data';
import { compactNum, getCreatureImageUrl, getValidFoodCost } from '../utils';
import { useOrboStore } from '../store';

export const ExplorerModal = () => {
  const explorerBase = useOrboStore(s => s.explorerBase);
  const explorerCompare = useOrboStore(s => s.explorerCompare);
  const setExplorerBase = useOrboStore(s => s.setExplorerBase);
  const setExplorerCompare = useOrboStore(s => s.setExplorerCompare);
  const setModalTarget = useOrboStore(s => s.setModalTarget);
  const slots = useOrboStore(s => s.slots);

  if (!explorerBase) return null;

  return (
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
            <div className="relative overflow-hidden rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-4">
               <img
                  src={`https://playorbo.fun/game/spawn/rarity-bgs/${creaturesDict[explorerBase].tier}.png`}
                  className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
                  alt=""
               />
               <div className="relative z-10 flex items-center space-x-4">
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

               <div className="relative z-10 flex items-center space-x-4 justify-end sm:justify-auto pt-4 border-t border-[#222] sm:border-0 sm:pt-0">
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
                            const compSurpassIdx = cC.levels.findIndex(l => l.dps > baseMax);
                            const baseSurpassIdx = bC.levels.findIndex(l => l.dps > compMax);

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

                                  const surpassIdx = evalC.levels.findIndex(l => l.dps > currentDps);
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
                           bC.levels.forEach((lvl, idx) => {
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
  );
};
