import { useMemo } from 'react';
import { creaturesDict, TIER_COLORS } from '../data';
import { getRuntApexBoosts } from '../calc';
import { useOrboStore } from '../store';
import type { TierKey } from '../types';

interface Segment {
  idx: number;
  name: string;
  tier: TierKey;
  dps: number;            // effective DPS (base × runt/apex totem boost)
  boost: string | null;   // tooltip tag, e.g. "runt ×2" / "apex ×2"
}

// Army DPS contribution bar: one segment per filled slot, width = % of the
// total army DPS, color = tier color. Shares use effective DPS so runt/apex
// totem passives (weakest/strongest unit boosts) show in the segment sizes.
// Exact values stay hidden until a segment is hovered (desktop) or tapped
// (mobile), which lights the matching unit card and fills the readout line.
export const DpsBreakdown = () => {
  const slots = useOrboStore(s => s.slots);
  const totemKeys = useOrboStore(s => s.config.totemKeys);
  const highlightedSlot = useOrboStore(s => s.highlightedSlot);
  const setHighlightedSlot = useOrboStore(s => s.setHighlightedSlot);

  // Hover previews the link on desktop; tap toggles it on touch.
  const hoverHandlers = (idx: number) => ({
    onMouseEnter: () => setHighlightedSlot(idx),
    onMouseLeave: () => setHighlightedSlot(null),
    onClick: () => setHighlightedSlot(highlightedSlot === idx ? null : idx),
  });

  const { segments, total } = useMemo(() => {
    const baseDps = slots.map(slot => {
      if (!slot.creatureKey) return 0;
      const c = creaturesDict[slot.creatureKey];
      return c?.levels[slot.level - 1]?.dps || 0;
    });
    const { mults, runtIdx, apexIdx } = getRuntApexBoosts(totemKeys || [], baseDps);
    const segments: Segment[] = [];
    let total = 0;
    slots.forEach((slot, idx) => {
      if (!slot.creatureKey) return;
      const c = creaturesDict[slot.creatureKey];
      const base = baseDps[idx];
      if (!c || base <= 0) return;
      const dps = base * mults[idx];
      const tags = [runtIdx === idx ? 'runt' : null, apexIdx === idx ? 'apex' : null].filter(Boolean);
      const boost = tags.length
        ? `${tags.join('+')} ×${mults[idx].toLocaleString(undefined, { maximumFractionDigits: 2 })}`
        : null;
      segments.push({ idx, name: c.name, tier: c.tier, dps, boost });
      total += dps;
    });
    return { segments, total };
  }, [slots, totemKeys]);

  if (total <= 0) return null;
  const active = segments.find(s => s.idx === highlightedSlot);

  return (
    <div className="px-2 sm:px-3 pt-2 sm:pt-2.5 pb-2.5 sm:pb-3 border-t border-[#222]">
      {/* 2px gaps let the dark track show through, so same-tier neighbours
          still read as separate units. Square corners keep the widths an
          honest 1:1 map of the shares (no rounded-end foreshortening). */}
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden border border-[#222] bg-[#0a0a0a]">
        {segments.map(s => {
          const pct = (s.dps / total) * 100;
          return (
            <div
              key={s.idx}
              {...hoverHandlers(s.idx)}
              className="h-full transition-all duration-300 hover:opacity-75"
              style={{ width: `${pct}%`, backgroundColor: TIER_COLORS[s.tier] }}
              title={`${s.name}: ${pct.toFixed(1)}% (${s.dps.toLocaleString(undefined, { maximumFractionDigits: 1 })} DPS${s.boost ? ` · ${s.boost}` : ''})`}
            />
          );
        })}
      </div>
      {/* On-demand readout: exact values for the hovered/tapped segment only.
          Fixed height so nothing shifts when it appears. */}
      <div className="h-4 mt-1.5 flex items-center">
        {active && (
          <span className="flex items-center text-[9px] font-mono text-[#888]">
            <span className="w-2 h-2 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: TIER_COLORS[active.tier] }} />
            {active.name}
            <span className="text-[#ededed] ml-1">{((active.dps / total) * 100).toFixed(1)}%</span>
            <span className="text-[#555] ml-1">
              ({active.dps.toLocaleString(undefined, { maximumFractionDigits: 1 })} DPS{active.boost ? ` · ${active.boost}` : ''})
            </span>
          </span>
        )}
      </div>
    </div>
  );
};
