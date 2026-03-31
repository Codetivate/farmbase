'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, FileSearch, Sprout, LogOut, ChevronDown, Shield, Crown, LogIn, Coffee, Package, Gauge } from 'lucide-react';
import { useFarmStore } from '@/store/farm-store';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-context';
import LanguageToggle from './language-toggle';
import ThemeToggle from './theme-toggle';
import BuyCoffeeModal from './buy-coffee-modal';

const roleLabels: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'text-cyan-500 dark:text-cyan-400' },
  editor: { label: 'Editor', color: 'text-amber-500 dark:text-amber-400' },
  viewer: { label: 'Viewer', color: 'text-muted-foreground' },
};

export default function Header() {
  const { viewMode, setViewMode } = useFarmStore();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { t, locale } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [coffeeOpen, setCoffeeOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const role = roleLabels[profile?.role || 'viewer'] || roleLabels.viewer;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl transition-colors">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center">
        <div className="flex items-center gap-2.5 shrink-0">
          <motion.div
            className="flex items-center gap-2.5 cursor-pointer"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setViewMode('marketplace')}
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
                <FlaskConical size={16} className="text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-foreground tracking-tight leading-none">
                {t.header.farmbase}
              </h1>
              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-[0.2em]">
                {t.header.farmingResearch}
              </p>
            </div>
          </motion.div>
        </div>

        <nav className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('marketplace')}
              className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'marketplace' || viewMode === 'detail'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sprout size={14} />
              <span>{t.header.research}</span>
              {(viewMode === 'marketplace' || viewMode === 'detail') && (
                <motion.div
                  layoutId="header-tab-indicator"
                  className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-cyan-500 dark:bg-cyan-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
            {isAdmin && (
              <button
                onClick={() => setViewMode('papers')}
                className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'papers'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileSearch size={14} />
                <span>{t.header.scientificHub}</span>
                {viewMode === 'papers' && (
                  <motion.div
                    layoutId="header-tab-indicator"
                    className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-cyan-500 dark:bg-cyan-400"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            )}
            <button
              onClick={() => setViewMode('control-room')}
              className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'control-room'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Gauge size={14} />
              <span>{t.controlRoom.title}</span>
              {viewMode === 'control-room' && (
                <motion.div
                  layoutId="header-tab-indicator"
                  className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-cyan-500 dark:bg-cyan-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          </div>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setCoffeeOpen(true)}
            className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-400/40 text-amber-600 dark:text-amber-300 hover:from-amber-500/15 hover:to-orange-500/15 active:scale-[0.97] coffee-btn-glow"
          >
            <Coffee size={13} className="transition-transform group-hover:rotate-[-12deg]" />
            <span className="hidden sm:inline">{t.coffee.buyMeCoffee}</span>
          </button>

          <LanguageToggle />

          {user ? (
            <>
              <button
                onClick={() => setViewMode(viewMode === 'papers' && isAdmin ? 'marketplace' : isAdmin ? 'papers' : 'marketplace')}
                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors sm:hidden"
              >
                {viewMode === 'papers' ? <Sprout size={16} /> : isAdmin ? <FileSearch size={16} /> : null}
              </button>

              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-secondary border border-transparent hover:border-border transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-[11px] font-bold text-foreground overflow-hidden">
                    {user?.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      (profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name)?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'
                    )}
                  </div>
                  <ChevronDown size={12} className={`text-muted-foreground transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-border bg-popover/95 backdrop-blur-xl shadow-xl overflow-hidden"
                    >
                      <div className="p-3 border-b border-border">
                        <p className="text-xs font-medium text-foreground truncate">
                          {profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'No name set'}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {profile?.email || user?.email}
                        </p>
                        <div className="flex items-center gap-1 mt-1.5">
                          {profile?.role === 'admin' ? (
                            <Crown size={9} className="text-cyan-500 dark:text-cyan-400" />
                          ) : (
                            <Shield size={9} className={role.color} />
                          )}
                          <span className={`text-[9px] font-medium ${role.color}`}>{role.label}</span>
                        </div>
                      </div>

                      <div className="p-1.5 border-b border-border">
                        {isAdmin && (
                          <button
                            onClick={() => { setViewMode('papers'); setMenuOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-secondary transition-colors text-left"
                          >
                            <FileSearch size={13} className="text-muted-foreground" />
                            {t.header.scientificHub}
                          </button>
                        )}
                        <button
                          onClick={() => { setViewMode('procurement'); setMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-secondary transition-colors text-left"
                        >
                          <Package size={13} className="text-muted-foreground" />
                          {locale === 'th' ? 'บันทึกไว้' : 'My Favourite'}
                        </button>
                        <button
                          onClick={() => { setViewMode('control-room'); setMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-secondary transition-colors text-left"
                        >
                          <Gauge size={13} className="text-muted-foreground" />
                          {t.controlRoom.title}
                        </button>
                        <button
                          onClick={() => { signOut(); setMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors text-left"
                        >
                          <LogOut size={13} />
                          {t.header.signOut}
                        </button>
                      </div>

                      <div className="p-3">
                        <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mb-2">Theme</p>
                        <ThemeToggle />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="relative flex items-center gap-2">
              <button
                onClick={() => setViewMode('login')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-500/15 hover:shadow-cyan-500/25 active:scale-[0.98]"
              >
                <LogIn size={14} />
                <span>{t.header.signIn}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <BuyCoffeeModal open={coffeeOpen} onClose={() => setCoffeeOpen(false)} />
    </header>
  );
}
