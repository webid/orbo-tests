import { Plus, X, Search, Star, Sword, Undo2 } from 'lucide-react';
import { creaturesDict } from '../data';
import { getCreatureImageUrl } from '../utils';
import { useOrboStore } from '../store';
import { DpsBreakdown } from './DpsBreakdown';
import { LevelInput } from './LevelInput';

export const ArmyGrid = () => {
  const slots = useOrboStore(s => s.slots);
  const setModalTarget = useOrboStore(s => s.setModalTarget);
  const setExplorerBase = useOrboStore(s => s.setExplorerBase);
  const updateSlotLevel = useOrboStore(s => s.updateSlotLevel);
  const removeSlot = useOrboStore(s => s.removeSlot);
  const swapSlots = useOrboStore(s => s.swapSlots);
  const undoSlotChange = useOrboStore(s => s.undoSlotChange);
  const canUndo = useOrboStore(s => s.slotsHistory.length > 0);
  const setToast = useOrboStore(s => s.setToast);
  const draggedIndex = useOrboStore(s => s.draggedIndex);
  const setDraggedIndex = useOrboStore(s => s.setDraggedIndex);
  const highlightedSlot = useOrboStore(s => s.highlightedSlot);

  const handleUndo = () => {
    if (!canUndo) return;
    undoSlotChange();
    setToast('Undid last army change');
  };

  return (
    <div className="bg-[#111] rounded-lg border border-[#222]">
       <div className="p-3.5 border-b border-[#222] flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-[#888] flex items-center">
            <Sword className="w-3.5 h-3.5 mr-2" />
            Army Composition
          </h2>
          <div className="flex space-x-2">
             <button onClick={handleUndo} disabled={!canUndo} title="Undo last army change (assign, remove, reorder)" className="px-2.5 py-1 text-[10px] uppercase tracking-wide font-medium rounded bg-[#222] hover:bg-[#333] text-[#ededed] transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:disabled:bg-[#222] flex items-center">
                <Undo2 className="w-3 h-3 mr-1" />
                Undo
             </button>
             <button onClick={() => setModalTarget('empty')} disabled={!slots.some(s => !s.creatureKey)} className="px-2.5 py-1 text-[10px] uppercase tracking-wide font-medium rounded bg-[#222] hover:bg-[#333] text-[#ededed] transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:disabled:bg-[#222]">
                Fill Empty
             </button>
             <button onClick={() => setModalTarget('all')} className="px-2.5 py-1 text-[10px] uppercase tracking-wide font-medium rounded bg-[#ededed] hover:bg-white text-black transition-colors">
                Assign All
             </button>
          </div>
       </div>

       <div className="p-2 sm:p-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
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
                      if (isNaN(fromIdx)) return;
                      swapSlots(fromIdx, idx);
                      setDraggedIndex(null);
                   }}
                   className={`bg-[#0a0a0a] border ${highlightedSlot === idx ? 'border-[#666] drop-shadow-[0_0_6px_rgba(255,255,255,0.15)]' : 'border-[#222]'} rounded-md flex flex-col relative group overflow-hidden transition-all hover:border-[#444] ${isAssigned ? 'cursor-grab active:cursor-grabbing' : ''} ${draggedIndex === idx ? 'opacity-40 border-dashed scale-95' : ''}`}
                >
                   {/* Rarity background (empty.png for vacant slots) */}
                   <img
                      src={`https://playorbo.fun/game/spawn/rarity-bgs/${isAssigned && c ? c.tier : 'empty'}.png`}
                      className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
                      alt=""
                   />
                   {isAssigned ? (
                      <>
                         <button onClick={(e) => { e.stopPropagation(); removeSlot(idx); }} className="absolute top-1 right-1 bg-black/60 backdrop-blur border border-[#333] text-[#888] rounded p-0.5 hover:text-white opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity z-10 w-6 h-6 sm:w-4 sm:h-4 flex justify-center items-center">
                            <X className="w-3 h-3 sm:w-2.5 sm:h-2.5" />
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setExplorerBase(c!.key); }} className="absolute top-1 right-8 sm:right-6 bg-black/60 backdrop-blur border border-[#333] text-[#888] rounded p-0.5 hover:text-[#ededed] opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity z-10 w-6 h-6 sm:w-4 sm:h-4 flex justify-center items-center" title="View in Explorer">
                            <Search className="w-3 h-3 sm:w-2.5 sm:h-2.5" />
                         </button>
                         <div className="w-full aspect-square overflow-hidden relative flex items-center justify-center p-1.5 pb-4">
                            <img src={getCreatureImageUrl(c!, slot.level)} alt={c!.name} loading="lazy" className="w-full h-full object-contain" />
                            <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />

                            <button
                               onClick={cycleStage}
                               className="absolute top-1 left-1.5 flex space-x-0.5 z-10 p-1.5 sm:p-0.5 hover:bg-black/50 rounded transition-colors"
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
                         <button onClick={(e) => { e.stopPropagation(); setExplorerBase(c!.key); }} className="relative w-full p-1.5 flex flex-col border-t border-[#222] text-left hover:bg-[#1a1a1a] active:bg-[#222] transition-colors" title="View in Explorer">
                            <p className="text-[9px] font-medium truncate text-[#ededed] w-full" title={c!.name}>{c!.name}</p>
                            <p className="text-[8.5px] text-[#888] font-mono mt-0.5 truncate leading-tight">
                              {dps.toLocaleString(undefined, { maximumFractionDigits: 1 })} DPS
                            </p>
                            <span className="text-[9px] uppercase tracking-wider text-[#aaa] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mt-0.5 truncate w-full">{c!.tier.replace(/([A-Z])/g, ' $1').trim()}</span>
                         </button>
                      </>
                   ) : (
                      <>
                         <button onClick={() => setModalTarget(idx)} className="relative w-full aspect-square hover:bg-white/5 flex flex-col items-center justify-center text-[#555] transition-colors cursor-pointer">
                            <Plus className="w-4 h-4 mb-0.5" />
                         </button>
                         <div className="relative w-full p-1.5 flex flex-col border-t border-[#222]">
                            <p className="text-[9px] font-medium text-[#444] w-full truncate">Empty Unit</p>
                            <p className="text-[8.5px] text-transparent font-mono mt-0.5 leading-tight">0 DPS</p>
                         </div>
                      </>
                   )}
                </div>
             )
          })}
       </div>

       {/* DPS contribution bar (2.2) — sits below the slots so the army is
           the first thing you see in the card. */}
       <DpsBreakdown />
    </div>
  );
};
