import { useState, useEffect } from 'react';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined'
      ? window.innerWidth < 768 || 'ontouchstart' in window
      : false
  );

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return isMobile;
}
