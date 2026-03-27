'use client';

import { Search } from 'lucide-react';
import type { Crop } from '@/lib/supabase';
import { useDashboardI18n } from '@/lib/i18n/use-dashboard-i18n';

interface PaperFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterStatus: string;
  onFilterStatusChange: (status: string) => void;
  filterCropId: string;
  onFilterCropChange: (cropId: string) => void;
  crops: Crop[];
  totalCount: number;
  filteredCount: number;
}

export default function PaperFilters({
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  filterCropId,
  onFilterCropChange,
  crops,
  totalCount,
  filteredCount,
}: PaperFiltersProps) {
  const dt = useDashboardI18n();

  const statusFilters = [
    { key: 'all', label: dt.all },
    { key: 'analyzing', label: dt.aiResearching },
    { key: 'review', label: dt.readyToReview },
    { key: 'approved', label: dt.approved },
    { key: 'rejected', label: dt.rejected },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={dt.searchPapers}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-teal-500/30 transition-colors"
          />
        </div>

        <select
          value={filterCropId}
          onChange={(e) => onFilterCropChange(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-muted border border-border text-xs text-foreground/80 focus:outline-none appearance-none cursor-pointer hover:border-ring/30 transition-colors"
        >
          <option value="all" className="bg-popover">{dt.allCrops}</option>
          {crops.map((c) => (
            <option key={c.id} value={c.id} className="bg-popover">{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-0.5">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterStatusChange(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                filterStatus === f.key
                  ? 'bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {totalCount > 0 && (
          <span className="text-[11px] text-muted-foreground/50 whitespace-nowrap shrink-0">
            {filteredCount === totalCount
              ? `${totalCount} ${dt.papers}`
              : `${filteredCount} ${dt.ofTotal} ${totalCount}`}
          </span>
        )}
      </div>
    </div>
  );
}
