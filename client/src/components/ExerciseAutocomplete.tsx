import { useState, useRef, useEffect } from 'react';

interface Suggestion { name: string; count: number; }

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (name: string) => void;
  placeholder?: string;
  suggestions?: Suggestion[];
}

export default function ExerciseAutocomplete({ value, onChange, onSubmit, placeholder, suggestions = [] }: Props) {
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filter suggestions client-side
  const query = value.toLowerCase();
  const filtered = query.length >= 1
    ? suggestions.filter((s) => s.name.toLowerCase().includes(query)).slice(0, 6)
    : [];

  const showDropdown = focused && query.length >= 1;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset active index when filtered list changes
  useEffect(() => { setActiveIdx(-1); }, [value]);

  const select = (name: string) => {
    onChange(name);
    setFocused(false);
    onSubmit(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filtered.length === 0) {
      if (e.key === 'Enter') { onSubmit(value); return; }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < filtered.length) {
        select(filtered[activeIdx].name);
      } else {
        onSubmit(value);
      }
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  // Highlight matching text
  const highlight = (text: string) => {
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-primary font-bold">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm font-body bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-outline text-on-surface"
      />

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-lg overflow-hidden">
          {filtered.length > 0 ? (
            filtered.map((s, i) => (
              <button
                key={s.name}
                onMouseDown={(e) => { e.preventDefault(); select(s.name); }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`w-full text-left px-4 py-3 flex justify-between items-center font-body text-sm cursor-pointer border-b border-outline-variant/20 last:border-0 transition-colors ${
                  i === activeIdx ? 'bg-primary-fixed/40' : 'hover:bg-surface-container-low'
                }`}
              >
                <span className="text-on-surface">{highlight(s.name)}</span>
                <span className="font-label text-xs text-on-surface-variant">{s.count}x</span>
              </button>
            ))
          ) : query.length >= 2 ? (
            <div className="px-4 py-3 text-sm text-on-surface-variant italic font-body">
              New exercise &mdash; press Enter to add
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
