// ---------------------------------------------------------------------------
// Shared type definitions for the Orbo Command Center
// ---------------------------------------------------------------------------

export type TierKey =
  | 'common' | 'uncommon' | 'scarce' | 'rare' | 'esoteric'
  | 'mythic' | 'relic' | 'untouched' | 'phaseBound' | 'lightSworn' | 'voidBorn';

export interface CreatureLevel {
  dps: number;
  foodCost: number;
  stage?: number;
}

export interface Creature {
  key: string;
  name: string;
  tier: TierKey;
  aspect?: string;
  image?: string;
  levels: CreatureLevel[];
}

export interface Boss {
  bossNumber: number;
  floor: number;
  biome: string;
  biomeName: string;
  hp: number;
  minDps: number;
  timer: number;
  gold: number;
  rocks: number;
}

export interface TotemEffect {
  key?: string;
  value: number;
  // Rush effects (descent-only) carry extra fields instead of a key.
  rush?: string;
  rocks?: number;
}

export interface Totem {
  key: string;
  name: string;
  tier: number;
  lane: string;
  effects: TotemEffect[];
}

export interface LuckRow {
  level: number;
  cost: number;
  spawnRates: Record<TierKey, number>;
}

export interface TapConfig {
  energyPerTap: number;
  maxEnergy: number;
  energyRegenPerSecond: number;
  overcharge: {
    maxLevel: number;
    baseMultiplier: number;
    multiplierPerLevel: number;
  };
  surge: {
    maxLevel: number;
    burstPercent: number[];
  };
}

export interface Ring {
  key: string;
  name: string;
  flatDamage: number;
  orboDpsMultiplier: number;
}

// ---------------------------------------------------------------------------
// App state types
// ---------------------------------------------------------------------------

export interface ConfigState {
  clickPercent: string;
  clickFixed: number;
  bossEnergy: number;
  battleDuration: number;
  maxClicks: number;
  bossNumber?: number;
  selectedBoss: string | null;
  overchargeLevel: number;
  surgeLevel: number;
  totemKeys: (string | null)[];
  luckLevel?: number | null;
  totemImagesOn?: boolean;
  // Legacy manual % fields (pre-totem-picker); kept only for old save/import compat.
  orboDamagePct?: number;
  attackSpeedPct?: number;
  energyMaxPct?: number;
}

export interface ArmySlotInfo {
  creatureKey: string | null;
  level: number;
}

export type ModalTarget = 'all' | 'empty' | number | 'explorer_base' | 'explorer_compare' | null;

export interface UpgradeHistory {
  slotIndex: number;
  creatureKey: string;
  startLevel: number;
  endLevel: number;
  totalCost: number;
  totalDpsGain: number;
  details: { level: number; cost: number }[];
}

export interface CalcResults {
  targetTotalDps: number;
  requiredArmyDps: number;
  gap: number;
  remainingGap: number;
  currentArmyDps: number;
  currentTotalDps: number;
  // Expected-value numbers including runt/apex/tap-crit totem passives.
  // Base numbers above stay unchanged so existing displays keep their meaning.
  effectiveArmyDps: number;
  effectiveTotalDps: number;
  tapCritExpectedMult: number;
  effectiveMaxClicks: number;
  overchargeMultiplier: number;
  upgradePlan: UpgradeHistory[];
  totalFoodCost: number;
}
