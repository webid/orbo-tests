// ---------------------------------------------------------------------------
// Export/import + share-link encode/decode round-trip tests (M4).
// Mirrors the exact encode path in SyncModal.exportData and the decode path
// in SyncModal.handleImport / App's #build= handler.
// ---------------------------------------------------------------------------

import { describe, expect, it } from 'vitest';

import { bossesData } from '../data';

// SyncModal.exportData (minus store access): btoa(encodeURIComponent(JSON)).
const encode = (payload: unknown): string =>
  btoa(encodeURIComponent(JSON.stringify(payload)));

// Shared decode path (SyncModal.handleImport + App share-link handler):
// atob, then optional decodeURIComponent with a legacy fallback.
const decode = (code: string): any => {
  let s = atob(code.trim().replace(/\s/g, ''));
  try {
    s = decodeURIComponent(s);
  } catch {
    // Legacy codes were not URI-encoded.
  }
  return JSON.parse(s);
};

const samplePayload = () => ({
  config: {
    clickPercent: '35',
    clickFixed: 57,
    bossEnergy: bossesData[25].hp,
    battleDuration: bossesData[25].timer,
    maxClicks: 82,
    bossNumber: bossesData[25].bossNumber,
    selectedBoss: null,
    overchargeLevel: 4,
    surgeLevel: 0,
    totemKeys: ['runt-strike-1', null, null],
    luckLevel: null,
    totemImagesOn: true,
  },
  slots: [
    { creatureKey: 'archon', level: 12 },
    { creatureKey: 'weasel', level: 40 },
    { creatureKey: null, level: 1 },
  ],
});

describe('save-code round trip', () => {
  it('encode → decode returns a deep-equal payload', () => {
    const payload = samplePayload();
    expect(decode(encode(payload))).toEqual(payload);
  });

  it('survives whitespace inside the code (paste with line breaks)', () => {
    const payload = samplePayload();
    const code = encode(payload);
    const messy = code.slice(0, 10) + '\n  ' + code.slice(10, 20) + ' ' + code.slice(20);
    expect(decode(messy)).toEqual(payload);
  });

  it('decodes legacy non-URI-encoded codes', () => {
    const legacy = { config: { bossNumber: 3 }, slots: [{ creatureKey: 'weasel', level: 1 }] };
    const legacyCode = btoa(JSON.stringify(legacy)); // old format: no encodeURIComponent
    expect(decode(legacyCode)).toEqual(legacy);
  });

  it('decodes legacy codes containing % characters via the fallback', () => {
    // decodeURIComponent throws on stray %; the catch path must use the raw string.
    const legacy = { note: '50% boost', slots: [] };
    const legacyCode = btoa(JSON.stringify(legacy));
    expect(decode(legacyCode)).toEqual(legacy);
  });

  it('throws on malformed codes (caller shows the parse-failure alert)', () => {
    expect(() => decode('!!!not-base64!!!')).toThrow();
    expect(() => decode(btoa('not json at all'))).toThrow();
  });
});

describe('shareable build links', () => {
  it('uses the same encoding as the export code after #build=', () => {
    const payload = samplePayload();
    const url = `https://example.com/orbo/#build=${encode(payload)}`;
    const code = url.slice(url.indexOf('#build=') + '#build='.length);
    const decoded = decode(code);
    expect(decoded.config.bossNumber).toBe(payload.config.bossNumber);
    expect(decoded.slots.filter((s: any) => s && s.creatureKey)).toHaveLength(2);
  });
});
