'use client';

import { Monitor, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();

  const options = [
    { key: 'system' as const, icon: Monitor, label: 'System' },
    { key: 'light' as const, icon: Sun, label: 'Light' },
    { key: 'dark' as const, icon: Moon, label: 'Dark' },
  ];

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary/80 border border-border">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = mode === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => setMode(opt.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all ${
              isActive
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground border border-transparent'
            }`}
          >
            <Icon size={12} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
