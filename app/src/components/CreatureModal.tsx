import { useMemo } from 'react';
import { Search, X, Users } from 'lucide-react';
import { creaturesData, TIER_COLORS, tierRank } from '../data';
import { compactNum, getCreatureImageUrl } from '../utils';
import { useOrboStore } from '../store';

export const CreatureModal = () => {
  const modalTarget = useOrboStore(s => s.modalTarget);
  const setModalTarget = useOrboStore(s => s.setModalTarget);
  const search = useOrboStore(s => s.search);
  const setSearch = useOrboStore(s => s.setSearch);
  const assignCreature = useOrboStore(s => s.assignCreature);

  const filtered = useMemo(() =>
    creaturesData.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const grouped = useMemo(() => {
    const groups: Record<string, typeof creaturesData> = {};
    filtered.forEach(c => {
      if (!groups[c.tier]) groups[c.tier] = [];
      groups[c.tier].push(c);
    });
    return groups;
  }, [filtered]);

  if (modalTarget === null) return null;

  return (
    <div onClick={() => setModalTarget(null)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div onClick={e => e.stopPropagation()} className="bg-[#111] rounded-lg border border-[#222] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-[#222] flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center">
            <Users className="w-4 h-4 mr-2 text-[#888]" />
            {modalTarget === 'all' ? 'Select Creature (Fill All)' :
             modalTarget === 'empty' ? 'Select Creature (Fill Empty)' :
             modalTarget === 'explorer_base' ? 'Select Base Creature' :
             modalTarget === 'explorer_compare' ? 'Select Comparison Creature' :
             'Select Creature'}
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
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#0a0a0a]">
          {Object.keys(grouped).sort((a, b) => (tierRank[a] || 0) - (tierRank[b] || 0)).map(tier => (
            <div key={tier}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 border-b border-[#222] pb-1" style={{ color: TIER_COLORS[tier as keyof typeof TIER_COLORS] }}>
                {tier}
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2.5">
                {grouped[tier].map(c => (
                  <button
                    key={c.key}
                    onClick={() => assignCreature(c.key)}
                    className="flex flex-col items-center justify-between text-center bg-[#111] hover:bg-[#1a1a1a] border border-[#222] hover:border-[#444] rounded-md p-3 transition-colors h-full"
                  >
                    <div className="h-10 flex items-center justify-center w-full shrink-0">
                      <img src={getCreatureImageUrl(c)} alt={c.name} loading="lazy" onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} className="max-h-full max-w-[85%] object-contain" />
                    </div>
                    <div className="flex flex-col items-center w-full mt-auto">
                      <p className="text-[10px] font-medium text-[#ededed] leading-tight">{c.name}</p>
                      <p className="text-[9px] text-[#666] font-mono mt-0.5">Max {compactNum(c.levels[c.levels.length - 1].dps)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <div className="py-8 text-center text-[#666] text-sm">
              No matching creatures.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
