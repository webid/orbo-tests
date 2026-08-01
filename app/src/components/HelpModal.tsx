import type { ReactNode } from 'react';
import { X, HelpCircle, Plus, Star, Undo2, Redo2, GripVertical, Search, Sparkles, ClipboardList } from 'lucide-react';
import { TIER_COLORS } from '../data';
import { useOrboStore } from '../store';

// Keyboard shortcut chip.
const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#ededed] bg-[#1a1a1a] border border-[#333] rounded shadow-[0_1px_0_#000] whitespace-nowrap">{children}</kbd>
);

// Section heading with a small icon.
const Section = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
  <section className="space-y-2">
    <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[#ededed] flex items-center">
      <span className="text-[#888] mr-2 flex items-center">{icon}</span>
      {title}
    </h3>
    <div className="text-xs text-[#999] leading-relaxed space-y-2">{children}</div>
  </section>
);

export const HelpModal = () => {
  const helpModalOpen = useOrboStore(s => s.helpModalOpen);
  const setHelpModalOpen = useOrboStore(s => s.setHelpModalOpen);

  if (!helpModalOpen) return null;

  return (
    <div onClick={() => setHelpModalOpen(false)} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div onClick={e => e.stopPropagation()} className="bg-[#111] rounded-lg border border-[#222] w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#222] flex items-center justify-between shrink-0">
          <h2 className="text-sm font-medium flex items-center">
            <HelpCircle className="w-4 h-4 mr-2 text-[#888]" />
            How it works
          </h2>
          <button onClick={() => setHelpModalOpen(false)} aria-label="Close help" className="p-1.5 text-[#888] hover:text-[#ededed] bg-[#1a1a1a] hover:bg-[#222] rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-auto space-y-5">
          <Section icon={<ClipboardList className="w-3.5 h-3.5" />} title="1 · Set up your numbers">
            <p>First, mirror your account so the math matches the game:</p>
            <ul className="list-disc pl-4 space-y-1.5 marker:text-[#555]">
              <li>
                Copy <b className="text-[#ededed]">Click DPS %</b> and{' '}
                <b className="text-[#ededed]">Total Click Power</b> from the in-game{' '}
                <b className="text-[#ededed]">Attributes</b> screen.
              </li>
              <li>Configure your tap upgrades and the totems you use.</li>
              <li>Set up your deck's orbos and each orbo's level (next section).</li>
              <li>
                Set your current luck level in the <b className="text-[#ededed]">Luck</b> modal.
              </li>
            </ul>
            <p>Only after that, save a preset or export a code to keep the setup.</p>
          </Section>

          <Section icon={<Plus className="w-3.5 h-3.5" />} title="2 · Build your deck">
            <p>
              Tap an empty slot{' '}
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#0a0a0a] border border-[#222] align-middle" aria-hidden="true">
                <Plus className="w-3 h-3 text-[#666]" />
              </span>{' '}
              to add an orbo, tap a portrait to replace it, drag cards{' '}
              <GripVertical className="w-3 h-3 inline text-[#666]" aria-hidden="true" /> to reorder, and tap the{' '}
              <Star className="w-3 h-3 inline text-[#666]" aria-hidden="true" /> stars to cycle stages.
            </p>
            <p>
              Filling in bulk: <b className="text-[#ededed]">Fill Empty</b> drops the picked orbo into
              every open slot, and <b className="text-[#ededed]">Assign All</b> sets all eight slots to it.
            </p>
            <div className="pt-0.5">
              <p>Mistake? Every change is reversible:</p>
              <div className="grid grid-cols-[auto_auto_1fr] gap-x-2.5 gap-y-1.5 items-center mt-1.5 w-fit max-w-full">
                <Undo2 className="w-3.5 h-3.5 text-[#888]" aria-hidden="true" />
                <Kbd>Ctrl/⌘ Z</Kbd>
                <span>undo the last change</span>
                <Redo2 className="w-3.5 h-3.5 text-[#888]" aria-hidden="true" />
                <Kbd>Ctrl/⌘ Shift Z</Kbd>
                <span>redo it</span>
              </div>
              <p className="text-[10px] text-[#666] mt-1.5">Both are also buttons in the Deck header.</p>
            </div>
          </Section>

          <Section icon={<Search className="w-3.5 h-3.5" />} title="3 · Read the DPS bar">
            <div className="flex h-2.5 w-full gap-[2px] overflow-hidden border border-[#222] bg-[#0a0a0a]" aria-hidden="true">
              <div style={{ width: '46%', backgroundColor: TIER_COLORS.rare }} />
              <div style={{ width: '30%', backgroundColor: TIER_COLORS.uncommon }} />
              <div style={{ width: '24%', backgroundColor: TIER_COLORS.common }} />
            </div>
            <p>
              Each segment is one orbo's share of your deck's DPS — including runt (weakest) and apex
              (strongest) totem boosts. Hover or tap a segment to highlight that orbo in the grid.
            </p>
          </Section>

          <Section icon={<Sparkles className="w-3.5 h-3.5" />} title="Tools">
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              <b className="text-[#ededed] whitespace-nowrap">Explorer</b>
              <span>explore and compare every orbo available in the game.</span>
              <b className="text-[#ededed] whitespace-nowrap">Upgrade Path</b>
              <span>the best next level-ups for your deck, in order, with their food cost.</span>
              <b className="text-[#ededed] whitespace-nowrap">Luck</b>
              <span>spawn rates and gold cost for every luck level.</span>
              <b className="text-[#ededed] whitespace-nowrap">Totems</b>
              <span>
                grid or list view with every card's lore and effects — or open the{' '}
                <a
                  href={`${import.meta.env.BASE_URL}totem-reference.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#ededed] underline decoration-[#444] underline-offset-2 hover:decoration-[#888] transition-colors"
                >full totem reference</a>{' '}
                (plain page, easy to translate).
              </span>
              <b className="text-[#ededed] whitespace-nowrap">Presets</b>
              <span>save and load deck + settings. Save turns into Update while a preset is loaded, so you always overwrite the right one.</span>
              <b className="text-[#ededed] whitespace-nowrap">Sync</b>
              <span>export your setup as a code to back it up or share it, then import it any time.</span>
            </div>
          </Section>

          <p className="text-[10px] text-[#555] border-t border-[#222] pt-3">
            Everything is stored locally in your browser — nothing is uploaded.
          </p>
        </div>
      </div>
    </div>
  );
};
