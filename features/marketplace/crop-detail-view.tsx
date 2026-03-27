'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, ArrowUpRight, Sparkles, Play, Pause, SkipForward, RotateCcw, CalendarDays, FlaskConical } from 'lucide-react';
import { useFarmStore } from '@/store/farm-store';
import { useI18n, useCropName } from '@/lib/i18n/i18n-context';
import { useCurrency } from '@/lib/currency-context';
import { computeGrowth, computeROI } from '@/features/simulation/growth-model';
import CropSceneRouter from '@/features/simulation/crop-scene-router';
import StatsOverlay from '@/features/simulation/stats-overlay';
import EnvironmentPanel from '@/features/simulation/environment-panel';
import GrowingGuide from './growing-guide';

export default function CropDetailView() {
  const {
    selectedCrop,
    environment,
    simulationDay,
    setSimulationDay,
    goBackToMarketplace,
    setDrawerOpen,
    openDesignLab,
  } = useFarmStore();
  const { t, locale } = useI18n();
  const { formatCurrency, currencySymbol } = useCurrency();
  const cropName = useCropName(selectedCrop?.name || '');

  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const maxDay = selectedCrop?.growth_params?.cycle_days || 60;

  const advanceDay = useCallback(() => {
    setSimulationDay(Math.min(simulationDay + 1, maxDay));
  }, [simulationDay, maxDay, setSimulationDay]);

  const skipForward = useCallback(() => {
    setSimulationDay(Math.min(simulationDay + 7, maxDay));
  }, [simulationDay, maxDay, setSimulationDay]);

  const resetDay = useCallback(() => {
    setIsPlaying(false);
    setSimulationDay(1);
  }, [setSimulationDay]);

  const simDayRef = useRef(simulationDay);
  simDayRef.current = simulationDay;

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const current = simDayRef.current;
        if (current >= maxDay) {
          setIsPlaying(false);
          return;
        }
        setSimulationDay(current + 1);
      }, 400);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, maxDay, setSimulationDay]);

  useEffect(() => {
    if (simulationDay >= maxDay) setIsPlaying(false);
  }, [simulationDay, maxDay]);

  const progressPct = ((simulationDay / maxDay) * 100).toFixed(0);

  const growthState = useMemo(() => {
    if (!selectedCrop) return null;
    return computeGrowth(simulationDay, environment, selectedCrop);
  }, [selectedCrop, environment, simulationDay]);

  if (!selectedCrop || !growthState) return null;

  const roi = computeROI(selectedCrop, growthState.health);
  const benefitSummary = locale === 'th'
    ? selectedCrop.benefit_summary_th
    : selectedCrop.benefit_summary_en;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={goBackToMarketplace}
          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">{t.detail.backToResearch}</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-border hover:border-cyan-500/30 text-xs font-medium text-muted-foreground hover:text-cyan-600 dark:hover:text-cyan-300 transition-all"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">{t.detail.researchPapers}</span>
            <ArrowUpRight size={12} />
          </button>
          <button
            onClick={() => openDesignLab(selectedCrop)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 border border-cyan-400 text-xs font-medium text-white transition-all shadow-lg shadow-cyan-500/20"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Design Lab</span>
            <ArrowUpRight size={12} />
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex items-center justify-center"
      >
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border backdrop-blur-sm shadow-lg shadow-black/5 dark:shadow-black/10">
          <div className="flex items-center gap-1.5 mr-1">
            <CalendarDays size={14} className="text-cyan-500 dark:text-cyan-400" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:inline">{t.detail.day}</span>
          </div>

          <button
            onClick={resetDay}
            title={t.simControls.resetToDay1}
            className="p-1.5 rounded-lg bg-secondary/60 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          >
            <RotateCcw size={14} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-xl border transition-all active:scale-95 ${
              isPlaying
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-500 dark:text-cyan-400 shadow-lg shadow-cyan-500/10'
                : 'bg-teal-500/15 border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/25 shadow-lg shadow-teal-500/10'
            }`}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          </button>

          <button
            onClick={advanceDay}
            disabled={simulationDay >= maxDay}
            className="px-2.5 py-1.5 rounded-lg bg-secondary/60 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95 disabled:opacity-30 text-xs font-semibold"
          >
            +1d
          </button>

          <button
            onClick={skipForward}
            disabled={simulationDay >= maxDay}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/60 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95 disabled:opacity-30 text-xs font-semibold"
          >
            <SkipForward size={12} />
            +7d
          </button>

          <div className="flex items-center gap-2 ml-1 pl-2 border-l border-border">
            <div className="w-24 sm:w-32 h-1.5 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            <span className="text-sm font-mono font-bold text-cyan-500 dark:text-cyan-400 min-w-[60px] text-right">
              {simulationDay}<span className="text-muted-foreground/50">/{maxDay}</span>
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl border border-border overflow-hidden glow-pulse"
            style={{ background: '#0a0f1a' }}
          >
            <div className="absolute top-4 left-4 right-4 z-10">
              <h2 className="text-lg font-bold text-white drop-shadow-md">
                {cropName}
              </h2>
              {selectedCrop.name.toLowerCase().includes('strawberry') || selectedCrop.name.toLowerCase().includes('tochiotome') ? (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(locale === 'th'
                    ? ["ต้องการความเย็น", "ตลาดพรีเมียม", "ระวังเชื้อราจากความชื้น"]
                    : ["Needs Cold", "Premium Market", "Fungal Risk from Moisture"]
                  ).map((tag: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 bg-white/10 border border-white/20 text-white/70 text-[10px] font-medium rounded backdrop-blur-md">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/60 italic font-mono drop-shadow-sm mt-0.5">
                  {selectedCrop.scientific_name}
                </p>
              )}
            </div>

            <div className="h-[380px] sm:h-[440px]">
              <CropSceneRouter crop={selectedCrop} growthState={growthState} />
            </div>

            <div className="absolute bottom-4 left-4 right-4 z-10">
              <StatsOverlay growthState={growthState} crop={selectedCrop} day={simulationDay} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border bg-card backdrop-blur-sm p-5"
          >
            <EnvironmentPanel />
          </motion.div>
        </div>

        <div className="xl:col-span-5 space-y-4">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border bg-card backdrop-blur-sm p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <Sparkles size={14} className="text-cyan-500 dark:text-cyan-400" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {t.detail.aiGrowingGuide}
              </h3>
            </div>
            <GrowingGuide crop={selectedCrop} currentDay={simulationDay} />
          </motion.div>

          {benefitSummary && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl border border-border bg-card backdrop-blur-sm p-5 space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <FlaskConical size={14} className="text-emerald-500 dark:text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {t.detail.benefitSummary}
                </h3>
                <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/8 border border-cyan-500/15">
                  <Sparkles size={10} className="text-cyan-500 dark:text-cyan-400" />
                  <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                    {t.detail.researchBacked}
                  </span>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {benefitSummary}
              </p>
            </motion.div>
          )}



        </div>
      </div>
    </motion.div>
  );
}
