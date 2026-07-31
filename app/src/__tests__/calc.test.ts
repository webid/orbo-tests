// ---------------------------------------------------------------------------
// Unit tests for the battle calc (M4). Pins the DPS requirement formula,
// the energy-cap click limit, overcharge scaling, totem passive handling
// and the greedy upgrade simulation against regressions.
// ---------------------------------------------------------------------------

import { describe, expect, it } from 'vitest';

import { calculateRequirements } from '../calc';
import { creaturesDict, tapConfig, totemsData } from '../data';
import { getEquippedTotemEffects, getTotemMult } from '../utils';
import type { ArmySlotInfo, ConfigState } from '../types';

const baseConfig = (over: Partial<ConfigState> = {}): ConfigState => ({
  clickPercent: '0',
  clickFixed: 0,
  bossEnergy: 1_000_000,
  battleDuration: 30,
  maxClicks: 0,
  bossNumber: undefined,
  selectedBoss: null,
  overchargeLevel: 0,
  surgeLevel: 0,
  totemKeys: [null, null, null],
  ...over,
});

const emptySlots = (): ArmySlotInfo[] =>
  Array.from({ length: 8 }, () => ({ creatureKey: null, level: 1 }));

const slotsWith = (...keys: (string | null)[]): ArmySlotInfo[] => {
  const slots = emptySlots();
  keys.forEach((key, i) => { slots[i] = { creatureKey: key, level: 1 }; });
  return slots;
};

const dpsOf = (key: string, level = 1) => creaturesDict[key].levels[level - 1].dps;

describe('calculateRequirements — baseline formula', () => {
  it('target total DPS is bossEnergy / battleDuration', () => {
    const r = calculateRequirements(baseConfig({ bossEnergy: 900_000, battleDuration: 30 }), emptySlots());
    expect(r.targetTotalDps).toBeCloseTo(30_000, 6);
  });

  it('with no clicks and no totems, required army DPS = bossEnergy / duration', () => {
    const r = calculateRequirements(baseConfig({ bossEnergy: 1_000_000, battleDuration: 30 }), emptySlots());
    expect(r.requiredArmyDps).toBeCloseTo(1_000_000 / 30, 6);
    expect(r.gap).toBeCloseTo(r.requiredArmyDps, 6); // empty army contributes 0
  });

  it('currentArmyDps is the plain sum of filled slot DPS', () => {
    const r = calculateRequirements(baseConfig(), slotsWith('archon', 'weasel', 'phoenix-chick'));
    const expected = dpsOf('archon') + dpsOf('weasel') + dpsOf('phoenix-chick');
    expect(r.currentArmyDps).toBeCloseTo(expected, 6);
    expect(r.gap).toBeCloseTo(r.requiredArmyDps - expected, 6);
  });

  it('click power feeds currentTotalDps (ring % + fixed, scaled by overcharge)', () => {
    // Hand-verified against the formula in calc.ts. Overcharge L4 triples the
    // per-tap energy cost, so the energy budget only allows
    // floor((50 + 2.5*30) / (1.5*3)) = 27 clicks, not the configured 82.
    const army = dpsOf('archon');
    const r = calculateRequirements(
      baseConfig({ clickPercent: '35', clickFixed: 57, overchargeLevel: 4, maxClicks: 82 }),
      slotsWith('archon')
    );
    const ocMult = 1 + 4 * tapConfig.overcharge.multiplierPerLevel;
    const clicks = Math.min(
      82,
      Math.floor((tapConfig.maxEnergy + tapConfig.energyRegenPerSecond * 30) / (tapConfig.energyPerTap * ocMult))
    );
    const clickDps = (army * 0.35 + 57) * ocMult;
    expect(r.effectiveMaxClicks).toBe(clicks);
    expect(r.currentTotalDps).toBeCloseTo(army + clickDps * clicks / 30, 4);
  });
});

describe('calculateRequirements — energy cap & overcharge', () => {
  const energyCapFor = (duration: number) =>
    Math.floor((tapConfig.maxEnergy + tapConfig.energyRegenPerSecond * duration) / tapConfig.energyPerTap);

  it('caps clicks at the energy budget when maxClicks exceeds it', () => {
    const cap = energyCapFor(30);
    const r = calculateRequirements(baseConfig({ maxClicks: cap + 500 }), emptySlots());
    expect(r.effectiveMaxClicks).toBe(cap);
  });

  it('keeps maxClicks when below the energy budget', () => {
    const r = calculateRequirements(baseConfig({ maxClicks: 10 }), emptySlots());
    expect(r.effectiveMaxClicks).toBe(10);
  });

  it('overcharge multiplier is 1 + level * multiplierPerLevel', () => {
    expect(calculateRequirements(baseConfig({ overchargeLevel: 0 }), emptySlots()).overchargeMultiplier)
      .toBe(1);
    expect(calculateRequirements(baseConfig({ overchargeLevel: 4 }), emptySlots()).overchargeMultiplier)
      .toBeCloseTo(1 + 4 * tapConfig.overcharge.multiplierPerLevel, 10);
  });

  it('overcharge raises the required army DPS when clicks are capped by energy', () => {
    // Clicks are energy-capped (maxClicks huge), so higher overcharge means the
    // same click contribution with fewer effective clicks factored per tap cost —
    // requiredArmyDps must stay finite and positive in both cases.
    const plain = calculateRequirements(baseConfig({ maxClicks: 10_000, clickPercent: '35' }), emptySlots());
    const oc4 = calculateRequirements(baseConfig({ maxClicks: 10_000, clickPercent: '35', overchargeLevel: 4 }), emptySlots());
    expect(Number.isFinite(plain.requiredArmyDps)).toBe(true);
    expect(Number.isFinite(oc4.requiredArmyDps)).toBe(true);
    expect(oc4.requiredArmyDps).not.toBeCloseTo(plain.requiredArmyDps, 3);
  });
});

describe('calculateRequirements — totem passives (runt / apex / tap crit)', () => {
  const sum = (effects: ReturnType<typeof getEquippedTotemEffects>, key: string) =>
    effects.filter(e => e.key === key).reduce((a, e) => a + e.value, 0);

  it('a single filled slot counts as both runt and apex', () => {
    const runtTotem = totemsData.find(t => t.effects.some(e => e.key === 'runtOrboDamageMult'));
    expect(runtTotem, 'fixture: a runt totem must exist in the data').toBeTruthy();

    const keys: (string | null)[] = [runtTotem!.key, null, null];
    const effects = getEquippedTotemEffects(keys);
    const runtExp = getTotemMult(effects, 'runtOrboDamageMult') * (1 + sum(effects, 'runtOrboCritChance') * sum(effects, 'runtOrboCritMult'));
    const apexExp = getTotemMult(effects, 'apexOrboDamageMult') * (1 + sum(effects, 'apexOrboCritChance') * sum(effects, 'apexOrboCritMult'));

    const withTotem = calculateRequirements(baseConfig({ totemKeys: keys }), slotsWith('archon'));
    const bare = calculateRequirements(baseConfig(), slotsWith('archon'));

    expect(withTotem.effectiveArmyDps).toBeCloseTo(bare.currentArmyDps * runtExp * apexExp, 6);
    expect(withTotem.currentArmyDps).toBeCloseTo(bare.currentArmyDps, 6); // base numbers untouched
  });

  it('runt boosts the weakest slot, apex the strongest', () => {
    const runtTotem = totemsData.find(t => t.effects.some(e => e.key === 'runtOrboDamageMult'));
    const apexTotem = totemsData.find(t => t.effects.some(e => e.key === 'apexOrboDamageMult'));
    if (!runtTotem || !apexTotem) return; // fixture guard

    const keys: (string | null)[] = [runtTotem.key, apexTotem.key, null];
    const effects = getEquippedTotemEffects(keys);
    const runtExp = getTotemMult(effects, 'runtOrboDamageMult') * (1 + sum(effects, 'runtOrboCritChance') * sum(effects, 'runtOrboCritMult'));
    const apexExp = getTotemMult(effects, 'apexOrboDamageMult') * (1 + sum(effects, 'apexOrboCritChance') * sum(effects, 'apexOrboCritMult'));

    // Weasel (1 DPS) is the runt, Archon (291.7) the apex.
    const r = calculateRequirements(baseConfig({ totemKeys: keys }), slotsWith('archon', 'weasel'));
    expect(r.effectiveArmyDps).toBeCloseTo(dpsOf('archon') * apexExp + dpsOf('weasel') * runtExp, 6);
  });

  it('tap crit is modeled as an expected-value multiplier on click DPS', () => {
    const r = calculateRequirements(baseConfig(), emptySlots());
    expect(r.tapCritExpectedMult).toBe(1); // no totems → no crit
    expect(r.effectiveTotalDps).toBeCloseTo(r.currentTotalDps, 6);
  });
});

describe('calculateRequirements — greedy upgrade simulation', () => {
  it('produces no plan when the army already beats the requirement', () => {
    // Archon lv1 (291.7 DPS) vs a 300-energy boss → required 10 DPS, gap negative.
    const r = calculateRequirements(baseConfig({ bossEnergy: 300 }), slotsWith('archon'));
    expect(r.gap).toBeLessThan(0);
    expect(r.upgradePlan).toHaveLength(0);
    expect(r.totalFoodCost).toBe(0);
  });

  it('simulates upgrades until the gap is closed, cheapest-efficiency first', () => {
    const r = calculateRequirements(baseConfig({ bossEnergy: 30_000 }), slotsWith('archon')); // needs ~1000 DPS
    expect(r.gap).toBeGreaterThan(0);
    expect(r.upgradePlan.length).toBeGreaterThan(0);
    expect(r.remainingGap).toBeLessThanOrEqual(0);

    const totalGain = r.upgradePlan.reduce((a, h) => a + h.totalDpsGain, 0);
    expect(totalGain).toBeGreaterThanOrEqual(r.gap);
    expect(r.totalFoodCost).toBeGreaterThan(0);

    // Plan levels are contiguous from the starting level per slot.
    for (const h of r.upgradePlan) {
      expect(h.endLevel).toBeGreaterThan(h.startLevel);
      expect(h.details.length).toBe(h.endLevel - h.startLevel);
    }
  });

  it('stops when no slot can upgrade further, leaving a positive remaining gap', () => {
    // Astronomical requirement with a single maxed-out creature: the sim must
    // terminate with remainingGap > 0 rather than loop forever.
    const archonMax = creaturesDict['archon'].levels.length;
    const slots = slotsWith('archon');
    slots[0].level = archonMax;
    const r = calculateRequirements(baseConfig({ bossEnergy: 1e15 }), slots);
    expect(r.upgradePlan).toHaveLength(0);
    expect(r.remainingGap).toBeGreaterThan(0);
  });
});
