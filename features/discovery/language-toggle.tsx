'use client';

import { motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n/i18n-context';

export default function LanguageToggle() {
  const { locale, toggleLocale } = useI18n();

  return (
    <button
      onClick={toggleLocale}
      className="relative flex items-center h-8 w-[68px] rounded-full bg-secondary/80 border border-border hover:border-ring/30 transition-all overflow-hidden"
      title={locale === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
    >
      <motion.div
        className="absolute top-0.5 w-[30px] h-[28px] rounded-full bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-500/30"
        animate={{ left: locale === 'th' ? 2 : 34 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
      <span
        className={`relative z-10 flex-1 text-center text-[10px] font-bold tracking-wide transition-colors duration-200 ${
          locale === 'th' ? 'text-cyan-600 dark:text-cyan-300' : 'text-muted-foreground'
        }`}
      >
        TH
      </span>
      <span
        className={`relative z-10 flex-1 text-center text-[10px] font-bold tracking-wide transition-colors duration-200 ${
          locale === 'en' ? 'text-cyan-600 dark:text-cyan-300' : 'text-muted-foreground'
        }`}
      >
        EN
      </span>
    </button>
  );
}
