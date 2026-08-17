import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

const THEMES = [
  { id: 'light', label: 'Vajra Default', color: '#800020' },
  { id: 'dark', label: 'Dark Mode', color: '#1a1a1a' },
  { id: 'blue', label: 'Blue Pro', color: '#1d4ed8' },
  { id: 'emerald', label: 'Emerald', color: '#059669' },
  { id: 'purple', label: 'Purple', color: '#7c3aed' },
  { id: 'ocean', label: 'Ocean', color: '#0891b2' },
  { id: 'corporate', label: 'Corporate', color: '#475569' },
] as const;

export function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-deepgray)] dark:hover:text-white hover:bg-[var(--color-border)]/40 transition-all"
        aria-label="Select theme"
        title="Select Theme"
      >
        <Palette className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[var(--color-surface)] rounded-xl shadow-xl border border-[var(--color-border)] overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
          <div className="py-2">
            <div className="px-3 pb-2 text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider border-b border-[var(--color-border)] mb-1">
              Select Theme
            </div>
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id as any);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-[var(--color-border)]/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border border-[var(--color-border-strong)] shadow-inner group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className={`font-medium ${theme === t.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-deepgray)]'}`}>
                    {t.label}
                  </span>
                </div>
                {theme === t.id && <Check className="w-4 h-4 text-[var(--color-primary)]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
