'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18n-context';

interface MetricPopoverProps {
  children: ReactNode;
  title: string;
  description: string;
  formula?: string;
  details?: { label: string; value: string }[];
}

export default function MetricPopover({
  children,
  title,
  description,
  formula,
  details,
}: MetricPopoverProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <div
        className="w-full text-left cursor-help"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {children}
      </div>

      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              onClick={() => setOpen(false)}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative z-10 w-full max-w-xs rounded-2xl bg-popover border border-border shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-3.5 border-b border-border">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Info size={14} className="text-teal-400/70 shrink-0" />
                      <span className="text-sm font-semibold text-foreground">{title}</span>
                    </div>
                    <button
                      onClick={() => setOpen(false)}
                      className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{description}</p>
                </div>

                {formula && (
                  <div className="px-4 py-3 border-b border-border bg-secondary/30">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{t.popover.formula}</span>
                    <p className="text-xs font-mono text-foreground mt-1">{formula}</p>
                  </div>
                )}

                {details && details.length > 0 && (
                  <div className="px-4 py-3 space-y-2">
                    {details.map((d) => (
                      <div key={d.label} className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{d.label}</span>
                        <span className="text-[11px] font-mono text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
