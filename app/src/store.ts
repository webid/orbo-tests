// ---------------------------------------------------------------------------
// Zustand store — single source of truth for config, army slots and UI state.
//
// Persistence strategy: a custom storage adapter that keeps the SAME
// localStorage keys and JSON shapes as the original app (`orbo_config` and
// `orbo_army`). This means:
//   - Existing users' saved state is picked up with zero migration.
//   - Rolling back to a previous build still finds valid data.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { bossesData, creaturesDict } from './data';
import type { ArmySlotInfo, ConfigState, ModalTarget, Preset } from './types';

// ---------------------------------------------------------------------------
// Config normalization (applied on every load, mirrors the old initializer)
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: ConfigState = {
  clickPercent: "35",
  clickFixed: 57,
  bossEnergy: 2550000,
  battleDuration: 30,
  maxClicks: 82,
  bossNumber: 11,
  selectedBoss: null,
  overchargeLevel: 0,
  surgeLevel: 0,
  totemKeys: [null, null, null],
  luckLevel: null,
  totemImagesOn: true
};

const DEFAULT_SLOTS: ArmySlotInfo[] = Array(8).fill({ creatureKey: null, level: 1 });

// Maximum number of named presets (M3).
export const MAX_PRESETS = 5;

// Maximum army snapshots kept for the Undo button (transient, not persisted).
const MAX_UNDO = 20;

export function normalizeConfig(saved: any): ConfigState {
  if (!saved) return { ...DEFAULT_CONFIG };
  const cfg = { ...DEFAULT_CONFIG, ...saved };

  // Legacy: clickPercent stored as a 0-1 number → convert to "35" style string.
  if (typeof cfg.clickPercent === 'number' && cfg.clickPercent <= 1) {
    cfg.clickPercent = (cfg.clickPercent * 100).toString();
  } else if (typeof cfg.clickPercent === 'number') {
    cfg.clickPercent = cfg.clickPercent.toString();
  }

  // Sync bossEnergy/battleDuration from the current bossesData so stale
  // saved values are overwritten whenever HP values are updated.
  if (cfg.bossNumber != null) {
    const match = bossesData.find(b => b.bossNumber === cfg.bossNumber);
    if (match) {
      cfg.bossEnergy = match.hp;
      cfg.battleDuration = match.timer;
    }
  } else {
    // Recover bossNumber from bossEnergy for very old saves.
    const match = bossesData.find(b => b.hp === cfg.bossEnergy);
    if (match) cfg.bossNumber = match.bossNumber;
  }

  // Backfill fields for configs saved before they existed.
  cfg.overchargeLevel = cfg.overchargeLevel ?? 0;
  cfg.surgeLevel = cfg.surgeLevel ?? 0;
  cfg.totemKeys = Array.isArray(cfg.totemKeys) && cfg.totemKeys.length === 3
    ? cfg.totemKeys
    : [null, null, null];
  cfg.luckLevel = cfg.luckLevel ?? null;
  cfg.totemImagesOn = cfg.totemImagesOn !== false;

  // Strip legacy manual % fields (pre-totem-picker).
  delete cfg.orboDamagePct;
  delete cfg.attackSpeedPct;
  delete cfg.energyMaxPct;

  return cfg;
}

// ---------------------------------------------------------------------------
// Custom storage: split state across the two legacy localStorage keys
// ---------------------------------------------------------------------------

const legacyStorage: StateStorage = {
  getItem: () => {
    try {
      const config = localStorage.getItem('orbo_config');
      const slots = localStorage.getItem('orbo_army');
      const presets = localStorage.getItem('orbo_presets');
      if (!config && !slots && !presets) return null;
      return JSON.stringify({
        state: {
          config: config ? JSON.parse(config) : null,
          slots: slots ? JSON.parse(slots) : null,
          presets: presets ? JSON.parse(presets) : [],
        },
        version: 0,
      });
    } catch {
      return null;
    }
  },
  setItem: (_name, value) => {
    try {
      const parsed = JSON.parse(value);
      if (parsed.state?.config) localStorage.setItem('orbo_config', JSON.stringify(parsed.state.config));
      if (parsed.state?.slots) localStorage.setItem('orbo_army', JSON.stringify(parsed.state.slots));
      if (Array.isArray(parsed.state?.presets)) localStorage.setItem('orbo_presets', JSON.stringify(parsed.state.presets));
    } catch { /* non-fatal */ }
  },
  removeItem: () => {
    localStorage.removeItem('orbo_config');
    localStorage.removeItem('orbo_army');
    localStorage.removeItem('orbo_presets');
  },
};

// ---------------------------------------------------------------------------
// Store definition
// ---------------------------------------------------------------------------

export interface OrboStore {
  // Persisted state
  config: ConfigState;
  slots: ArmySlotInfo[];

  // Transient UI state
  modalTarget: ModalTarget;
  bossModalOpen: boolean;
  bossSearch: string;
  syncModalOpen: boolean;
  syncInput: string;
  copied: boolean;
  search: string;
  updateAvailable: boolean;
  expandedSteps: Record<number, boolean>;
  draggedIndex: number | null;
  highlightedSlot: number | null;
  slotsHistory: ArmySlotInfo[][];
  slotsRedo: ArmySlotInfo[][];
  luckModalOpen: boolean;
  helpModalOpen: boolean;
  tapModsOpen: boolean;
  totemPickerSlot: number | null;
  totemSearch: string;
  explorerBase: string | null;
  explorerCompare: string | null;
  toast: string | null;
  presets: Preset[];

  // Config actions
  setConfig: (partial: Partial<ConfigState>) => void;
  setTotemImagesOn: (on: boolean) => void;
  cycleBoss: (dir: -1 | 1) => void;

  // Slot actions
  setSlots: (slots: ArmySlotInfo[]) => void;
  updateSlotLevel: (index: number, newLevel: number) => void;
  removeSlot: (index: number) => void;
  assignCreature: (creatureKey: string) => void;
  swapSlots: (from: number, to: number) => void;
  undoSlotChange: () => void;
  redoSlotChange: () => void;

  // UI actions
  setModalTarget: (t: ModalTarget) => void;
  setBossModalOpen: (open: boolean) => void;
  setBossSearch: (s: string) => void;
  setSyncModalOpen: (open: boolean) => void;
  setSyncInput: (s: string) => void;
  setCopied: (v: boolean) => void;
  setSearch: (s: string) => void;
  setUpdateAvailable: (v: boolean) => void;
  toggleStep: (idx: number) => void;
  setDraggedIndex: (i: number | null) => void;
  setHighlightedSlot: (i: number | null) => void;
  setLuckModalOpen: (open: boolean) => void;
  setHelpModalOpen: (open: boolean) => void;
  setTapModsOpen: (fn: boolean | ((prev: boolean) => boolean)) => void;
  setTotemPickerSlot: (slot: number | null) => void;
  setTotemSearch: (s: string) => void;
  setExplorerBase: (key: string | null) => void;
  setExplorerCompare: (key: string | null) => void;
  setToast: (msg: string | null) => void;
  closeAllModals: () => void;

  // Preset actions (M3)
  savePreset: (name: string) => string | null;
  updatePreset: (id: string) => boolean;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
}

// Snapshot the current army for the Undo button, capped at MAX_UNDO.
const pushSlotsHistory = (state: Pick<OrboStore, 'slots' | 'slotsHistory'>): ArmySlotInfo[][] =>
  [...state.slotsHistory, state.slots.map(s => ({ ...s }))].slice(-MAX_UNDO);

export const useOrboStore = create<OrboStore>()(
  persist(
    (set, get) => ({
      // --- Persisted ---
      config: { ...DEFAULT_CONFIG },
      slots: DEFAULT_SLOTS.map(s => ({ ...s })),

      // --- Transient UI ---
      modalTarget: null,
      bossModalOpen: false,
      bossSearch: '',
      syncModalOpen: false,
      syncInput: '',
      copied: false,
      search: '',
      updateAvailable: false,
      expandedSteps: {},
      draggedIndex: null,
      highlightedSlot: null,
      slotsHistory: [],
      slotsRedo: [],
      luckModalOpen: false,
      helpModalOpen: false,
      tapModsOpen: false,
      totemPickerSlot: null,
      totemSearch: '',
      explorerBase: null,
      explorerCompare: null,
      toast: null,
      presets: [],

      // --- Config actions ---
      setConfig: (partial) => set(state => ({ config: { ...state.config, ...partial } })),
      setTotemImagesOn: (on) => set(state => ({ config: { ...state.config, totemImagesOn: on } })),

      // Prev/next boss navigation with wrap-around (boss 1 <-> last boss).
      // Syncs bossEnergy/battleDuration exactly like picking from the modal.
      cycleBoss: (dir) => set(state => {
        const sorted = [...bossesData].sort((a, b) => a.bossNumber - b.bossNumber);
        if (sorted.length === 0) return state;
        const idx = sorted.findIndex(b => b.bossNumber === state.config.bossNumber);
        // Custom/unknown boss: next starts at the first, prev at the last.
        const nextIdx = idx === -1
          ? (dir === 1 ? 0 : sorted.length - 1)
          : (idx + dir + sorted.length) % sorted.length;
        const b = sorted[nextIdx];
        return {
          config: {
            ...state.config,
            bossNumber: b.bossNumber,
            bossEnergy: b.hp,
            battleDuration: b.timer,
          },
        };
      }),

      // --- Slot actions ---
      setSlots: (slots) => set({ slots }),

      updateSlotLevel: (index, newLevel) => set(state => {
        const cKey = state.slots[index]?.creatureKey;
        if (!cKey) return state;
        const maxLevel = creaturesDict[cKey]?.levels.length ?? 1;
        const clamped = Math.max(1, Math.min(newLevel, maxLevel));
        const slots = state.slots.map((s, i) => i === index ? { ...s, level: clamped } : s);
        return { slots };
      }),

      removeSlot: (index) => set(state => ({
        slots: state.slots.map((s, i) => i === index ? { creatureKey: null, level: 1 } : s),
        slotsHistory: pushSlotsHistory(state),
        slotsRedo: [],
      })),

      assignCreature: (creatureKey) => {
        const { modalTarget } = get();
        if (modalTarget === 'explorer_base') {
          set({ explorerBase: creatureKey, modalTarget: null, search: '' });
          return;
        }
        if (modalTarget === 'explorer_compare') {
          set({ explorerCompare: creatureKey, modalTarget: null, search: '' });
          return;
        }
        set(state => {
          const slots = state.slots.map(s => ({ ...s }));
          if (modalTarget === 'all') {
            for (let i = 0; i < 8; i++) slots[i] = { creatureKey, level: 1 };
          } else if (modalTarget === 'empty') {
            for (let i = 0; i < 8; i++) {
              if (!slots[i].creatureKey) slots[i] = { creatureKey, level: 1 };
            }
          } else if (typeof modalTarget === 'number') {
            slots[modalTarget] = { creatureKey, level: 1 };
          }
          return { slots, slotsHistory: pushSlotsHistory(state), slotsRedo: [], modalTarget: null, search: '' };
        });
      },

      swapSlots: (from, to) => set(state => {
        if (from === to || from < 0 || to < 0 || from >= 8 || to >= 8) return state;
        const slots = [...state.slots];
        const temp = slots[to];
        slots[to] = slots[from];
        slots[from] = temp;
        return { slots, slotsHistory: pushSlotsHistory(state), slotsRedo: [] };
      }),

      // Restores the most recent army snapshot (assign / remove / reorder).
      // Level tweaks are intentionally not tracked — cheap to redo by hand.
      undoSlotChange: () => set(state => {
        if (state.slotsHistory.length === 0) return state;
        const slotsHistory = [...state.slotsHistory];
        const previous = slotsHistory.pop()!;
        return {
          slots: previous,
          slotsHistory,
          slotsRedo: [...state.slotsRedo, state.slots.map(s => ({ ...s }))].slice(-MAX_UNDO),
        };
      }),
      
      // Re-applies the most recently undone army change.
      redoSlotChange: () => set(state => {
        if (state.slotsRedo.length === 0) return state;
        const slotsRedo = [...state.slotsRedo];
        const next = slotsRedo.pop()!;
        return {
          slots: next,
          slotsRedo,
          slotsHistory: [...state.slotsHistory, state.slots.map(s => ({ ...s }))].slice(-MAX_UNDO),
        };
      }),

      // --- UI actions ---
      setModalTarget: (t) => set({ modalTarget: t }),
      setBossModalOpen: (open) => set({ bossModalOpen: open }),
      setBossSearch: (s) => set({ bossSearch: s }),
      setSyncModalOpen: (open) => set({ syncModalOpen: open }),
      setSyncInput: (s) => set({ syncInput: s }),
      setCopied: (v) => set({ copied: v }),
      setSearch: (s) => set({ search: s }),
      setUpdateAvailable: (v) => set({ updateAvailable: v }),
      toggleStep: (idx) => set(state => ({
        expandedSteps: { ...state.expandedSteps, [idx]: !state.expandedSteps[idx] }
      })),
      setDraggedIndex: (i) => set({ draggedIndex: i }),
      setHighlightedSlot: (i) => set({ highlightedSlot: i }),
      setLuckModalOpen: (open) => set({ luckModalOpen: open }),
      setHelpModalOpen: (open) => set({ helpModalOpen: open }),
      setTapModsOpen: (fn) => set(state => ({
        tapModsOpen: typeof fn === 'function' ? fn(state.tapModsOpen) : fn
      })),
      setTotemPickerSlot: (slot) => set({ totemPickerSlot: slot }),
      setTotemSearch: (s) => set({ totemSearch: s }),
      setExplorerBase: (key) => set({ explorerBase: key }),
      setExplorerCompare: (key) => set({ explorerCompare: key }),
      setToast: (msg) => set({ toast: msg }),
      closeAllModals: () => set({
        bossModalOpen: false,
        modalTarget: null,
        syncModalOpen: false,
        luckModalOpen: false,
        helpModalOpen: false,
        totemPickerSlot: null,
        totemSearch: '',
        explorerBase: null,
        explorerCompare: null,
      }),

      // --- Preset actions (M3) ---
      // Named snapshots of the full battle state, capped at MAX_PRESETS.
      // savePreset returns the new preset id (or null when at the cap).
      savePreset: (name) => {
        const state = get();
        if (state.presets.length >= MAX_PRESETS) return null;
        const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const preset: Preset = {
          id,
          name: name.trim() || `Preset ${state.presets.length + 1}`,
          config: { ...state.config },
          slots: state.slots.map(s => ({ ...s })),
        };
        set({ presets: [...state.presets, preset] });
        return id;
      },
      // Overwrites an existing preset with the current config+slots, keeping
      // its id and name — the "load → tweak → update" flow. Returns false if
      // the preset no longer exists.
      updatePreset: (id) => {
        const state = get();
        if (!state.presets.some(p => p.id === id)) return false;
        set({
          presets: state.presets.map(p => p.id === id
            ? { ...p, config: { ...state.config }, slots: state.slots.map(s => ({ ...s })) }
            : p),
        });
        return true;
      },
      loadPreset: (id) => set(state => {
        const preset = state.presets.find(p => p.id === id);
        if (!preset) return state;
        return {
          config: normalizeConfig({ ...preset.config }),
          slots: preset.slots.map(s => ({ ...s })),
        };
      }),
      deletePreset: (id) => set(state => ({
        presets: state.presets.filter(p => p.id !== id),
      })),
      renamePreset: (id, name) => set(state => ({
        presets: state.presets.map(p => p.id === id ? { ...p, name } : p),
      })),
    }),
    {
      name: 'orbo-store',
      storage: createJSONStorage(() => legacyStorage),
      partialize: (state) => ({ config: state.config, slots: state.slots, presets: state.presets }),
      merge: (persisted, current) => {
        const p = persisted as { config?: any; slots?: ArmySlotInfo[]; presets?: Preset[] } | undefined;
        return {
          ...current,
          config: normalizeConfig(p?.config ?? null),
          slots: Array.isArray(p?.slots) && p!.slots.length === 8
            ? p!.slots
            : current.slots,
          presets: Array.isArray(p?.presets) ? p!.presets : [],
        };
      },
    }
  )
);
