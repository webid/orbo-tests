import type { ReactNode } from 'react';

export const StatCard = ({ title, value, subValue, good }: {
  title: string;
  value: string;
  subValue?: ReactNode;
  good?: boolean;
}) => (
  <div className="bg-[#111] p-4 rounded-lg border border-[#222] flex flex-col justify-center">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#666] mb-1">{title}</p>
    <p className={`text-lg sm:text-2xl font-mono tracking-tight truncate ${good === true ? 'text-emerald-500/80' : good === false ? 'text-red-500/80' : 'text-[#ededed]'}`}>
      {value}
    </p>
    <div className="w-full text-xs text-[#888]">{subValue}</div>
  </div>
);
