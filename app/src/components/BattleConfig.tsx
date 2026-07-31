import { ChevronLeft, ChevronRight } from 'lucide-react';
import { bossesData } from '../data';
import { useOrboStore } from '../store';
import type { CalcResults } from '../types';
import { InputRow } from './InputRow';
import { SettingsIcon } from './SettingsIcon';

export const BattleConfig = ({ results }: { results: CalcResults }) => {
  const config = useOrboStore(s => s.config);
  const setConfig = useOrboStore(s => s.setConfig);
  const setBossModalOpen = useOrboStore(s => s.setBossModalOpen);
  const cycleBoss = useOrboStore(s => s.cycleBoss);

  const currentBoss = config.bossNumber
    ? bossesData.find(b => b.bossNumber === config.bossNumber)
    : undefined;

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'clickPercentForm') {
      setConfig({ clickPercent: value });
    } else {
      setConfig({ [name]: parseFloat(value) || 0 });
    }
  };

  return (
    <div className="bg-[#111] rounded-lg border border-[#222]">
      <div className="p-3.5 border-b border-[#222]">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-[#888] flex items-center">
          <SettingsIcon className="w-3.5 h-3.5 mr-2" />
          Battle Config
        </h2>
      </div>
      <div className="p-5 grid grid-cols-2 gap-4">
        <div className="col-span-2">
           <label className="text-[10px] font-semibold uppercase tracking-wider text-[#666] mb-1.5 block">Target Boss</label>
           <div className="flex items-stretch space-x-1.5">
           <button onClick={() => cycleBoss(-1)} title="Previous boss" aria-label="Previous boss" className="shrink-0 px-1.5 sm:px-2 bg-[#0a0a0a] border border-[#222] hover:border-[#444] rounded-md text-[#666] hover:text-[#ededed] transition-colors flex items-center">
              <ChevronLeft className="w-4 h-4" />
           </button>
           <button onClick={() => setBossModalOpen(true)} className="flex-1 min-w-0 bg-[#0a0a0a] border border-[#222] hover:border-[#444] rounded-md p-3 flex items-center justify-between transition-colors text-left group">
              <div className="flex items-center min-w-0">
                 <div className="w-10 h-10 rounded overflow-hidden border border-[#333] bg-[#1a1a1a] shrink-0 mr-3">
                    <img src={currentBoss ? `https://playorbo.fun/depths/map/biomes/${currentBoss.biome}.webp` : 'https://playorbo.fun/depths/map/biomes/grasslands.webp'} alt="" onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} className="w-full h-full object-cover scale-[1.15]" />
                 </div>
                 <div className="min-w-0">
                    <p className="text-sm font-medium text-[#ededed] group-hover:text-white transition-colors truncate">{currentBoss ? `Floor ${currentBoss.floor} - ${currentBoss.biomeName}` : 'Custom Boss'}</p>
                    <p className="text-[10px] font-mono text-[#888] mt-0.5">{config.bossEnergy.toLocaleString()} HP / {config.battleDuration}s</p>
                 </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#444] group-hover:text-[#888] transition-colors shrink-0" />
           </button>
           <button onClick={() => cycleBoss(1)} title="Next boss" aria-label="Next boss" className="shrink-0 px-1.5 sm:px-2 bg-[#0a0a0a] border border-[#222] hover:border-[#444] rounded-md text-[#666] hover:text-[#ededed] transition-colors flex items-center">
              <ChevronRight className="w-4 h-4" />
           </button>
           </div>
        </div>
        <div className="col-span-2 h-px bg-[#222] mt-1 mb-2" />
        <div className="col-span-2 grid grid-cols-3 gap-3">
           <InputRow
              label="Click DPS (%)"
              name="clickPercentForm"
              value={config.clickPercent}
              onChange={handleConfigChange}
              tooltip="You need to get this value from your profile page under attributes. In the game UI, it's called 'Orbo DPS → Click'"
              tooltipAlign="left"
           />
           <InputRow
              label="Max Clicks"
              name="maxClicks"
              value={config.maxClicks}
              onChange={handleConfigChange}
              tooltip="Adjust to your liking, 82 is just what the dev suggests :D"
              tooltipAlign="center"
           />
           <InputRow
              label="Total Click Power"
              name="totalClickPower"
              tooltip="You need to get this value from your profile page under attributes. In the game UI, it's called 'Power'"
              tooltipAlign="right"
              value={Math.round(results.currentArmyDps * ((parseFloat(config.clickPercent) || 0) / 100) + config.clickFixed)}
              onChange={(e) => {
                 const val = parseFloat(e.target.value);
                 const totalPower = isNaN(val) ? 0 : val;
                 const fixed = totalPower - (results.currentArmyDps * ((parseFloat(config.clickPercent) || 0) / 100));
                 setConfig({ clickFixed: fixed });
              }}
           />
        </div>
      </div>
    </div>
  );
};
