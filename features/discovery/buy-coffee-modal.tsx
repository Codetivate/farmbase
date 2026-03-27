'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Coffee } from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18n-context';

function CoffeeCupSvg({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        d="M8 18C8 16.8954 8.89543 16 10 16H32C33.1046 16 34 16.8954 34 18V34C34 38.4183 30.4183 42 26 42H16C11.5817 42 8 38.4183 8 34V18Z"
        fill="#FFDD67"
      />
      <path
        d="M34 20H36C38.7614 20 41 22.2386 41 25V25C41 27.7614 38.7614 30 36 30H34"
        stroke="#FFDD67"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <ellipse cx="15" cy="26" rx="2.5" ry="3" fill="#3d2c1e" opacity="0.15" />
      <ellipse cx="27" cy="26" rx="2.5" ry="3" fill="#3d2c1e" opacity="0.15" />
      <path d="M18 32C18 32 21 35 24 32" stroke="#3d2c1e" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      <path d="M13 12C13 12 14 6 17 6" stroke="#FFDD67" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M21 12C21 12 22 4 25 4" stroke="#FFDD67" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M29 12C29 12 30 7 33 7" stroke="#FFDD67" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

interface BuyCoffeeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BuyCoffeeModal({ open, onClose }: BuyCoffeeModalProps) {
  const { t, locale } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto"
          onClick={onClose}
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

          <div className="min-h-full flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[340px] rounded-3xl bg-white dark:bg-stone-900 shadow-2xl overflow-hidden"
            >
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all z-10"
              >
                <X size={18} />
              </button>

              <div className="px-6 pt-6 pb-3 bg-gradient-to-b from-amber-50/80 dark:from-amber-950/30 to-transparent">
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    initial={{ rotate: -10 }}
                    animate={{ rotate: [0, -6, 6, -3, 0] }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    <CoffeeCupSvg size={52} />
                  </motion.div>
                  <h3 className="mt-2 text-xl font-extrabold text-stone-800 dark:text-stone-100 tracking-tight">
                    {locale === 'th' ? 'เลี้ยงกาแฟเรา' : 'Buy us a coffee'}
                  </h3>
                  <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                    {t.coffee.supportSubtitle}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 25 }}
                  className="flex justify-center"
                >
                  <div className="relative p-3 bg-white rounded-2xl border-2 border-stone-100 dark:border-stone-700 shadow-sm">
                    <img
                      src="/promptpay-qr.jpg"
                      alt="PromptPay QR Code"
                      width={220}
                      height={220}
                      className="rounded-xl object-contain"
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mt-4 flex flex-col items-center gap-2"
                >
                  <div className="flex items-center gap-1.5 text-stone-400 dark:text-stone-500">
                    <Coffee size={12} />
                    <span className="text-xs">
                      {locale === 'th'
                        ? 'สแกน QR แล้วจ่ายผ่านแอปธนาคาร'
                        : 'Scan QR and pay via banking app'}
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800"
                >
                  <p className="text-center text-xs text-stone-400 dark:text-stone-500 flex items-center justify-center gap-1">
                    <Heart size={11} className="text-red-400" fill="currentColor" />
                    {t.coffee.thankYouDesc}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
