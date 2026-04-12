import { useState } from 'react';

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  confirmStyle: 'error' | 'primary';
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel, confirmStyle, onConfirm, onCancel }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-surface-container-lowest rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-headline font-bold text-xl text-on-surface mb-2">{title}</h3>
        <p className="text-on-surface-variant text-sm mb-8 font-body">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="bg-surface-container-high rounded-full px-6 py-2.5 font-headline font-bold text-sm text-on-surface hover:bg-surface-container-highest transition-colors">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className={`rounded-full px-6 py-2.5 font-headline font-bold text-sm text-white disabled:opacity-50 flex items-center gap-2 transition-opacity hover:opacity-90 ${
              confirmStyle === 'error' ? 'bg-error' : 'hearth-glow'
            }`}>
            {loading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
