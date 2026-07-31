// ---------------------------------------------------------------------------
// PresetBar (M3.1) — named snapshots of the full battle state.
// Dropdown loads a preset, the pencil button opens an inline rename input
// (Enter/blur commits, Escape cancels). With a preset selected the save
// button becomes UPDATE and overwrites that preset in place (no prompt, no
// duplicate); without one it snapshots the current config+slots as a new
// preset. Names are unique (trim + case-insensitive) — duplicate saves and
// renames are refused with a toast. Delete removes it. Max 5 presets.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Bookmark, Pencil, Save, Trash2 } from 'lucide-react';
import { useOrboStore, MAX_PRESETS } from '../store';

export const PresetBar = () => {
  const presets = useOrboStore(s => s.presets);
  const savePreset = useOrboStore(s => s.savePreset);
  const updatePreset = useOrboStore(s => s.updatePreset);
  const loadPreset = useOrboStore(s => s.loadPreset);
  const deletePreset = useOrboStore(s => s.deletePreset);
  const renamePreset = useOrboStore(s => s.renamePreset);
  const setToast = useOrboStore(s => s.setToast);

  // Which preset is currently loaded into the bar (transient UI state).
  const [selectedId, setSelectedId] = useState('');
  // Rename is opt-in: loading a preset no longer forces the input open.
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');

  const selectedPreset = presets.find(p => p.id === selectedId) ?? null;
  const atCap = presets.length >= MAX_PRESETS;

  // Names are unique up to trim + case; excludeId skips the preset being
  // renamed so keeping your own name is never a collision.
  const nameTaken = (name: string, excludeId?: string) =>
    presets.some(p => p.id !== excludeId &&
      p.name.trim().toLowerCase() === name.trim().toLowerCase());

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setRenaming(false);
    if (!id) return;
    loadPreset(id);
    const p = presets.find(x => x.id === id);
    setToast(`Loaded preset: ${p?.name ?? ''}`);
  };

  const startRename = () => {
    if (!selectedPreset) return;
    setDraftName(selectedPreset.name);
    setRenaming(true);
  };

  const commitRename = () => {
    if (selectedPreset) {
      const name = draftName.trim();
      if (name && name !== selectedPreset.name) {
        if (nameTaken(name, selectedPreset.id)) {
          setToast(`Another preset is already named "${name}"`);
        } else {
          renamePreset(selectedPreset.id, name);
        }
      }
    }
    setRenaming(false);
  };

  const handleSave = () => {
    // With a preset loaded, Save becomes an in-place update — the common
    // "load → tweak → keep" flow never prompts and never duplicates.
    if (selectedPreset) {
      updatePreset(selectedPreset.id);
      setToast(`Updated preset: ${selectedPreset.name}`);
      return;
    }
    const raw = window.prompt('Preset name:', `Preset ${presets.length + 1}`);
    if (raw === null) return; // cancelled
    const name = raw.trim() || `Preset ${presets.length + 1}`;
    if (nameTaken(name)) {
      setToast(`A preset named "${name}" already exists — load it and press Update to overwrite`);
      return;
    }
    const id = savePreset(name);
    if (id) {
      setSelectedId(id);
      setToast(`Saved preset: ${name}`);
    } else {
      setToast(`Preset limit reached (max ${MAX_PRESETS})`);
    }
  };

  const handleDelete = () => {
    if (!selectedPreset) return;
    if (!window.confirm(`Delete preset "${selectedPreset.name}"?`)) return;
    deletePreset(selectedPreset.id);
    setSelectedId('');
    setToast(`Deleted preset: ${selectedPreset.name}`);
  };

  return (
    <div className="bg-[#111] rounded-lg border border-[#222] p-2.5 sm:p-3 flex items-center flex-wrap gap-2">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#888] flex items-center shrink-0">
        <Bookmark className="w-3.5 h-3.5 mr-1.5" />
        Presets
      </span>

      <select
        value={selectedId}
        onChange={e => handleSelect(e.target.value)}
        aria-label="Load a preset"
        className="flex-1 min-w-[120px] bg-[#0a0a0a] border border-[#222] rounded p-1.5 text-xs text-[#ededed] focus:outline-none focus:border-[#444] transition-colors"
      >
        <option value="">— Load a preset —</option>
        {presets.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {/* Rename is opt-in via the pencil — loading a preset keeps the bar compact. */}
      {selectedPreset && renaming && (
        <input
          type="text"
          value={draftName}
          onChange={e => setDraftName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') setRenaming(false);
          }}
          onBlur={commitRename}
          onFocus={e => e.target.select()}
          autoFocus
          aria-label="Rename preset"
          title="Enter to save, Escape to cancel"
          className="flex-1 min-w-[100px] bg-[#0a0a0a] border border-[#444] rounded p-1.5 text-xs text-[#ededed] focus:outline-none transition-colors"
        />
      )}

      {selectedPreset && !renaming && (
        <button
          onClick={startRename}
          aria-label="Rename preset"
          title="Rename this preset"
          className="px-2 py-1.5 rounded bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-[#888] hover:text-[#ededed] transition-colors shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}

      <button
        onClick={handleSave}
        disabled={!selectedPreset && atCap}
        title={selectedPreset
          ? `Overwrite "${selectedPreset.name}" with the current deck & config`
          : atCap ? `Max ${MAX_PRESETS} presets` : 'Save current deck & config as a new preset'}
        className="px-2.5 py-1.5 text-[10px] uppercase tracking-wide font-medium rounded bg-[#222] hover:bg-[#333] text-[#ededed] transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:disabled:bg-[#222] flex items-center shrink-0"
      >
        <Save className="w-3 h-3 mr-1" />
        {selectedPreset ? 'Update' : 'Save'}
      </button>

      {selectedPreset && (
        <button
          onClick={handleDelete}
          aria-label="Delete preset"
          title="Delete this preset"
          className="px-2 py-1.5 rounded bg-[#1a1a1a] hover:bg-red-500/15 border border-[#333] hover:border-red-500/40 text-[#888] hover:text-red-400 transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      <span className="text-[9px] text-[#555] font-mono shrink-0">{presets.length}/{MAX_PRESETS}</span>
    </div>
  );
};
