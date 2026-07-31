// ---------------------------------------------------------------------------
// Static game data imports + derived lookup structures and display constants
// ---------------------------------------------------------------------------

import type { Boss, Creature, LuckRow, TapConfig, TierKey, Totem } from './types';

import creaturesJson from './orbo-creatures.json';
import bossesJson from './orbo-bosses.json';
import luckJson from './orbo-luck.json';
import tapConfigJson from './orbo-tap-config.json';
import totemsJson from './orbo-totems.json';

export const creaturesData = creaturesJson as Creature[];
export const bossesData = bossesJson as Boss[];
export const luckData = luckJson as LuckRow[];
export const tapConfig = tapConfigJson as TapConfig;
export const totemsData = totemsJson as Totem[];

export const creaturesDict: Record<string, Creature> = Object.fromEntries(
  creaturesData.map(c => [c.key, c])
);

export const totemsDict: Record<string, Totem> = Object.fromEntries(
  totemsData.map(t => [t.key, t])
);

// ---------------------------------------------------------------------------
// Display constants
// ---------------------------------------------------------------------------

export const TIER_COLORS: Record<TierKey, string> = {
  common:     '#9ca3af',
  uncommon:   '#22c55e',
  scarce:     '#3b82f6',
  rare:       '#a855f7',
  esoteric:   '#f97316',
  mythic:     '#ef4444',
  relic:      '#eab308',
  untouched:  '#06b6d4',
  phaseBound: '#8b5cf6',
  lightSworn: '#fbbf24',
  voidBorn:   '#6b7280',
};

export const TOTEM_TIER_COLORS: Record<number, string> = {
  1: '#888',
  2: '#6b9',
  3: '#69f',
  4: '#c6f',
  5: '#fa5',
  6: '#ff5',
};

export const TOTEM_TIER_NAMES: Record<number, string> = {
  1: 'Weak',
  2: 'Lesser',
  3: 'Rare',
  4: 'Mighty',
  5: 'Legendary',
  6: 'Holy',
};

// Lane display order inside each tier of the totem picker.
export const TOTEM_LANE_ORDER: Record<string, number> = {
  power: 1,
  energy: 2,
  tap: 3,
  economy: 4,
  idle: 5,
  descent: 6,
  orb: 7,
};

// Effect metadata: label, whether the battle calc consumes it, how duplicates
// stack ('mult' = multiply multipliers, 'add' = sum values) and display format.
export const TOTEM_EFFECT_INFO: Record<string, { label: string; battle: boolean; stack: 'mult' | 'add'; format: 'mult' | 'pct' | 'flat' | 'hours' }> = {
  orboDamageMult:        { label: 'Orbo Damage',        battle: true,  stack: 'mult', format: 'mult' },
  orboAttackSpeedMult:   { label: 'Attack Speed',       battle: true,  stack: 'mult', format: 'mult' },
  energyMaxMult:         { label: 'Energy Max',         battle: true,  stack: 'mult', format: 'mult' },
  energyRegenMult:       { label: 'Energy Regen',       battle: true,  stack: 'mult', format: 'mult' },
  freeTapChance:         { label: 'Free Tap Chance',    battle: true,  stack: 'add',  format: 'pct' },
  tapCritChance:         { label: 'Tap Crit Chance',    battle: false, stack: 'add',  format: 'pct' },
  tapCritMultBonus:      { label: 'Tap Crit Mult',      battle: false, stack: 'add',  format: 'flat' },
  apexOrboDamageMult:    { label: 'Apex Orbo Damage',   battle: false, stack: 'mult', format: 'mult' },
  apexOrboCritChance:    { label: 'Apex Crit Chance',   battle: false, stack: 'add',  format: 'pct' },
  apexOrboCritMult:      { label: 'Apex Crit Mult',     battle: false, stack: 'add',  format: 'flat' },
  runtOrboDamageMult:    { label: 'Runt Orbo Damage',   battle: false, stack: 'mult', format: 'mult' },
  runtOrboCritChance:    { label: 'Runt Crit Chance',   battle: false, stack: 'add',  format: 'pct' },
  runtOrboCritMult:      { label: 'Runt Crit Mult',     battle: false, stack: 'add',  format: 'flat' },
  rockCoinsMult:         { label: 'Rock Coins',         battle: false, stack: 'mult', format: 'mult' },
  rockHpMult:            { label: 'Rock HP',            battle: false, stack: 'mult', format: 'mult' },
  rockJackpotChance:     { label: 'Rock Jackpot',       battle: false, stack: 'add',  format: 'pct' },
  energyPerRockBreak:    { label: 'Energy / Rock Break', battle: false, stack: 'add', format: 'flat' },
  idleCoinsMult:         { label: 'Idle Coins',         battle: false, stack: 'mult', format: 'mult' },
  idleCapHoursBonus:     { label: 'Idle Cap',           battle: false, stack: 'add',  format: 'hours' },
  descendOrbsBonus:      { label: 'Descend Orbs',       battle: false, stack: 'add',  format: 'flat' },
  descendCoinFlipPayout: { label: 'Coin Flip Payout',   battle: false, stack: 'add',  format: 'pct' },
  doubleDescendChance:   { label: 'Double Descend',     battle: false, stack: 'add',  format: 'pct' },
};

// Sort order for creature tiers in the picker.
export const tierRank: Record<string, number> = {
  'common': 1,
  'uncommon': 2,
  'scarce': 3,
  'rare': 4,
  'esoteric': 5,
  'mythic': 6,
  'relic': 7,
  'untouched': 8,
  'phaseBound': 9,
  'lightSworn': 10,
  'voidBorn': 11
};
