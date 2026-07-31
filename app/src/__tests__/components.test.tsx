// ---------------------------------------------------------------------------
// Component smoke tests (M4): full App render, modal open/close, luck-table
// trimming, the Sync import flow and preset saving — all against the real
// Zustand store in jsdom.
// ---------------------------------------------------------------------------

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import App from '../App';
import { normalizeConfig, useOrboStore } from '../store';
import { bossesData, luckData } from '../data';

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
    luckModalOpen: false,
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
    expect(screen.getByRole('heading', { name: /army composition/i })).toBeTruthy();
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
    const armyCard = screen.getByRole('heading', { name: /army composition/i })
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

// --- helpers ---------------------------------------------------------------

function firstLevelCell(row: HTMLElement): string {
  return within(row).getAllByRole('cell')[0].textContent!.replace(/\D/g, '');
}
