import { HelpCircle } from 'lucide-react';
import type { ChangeEvent } from 'react';

export const InputRow = ({ label, name, value, onChange, tooltip, tooltipAlign = 'left' }: {
  label: string;
  name?: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  tooltip?: string;
  tooltipAlign?: 'left' | 'center' | 'right';
}) => {
  const alignClass = tooltipAlign === 'left' ? 'left-[-4px] sm:left-1/2 sm:-translate-x-1/2'
                   : tooltipAlign === 'right' ? 'right-[-12px] sm:left-1/2 sm:-translate-x-1/2 sm:right-auto'
                   : 'left-1/2 -translate-x-1/2';

  return (
    <div className="flex flex-col space-y-1.5">
      <div className="flex items-center space-x-1.5 relative group z-10 cursor-help" tabIndex={0}>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-[#666] cursor-help">{label}</label>
        {tooltip && (
          <div className="relative">
            <HelpCircle className="w-3 h-3 text-[#555] group-hover:text-[#888] transition-colors" />
            <div className={`absolute bottom-full mb-2 hidden group-hover:block group-focus:block active:block w-44 sm:w-48 p-2 bg-[#222] border border-[#333] text-[9.5px] text-[#ccc] rounded shadow-xl z-[100] normal-case tracking-normal leading-relaxed pointer-events-none ${alignClass}`}>
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full bg-[#0a0a0a] border border-[#222] rounded-md py-1.5 px-3 font-mono text-sm text-[#ededed] focus:outline-none focus:border-[#444] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
};
