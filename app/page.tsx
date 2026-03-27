'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFarmStore } from '@/store/farm-store';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { I18nProvider, useI18n } from '@/lib/i18n/i18n-context';
import { CurrencyProvider } from '@/lib/currency-context';
import { ThemeProvider } from '@/lib/theme-context';
import Header from '@/features/discovery/header';
import OmniSearchBar from '@/features/discovery/search-bar';
import SeasonalChips from '@/features/discovery/seasonal-chips';
import MarketplaceFeed from '@/features/marketplace/marketplace-feed';
import CropDetailView from '@/features/marketplace/crop-detail-view';
import ScientificDrawer from '@/features/discovery/scientific-drawer';
import PaperTracker from '@/features/papers/paper-tracker';
import LoginPage from '@/features/auth/login-page';
import ScrollToTop from '@/features/discovery/scroll-to-top';
import DesignLabView from '@/features/parametric/design-lab-view';
import ProcurementDashboard from '@/features/procurement/procurement-dashboard';
import OperationsDashboard from '@/features/operations/operations-dashboard';

function MarketplaceView() {
  const { t } = useI18n();

  return (
    <motion.div
      key="marketplace"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div className="text-center space-y-3 pt-6 pb-8">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight"
        >
          {t.hero.title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed"
        >
          {t.hero.subtitle}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="max-w-2xl mx-auto mb-10"
      >
        <OmniSearchBar />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <SeasonalChips />
      </motion.div>

      <MarketplaceFeed />
    </motion.div>
  );
}

function DetailView() {
  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.35 }}
    >
      <CropDetailView />
    </motion.div>
  );
}

function PapersView() {
  const { isAdmin, user } = useAuth();
  const { setViewMode } = useFarmStore();

  useEffect(() => {
    if (!user || !isAdmin) {
      setViewMode('marketplace');
    }
  }, [user, isAdmin, setViewMode]);

  if (!user || !isAdmin) return null;

  return (
    <motion.div
      key="papers"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
    >
      <PaperTracker />
    </motion.div>
  );
}

function LoginView() {
  const { user } = useAuth();
  const { setViewMode } = useFarmStore();

  useEffect(() => {
    if (user) {
      setViewMode('marketplace');
    }
  }, [user, setViewMode]);

  if (user) return null;

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
    >
      <LoginPage />
    </motion.div>
  );
}

function App() {
  const { viewMode } = useFarmStore();

  return (
    <div className="min-h-screen bg-background transition-colors">
      <Header />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[100px]" style={{ background: 'var(--glow-cyan)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px]" style={{ background: 'var(--glow-emerald)' }} />
      </div>

      <main className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-6 overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'marketplace' && <MarketplaceView key="marketplace" />}
          {viewMode === 'detail' && <DetailView key="detail" />}
          {viewMode === 'papers' && <PapersView key="papers" />}
          {viewMode === 'login' && <LoginView key="login" />}
          {viewMode === 'design-lab' && <DesignLabView key="design-lab" />}
          {viewMode === 'procurement' && <ProcurementDashboard key="procurement" />}
          {viewMode === 'operations' && <OperationsDashboard key="operations" />}
        </AnimatePresence>
      </main>

      <ScientificDrawer />
      <ScrollToTop />
    </div>
  );
}

export default function Dashboard() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <CurrencyProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </CurrencyProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
