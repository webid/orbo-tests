import { X, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { luckData, TIER_COLORS } from '../data';
import { compactNum } from '../utils';
import { useOrboStore } from '../store';

// Compact upgrade-time display: "45s" / "8m" / "1h 15m" / "48h" (the game
// caps luck upgrade timers at 48h; 0 = instant/free-skip early levels).
const fmtDuration = (secs: number): ReactNode => {
  if (!secs) return <span className="text-[#444]">—</span>;
  if (secs < 60) return `${secs}s`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m`;
  if (mins >= 24 * 60) return `${Math.round(mins / 60)}h`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export const LuckTableModal = () => {
  const luckModalOpen = useOrboStore(s => s.luckModalOpen);
  const setLuckModalOpen = useOrboStore(s => s.setLuckModalOpen);
  const config = useOrboStore(s => s.config);
  const setConfig = useOrboStore(s => s.setConfig);

  if (!luckModalOpen) return null;

  return (
    <div onClick={() => setLuckModalOpen(false)} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div onClick={e => e.stopPropagation()} className="bg-[#111] rounded-lg border border-[#222] w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#222] flex items-center justify-between shrink-0">
          <h2 className="text-sm font-medium flex items-center">
            <Sparkles className="w-4 h-4 mr-2 text-[#888]" />
            Luck Table
          </h2>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-1.5 text-[10px] uppercase tracking-wider text-[#666]">
              <span>Your Lv</span>
              <input
                type="number"
                min={1}
                max={luckData.length}
                value={config.luckLevel ?? ''}
                placeholder="—"
                onChange={e => {
                  const v = e.target.value === '' ? null : Math.max(1, Math.min(luckData.length, parseInt(e.target.value) || 1));
                  setConfig({ luckLevel: v });
                }}
                className="w-14 bg-[#0a0a0a] border border-[#333] rounded px-2 py-1 text-xs font-mono text-[#ededed] focus:outline-none focus:border-[#555] transition-colors text-center"
              />
            </label>
            <button onClick={() => setLuckModalOpen(false)} className="p-1.5 text-[#888] hover:text-[#ededed] bg-[#1a1a1a] hover:bg-[#222] rounded transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 py-2.5 border-b border-[#222] bg-[#0d0d0d] shrink-0">
          <p className="text-[11px] text-[#666] leading-relaxed">
            Upgrade luck with gold to increase spawn rates for rarer creatures. <span className="text-[#444]">Cost</span> is the gold required to reach that level. <span className="text-[#444]">Cumulative</span> is the total gold spent from level 1. <span className="text-[#444]">Time</span> is how long that upgrade takes — instant through level 3, capped at 48h.
          </p>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto scrollbar-slim">
          <table className="w-full text-[11px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#111] border-b border-[#333]">
                <th className="sticky left-0 z-20 bg-[#111] text-left px-3 py-2.5 font-semibold text-[#666] uppercase tracking-wider whitespace-nowrap w-10">Lv</th>
                <th className="text-right px-3 py-2.5 font-semibold text-[#666] uppercase tracking-wider whitespace-nowrap">Cost</th>
                <th className="text-right px-3 py-2.5 font-semibold text-[#555] uppercase tracking-wider whitespace-nowrap">Cumulative</th>
                <th className="text-right px-3 py-2.5 font-semibold text-[#555] uppercase tracking-wider whitespace-nowrap" title="Time the upgrade to this level takes">Time</th>
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
                <th className="text-right pl-3 pr-6 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: TIER_COLORS.voidBorn }}>Void Born</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const allRows = luckData;
                // When a luck level is set, trim the table to currentLevel-1 → max.
                const startLevel = config.luckLevel != null ? Math.max(1, config.luckLevel - 1) : 1;
                // Pre-compute cumulative cost for levels before the visible window.
                let cumulative = 0;
                for (const row of allRows) {
                  if (row.level >= startLevel) break;
                  cumulative += row.cost;
                }
                const visibleRows = allRows.filter(row => row.level >= startLevel);
                return visibleRows.map((row, idx) => {
                  cumulative += row.cost;
                  const r = row.spawnRates;
                  const fmt = (v: number) => v === 0 ? <span className="text-[#333]">—</span> : v < 0.01 ? v.toFixed(4)+'%' : v < 0.1 ? v.toFixed(4)+'%' : v < 1 ? v.toFixed(2)+'%' : v.toFixed(1)+'%';
                  const isEven = idx % 2 === 0;
                  const isCurrentLuck = config.luckLevel != null && row.level === config.luckLevel;
                  return (
                    <tr key={row.level} className={`border-b border-[#1a1a1a] ${isCurrentLuck ? 'bg-[#1a2a1a] ring-1 ring-inset ring-[#3a5a3a]' : isEven ? 'bg-[#0a0a0a]' : 'bg-[#0d0d0d]'} hover:bg-[#141414] transition-colors`}>
                      <td className={`sticky left-0 z-[1] px-3 py-2 font-mono font-semibold ${isCurrentLuck ? 'text-[#7dde7d] bg-[#1a2a1a]' : 'text-[#ededed] ' + (isEven ? 'bg-[#0a0a0a]' : 'bg-[#0d0d0d]')} border-r border-[#222]`}>{row.level}{isCurrentLuck ? ' ◂' : ''}</td>
                      <td className="px-3 py-2 font-mono text-right text-[#888] whitespace-nowrap">
                        {row.cost === 0 ? <span className="text-[#444]">—</span> : compactNum(row.cost, 2)}
                      </td>
                      <td className="px-3 py-2 font-mono text-right text-[#555] whitespace-nowrap">{compactNum(cumulative, 2)}</td>
                      <td className="px-3 py-2 font-mono text-right text-[#555] whitespace-nowrap">{fmtDuration(row.upgradeSeconds)}</td>
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
                      <td className="pl-3 pr-6 py-2 font-mono text-right" style={{ color: TIER_COLORS.voidBorn }}>{fmt(r.voidBorn)}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
