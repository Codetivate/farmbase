'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  MessageSquareWarning,
  Activity,
} from 'lucide-react';
import { useDashboardI18n } from '@/lib/i18n/use-dashboard-i18n';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useFarmStore } from '@/store/farm-store';

export type DashboardSection = 'papers' | 'issues' | 'users';

interface DashboardLayoutProps {
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  issueBadgeCount?: number;
  children: React.ReactNode;
}

export default function DashboardLayout({
  activeSection,
  onSectionChange,
  issueBadgeCount,
  children,
}: DashboardLayoutProps) {
  const dt = useDashboardI18n();
  const { t } = useI18n();
  const { setViewMode } = useFarmStore();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { key: 'papers' as DashboardSection, label: dt.navPapers, icon: FileText },
    { key: 'issues' as DashboardSection, label: dt.navIssues, icon: MessageSquareWarning },
    { key: 'users' as DashboardSection, label: dt.navUsers, icon: Users },
  ];

  return (
    <div className="flex min-h-[calc(100vh-80px)]">
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-background/80 backdrop-blur-sm transition-all duration-300 shrink-0 ${
          collapsed ? 'w-[60px]' : 'w-[200px]'
        }`}
      >
        <div className="p-3">
          <div className={`flex items-center gap-2 px-2 py-1.5 mb-1 ${collapsed ? 'justify-center' : ''}`}>
            {!collapsed && (
              <div className="flex items-center gap-2 flex-1">
                <LayoutDashboard size={14} className="text-teal-400" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{dt.dashboardLabel}</span>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;
              const showBadge = item.key === 'issues' && issueBadgeCount && issueBadgeCount > 0;
              return (
                <button
                  key={item.key}
                  onClick={() => onSectionChange(item.key)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-teal-500/10 text-teal-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <div className="relative">
                    <Icon size={16} className={isActive ? 'text-teal-400' : ''} />
                    {showBadge && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 flex items-center justify-center px-0.5 rounded-full bg-amber-500 text-[11px] font-bold text-white">
                        {issueBadgeCount > 99 ? '99+' : issueBadgeCount}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <span className="flex-1 text-left">{item.label}</span>
                  )}
                  {!collapsed && showBadge && (
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                      {issueBadgeCount}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="my-2 border-t border-border/50" />
            <button
              onClick={() => setViewMode('operations')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <Activity size={16} />
              {!collapsed && (
                <span className="flex-1 text-left">{t.operations?.title || 'Live Operations'}</span>
              )}
            </button>
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 pb-20 md:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border safe-area-inset-bottom">
        <div className="flex items-center justify-around py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.key;
            const showBadge = item.key === 'issues' && issueBadgeCount && issueBadgeCount > 0;
            return (
              <button
                key={item.key}
                onClick={() => onSectionChange(item.key)}
                className={`flex flex-col items-center gap-0.5 py-2 px-5 rounded-xl transition-all ${
                  isActive ? 'text-teal-400' : 'text-muted-foreground'
                }`}
              >
                <div className="relative">
                  <Icon size={20} />
                  {showBadge && (
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 flex items-center justify-center px-0.5 rounded-full bg-amber-500 text-[11px] font-bold text-white">
                      {issueBadgeCount > 99 ? '99+' : issueBadgeCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
          <div className="h-6 w-px bg-border/50 mx-1" />
          <button
            onClick={() => setViewMode('operations')}
            className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all text-amber-500 hover:text-amber-400"
          >
            <Activity size={20} />
            <span className="text-[10px] font-medium truncate max-w-[60px]">{t.operations?.title || 'Live'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
