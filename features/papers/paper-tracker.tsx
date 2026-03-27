'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  FileText,
  Plus,
} from 'lucide-react';
import { usePaperStore } from '@/store/paper-store';
import { useFarmStore } from '@/store/farm-store';
import { useDashboardI18n } from '@/lib/i18n/use-dashboard-i18n';
import DashboardLayout, { type DashboardSection } from '@/features/dashboard/dashboard-layout';
import PipelineStats from './pipeline-stats';
import PaperFilters from './paper-filters';
import SubmissionCard from './submission-card';
import ReviewPanel from './review-panel';
import DetailPanelWrapper from './detail-panel-wrapper';
import AddPaperModal from './add-paper-modal';
import FeedbackDashboard from './feedback-dashboard';
import UserManagement from '@/features/auth/user-management';

export default function PaperTracker() {
  const dt = useDashboardI18n();
  const { crops } = useFarmStore();
  const {
    submissions,
    selectedSubmission,
    isLoading,
    filterStatus,
    filterCropId,
    feedback,
    setFilterStatus,
    setFilterCropId,
    setSelectedSubmission,
    fetchSubmissions,
    fetchFeedback,
  } = usePaperStore();

  const [section, setSection] = useState<DashboardSection>('papers');
  const [searchQuery, setSearchQuery] = useState('');
  const [addPaperOpen, setAddPaperOpen] = useState(false);

  useEffect(() => {
    fetchSubmissions();
    fetchFeedback();
  }, []);

  const openIssueCount = useMemo(
    () => feedback.filter((f) => f.status === 'pending' || f.status === 'ai_triaged' || f.status === 'reviewing').length,
    [feedback]
  );

  const filtered = useMemo(() => {
    let result = submissions;
    if (filterStatus !== 'all') {
      if (filterStatus === 'analyzing') {
        result = result.filter((s) => s.status === 'analyzing' || s.status === 'pending');
      } else {
        result = result.filter((s) => s.status === filterStatus);
      }
    }
    if (filterCropId !== 'all') {
      result = result.filter((s) => s.crop_id === filterCropId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.authors?.toLowerCase().includes(q) ||
          s.journal?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [submissions, filterStatus, filterCropId, searchQuery]);

  const cropNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of crops) map[c.id] = c.name;
    return map;
  }, [crops]);

  const handleFilterFromStats = (status: string) => {
    setFilterStatus(status);
  };

  return (
    <DashboardLayout activeSection={section} onSectionChange={setSection} issueBadgeCount={openIssueCount}>
      {section === 'papers' && (
        <div className="space-y-5 max-w-[1200px]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">{dt.papersManagement}</h1>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                {dt.papersManagementDesc}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAddPaperOpen(true)}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-xs font-semibold transition-all active:scale-[0.97] shadow-lg shadow-teal-500/20"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">{dt.addPaper}</span>
              </button>
              <button
                onClick={fetchSubmissions}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <PipelineStats
            submissions={submissions}
            onFilterChange={handleFilterFromStats}
          />

          <PaperFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            filterCropId={filterCropId}
            onFilterCropChange={setFilterCropId}
            crops={crops}
            totalCount={submissions.length}
            filteredCount={filtered.length}
          />

          <div className={`grid gap-0 ${
            selectedSubmission ? 'lg:grid-cols-[1fr_480px]' : 'grid-cols-1'
          }`}>
            <div className="space-y-1 max-h-[calc(100vh-420px)] sm:max-h-[calc(100vh-380px)] overflow-y-auto pr-1 scrollbar-hide">
              {filtered.map((sub, i) => (
                <SubmissionCard
                  key={sub.id}
                  submission={sub}
                  cropName={cropNameMap[sub.crop_id] || 'Unknown'}
                  onSelect={setSelectedSubmission}
                  isSelected={selectedSubmission?.id === sub.id}
                  index={i}
                />
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-16 sm:py-20">
                  <FileText size={32} className="text-border mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">{dt.noPapersFound}</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    {submissions.length === 0
                      ? dt.addPaperToStart
                      : dt.adjustFilters
                    }
                  </p>
                  {submissions.length === 0 && (
                    <button
                      onClick={() => setAddPaperOpen(true)}
                      className="mt-4 px-4 py-2 rounded-xl bg-teal-500/10 text-teal-400 text-xs font-medium hover:bg-teal-500/20 transition-all"
                    >
                      <Plus size={12} className="inline mr-1" />
                      {dt.addFirstPaper}
                    </button>
                  )}
                </div>
              )}
            </div>

            <DetailPanelWrapper
              open={!!selectedSubmission}
              onClose={() => setSelectedSubmission(null)}
            >
              {selectedSubmission && (
                <ReviewPanel
                  submission={selectedSubmission}
                  onClose={() => setSelectedSubmission(null)}
                  cropName={cropNameMap[selectedSubmission.crop_id] || 'Unknown'}
                />
              )}
            </DetailPanelWrapper>
          </div>
        </div>
      )}

      {section === 'issues' && (
        <FeedbackDashboard />
      )}

      {section === 'users' && (
        <div className="max-w-[900px]">
          <div className="mb-5">
            <h1 className="text-lg sm:text-xl font-bold text-foreground">{dt.userManagement}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
              {dt.userManagementDesc}
            </p>
          </div>
          <UserManagement />
        </div>
      )}

      <AnimatePresence>
        {addPaperOpen && (
          <AddPaperModal
            open={addPaperOpen}
            onClose={() => setAddPaperOpen(false)}
            crops={crops}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
