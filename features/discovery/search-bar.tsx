'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFarmStore } from '@/store/farm-store';
import { useI18n } from '@/lib/i18n/i18n-context';

export default function OmniSearchBar() {
  const { searchQuery, setSearchQuery } = useFarmStore();
  const { t } = useI18n();
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focused && !searchQuery) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [focused, searchQuery]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % t.search.placeholders.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [t.search.placeholders.length]);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <motion.div
        className={`relative flex items-center gap-3 px-5 py-3.5 rounded-2xl border transition-all duration-300 ${
          focused
            ? 'bg-card border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.12)]'
            : 'bg-card border-border hover:border-ring/30 shadow-sm'
        } backdrop-blur-xl`}
        layout
      >
        <Search size={18} className={focused ? 'text-cyan-400' : 'text-muted-foreground'} />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={t.search.placeholders[placeholderIdx]}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        )}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary border border-border">
          <Sparkles size={12} className="text-cyan-400" />
          <span className="text-[10px] font-medium text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
            AI
          </span>
        </div>
      </motion.div>

      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="px-4 py-2 border-b border-border">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                {t.search.popularSearches}
              </span>
            </div>
            {t.search.suggestions.map((s, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left"
                onMouseDown={() => {
                  setSearchQuery(s);
                  setShowSuggestions(false);
                }}
              >
                <Search size={12} className="text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground">{s}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
