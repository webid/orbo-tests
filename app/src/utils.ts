// ---------------------------------------------------------------------------
// Pure utility helpers (no React, no side effects)
// ---------------------------------------------------------------------------

import { TOTEM_EFFECT_INFO, totemsDict } from './data';
import type { Creature, TotemEffect } from './types';

export const loadState = <T>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

export const compactNum = (num: number | string, decimals: number = 1): string => {
  if (num === undefined || num === null || isNaN(Number(num))) return String(num);
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: decimals
  }).format(Number(num));
};

// Like compactNum but stays in K (e.g. 1,170K) rather than jumping to M.
// Useful for food costs where full-K precision is more readable.
export const compactNumK = (num: number): string => {
  if (!num || isNaN(num)) return '0';
  if (num < 1_000) return Math.round(num).toLocaleString();
  if (num < 1_000_000_000) return Math.round(num / 1_000).toLocaleString() + 'K';
  return compactNum(num, 1);
};

export const getValidFoodCost = (c: Creature, levelIdx: number): number => {
  if (!c || !c.levels || !c.levels[levelIdx]) return 0;
  let cost = c.levels[levelIdx].foodCost || 0;
  const currentStage = c.levels[levelIdx].stage;
  const nextStage = c.levels[levelIdx + 1]?.stage;
  if (currentStage && nextStage && nextStage > currentStage) {
    cost = cost * nextStage;
  }
  return cost;
};

export const getCreatureImageUrl = (c: Creature, absoluteLevel?: number): string => {
  const tierMap: Record<string, string> = {
    'common': '1-common',
    'uncommon': '2-uncommon',
    'scarce': '3-scarce',
    'rare': '4-rare',
    'esoteric': '5-esoteric',
    'mythic': '6-mythic',
    'relic': '7-relic',
    'untouched': '8-untouched',
    'phaseBound': '9-phase-bound',
    'lightSworn': '10-light-sworn',
    'voidBorn': '11-void-born'
  };
  const prefix = tierMap[c.tier] || c.tier;

  let imgName = c.image || 'base.png';
  if (absoluteLevel) {
    const stageIndex = c.levels[absoluteLevel - 1]?.stage || 1;
    if (stageIndex === 2) imgName = 'evo1.png';
    if (stageIndex === 3) imgName = 'evo2.png';
    if (stageIndex === 4) imgName = 'final.png';
  }

  return `https://orbo.shadow.club/orbos/${prefix}/${c.key}/${imgName}`;
};

// ---------------------------------------------------------------------------
// Totem helpers
// ---------------------------------------------------------------------------

export const formatTotemEffectValue = (key: string, value: number): string => {
  const fmt = TOTEM_EFFECT_INFO[key]?.format || 'flat';
  if (fmt === 'mult') return `\u00d7${Math.round(value * 100) / 100}`;
  if (fmt === 'pct') return `+${Math.round(value * 1000) / 10}%`;
  if (fmt === 'hours') return `+${value}h`;
  return `+${value}`;
};

// One display line per card effect (handles 'rush' effects, which have no key).
export const formatTotemEffect = (e: TotemEffect): string => {
  if (!e.key && e.rush) {
    const rushLabel = e.rush === 'rockCoins' ? 'rock coins' : e.rush === 'rockHp' ? 'rock HP' : e.rush;
    return `Rush: ${rushLabel} \u00d7${e.value} for ${e.rocks} rocks`;
  }
  return `${TOTEM_EFFECT_INFO[e.key!]?.label || e.key} ${formatTotemEffectValue(e.key!, e.value)}`;
};

// Keyed effects from the equipped totem cards. 'rush' effects are excluded —
// they only apply during descent runs, never in boss battles.
export const getEquippedTotemEffects = (totemKeys: (string | null)[]): TotemEffect[] =>
  (totemKeys || [])
    .filter(Boolean)
    .map(key => totemsDict[key as string])
    .filter(Boolean)
    .flatMap(t => t.effects.filter(e => e && e.key));

// Multiplicative stack: totem values are direct multipliers (1.1, 1.5, 2.0).
export const getTotemMult = (effects: TotemEffect[], effectKey: string): number =>
  effects.filter(e => e.key === effectKey).reduce((acc, e) => acc * e.value, 1);
