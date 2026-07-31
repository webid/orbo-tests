import { useMemo } from 'react';
import { Zap, ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { tapConfig, TOTEM_EFFECT_INFO, TOTEM_TIER_COLORS, totemsDict } from '../data';
import { formatTotemEffect, formatTotemEffectValue, getEquippedTotemEffects } from '../utils';
import { useOrboStore } from '../store';
import type { CalcResults } from '../types';
import { TotemThumb } from './TotemThumb';

export const TapTotemPanel = ({ results }: { results: CalcResults }) => {
  const config = useOrboStore(s => s.config);
  const setConfig = useOrboStore(s => s.setConfig);
  const tapModsOpen = useOrboStore(s => s.tapModsOpen);
  const setTapModsOpen = useOrboStore(s => s.setTapModsOpen);
  const setTotemPickerSlot = useOrboStore(s => s.setTotemPickerSlot);

  const totemImagesOn = config.totemImagesOn !== false;

  const totemSummary = useMemo(() => {
    const equippedTotemEffects = getEquippedTotemEffects(config.totemKeys || []);
    return Object.entries(TOTEM_EFFECT_INFO)
      .map(([key, info]) => {
        const matches = equippedTotemEffects.filter(e => e.key === key);
        if (matches.length === 0) return null;
        const total = info.stack === 'mult'
          ? matches.reduce((a, e) => a * e.value, 1)
          : matches.reduce((a, e) => a + e.value, 0);
        // Skip effects at their neutral value (×1 multipliers, +0 additives).
        if (info.stack === 'mult' ? Math.abs(total - 1) < 1e-9 : Math.abs(total) < 1e-9) return null;
        return { key, label: info.label, battle: info.battle, text: formatTotemEffectValue(key, total) };
      })
      .filter((s): s is { key: string; label: string; battle: boolean; text: string } => s !== null);
  }, [config.totemKeys]);

  return (
    <div className="bg-[#111] rounded-lg border border-[#222]">
      <button onClick={() => setTapModsOpen(prev => !prev)} className="w-full p-3.5 flex items-center justify-between group">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-[#888] flex items-center">
          <Zap className="w-3.5 h-3.5 mr-2" />
          Tap &amp; Totem Bonuses
        </h2>
        <div className="flex items-center space-x-2">
          {(config.overchargeLevel > 0 || (config.surgeLevel || 0) > 0 || (config.totemKeys || []).some(Boolean)) && (
            <span className="text-[9px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-[#222] text-emerald-500/80">Active</span>
          )}
          {tapModsOpen ? <ChevronDown className="w-4 h-4 text-[#444] group-hover:text-[#888] transition-colors" /> : <ChevronRight className="w-4 h-4 text-[#444] group-hover:text-[#888] transition-colors" />}
        </div>
      </button>
      {tapModsOpen && (
        <div className="p-5 pt-1 space-y-4 border-t border-[#222]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[#666]">Overcharge Level</label>
              <div className="flex items-center space-x-3 h-[34px]">
                <input
                  type="range"
                  min={0}
                  max={tapConfig.overcharge.maxLevel}
                  step={1}
                  value={config.overchargeLevel}
                  onChange={e => setConfig({ overchargeLevel: parseInt(e.target.value) || 0 })}
                  className="flex-1 accent-[#ededed] cursor-pointer"
                />
                <span className="font-mono text-sm tracking-widest shrink-0">
                  {Array.from({ length: tapConfig.overcharge.maxLevel }).map((_, i) => (
                    <span key={i} className={i < config.overchargeLevel ? 'text-yellow-400' : 'text-[#333]'}>
                      {i < config.overchargeLevel ? '\u25cf' : '\u25cb'}
                    </span>
                  ))}
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#888]">
                {config.overchargeLevel > 0
                  ? `${results.overchargeMultiplier}\u00d7 tap dmg \u00b7 ${(tapConfig.energyPerTap * results.overchargeMultiplier).toLocaleString(undefined, { maximumFractionDigits: 2 })} energy/tap`
                  : `off \u00b7 ${tapConfig.energyPerTap} energy/tap`}
              </p>
            </div>
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[#666]">Surge Level</label>
              <div className="flex items-center space-x-3 h-[34px]">
                <input
                  type="range"
                  min={0}
                  max={tapConfig.surge.maxLevel}
                  step={1}
                  value={config.surgeLevel || 0}
                  onChange={e => setConfig({ surgeLevel: parseInt(e.target.value) || 0 })}
                  className="flex-1 accent-[#ededed] cursor-pointer"
                />
                <span className="font-mono text-sm tracking-widest shrink-0">
                  {Array.from({ length: tapConfig.surge.maxLevel }).map((_, i) => (
                    <span key={i} className={i < (config.surgeLevel || 0) ? 'text-yellow-400' : 'text-[#333]'}>
                      {i < (config.surgeLevel || 0) ? '\u25cf' : '\u25cb'}
                    </span>
                  ))}
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#888]">
                {(config.surgeLevel || 0) === 0
                  ? 'Off'
                  : (config.surgeLevel || 0) === tapConfig.surge.maxLevel
                    ? 'Full bar burst'
                    : `${tapConfig.surge.burstPercent[(config.surgeLevel || 0) - 1]}% burst`}
              </p>
            </div>
          </div>
          <div className="h-px bg-[#222]" />
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[#666]">Equipped Totems</label>
            <div className="grid grid-cols-3 gap-3">
              {(config.totemKeys || [null, null, null]).map((tKey, idx) => {
                const t = tKey ? totemsDict[tKey] : null;
                return (
                  <div key={idx} className="relative group/slot">
                    <button
                      onClick={() => setTotemPickerSlot(idx)}
                      className={`w-full h-full min-h-[72px] bg-[#1a1a1a] border border-[#333] rounded-md p-2.5 flex flex-col text-left transition-colors hover:border-[#555] ${t ? 'border-l-2' : 'border-dashed'}`}
                      style={t ? { borderLeftColor: TOTEM_TIER_COLORS[t.tier] } : undefined}
                    >
                      {t ? (
                        <>
                          <div className="flex items-center space-x-1.5 w-full pr-4">
                            {totemImagesOn && <TotemThumb totem={t} size={24} />}
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TOTEM_TIER_COLORS[t.tier] }} />
                            <span className="text-[11px] font-medium text-[#ededed] leading-tight truncate">{t.name}</span>
                          </div>
                          <span className="text-[9px] font-mono text-[#888] mt-1 leading-tight">{formatTotemEffect(t.effects[0])}</span>
                          {t.effects.length > 1 && <span className="text-[9px] font-mono text-[#666]">+{t.effects.length - 1} more</span>}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full flex-1 text-[#555]">
                          <Plus className="w-4 h-4 mb-1" />
                          <span className="text-[10px] uppercase tracking-wide text-center">Empty — Tap to pick</span>
                        </div>
                      )}
                    </button>
                    {t && (
                      <button
                        onClick={() => {
                          const keys = [...(config.totemKeys || [null, null, null])];
                          keys[idx] = null;
                          setConfig({ totemKeys: keys });
                        }}
                        className="absolute top-1 right-1 bg-black/60 backdrop-blur border border-[#333] text-[#888] rounded p-0.5 hover:text-white opacity-0 group-hover/slot:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity z-10 w-4 h-4 flex justify-center items-center"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {totemSummary.length > 0 && (
              <div className="flex flex-wrap gap-y-1 pt-1 text-[10px] font-mono">
                {totemSummary.map((s, i) => (
                  <span key={s.key} className={s.battle ? 'text-emerald-500/80' : 'text-[#555]'}>
                    {i > 0 && <span className="text-[#444] mx-1.5">·</span>}
                    {s.label} {s.text}
                    {!s.battle && <span className="text-[#444]"> (not used in calc)</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="text-[10px] font-mono text-[#666]">
            Effective clicks this battle: <span className="text-[#ededed]">{results.effectiveMaxClicks}</span>
            {results.effectiveMaxClicks < config.maxClicks && <span className="text-yellow-500/80"> (energy-limited, below your {config.maxClicks} max)</span>}
          </p>
        </div>
      )}
    </div>
  );
};
