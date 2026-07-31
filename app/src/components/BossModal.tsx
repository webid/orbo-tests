import { Search, X, Target } from 'lucide-react';
import { bossesData } from '../data';
import { useOrboStore } from '../store';

export const BossModal = () => {
  const bossModalOpen = useOrboStore(s => s.bossModalOpen);
  const setBossModalOpen = useOrboStore(s => s.setBossModalOpen);
  const bossSearch = useOrboStore(s => s.bossSearch);
  const setBossSearch = useOrboStore(s => s.setBossSearch);
  const config = useOrboStore(s => s.config);
  const setConfig = useOrboStore(s => s.setConfig);

  if (!bossModalOpen) return null;

  const filtered = bossesData.filter(b =>
    b.biomeName.toLowerCase().includes(bossSearch.toLowerCase()) || b.floor.toString().includes(bossSearch)
  );

  return (
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
            {filtered.map(b => (
              <div key={b.bossNumber} onClick={() => {
                 setConfig({ bossEnergy: b.hp, bossNumber: b.bossNumber, battleDuration: b.timer });
                 setBossModalOpen(false);
                 setBossSearch('');
              }} className={`group cursor-pointer bg-[#111] hover:bg-[#1a1a1a] border flex flex-col items-center justify-between text-center transition-colors shadow-sm p-4 rounded-xl h-full ${config.bossNumber === b.bossNumber ? 'border-[#888]' : 'border-[#222] hover:border-[#444]'}`}>
                 <div className="w-full h-14 flex items-center justify-center shrink-0 mb-2">
                    <img src={`https://playorbo.fun/depths/map/biomes/${b.biome}.webp`} alt={b.biomeName} loading="lazy" onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} className="max-w-[85%] max-h-full object-contain drop-shadow-md" />
                 </div>
                 <div className="flex flex-col items-center w-full mt-auto">
                    <p className="font-semibold text-[11px] text-[#ededed] leading-tight mb-1">{b.biomeName}</p>
                    <p className="text-[10px] text-[#888] font-mono">Floor {b.floor}</p>
                    <p className="text-[10px] text-[#666] font-mono mt-0.5">{b.hp.toLocaleString()} HP</p>
                 </div>
              </div>
            ))}
            {filtered.length === 0 && (
               <div className="col-span-full py-8 text-center text-[#666] text-sm">
                  No matching bosses.
               </div>
            )}
         </div>
      </div>
    </div>
  );
};
