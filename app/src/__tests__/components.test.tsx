// ---------------------------------------------------------------------------
// Component smoke tests (M4): full App render, modal open/close, luck-table
// trimming, the Sync import flow and preset saving — all against the real
// Zustand store in jsdom.
// ---------------------------------------------------------------------------

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import App from '../App';
import { normalizeConfig, useOrboStore } from '../store';
import { bossesData, creaturesDict, luckData, totemsData, TOTEM_LANE_ORDER } from '../data';
import { getEquippedTotemEffects, getTotemMult } from '../utils';

const resetStore = () => {
  localStorage.clear();
  useOrboStore.setState({
    config: normalizeConfig(null),
    slots: Array.from({ length: 8 }, () => ({ creatureKey: null, level: 1 })),
    presets: [],
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
  });
};

beforeEach(resetStore);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('App shell', () => {
  it('renders the command center with config, presets and army sections', () => {
    render(<App />);
    expect(screen.getByText('Orbo Command Center')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /battle config/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^deck$/i })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Load a preset' })).toBeTruthy();
    expect(screen.getByText(/presets/i)).toBeTruthy();
  });
});

describe('modal open/close', () => {
  it('opens the Luck Table and closes it with Escape', () => {
    render(<App />);
    expect(screen.queryByText('Luck Table')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /luck/i }));
    expect(screen.getByText('Luck Table')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Luck Table')).toBeNull();
  });

  it('opens the Sync modal and closes it with its X button', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /sync/i }));
    expect(screen.getByText('Sync Data')).toBeTruthy();

    // Close via the header X (first button inside the modal panel).
    const modal = screen.getByText('Sync Data').closest('div[class*="bg-[#111]"]') as HTMLElement;
    const closeBtn = within(modal).getAllByRole('button')[0];
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Sync Data')).toBeNull();
  });
});

describe('luck table trimming', () => {
  it('shows all rows from level 1 when no luck level is set', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /luck/i }));
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(1 + luckData.length); // header + all levels
    expect(firstLevelCell(rows[1])).toBe('1');
  });

  it('trims to luckLevel-1 → max when a luck level is set', () => {
    useOrboStore.getState().setConfig({ luckLevel: 58 });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /luck/i }));

    const rows = screen.getAllByRole('row');
    expect(firstLevelCell(rows[1])).toBe('57'); // trimmed start
    // Current level is marked with a ◂ marker.
    expect(within(rows[2]).getAllByText(/58 ◂/).length).toBeGreaterThan(0);
  });
});

describe('Sync import flow', () => {
  it('applies an imported save code to config and slots', () => {
    const targetBoss = bossesData.find(b => b.bossNumber === 5)!;
    const code = btoa(encodeURIComponent(JSON.stringify({
      config: {
        clickPercent: '40',
        clickFixed: 10,
        bossNumber: 5,
        bossEnergy: targetBoss.hp,
        battleDuration: targetBoss.timer,
        maxClicks: 50,
        overchargeLevel: 2,
        surgeLevel: 1,
        totemKeys: [null, null, null],
        luckLevel: null,
        totemImagesOn: true,
        selectedBoss: null,
      },
      slots: [
        { creatureKey: 'weasel', level: 7 },
        ...Array.from({ length: 7 }, () => ({ creatureKey: null, level: 1 })),
      ],
    })));

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /sync/i }));
    fireEvent.change(screen.getByPlaceholderText('Paste your code here...'), { target: { value: code } });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    // Modal closes, config applied: boss button now shows the imported floor.
    expect(screen.queryByText('Sync Data')).toBeNull();
    expect(screen.getByRole('button', { name: new RegExp(`Floor ${targetBoss.floor} `) })).toBeTruthy();
    expect(useOrboStore.getState().config.maxClicks).toBe(50);
    expect(useOrboStore.getState().slots[0]).toEqual({ creatureKey: 'weasel', level: 7 });
    expect(screen.getByText(/Imported: 1 creature/)).toBeTruthy();
  });
});

describe('preset bar', () => {
  it('saves the current state as a named preset', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('My Build');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    const combo = screen.getByRole('combobox', { name: 'Load a preset' }) as HTMLSelectElement;
    expect([...combo.options].map(o => o.text)).toContain('My Build');
    expect(screen.getByText('1/5')).toBeTruthy();
    expect(useOrboStore.getState().presets).toHaveLength(1);
  });

  it('loads a preset back into config and slots', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Snapshot');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Mutate state, then restore via the dropdown.
    useOrboStore.getState().setConfig({ maxClicks: 1 });
    const combo = screen.getByRole('combobox', { name: 'Load a preset' }) as HTMLSelectElement;
    fireEvent.change(combo, { target: { value: useOrboStore.getState().presets[0].id } });

    expect(useOrboStore.getState().config.maxClicks).toBe(normalizeConfig(null).maxClicks);
    expect(screen.getByText(/Loaded preset: Snapshot/)).toBeTruthy();
  });

  it('renames via the pencil button — loading does not force the form open', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Old Name');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    const combo = screen.getByRole('combobox', { name: 'Load a preset' }) as HTMLSelectElement;
    fireEvent.change(combo, { target: { value: useOrboStore.getState().presets[0].id } });

    // Loading a preset must NOT open the rename input.
    expect(screen.queryByRole('textbox', { name: 'Rename preset' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Rename preset' }));
    const input = screen.getByRole('textbox', { name: 'Rename preset' }) as HTMLInputElement;
    expect(input.value).toBe('Old Name');

    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(useOrboStore.getState().presets[0].name).toBe('New Name');
    expect(screen.queryByRole('textbox', { name: 'Rename preset' })).toBeNull();
  });

  it('cancels a rename with Escape, keeping the old name', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Keep Me');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    const combo = screen.getByRole('combobox', { name: 'Load a preset' }) as HTMLSelectElement;
    fireEvent.change(combo, { target: { value: useOrboStore.getState().presets[0].id } });
    fireEvent.click(screen.getByRole('button', { name: 'Rename preset' }));

    const input = screen.getByRole('textbox', { name: 'Rename preset' });
    fireEvent.change(input, { target: { value: 'Changed' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(useOrboStore.getState().presets[0].name).toBe('Keep Me');
    expect(screen.queryByRole('textbox', { name: 'Rename preset' })).toBeNull();
  });

  it('updates the loaded preset in place instead of creating a duplicate', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Main Deck');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Tweak the config, then hit the button again — it now reads "Update"
    // and must overwrite the same preset, not append a copy.
    useOrboStore.getState().setConfig({ maxClicks: 1 });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    const presets = useOrboStore.getState().presets;
    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe('Main Deck');
    expect(presets[0].config.maxClicks).toBe(1);
    expect(screen.getByText(/Updated preset: Main Deck/)).toBeTruthy();
  });

  it('refuses to create a second preset with a duplicate name', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Main Deck');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Deselect, then try to save a new preset under the same name (any case).
    const combo = screen.getByRole('combobox', { name: 'Load a preset' }) as HTMLSelectElement;
    fireEvent.change(combo, { target: { value: '' } });
    vi.spyOn(window, 'prompt').mockReturnValue('main deck');
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(useOrboStore.getState().presets).toHaveLength(1);
    expect(screen.getByText(/already exists/)).toBeTruthy();
  });

  it('refuses a rename that collides with another preset', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Alpha');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    const combo = screen.getByRole('combobox', { name: 'Load a preset' }) as HTMLSelectElement;
    fireEvent.change(combo, { target: { value: '' } });
    vi.spyOn(window, 'prompt').mockReturnValue('Beta');
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Rename "Beta" → "alpha": case-insensitive collision with preset 1.
    fireEvent.change(combo, { target: { value: useOrboStore.getState().presets[1].id } });
    fireEvent.click(screen.getByRole('button', { name: 'Rename preset' }));
    const input = screen.getByRole('textbox', { name: 'Rename preset' });
    fireEvent.change(input, { target: { value: 'alpha' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(useOrboStore.getState().presets[1].name).toBe('Beta');
    expect(screen.getByText(/already named/)).toBeTruthy();
  });
});

describe('army undo', () => {
  it('undo button is disabled when there is nothing to undo', () => {
    render(<App />);
    expect((screen.getByRole('button', { name: /undo/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('restores the army after a misfired Assign All (full picker flow)', () => {
    useOrboStore.getState().setSlots([
      { creatureKey: 'archon', level: 5 },
      ...Array.from({ length: 7 }, () => ({ creatureKey: null, level: 1 })),
    ]);
    render(<App />);

    // Misfire: Assign All → pick Weasel → every slot becomes Weasel L1.
    fireEvent.click(screen.getByRole('button', { name: /assign all/i }));
    const search = screen.getByPlaceholderText(/search creatures/i);
    fireEvent.change(search, { target: { value: 'weasel' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(useOrboStore.getState().slots.every(s => s.creatureKey === 'weasel')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /undo/i }));

    const slots = useOrboStore.getState().slots;
    expect(slots[0]).toEqual({ creatureKey: 'archon', level: 5 });
    expect(slots.filter(s => !s.creatureKey)).toHaveLength(7);
    expect(screen.getByText(/Undid last deck change/)).toBeTruthy();
    // One undo per change: the stack is empty again.
    expect((screen.getByRole('button', { name: /undo/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('brings back a removed unit and un-swaps a reorder', () => {
    useOrboStore.getState().setSlots([
      { creatureKey: 'archon', level: 3 },
      { creatureKey: 'weasel', level: 2 },
      ...Array.from({ length: 6 }, () => ({ creatureKey: null, level: 1 })),
    ]);
    render(<App />);
    const undoBtn = screen.getByRole('button', { name: /undo/i });

    // Remove the weasel → undo → it is back, level intact. (act() flushes
    // the re-render so the Undo button is enabled before we click it.)
    act(() => { useOrboStore.getState().removeSlot(1); });
    expect(useOrboStore.getState().slots[1].creatureKey).toBeNull();
    fireEvent.click(undoBtn);
    expect(useOrboStore.getState().slots[1]).toEqual({ creatureKey: 'weasel', level: 2 });

    // Reorder via swapSlots (the drag & drop path) → undo → original order.
    act(() => { useOrboStore.getState().swapSlots(0, 1); });
    expect(useOrboStore.getState().slots[0].creatureKey).toBe('weasel');
    fireEvent.click(undoBtn);
    expect(useOrboStore.getState().slots[0].creatureKey).toBe('archon');
    expect(useOrboStore.getState().slots[1].creatureKey).toBe('weasel');
  });

  it('redo button re-applies an undone change, and a new action clears the redo stack', () => {
    useOrboStore.getState().setSlots([
      { creatureKey: 'archon', level: 3 },
      { creatureKey: 'weasel', level: 2 },
      ...Array.from({ length: 6 }, () => ({ creatureKey: null, level: 1 })),
    ]);
    render(<App />);
    const undoBtn = screen.getByRole('button', { name: /undo/i });
    const redoBtn = () => screen.getByRole('button', { name: /redo/i }) as HTMLButtonElement;
    expect(redoBtn().disabled).toBe(true);

    act(() => { useOrboStore.getState().removeSlot(1); });
    fireEvent.click(undoBtn);
    expect(useOrboStore.getState().slots[1]).toEqual({ creatureKey: 'weasel', level: 2 });
    expect(redoBtn().disabled).toBe(false);

    fireEvent.click(redoBtn());
    expect(useOrboStore.getState().slots[1].creatureKey).toBeNull();
    expect(screen.getByText(/Redid deck change/)).toBeTruthy();
    expect(redoBtn().disabled).toBe(true);

    // Undo again, then make a NEW army change — the redo branch is discarded.
    fireEvent.click(undoBtn);
    expect(useOrboStore.getState().slots[1].creatureKey).toBe('weasel');
    act(() => { useOrboStore.getState().removeSlot(0); });
    expect(redoBtn().disabled).toBe(true);
  });

  it('Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z redoes, but not while typing', () => {
    useOrboStore.getState().setSlots([
      { creatureKey: 'archon', level: 3 },
      { creatureKey: 'weasel', level: 2 },
      ...Array.from({ length: 6 }, () => ({ creatureKey: null, level: 1 })),
    ]);
    render(<App />);

    act(() => { useOrboStore.getState().removeSlot(1); });
    expect(useOrboStore.getState().slots[1].creatureKey).toBeNull();

    // Ctrl+Z undoes.
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    expect(useOrboStore.getState().slots[1]).toEqual({ creatureKey: 'weasel', level: 2 });

    // Ctrl+Shift+Z redoes (browsers report an uppercase key with shift held).
    fireEvent.keyDown(document.body, { key: 'Z', ctrlKey: true, shiftKey: true });
    expect(useOrboStore.getState().slots[1].creatureKey).toBeNull();

    // Cmd+Z works too (macOS).
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true });
    expect(useOrboStore.getState().slots[1].creatureKey).toBe('weasel');

    // While typing in a text field the shortcut stays with the field.
    act(() => { useOrboStore.getState().removeSlot(1); });
    const input = document.querySelector('input[name="maxClicks"]')!;
    fireEvent.keyDown(input, { key: 'z', ctrlKey: true });
    expect(useOrboStore.getState().slots[1].creatureKey).toBeNull();
  });
});

describe('help modal', () => {
  it('opens from the header, shows the guide, and closes with X', () => {
    render(<App />);
    // Mobile icon (title row) + desktop button (action row) both exist;
    // CSS breakpoints pick one, jsdom sees both.
    const helpButtons = screen.getAllByRole('button', { name: 'Help' });
    expect(helpButtons).toHaveLength(2);

    fireEvent.click(helpButtons[0]);
    expect(screen.getByText('How it works')).toBeTruthy();
    expect(screen.getByText(/mirror your account/)).toBeTruthy();
    expect(screen.getByText(/Ctrl\/⌘ Z/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close help' }));
    expect(screen.queryByText('How it works')).toBeNull();
  });

  it('closes with Escape', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Help' })[0]);
    expect(screen.getByText('How it works')).toBeTruthy();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByText('How it works')).toBeNull();
  });
});

describe('dps breakdown bar', () => {
  it('sizes segments by effective share incl. runt totem boost, with square corners', () => {
    const runtTotem = totemsData.find(t => t.effects.some(e => e.key === 'runtOrboDamageMult'));
    expect(runtTotem, 'fixture: a runt totem must exist in the data').toBeTruthy();
    useOrboStore.getState().setConfig({ totemKeys: [runtTotem!.key, null, null] });
    useOrboStore.getState().setSlots([
      { creatureKey: 'archon', level: 1 },
      { creatureKey: 'weasel', level: 1 },
      ...Array.from({ length: 6 }, () => ({ creatureKey: null, level: 1 })),
    ]);
    render(<App />);

    // Weasel (the runt) gets the totem's expected boost; Archon is untouched.
    const effects = getEquippedTotemEffects([runtTotem!.key, null, null]);
    const sum = (key: string) => effects.filter(e => e.key === key).reduce((a, e) => a + e.value, 0);
    const runtExp = getTotemMult(effects, 'runtOrboDamageMult') *
      (1 + sum('runtOrboCritChance') * sum('runtOrboCritMult'));
    const weaselDps = creaturesDict['weasel'].levels[0].dps;
    const archonDps = creaturesDict['archon'].levels[0].dps;
    const expectedPct = (weaselDps * runtExp) / (archonDps + weaselDps * runtExp) * 100;

    const seg = document.querySelector('[title^="Weasel:"]') as HTMLElement;
    expect(seg).toBeTruthy();
    expect(parseFloat(seg.style.width)).toBeCloseTo(expectedPct, 4);
    expect(seg.getAttribute('title')).toContain('runt');
    // Values are on-demand only: no static legend or hint text below the bar.
    expect(document.body.textContent).not.toContain('hover a segment');

    // Square corners: the track must not round its ends.
    expect(seg.parentElement!.className).not.toContain('rounded');
  });

  it('shows the exact share in the readout on hover and tap only', () => {
    useOrboStore.getState().setSlots([
      { creatureKey: 'weasel', level: 1 },
      { creatureKey: 'archon', level: 1 },
      ...Array.from({ length: 6 }, () => ({ creatureKey: null, level: 1 })),
    ]);
    render(<App />);
    const seg = document.querySelector('[title^="Weasel:"]') as HTMLElement;
    expect(seg).toBeTruthy();

    // At rest: no percentages anywhere below the bar.
    expect(screen.queryByText(/^\d+\.\d+%$/)).toBeNull();

    // Hover (desktop) → readout appears; leave → it clears.
    fireEvent.mouseOver(seg);
    expect(screen.getByText(/^\d+\.\d+%$/)).toBeTruthy();
    fireEvent.mouseOut(seg);
    expect(screen.queryByText(/^\d+\.\d+%$/)).toBeNull();

    // Tap toggles it (mobile path).
    fireEvent.click(seg);
    expect(screen.getByText(/^\d+\.\d+%$/)).toBeTruthy();
    fireEvent.click(seg);
    expect(screen.queryByText(/^\d+\.\d+%$/)).toBeNull();
  });
});

describe('dps breakdown highlight', () => {
  it('highlights the matching unit card while a segment is hovered', () => {
    useOrboStore.getState().setSlots([
      { creatureKey: 'weasel', level: 7 },
      ...Array.from({ length: 7 }, () => ({ creatureKey: null, level: 1 })),
    ]);
    render(<App />);

    const seg = document.querySelector('[title^="Weasel:"]') as HTMLElement;
    expect(seg).toBeTruthy();

    // React derives onMouseEnter/Leave from the bubbling mouseover/mouseout.
    fireEvent.mouseOver(seg);
    const armyCard = screen.getByRole('heading', { name: /^deck$/i })
      .closest('div[class*="bg-[#111]"]') as HTMLElement;
    const card = within(armyCard).getByAltText('Weasel').closest('div.group') as HTMLElement;
    expect(card.className).toContain('border-[#666]');

    fireEvent.mouseOut(seg);
    expect(card.className).not.toContain('border-[#666]');
  });

  it('toggles the highlight on click (tap on touch devices)', () => {
    useOrboStore.getState().setSlots([
      { creatureKey: 'weasel', level: 7 },
      ...Array.from({ length: 7 }, () => ({ creatureKey: null, level: 1 })),
    ]);
    render(<App />);

    const seg = document.querySelector('[title^="Weasel:"]') as HTMLElement;
    fireEvent.click(seg);
    expect(useOrboStore.getState().highlightedSlot).toBe(0);
    fireEvent.click(seg);
    expect(useOrboStore.getState().highlightedSlot).toBeNull();
  });
});

describe('totem picker duplicate restriction', () => {
  const pickerPanel = () =>
    screen.getByText(/Select Totem — Slot/).closest('.max-w-3xl') as HTMLElement;

  it('disables a card equipped in another slot and keeps others selectable', () => {
    const [a, b] = totemsData;
    useOrboStore.getState().setConfig({ totemKeys: [a.key, null, null] });
    useOrboStore.getState().setTotemPickerSlot(1);
    render(<App />);

    const panel = pickerPanel();
    const dupBtn = within(panel).getByText(a.name).closest('button') as HTMLButtonElement;
    expect(dupBtn.disabled).toBe(true);
    expect(dupBtn.className).toContain('opacity-40');
    expect(within(dupBtn).getByText('Equipped')).toBeTruthy();

    // Clicking a disabled button is a no-op: slot 2 stays empty.
    fireEvent.click(dupBtn);
    expect(useOrboStore.getState().config.totemKeys).toEqual([a.key, null, null]);

    // A card that isn't equipped anywhere is still selectable.
    const freeBtn = within(panel).getByText(b.name).closest('button') as HTMLButtonElement;
    expect(freeBtn.disabled).toBe(false);
    fireEvent.click(freeBtn);
    expect(useOrboStore.getState().config.totemKeys).toEqual([a.key, b.key, null]);
  });

  it('keeps the card selectable in the slot where it is equipped', () => {
    const [a] = totemsData;
    useOrboStore.getState().setConfig({ totemKeys: [null, a.key, null] });
    useOrboStore.getState().setTotemPickerSlot(1);
    render(<App />);

    const btn = within(pickerPanel()).getByText(a.name).closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.className).toContain('border-[#888]'); // selected style, not dimmed
    expect(within(btn).queryByText('Equipped')).toBeNull();
  });

  it('skips equipped-elsewhere cards in the Enter-to-pick shortcut', () => {
    const sorted = [...totemsData].sort(
      (x, y) => x.tier - y.tier || (TOTEM_LANE_ORDER[x.lane] || 99) - (TOTEM_LANE_ORDER[y.lane] || 99)
    );
    const [first, second] = sorted;
    useOrboStore.getState().setConfig({ totemKeys: [null, null, first.key] });
    useOrboStore.getState().setTotemPickerSlot(0);
    render(<App />);

    fireEvent.keyDown(screen.getByPlaceholderText(/Search totems/), { key: 'Enter' });
    expect(useOrboStore.getState().config.totemKeys).toEqual([second.key, null, first.key]);
  });
});

// --- helpers ---------------------------------------------------------------

function firstLevelCell(row: HTMLElement): string {
  return within(row).getAllByRole('cell')[0].textContent!.replace(/\D/g, '');
}
