import { useOrboStore } from '../store';

export const UpdateBanner = () => {
  const updateAvailable = useOrboStore(s => s.updateAvailable);

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#111] border border-[#333] shadow-2xl rounded-lg p-3 sm:p-4 flex items-center space-x-4 animate-in slide-in-from-top-4 fade-in duration-300">
      <div>
        <h3 className="text-sm font-semibold text-[#ededed]">Update Available</h3>
        <p className="text-xs text-[#888] mt-0.5">A new version has been deployed. Reload to apply.</p>
      </div>
      <button onClick={() => window.location.reload()} className="px-3 py-1.5 bg-[#ededed] hover:bg-white text-black text-[10px] uppercase tracking-wider font-semibold rounded transition-colors shrink-0">
        Reload Now
      </button>
    </div>
  );
};
