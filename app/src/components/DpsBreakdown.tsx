import { useMemo } from 'react';
import { creaturesDict, TIER_COLORS } from '../data';
import { useOrboStore } from '../store';
import type { TierKey } from '../types';

interface Segment {
  idx: number;
  name: string;
  tier: TierKey;
  dps: number;
}

// Army DPS contribution bar: one segment per filled slot, width = % of the
// total army DPS, color = tier color. Full-width by design, so it stays
// readable on narrow screens.
export const DpsBreakdown = () => {
  const slots = useOrboStore(s => s.slots);

  const { segments, total } = useMemo(() => {
    const segments: Segment[] = [];
    let total = 0;
    slots.forEach((slot, idx) => {
      if (!slot.creatureKey) return;
      const c = creaturesDict[slot.creatureKey];
      const dps = c?.levels[slot.level - 1]?.dps || 0;
      if (!c || dps <= 0) return;
      segments.push({ idx, name: c.name, tier: c.tier, dps });
      total += dps;
    });
    return { segments, total };
  }, [slots]);

  if (total <= 0) return null;

  return (
    <div className="px-2 sm:px-3 pt-2 sm:pt-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full border border-[#222] bg-[#0a0a0a]">
        {segments.map(s => {
          const pct = (s.dps / total) * 100;
          return (
            <div
              key={s.idx}
              className="h-full transition-all duration-300 hover:opacity-75"
              style={{ width: `${pct}%`, backgroundColor: TIER_COLORS[s.tier] }}
              title={`${s.name}: ${pct.toFixed(1)}% (${s.dps.toLocaleString(undefined, { maximumFractionDigits: 1 })} DPS)`}
            />
          );
        })}
      </div>
      <p className="text-[9px] font-mono text-[#555] mt-1">DPS share per unit — hover a segment for details</p>
    </div>
  );
};
