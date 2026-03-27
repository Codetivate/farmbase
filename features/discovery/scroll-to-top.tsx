'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-card border border-border shadow-lg shadow-black/10 dark:shadow-black/30 backdrop-blur-xl hover:bg-secondary hover:border-emerald-500/30 hover:shadow-emerald-500/10 transition-colors group"
          aria-label="Scroll to top"
        >
          <ChevronUp
            size={20}
            className="text-muted-foreground group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors"
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
