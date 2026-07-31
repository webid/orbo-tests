import type { Totem } from '../types';

// Totem card thumbnail with the tier border art behind it. Broken images are
// hidden via onError; the CSS background fails silently on its own.
export const TotemThumb = ({ totem, size }: { totem: Totem; size: number }) => (
  <div
    className="relative shrink-0 rounded overflow-hidden"
    style={{
      width: size,
      height: size,
      backgroundImage: `url(https://playorbo.fun/game/totems/card-bg/bord-tier-${totem.tier}-sm.png)`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}
  >
    <img
      src={`https://playorbo.fun/game/totems/cards/thumbs/${totem.key}.png`}
      alt={totem.name}
      loading="lazy"
      onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
      className="w-full h-full object-contain"
    />
  </div>
);
