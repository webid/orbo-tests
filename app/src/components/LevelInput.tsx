import { useState, useEffect } from 'react';

export const LevelInput = ({ absoluteLevel, maxLevel, onChange }: {
  absoluteLevel: number;
  maxLevel: number;
  onChange: (val: number) => void;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [tempVal, setTempVal] = useState(absoluteLevel.toString());

  useEffect(() => {
    if (!isFocused) setTempVal(absoluteLevel.toString());
  }, [absoluteLevel, isFocused]);

  const relativeLevel = absoluteLevel <= 20 ? absoluteLevel : ((absoluteLevel - 1) % 20) + 1;
  const displayVal = isFocused ? tempVal : relativeLevel;

  return (
    <input
      type="number"
      value={displayVal}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        setIsFocused(false);
        let val = parseInt(e.target.value) || 1;
        if (val < 1) val = 1;
        if (val > maxLevel) val = maxLevel;
        onChange(val);
      }}
      onChange={(e) => setTempVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className={`bg-black/50 border border-[#333] backdrop-blur text-[9px] font-mono text-center text-yellow-500 focus:outline-none focus:border-yellow-500/50 transition-all rounded-sm py-px [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isFocused ? 'w-9 absolute left-3 z-30 shadow-xl' : 'w-7'}`}
      onClick={e => e.stopPropagation()}
    />
  );
};
