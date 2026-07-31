// ---------------------------------------------------------------------------
// PresetBar (M3.1) — named snapshots of the full battle state.
// Dropdown loads a preset, the inline input renames the selected preset,
// Save snapshots the current config+slots, Delete removes it. Max 5 presets.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Bookmark, Save, Trash2 } from 'lucide-react';
import { useOrboStore, MAX_PRESETS } from '../store';

export const PresetBar = () => {
  const presets = useOrboStore(s => s.presets);
  const savePreset = useOrboStore(s => s.savePreset);
  const loadPreset = useOrboStore(s => s.loadPreset);
  const deletePreset = useOrboStore(s => s.deletePreset);
  const renamePreset = useOrboStore(s => s.renamePreset);
  const setToast = useOrboStore(s => s.setToast);

  // Which preset is currently loaded into the bar (transient UI state).
  const [selectedId, setSelectedId] = useState('');

  const selectedPreset = presets.find(p => p.id === selectedId) ?? null;
  const atCap = presets.length >= MAX_PRESETS;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (!id) return;
    loadPreset(id);
    const p = presets.find(x => x.id === id);
    setToast(`Loaded preset: ${p?.name ?? ''}`);
  };

  const handleSave = () => {
    const name = window.prompt('Preset name:', `Preset ${presets.length + 1}`);
    if (name === null) return; // cancelled
    const id = savePreset(name);
    if (id) {
      setSelectedId(id);
      setToast(`Saved preset: ${name.trim() || `Preset ${presets.length + 1}`}`);
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

      {/* Inline rename for the selected preset */}
      {selectedPreset && (
        <input
          type="text"
          value={selectedPreset.name}
          onChange={e => renamePreset(selectedPreset.id, e.target.value)}
          aria-label="Rename preset"
          title="Rename preset"
          className="flex-1 min-w-[100px] bg-[#0a0a0a] border border-[#222] rounded p-1.5 text-xs text-[#ededed] focus:outline-none focus:border-[#444] transition-colors"
        />
      )}

      <button
        onClick={handleSave}
        disabled={atCap}
        title={atCap ? `Max ${MAX_PRESETS} presets` : 'Save current army & config as a preset'}
        className="px-2.5 py-1.5 text-[10px] uppercase tracking-wide font-medium rounded bg-[#222] hover:bg-[#333] text-[#ededed] transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:disabled:bg-[#222] flex items-center shrink-0"
      >
        <Save className="w-3 h-3 mr-1" />
        Save
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
