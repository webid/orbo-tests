import { useMemo } from 'react';
import { Search, X, Users } from 'lucide-react';
import { creaturesData, tierRank } from '../data';
import { compactNum, getCreatureImageUrl } from '../utils';
import { useOrboStore } from '../store';
import type { Creature } from '../types';

const getCreatureMaxDps = (c: Creature) => {
  if (!c.levels || c.levels.length === 0) return 0;
  return c.levels[c.levels.length - 1].dps;
};

export const CreatureModal = () => {
  const modalTarget = useOrboStore(s => s.modalTarget);
  const setModalTarget = useOrboStore(s => s.setModalTarget);
  const search = useOrboStore(s => s.search);
  const setSearch = useOrboStore(s => s.setSearch);
  const assignCreature = useOrboStore(s => s.assignCreature);

  const filteredCreatures = useMemo(() =>
    creaturesData.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) || c.tier.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
      const tA = tierRank[a.tier] || 99;
      const tB = tierRank[b.tier] || 99;
      if (tA !== tB) return tA - tB;
      return getCreatureMaxDps(b) - getCreatureMaxDps(a);
    }),
    [search]
  );

  const groupedCreatures = useMemo(() =>
    filteredCreatures.reduce((acc, c) => {
      const lastGroup = acc[acc.length - 1];
      if (lastGroup && lastGroup.tier === c.tier) {
        lastGroup.creatures.push(c);
      } else {
        acc.push({ tier: c.tier, creatures: [c] });
      }
      return acc;
    }, [] as { tier: string, creatures: typeof creaturesData }[]),
    [filteredCreatures]
  );

  if (modalTarget === null) return null;

  return (
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
                  placeholder="Search creatures... (Enter picks the first match)"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && filteredCreatures.length > 0) assignCreature(filteredCreatures[0].key);
                  }}
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
                        <button key={c.key} onClick={() => assignCreature(c.key)} className="group relative overflow-hidden bg-[#111] hover:bg-[#1a1a1a] border border-[#222] hover:border-[#444] p-3 rounded-md flex flex-col items-center text-center transition-colors">
                           <img
                              src={`https://playorbo.fun/game/spawn/rarity-bgs/${c.tier}.png`}
                              className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
                              alt=""
                           />
                           <div className="relative z-10 w-10 h-10 mb-2 rounded bg-[#0a0a0a] overflow-hidden border border-[#222] shrink-0">
                              <img src={getCreatureImageUrl(c)} alt={c.name} loading="lazy" className="w-full h-full object-cover" />
                           </div>
                           <p className="relative z-10 font-medium text-[11px] text-[#ededed] leading-tight mb-1">{c.name}</p>
                           <span className="relative z-10 text-[10px] text-[#ccc] mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{compactNum(getCreatureMaxDps(c))} dps</span>
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
  );
};
