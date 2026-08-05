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
        className="flex items-center gap-2 p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
        aria-label="Select theme"
        title="Select Theme"
      >
        <Palette className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
          <div className="py-2">
            <div className="px-3 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-white/5 mb-1">
              Select Theme
            </div>
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id as any);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border border-gray-200 dark:border-white/20 shadow-inner group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className={`font-medium ${theme === t.id ? 'text-[var(--color-primary)]' : 'text-gray-700 dark:text-gray-300'}`}>
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
