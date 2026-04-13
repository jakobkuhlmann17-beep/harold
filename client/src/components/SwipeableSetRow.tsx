import { useState, useRef } from 'react';

interface Props {
  children: React.ReactNode;
  onComplete: () => void;
  onDelete: () => void;
  isCompleted: boolean;
  enabled: boolean;
}

export default function SwipeableSetRow({ children, onComplete, onDelete, isCompleted, enabled }: Props) {
  const [offset, setOffset] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!enabled) return <>{children}</>;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = false;
    setTransitioning(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (!swiping.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      swiping.current = true;
    }
    if (swiping.current) {
      e.preventDefault();
      // Clamp: right max 140, left max -140
      setOffset(Math.max(-140, Math.min(140, dx)));
    }
  };

  const handleTouchEnd = () => {
    setTransitioning(true);
    if (offset > 80 && !isCompleted) {
      onComplete();
      setOffset(0);
    } else if (offset < -80) {
      if (deleteConfirm) {
        onDelete();
        setOffset(0);
        setDeleteConfirm(false);
        if (deleteTimer.current) clearTimeout(deleteTimer.current);
      } else {
        setDeleteConfirm(true);
        setOffset(0);
        deleteTimer.current = setTimeout(() => setDeleteConfirm(false), 2000);
      }
    } else {
      setOffset(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Background layers */}
      <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
        <div className={`flex items-center gap-2 transition-opacity ${offset > 30 ? 'opacity-100' : 'opacity-0'}`}>
          <span className="material-symbols-outlined text-[24px] text-[#2e7d32]">check_circle</span>
          <span className="text-xs font-headline font-bold text-[#2e7d32]">Complete</span>
        </div>
        <div className={`flex items-center gap-2 transition-opacity ${offset < -30 ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-xs font-headline font-bold text-error">{deleteConfirm ? 'Swipe again' : 'Delete'}</span>
          <span className="material-symbols-outlined text-[24px] text-error">delete</span>
        </div>
      </div>
      {/* Green/red background tint */}
      {offset > 30 && <div className="absolute inset-0 bg-green-100/80 rounded-xl" />}
      {offset < -30 && <div className="absolute inset-0 bg-red-100/80 rounded-xl" />}
      {/* Row content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-surface-container-lowest"
        style={{
          transform: `translateX(${offset}px)`,
          transition: transitioning ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
