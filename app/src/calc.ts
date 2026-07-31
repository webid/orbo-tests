// ---------------------------------------------------------------------------
// Battle calculation — pure function, no React dependencies.
// Solves the DPS requirement for a boss fight and simulates the cheapest
// greedy upgrade path to close the gap.
// ---------------------------------------------------------------------------

import { creaturesDict, tapConfig } from './data';
import { getEquippedTotemEffects, getTotemMult } from './utils';
import type { ArmySlotInfo, CalcResults, ConfigState, UpgradeHistory } from './types';

// Runt/apex totem passives target single units: the runt boost hits the
// weakest filled slot, the apex boost the strongest (a lone filled slot
// counts as both; ties go to the earliest slot). Crit is probabilistic, so
// each is modeled as an expected-value multiplier:
// damageMult * (1 + critChance * critMultBonus).
export interface RuntApexBoosts {
  mults: number[];          // per-slot expected multiplier (1 = no boost)
  runtIdx: number | null;   // slot receiving the runt boost (null = none)
  apexIdx: number | null;   // slot receiving the apex boost (null = none)
}

export function getRuntApexBoosts(totemKeys: (string | null)[], slotDps: number[]): RuntApexBoosts {
  const effects = getEquippedTotemEffects(totemKeys);
  const sum = (key: string) => effects.filter(e => e.key === key).reduce((a, e) => a + e.value, 0);
  const runtExpectedMult = getTotemMult(effects, 'runtOrboDamageMult') *
    (1 + sum('runtOrboCritChance') * sum('runtOrboCritMult'));
  const apexExpectedMult = getTotemMult(effects, 'apexOrboDamageMult') *
    (1 + sum('apexOrboCritChance') * sum('apexOrboCritMult'));

  const mults = slotDps.map(() => 1);
  let runtIdx: number | null = null;
  let apexIdx: number | null = null;
  const filled = slotDps.map((dps, i) => ({ dps, i })).filter(s => s.dps > 0);
  if (filled.length > 0 && (runtExpectedMult !== 1 || apexExpectedMult !== 1)) {
    let minI = filled[0].i;
    let maxI = filled[0].i;
    for (const s of filled) {
      if (s.dps < slotDps[minI]) minI = s.i;
      if (s.dps > slotDps[maxI]) maxI = s.i;
    }
    mults[minI] *= runtExpectedMult;
    mults[maxI] *= apexExpectedMult;
    if (runtExpectedMult !== 1) runtIdx = minI;
    if (apexExpectedMult !== 1) apexIdx = maxI;
  }
  return { mults, runtIdx, apexIdx };
}

export function calculateRequirements(config: ConfigState, slots: ArmySlotInfo[]): CalcResults {
  // Base DPS per slot (0 for empty); currentArmyDps is the plain sum.
  const slotDps = slots.map(slot => {
    if (!slot.creatureKey) return 0;
    const c = creaturesDict[slot.creatureKey];
    return c?.levels[slot.level - 1]?.dps || 0;
  });
  const currentArmyDps = slotDps.reduce((total, dps) => total + dps, 0);

  const clickPctNum = (parseFloat(config.clickPercent) || 0) / 100;

  const targetTotalDps = config.bossEnergy / config.battleDuration;

  // --- Tap & totem modifiers ---
  // Overcharge: L0 = 1× (off); each level adds 0.5× to both tap damage and energy cost.
  // tapConfig.overcharge.baseMultiplier (1.5) documents the game's L1 value
  // but we model overcharge as a delta: 1 + level * 0.5 → L1=1.5, L4=3.0
  const overchargeMultiplier = 1 + (config.overchargeLevel || 0) * tapConfig.overcharge.multiplierPerLevel;
  // Aggregate effects from the 3 equipped totem cards. Multiplier effects
  // stack multiplicatively; freeTapChance stacks additively.
  const totemEffects = getEquippedTotemEffects(config.totemKeys || []);
  const orboDamageMult = getTotemMult(totemEffects, 'orboDamageMult');
  const speedMultiplier = getTotemMult(totemEffects, 'orboAttackSpeedMult');
  const energyMaxMult = getTotemMult(totemEffects, 'energyMaxMult');
  const energyRegenMult = getTotemMult(totemEffects, 'energyRegenMult');
  const freeTapChance = totemEffects.filter(e => e.key === 'freeTapChance').reduce((a, e) => a + e.value, 0);

  // Tap-crit passive (runt/apex live in getRuntApexBoosts). Crit is modeled
  // as an expected-value multiplier: 1 + critChance * critMultBonus (the
  // totem's crit-mult value is treated as the bonus damage on crit).
  const tapCritChance = totemEffects.filter(e => e.key === 'tapCritChance').reduce((a, e) => a + e.value, 0);
  const tapCritMultBonus = totemEffects.filter(e => e.key === 'tapCritMultBonus').reduce((a, e) => a + e.value, 0);
  const tapCritExpectedMult = 1 + tapCritChance * tapCritMultBonus;

  // Energy budget caps how many taps fit in a battle: starting energy pool
  // (boosted by totems) plus regen over the fight, divided by cost per tap
  // (scaled up by overcharge, discounted by free-tap chance).
  // Default: (50 + 2.5*30) / 1.5 = 83 clicks.
  const adjustedEnergyPerTap = tapConfig.energyPerTap * overchargeMultiplier * (1 - freeTapChance);
  const adjustedMaxEnergy = tapConfig.maxEnergy * energyMaxMult;
  const adjustedRegen = tapConfig.energyRegenPerSecond * energyRegenMult;
  const energyBasedMaxClicks = Math.floor((adjustedMaxEnergy + adjustedRegen * config.battleDuration) / adjustedEnergyPerTap);
  const effectiveMaxClicks = Math.min(config.maxClicks, energyBasedMaxClicks);

  // Solve for adjusted army DPS `D` (after orboDamageMult) in:
  // D * speed * duration + (D * clickPct + clickFixed) * overcharge * clicks = bossEnergy
  // clickPercent/clickFixed are the aggregate of all 8 equipped rings (from the game's Attributes screen).
  const clickScale = overchargeMultiplier * effectiveMaxClicks;
  const adjustedRequiredDps = (config.bossEnergy - config.clickFixed * clickScale) /
                              (config.battleDuration * speedMultiplier + clickPctNum * clickScale);
  // Divide back out the totem damage boost to get base army DPS (comparable to slot DPS sums).
  const requiredArmyDps = adjustedRequiredDps / orboDamageMult;

  const gap = requiredArmyDps - currentArmyDps;
  const adjustedCurrentArmyDps = currentArmyDps * orboDamageMult;
  const currentClickDps = (adjustedCurrentArmyDps * clickPctNum + config.clickFixed) * overchargeMultiplier;
  const currentTotalDps = adjustedCurrentArmyDps * speedMultiplier + (currentClickDps * effectiveMaxClicks / config.battleDuration);

  // --- Effective DPS with totem passives (runt / apex / tap crit) ---
  // Base numbers above are intentionally left untouched; these are additive.
  const { mults: slotMults } = getRuntApexBoosts(config.totemKeys || [], slotDps);
  const effectiveArmyDps = slotDps.reduce((total, dps, i) => total + dps * slotMults[i], 0);
  const effectiveAdjustedArmyDps = effectiveArmyDps * orboDamageMult;
  const effectiveClickDps = (effectiveAdjustedArmyDps * clickPctNum + config.clickFixed) * overchargeMultiplier * tapCritExpectedMult;
  const effectiveTotalDps = effectiveAdjustedArmyDps * speedMultiplier + (effectiveClickDps * effectiveMaxClicks / config.battleDuration);

  let remainingGap = gap;
  const simulatedSlots = slots.map(s => ({ ...s }));
  let totalCost = 0;

  const history: UpgradeHistory[] = [];

  let canUpgrade = true;

  while (remainingGap > 0 && canUpgrade) {
    let bestEfficiency = -1;
    let bestSlotIdx = -1;
    let bestCost = 0;
    let bestDpsGain = 0;

    for (let i = 0; i < 8; i++) {
      const slot = simulatedSlots[i];
      if (!slot.creatureKey) continue;
      const c = creaturesDict[slot.creatureKey];
      const currentData = c.levels[slot.level - 1];
      const nextData = c.levels[slot.level];

      if (!nextData) continue;

      let cost = currentData.foodCost;
      if (nextData.stage && currentData.stage && nextData.stage > currentData.stage) {
        cost = currentData.foodCost * nextData.stage;
      }

      if (cost <= 0) continue;

      const dpsGain = nextData.dps - currentData.dps;
      const efficiency = dpsGain / cost;

      if (efficiency > bestEfficiency) {
        bestEfficiency = efficiency;
        bestSlotIdx = i;
        bestCost = cost;
        bestDpsGain = dpsGain;
      }
    }

    if (bestSlotIdx === -1) {
      canUpgrade = false;
      break;
    }

    const chosenSlot = simulatedSlots[bestSlotIdx];
    const existing = history.find(h => h.slotIndex === bestSlotIdx);
    if (existing) {
      existing.endLevel = chosenSlot.level + 1;
      existing.totalCost += bestCost;
      existing.totalDpsGain += bestDpsGain;
      existing.details.push({ level: chosenSlot.level, cost: bestCost });
    } else {
      history.push({
        slotIndex: bestSlotIdx,
        creatureKey: chosenSlot.creatureKey!,
        startLevel: chosenSlot.level,
        endLevel: chosenSlot.level + 1,
        totalCost: bestCost,
        totalDpsGain: bestDpsGain,
        details: [{ level: chosenSlot.level, cost: bestCost }]
      });
    }

    chosenSlot.level += 1;
    totalCost += bestCost;
    remainingGap -= bestDpsGain;
  }

  return {
    targetTotalDps,
    requiredArmyDps,
    gap,
    remainingGap,
    currentArmyDps,
    currentTotalDps,
    effectiveArmyDps,
    effectiveTotalDps,
    tapCritExpectedMult,
    effectiveMaxClicks,
    overchargeMultiplier,
    upgradePlan: history,
    totalFoodCost: totalCost
  };
}
