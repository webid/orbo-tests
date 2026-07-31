// ---------------------------------------------------------------------------
// normalizeConfig tests (M4): boss resolution from floor number, recovery of
// bossNumber from legacy bossEnergy saves, legacy field migration/backfill.
// ---------------------------------------------------------------------------

import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../store';
import { bossesData } from '../data';

describe('normalizeConfig — defaults & boss resolution', () => {
  it('returns full defaults for empty saves', () => {
    const cfg = normalizeConfig(null);
    expect(cfg.totemKeys).toEqual([null, null, null]);
    expect(cfg.overchargeLevel).toBe(0);
    expect(cfg.surgeLevel).toBe(0);
    expect(cfg.luckLevel).toBeNull();
    expect(cfg.totemImagesOn).toBe(true);
  });

  it('syncs bossEnergy/battleDuration from bossesData for a known bossNumber', () => {
    const boss = bossesData.find(b => b.bossNumber === 26)!;
    const cfg = normalizeConfig({ bossNumber: 26, bossEnergy: 123, battleDuration: 999 });
    expect(cfg.bossEnergy).toBe(boss.hp);
    expect(cfg.battleDuration).toBe(boss.timer);
  });

  it('recovers bossNumber from bossEnergy for very old saves', () => {
    // Old saves carry no bossNumber; the merge default must be nulled out for
    // the energy-based recovery path to run.
    const boss = bossesData[5];
    const cfg = normalizeConfig({ bossNumber: null, bossEnergy: boss.hp });
    expect(cfg.bossNumber).toBe(boss.bossNumber);
  });

  it('leaves custom (non-matching) bossEnergy untouched', () => {
    const cfg = normalizeConfig({ bossNumber: null, bossEnergy: 42424242 });
    expect(cfg.bossEnergy).toBe(42424242);
    expect(cfg.bossNumber).toBeNull();
  });
});

describe('normalizeConfig — legacy migration & backfill', () => {
  it('converts legacy 0-1 clickPercent numbers to percent strings', () => {
    expect(normalizeConfig({ clickPercent: 0.35 }).clickPercent).toBe('35');
  });

  it('converts legacy whole-number clickPercent to strings', () => {
    expect(normalizeConfig({ clickPercent: 35 }).clickPercent).toBe('35');
  });

  it('keeps modern string clickPercent as-is', () => {
    expect(normalizeConfig({ clickPercent: '42' }).clickPercent).toBe('42');
  });

  it('replaces malformed totemKeys with three empty slots', () => {
    expect(normalizeConfig({ totemKeys: ['only-one'] }).totemKeys).toEqual([null, null, null]);
    expect(normalizeConfig({ totemKeys: 'nope' }).totemKeys).toEqual([null, null, null]);
    expect(normalizeConfig({ totemKeys: ['a', 'b', 'c'] }).totemKeys).toEqual(['a', 'b', 'c']);
  });

  it('strips legacy manual % fields', () => {
    const cfg = normalizeConfig({ orboDamagePct: 10, attackSpeedPct: 5, energyMaxPct: 20 });
    expect('orboDamagePct' in cfg).toBe(false);
    expect('attackSpeedPct' in cfg).toBe(false);
    expect('energyMaxPct' in cfg).toBe(false);
  });

  it('respects an explicit totemImagesOn=false', () => {
    expect(normalizeConfig({ totemImagesOn: false }).totemImagesOn).toBe(false);
  });
});
