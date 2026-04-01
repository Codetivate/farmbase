'use client';

import { useFarmStore } from '@/store/farm-store';
import { useI18n } from '@/lib/i18n/i18n-context';
import { Slider } from '@/components/ui/slider';
import { Thermometer, Droplets, Wind, Sun, Sparkles } from 'lucide-react';

interface SliderRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  optimal: number;
  unit: string;
  optLabel: string;
  onChange: (val: number) => void;
}

function SliderRow({ icon, label, value, min, max, optimal, unit, optLabel, onChange }: SliderRowProps) {
  const isOptimal = Math.abs(value - optimal) < (max - min) * 0.15;
  const isWarning = !isOptimal && value >= min && value <= max;
  const isDanger = value < min || value > max;

  const statusColor = isDanger
    ? 'text-rose-500 dark:text-rose-400'
    : isWarning
      ? 'text-amber-500 dark:text-amber-400'
      : 'text-emerald-500 dark:text-emerald-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-xs font-medium text-foreground/80 uppercase tracking-wider">
            {label}
          </span>
        </div>
        <span className={`text-sm font-mono font-semibold ${statusColor}`}>
          {value}
          {unit?.replace(/\\u00B0|\\u00b0/g, '°')}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max + (max - min) * 0.3}
        step={(max - min) / 100}
        onValueChange={([v]) => onChange(Math.round(v * 10) / 10)}
        className="w-full"
      />
      <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
        <span>{min}{unit?.replace(/\\u00B0|\\u00b0/g, '°')}</span>
        <span className="text-emerald-600 dark:text-emerald-500">{optLabel}: {optimal}{unit?.replace(/\\u00B0|\\u00b0/g, '°')}</span>
        <span>{max}{unit?.replace(/\\u00B0|\\u00b0/g, '°')}</span>
      </div>
    </div>
  );
}

export default function EnvironmentPanel() {
  const { environment, setEnvironment, selectedCrop, simulationDay, setSimulationDay } =
    useFarmStore();
  const { t, locale } = useI18n();

  if (!selectedCrop) return null;

  const opt = selectedCrop.optimal_conditions;

  const handleOptimize = () => {
    setEnvironment({
      temperature: opt.temperature.optimal,
      humidity: opt.humidity.optimal,
      co2: opt.co2.optimal,
      light: opt.light.optimal,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {t.environment.title}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOptimize}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 hover:border-cyan-500/50 transition-all duration-200"
          >
            <Sparkles size={10} />
            {locale === 'th' ? 'ปรับค่าเหมาะสม' : 'Optimize'}
          </button>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-500 dark:text-emerald-400 font-mono">{t.environment.live}</span>
        </div>
      </div>

      <SliderRow
        icon={<Thermometer size={14} />}
        label={t.environment.temperature}
        value={environment.temperature}
        min={opt.temperature.min - 5}
        max={opt.temperature.max + 10}
        optimal={opt.temperature.optimal}
        unit={opt.temperature.unit}
        optLabel={t.environment.optimal}
        onChange={(v) => setEnvironment({ temperature: v })}
      />
      <SliderRow
        icon={<Droplets size={14} />}
        label={t.environment.humidity}
        value={environment.humidity}
        min={Math.max(0, opt.humidity.min - 20)}
        max={100}
        optimal={opt.humidity.optimal}
        unit={opt.humidity.unit}
        optLabel={t.environment.optimal}
        onChange={(v) => setEnvironment({ humidity: v })}
      />
      <SliderRow
        icon={<Wind size={14} />}
        label={t.environment.co2}
        value={environment.co2}
        min={200}
        max={opt.co2.max + 1000}
        optimal={opt.co2.optimal}
        unit={opt.co2.unit}
        optLabel={t.environment.optimal}
        onChange={(v) => setEnvironment({ co2: Math.round(v) })}
      />
      <SliderRow
        icon={<Sun size={14} />}
        label={t.environment.light}
        value={environment.light}
        min={0}
        max={opt.light.max * 2}
        optimal={opt.light.optimal}
        unit={opt.light.unit}
        optLabel={t.environment.optimal}
        onChange={(v) => setEnvironment({ light: Math.round(v) })}
      />

      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t.environment.simulationDay}
          </span>
          <span className="text-sm font-mono font-semibold text-cyan-500 dark:text-cyan-400">
            {t.detail.day} {simulationDay}/{selectedCrop.growth_params.cycle_days}
          </span>
        </div>
        <Slider
          value={[simulationDay]}
          min={1}
          max={selectedCrop.growth_params.cycle_days}
          step={1}
          onValueChange={([v]) => setSimulationDay(v)}
          className="w-full"
        />
      </div>
    </div>
  );
}
