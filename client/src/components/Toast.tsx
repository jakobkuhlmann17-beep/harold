import { useEffect } from 'react';

interface Props {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({ message, onDismiss, duration = 3000 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] bg-[#1b1c1c] text-white rounded-full px-6 py-3 font-body text-sm shadow-lg flex items-center gap-2">
      <span className="material-symbols-outlined text-[18px]">check_circle</span>
      {message}
    </div>
  );
}
