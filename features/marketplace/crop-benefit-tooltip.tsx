'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18n-context';

interface CropBenefitTooltipProps {
  benefitEn: string;
  benefitTh: string;
  children: React.ReactNode;
}

export default function CropBenefitTooltip({
  benefitEn,
  benefitTh,
  children,
}: CropBenefitTooltipProps) {
  const [visible, setVisible] = useState(false);
  const { locale, t } = useI18n();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const summary = locale === 'th' ? benefitTh : benefitEn;

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), 350);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(false), 150);
  }, []);

  if (!summary) return <>{children}</>;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 w-[320px] pointer-events-auto"
          >
            <div className="rounded-xl border border-border bg-popover backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/40">
                <div className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <FlaskConical size={11} className="text-emerald-500 dark:text-emerald-400" />
                </div>
                <span className="text-[10px] font-semibold text-foreground uppercase tracking-wider">
                  {t.detail.benefitSummary}
                </span>
                <div className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-500/8 border border-cyan-500/15">
                  <Sparkles size={8} className="text-cyan-400" />
                  <span className="text-[8px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                    {t.detail.researchBacked}
                  </span>
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] leading-[1.7] text-foreground/80">
                  {summary}
                </p>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 border-r border-b border-border bg-popover" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
