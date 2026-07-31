import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useOrboStore } from '../store';

// Bottom-center feedback toast (e.g. "Imported: 8 creatures, Boss 26 ...").
// Auto-dismisses 4s after the message appears or changes.
export const Toast = () => {
  const toast = useOrboStore(s => s.toast);
  const setToast = useOrboStore(s => s.setToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] max-w-[92vw] flex items-center px-4 py-2.5 rounded-lg border border-[#333] bg-[#111]/95 backdrop-blur shadow-2xl toast-in">
      <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500/80 shrink-0" />
      <p className="text-xs text-[#ededed] font-mono">{toast}</p>
    </div>
  );
};
