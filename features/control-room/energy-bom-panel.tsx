'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n/i18n-context';

// ═══════════════════════════════════════════════════════
// BOM — Extracted from Isaac Sim build_farm.py LOD 400
// Each item maps to a real USD prim path in the 3D twin
// ═══════════════════════════════════════════════════════
interface BOMItem {
  id: string;
  category: string;
  name: string;
  isaacPath: string;     // USD path in Isaac Sim
  spec: string;
  qty: number;
  unit: string;
  unitPrice: number;     // user-editable (baht)
  wattage?: number;      // power draw in watts (if applicable)
  hoursPerDay?: number;  // operating hours
}

const DEFAULT_BOM: BOMItem[] = [
  // ── สมองกล & เซนเซอร์ (AI & IoT) ──
  { id: 'JETSON', category: '🤖 AI', name: 'NVIDIA Jetson Orin Nano (8GB)', isaacPath: '/World/Ctrl/Jetson', spec: 'Developer Kit', qty: 1, unit: 'set', unitPrice: 16500, wattage: 15, hoursPerDay: 24, },
  { id: 'SENSORS', category: '🤖 AI', name: 'Sensirion SCD41 & SHT4x', isaacPath: '/World/Racks/*/IOT_*', spec: 'CO2, Temp, Humidity', qty: 1, unit: 'set', unitPrice: 3500, wattage: 2, hoursPerDay: 24, },
  
  // ── ระบบแสงสว่าง (Lighting) ──
  { id: 'LED', category: '💡 LED', name: 'Samsung LM301H EVO + Osram 730nm', isaacPath: '/World/Racks/*/LED_*', spec: 'Full spec + Far-red', qty: 1, unit: 'set', unitPrice: 14000, wattage: 400, hoursPerDay: 14, },
  
  // ── คุมอากาศและน้ำ (HVAC & Water) ──
  { id: 'AC', category: '❄️ HVAC', name: 'Haier Inverter 12,000 BTU', isaacPath: '/World/HVAC/AC', spec: 'Self-Cleaning', qty: 1, unit: 'set', unitPrice: 11000, wattage: 800, hoursPerDay: 24, },
  { id: 'CHILLER', category: '💧 Water', name: 'Hailea HC-150A Chiller', isaacPath: '/World/Irrig/Chiller', spec: 'Aquarium Chiller', qty: 1, unit: 'set', unitPrice: 6500, wattage: 150, hoursPerDay: 12, },
  
  // ── พลังงานสำรอง (Power Storage) ──
  { id: 'BATTERY', category: '🔋 Power', name: 'Sodium-ion Battery 12V 50Ah', isaacPath: '/World/Power/Battery', spec: 'Na-ion Deep Cycle', qty: 1, unit: 'set', unitPrice: 8000, },

  // ── โครงสร้างห้อง (Structure & Racks) ──
  { id: 'ROOM', category: '🏗️ Room', name: 'Isowall EPS 2" + Alu 2020', isaacPath: '/World/Room/*', spec: 'Include Gutters', qty: 1, unit: 'set', unitPrice: 23500, },

  // ── พันธุ์พืช (Crop Phase 1) — Self-propagating ──
  { id: 'PLANT', category: '🌱 Crop', name: 'Tochiotome Tissue Culture', isaacPath: '/World/Racks/*/Cr_*', spec: 'Self-propagated (Nursery)', qty: 160, unit: 'pcs', unitPrice: 0, },
];

// ═══════════════════════════════════════════════════════
// ENERGY OPTIMIZER PRESETS
// ═══════════════════════════════════════════════════════
interface OptimizePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  savings: string;
  changes: Record<string, Partial<{ hoursPerDay: number; wattage: number }>>;
}

const OPTIMIZE_PRESETS_BASE = [
  {
    id: 'eco', nameKey: 'ecoMode' as const, descKey: 'ecoDesc' as const,
    icon: '🌿', savings: '~15%',
    changes: { LED: { hoursPerDay: 12 }, AC: { wattage: 650 } },
  },
  {
    id: 'solar', nameKey: 'solarReady' as const, descKey: 'solarDesc' as const,
    icon: '☀️', savings: '~40% (w/ panels)',
    changes: { PUMP: { hoursPerDay: 6 }, AC: { wattage: 600 } },
  },
  {
    id: 'night', nameKey: 'nightShift' as const, descKey: 'nightDesc' as const,
    icon: '🌙', savings: '~25% cost',
    changes: { LED: { hoursPerDay: 14 } },
  },
];

// ═══════════════════════════════════════════════════════
// ENERGY MONITOR COMPONENT
// ═══════════════════════════════════════════════════════
function EnergyGauge({ kwhToday, kwhMonth, costMonth, solarPct, eb }: {
  kwhToday: number; kwhMonth: number; costMonth: number; solarPct: number;
  eb: any;
}) {
  const maxMonth = 1000; // scale
  const pct = Math.min(100, (kwhMonth / maxMonth) * 100);

  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">{eb.energyMonitor}</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
          {eb.live}
        </span>
      </div>

      {/* Big number display */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-xl bg-[hsl(var(--surface-2))]/50 border border-[hsl(var(--border))]/30">
          <div className="text-2xl font-black text-foreground">{kwhToday.toFixed(1)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{eb.kwhToday}</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-[hsl(var(--surface-2))]/50 border border-[hsl(var(--border))]/30">
          <div className="text-2xl font-black text-amber-400">{kwhMonth.toFixed(0)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{eb.kwhMonth}</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-[hsl(var(--surface-2))]/50 border border-[hsl(var(--border))]/30">
          <div className="text-2xl font-black text-red-400">฿{costMonth.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{eb.costMonth}</div>
        </div>
      </div>

      {/* Power breakdown bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{eb.powerBreakdown}</span>
          <span>{kwhMonth.toFixed(0)} / {maxMonth} kWh</span>
        </div>
        <div className="h-3 rounded-full bg-[hsl(var(--surface-2))] overflow-hidden flex">
          <div className="bg-blue-500 transition-all" style={{ width: `${pct * 0.72}%` }} title="AC 72%" />
          <div className="bg-purple-500 transition-all" style={{ width: `${pct * 0.24}%` }} title="LED 24%" />
          <div className="bg-emerald-500 transition-all" style={{ width: `${pct * 0.04}%` }} title="Other 4%" />
        </div>
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />AC {(pct*0.72).toFixed(0)}%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" />LED {(pct*0.24).toFixed(0)}%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Other</span>
        </div>
      </div>

      {/* Solar / Grid toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">☀️</span>
          <div>
            <div className="text-xs font-semibold text-foreground">{eb.solarOffset}</div>
            <div className="text-[10px] text-muted-foreground">{eb.solarSwitching}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400">{solarPct}%</span>
          <div className="w-10 h-5 rounded-full bg-[hsl(var(--surface-2))] border border-[hsl(var(--border))] relative cursor-pointer">
            <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
              solarPct > 0 ? 'left-5 bg-amber-400' : 'left-0.5 bg-neutral-500'
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════
export default function EnergyBomPanel({ initialTab = 'energy' }: { initialTab?: 'energy' | 'bom' }) {
  const { t } = useI18n();
  const eb = t.energyBom;
  const [bom, setBom] = useState<BOMItem[]>(DEFAULT_BOM);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [elecRate, setElecRate] = useState(4.5); // baht per kWh
  const [tab, setTab] = useState<'energy' | 'bom'>(initialTab);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Simulate live energy reading
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(timer);
  }, []);

  // Calculate totals
  const totalCost = bom.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const categories = Array.from(new Set(bom.map(i => i.category)));

  // Energy calculation
  const dailyKwh = bom.reduce((s, i) => {
    if (i.wattage && i.hoursPerDay) return s + (i.wattage * i.qty * i.hoursPerDay) / 1000;
    return s;
  }, 0);
  const monthlyKwh = dailyKwh * 30;
  const monthlyCost = monthlyKwh * elecRate;

  // Simulated "today so far" based on time
  const now = new Date();
  const hoursPassed = now.getHours() + now.getMinutes() / 60;
  const todayKwh = dailyKwh * (hoursPassed / 24) + (Math.sin(tick * 0.3) * 0.5);

  // Apply optimize preset
  const applyPreset = (preset: typeof OPTIMIZE_PRESETS_BASE[number]) => {
    if (activePreset === preset.id) {
      setBom(DEFAULT_BOM);
      setActivePreset(null);
      return;
    }
    const updated = DEFAULT_BOM.map(item => {
      const change = (preset.changes as Record<string, any>)[item.id];
      if (change) return { ...item, ...change };
      return { ...item };
    });
    setBom(updated);
    setActivePreset(preset.id);
  };

  const updatePrice = (id: string, price: number) => {
    setBom(prev => prev.map(i => i.id === id ? { ...i, unitPrice: price } : i));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

      {/* Tab Switch */}
      <div className="flex gap-2">
        {[
          { key: 'energy' as const, label: eb.tabEnergy, desc: eb.tabEnergyDesc },
          { key: 'bom' as const, label: eb.tabBom, desc: eb.tabBomDesc },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-left transition-all border ${
              tab === t.key
                ? 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/5'
                : 'bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:border-primary/20'
            }`}>
            <div>
              <div className="text-xs font-semibold text-foreground">{t.label}</div>
              <div className="text-[10px] text-muted-foreground">{t.desc}</div>
            </div>
            {tab === t.key && (
              <motion.div layoutId="energy-tab-glow"
                className="absolute inset-0 rounded-xl border-2 border-primary/40 pointer-events-none"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'energy' ? (
          <motion.div key="energy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-4">

            {/* Energy Gauge */}
            <EnergyGauge
              kwhToday={todayKwh}
              kwhMonth={monthlyKwh}
              costMonth={monthlyCost}
              solarPct={activePreset === 'solar' ? 45 : 0}
              eb={eb}
            />

            {/* Optimize Presets */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">{eb.optimize}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {OPTIMIZE_PRESETS_BASE.map(p => (
                  <button key={p.id} onClick={() => applyPreset(p)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      activePreset === p.id
                        ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                        : 'bg-[hsl(var(--surface-2))]/50 border-[hsl(var(--border))]/30 hover:border-primary/20'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{p.icon}</span>
                      <span className="text-xs font-bold text-foreground">{eb[p.nameKey]}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug mb-2">{eb[p.descKey]}</p>
                    <div className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activePreset === p.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/10 text-primary'
                    }`}>
                      {activePreset === p.id ? eb.active : `${eb.save} ${p.savings}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Per-device power table */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">{eb.devicePower}</h3>
              <div className="space-y-1">
                {bom.filter(i => i.wattage).map(item => {
                  const itemKwh = (item.wattage! * item.qty * (item.hoursPerDay || 0)) / 1000;
                  const pct = dailyKwh > 0 ? (itemKwh / dailyKwh) * 100 : 0;
                  return (
                    <div key={item.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-[hsl(var(--surface-2))]/30 transition-colors">
                      <span className="text-xs w-32 truncate text-muted-foreground">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground w-16">{item.wattage}W ×{item.qty}</span>
                      <div className="flex-1 h-2 rounded-full bg-[hsl(var(--surface-2))] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          className={`h-full rounded-full ${pct > 50 ? 'bg-blue-500' : pct > 15 ? 'bg-purple-500' : 'bg-emerald-500'}`}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-foreground w-16 text-right">{itemKwh.toFixed(1)} kWh</span>
                      <span className="text-[10px] text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
              {/* Electricity rate */}
              <div className="flex items-center gap-3 pt-2 border-t border-[hsl(var(--border))]/30">
                <span className="text-[10px] text-muted-foreground">{eb.elecRateLabel}</span>
                <input
                  type="number" step="0.1" value={elecRate}
                  onChange={e => setElecRate(parseFloat(e.target.value) || 0)}
                  className="w-16 text-xs px-2 py-1 rounded-lg bg-[hsl(var(--surface-2))] border border-[hsl(var(--border))] text-foreground text-center"
                />
                <span className="text-[10px] text-muted-foreground">{eb.elecRateUnit}</span>
              </div>
            </div>
          </motion.div>

        ) : (
          <motion.div key="bom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-3">

            {/* Total cost card */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">{eb.bomTitle}</h3>
                <div className="text-right">
                  <div className="text-xl font-black text-foreground">฿{totalCost.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">{bom.length} {eb.itemsEditable}</div>
                </div>
              </div>

              {/* Category accordion */}
              <div className="space-y-2">
                {categories.map(cat => {
                  const items = bom.filter(i => i.category === cat);
                  const catTotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
                  const isOpen = expandedCat === cat;

                  return (
                    <div key={cat} className="rounded-xl border border-[hsl(var(--border))]/30 overflow-hidden">
                      <button onClick={() => setExpandedCat(isOpen ? null : cat)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-[hsl(var(--surface-2))]/30 hover:bg-[hsl(var(--surface-2))]/60 transition-colors">
                        <span className="text-xs font-bold text-foreground">{cat}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-amber-400">฿{catTotal.toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground">{isOpen ? '▼' : '▶'}</span>
                        </div>
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-2 space-y-1">
                              {items.map(item => (
                                <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[hsl(var(--surface-2))]/30 transition-colors group">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-foreground truncate">{item.name}</div>
                                    <div className="text-[10px] text-muted-foreground truncate">{item.spec}</div>
                                    <div className="text-[9px] text-primary/50 truncate font-mono">{item.isaacPath}</div>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground shrink-0">{item.qty} {item.unit}</span>
                                  <span className="text-[10px] text-muted-foreground shrink-0">×</span>
                                  <input
                                    type="number"
                                    value={item.unitPrice}
                                    onChange={e => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                                    className="w-16 text-xs px-1.5 py-0.5 rounded bg-[hsl(var(--surface-2))] border border-transparent group-hover:border-primary/20 text-foreground text-right transition-colors"
                                  />
                                  <span className="text-[10px] font-mono text-amber-400 w-16 text-right shrink-0">
                                    ฿{(item.qty * item.unitPrice).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Cost breakdown bar */}
              <div className="mt-4 pt-3 border-t border-[hsl(var(--border))]/30 space-y-2">
                <div className="text-[10px] text-muted-foreground">{eb.costByCategory}</div>
                <div className="h-4 rounded-full overflow-hidden flex">
                  {categories.map((cat, i) => {
                    const catTotal = bom.filter(b => b.category === cat).reduce((s, b) => s + b.qty * b.unitPrice, 0);
                    const pct = (catTotal / totalCost) * 100;
                    const colors = ['bg-blue-500', 'bg-cyan-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500', 'bg-red-500', 'bg-teal-500', 'bg-orange-500'];
                    return <div key={cat} className={`${colors[i % colors.length]} transition-all`} style={{ width: `${pct}%` }} title={`${cat}: ฿${catTotal.toLocaleString()}`} />;
                  })}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {categories.map((cat, i) => {
                    const catTotal = bom.filter(b => b.category === cat).reduce((s, b) => s + b.qty * b.unitPrice, 0);
                    const colors = ['bg-blue-500', 'bg-cyan-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500', 'bg-red-500', 'bg-teal-500', 'bg-orange-500'];
                    return (
                      <span key={cat} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
                        {cat} ฿{catTotal.toLocaleString()}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
