'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface IsaacInfo {
  isaac: {
    available: boolean;
    path: string;
    version: string;
    active_jobs: number;
  };
  available_crops: string[];
  crop_details: Record<string, { name: string; name_th: string; type: string }>;
}

interface BomItem {
  item: string;
  spec: string;
  qty: number;
  unit_price: number;
  total: number;
}

interface DesignResult {
  success: boolean;
  config?: any;
  bom?: BomItem[];
  total_cost_thb?: number;
  metrics?: Record<string, any>;
  warnings?: string[];
  config_path?: string;
  error?: string;
}

interface BuildStatus {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  usd_path: string;
  error: string;
  elapsed_seconds: number;
}

// ═══════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════

const AI_ENGINE_URL = 'http://localhost:8000';

// ═══════════════════════════════════════════════
// API Helpers
// ═══════════════════════════════════════════════

async function fetchIsaacInfo(): Promise<IsaacInfo | null> {
  try {
    const res = await fetch(`${AI_ENGINE_URL}/api/isaac/info`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function submitDesign(params: any): Promise<DesignResult> {
  const res = await fetch(`${AI_ENGINE_URL}/api/isaac/design`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await res.json();
}

async function triggerBuild(configPath: string): Promise<{ success: boolean; job_id?: string; error?: string }> {
  const res = await fetch(`${AI_ENGINE_URL}/api/isaac/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config_path: configPath }),
  });
  return await res.json();
}

async function checkBuild(jobId: string): Promise<BuildStatus | null> {
  try {
    const res = await fetch(`${AI_ENGINE_URL}/api/isaac/status/${jobId}`);
    return await res.json();
  } catch { return null; }
}

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

export default function IsaacPanel() {
  // Connection state
  const [info, setInfo] = useState<IsaacInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Design params
  const [width, setWidth] = useState(4.0);
  const [depth, setDepth] = useState(3.0);
  const [height, setHeight] = useState(2.8);
  const [budget, setBudget] = useState(100000);
  const [crop, setCrop] = useState('tochiotome');
  const [maxTiers, setMaxTiers] = useState(5);
  const [hasRobot, setHasRobot] = useState(true);

  // Results
  const [designing, setDesigning] = useState(false);
  const [result, setResult] = useState<DesignResult | null>(null);

  // Build
  const [building, setBuilding] = useState(false);
  const [buildJobId, setBuildJobId] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);

  // Tab
  const [tab, setTab] = useState<'design' | 'result' | 'build'>('design');

  // ── Load info on mount ──
  useEffect(() => {
    fetchIsaacInfo().then(data => {
      setInfo(data);
      setLoading(false);
      if (!data) setError('AI Engine not connected. Start with: uvicorn main:app');
    });
  }, []);

  // ── Poll build status ──
  useEffect(() => {
    if (!buildJobId) return;
    const interval = setInterval(async () => {
      const status = await checkBuild(buildJobId);
      if (status) {
        setBuildStatus(status);
        if (status.status === 'done' || status.status === 'error') {
          setBuilding(false);
          clearInterval(interval);
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [buildJobId]);

  // ── Handlers ──
  const handleDesign = useCallback(async () => {
    setDesigning(true);
    setError('');
    try {
      const res = await submitDesign({
        width, depth, height, budget_thb: budget,
        crop, max_tiers: maxTiers, has_robot: hasRobot,
      });
      setResult(res);
      if (res.success) setTab('result');
      else setError(res.error || 'Design failed');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDesigning(false);
    }
  }, [width, depth, height, budget, crop, maxTiers, hasRobot]);

  const handleBuild = useCallback(async () => {
    if (!result?.config_path) return;
    setBuilding(true);
    setError('');
    try {
      const res = await triggerBuild(result.config_path);
      if (res.success && res.job_id) {
        setBuildJobId(res.job_id);
        setBuildStatus({ id: res.job_id, status: 'queued', usd_path: '', error: '', elapsed_seconds: 0 });
        setTab('build');
      } else {
        setError(res.error || 'Build trigger failed');
        setBuilding(false);
      }
    } catch (e: any) {
      setError(e.message);
      setBuilding(false);
    }
  }, [result]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
        <span className="ml-3 text-muted-foreground">Connecting to AI Engine...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
            🏗️
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Isaac Sim Auto-Designer</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered parametric farm design → NVIDIA Isaac Sim
            </p>
          </div>
        </div>

        {/* Connection Badge */}
        <div className="flex items-center gap-2 mt-3">
          <div className={`w-2.5 h-2.5 rounded-full ${info?.isaac?.available ? 'bg-emerald-500 animate-pulse' : info ? 'bg-amber-500' : 'bg-red-500'}`} />
          <span className="text-xs text-muted-foreground font-mono">
            {info?.isaac?.available
              ? `Isaac Sim ${info.isaac.version?.split('+')[0] || ''} Connected`
              : info
                ? 'Isaac Sim not found — design-only mode'
                : 'AI Engine offline'}
          </span>
        </div>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-card/50 border border-border/50 w-fit">
        {(['design', 'result', 'build'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-foreground shadow-sm border border-emerald-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/80'
            }`}
          >
            {t === 'design' ? '📐 Design' : t === 'result' ? '📊 Result' : '🔨 Build'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {tab === 'design' && (
          <motion.div
            key="design"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Room Size */}
            <div className="p-5 rounded-2xl bg-card/80 border border-border/50 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center text-xs">📏</span>
                Room Size
              </h3>
              <div className="space-y-4">
                <SliderField label="Width" value={width} onChange={setWidth} min={1.5} max={12} step={0.5} unit="m" />
                <SliderField label="Depth" value={depth} onChange={setDepth} min={1.5} max={12} step={0.5} unit="m" />
                <SliderField label="Height" value={height} onChange={setHeight} min={2.4} max={4.0} step={0.1} unit="m" />
                <div className="text-xs text-muted-foreground mt-2 p-2 rounded-lg bg-background/50">
                  Floor area: <span className="text-foreground font-mono">{(width * depth).toFixed(1)} m²</span>
                  {' · '}Volume: <span className="text-foreground font-mono">{(width * depth * height).toFixed(1)} m³</span>
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div className="p-5 rounded-2xl bg-card/80 border border-border/50 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center text-xs">🌱</span>
                Configuration
              </h3>
              <div className="space-y-4">
                {/* Crop Select */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Crop</label>
                  <select
                    value={crop}
                    onChange={e => setCrop(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {info?.available_crops?.map(c => (
                      <option key={c} value={c}>
                        {info.crop_details[c]?.name} ({info.crop_details[c]?.name_th})
                      </option>
                    )) ?? <option value="tochiotome">Tochiotome</option>}
                  </select>
                </div>

                <SliderField label="Max Tiers" value={maxTiers} onChange={v => setMaxTiers(Math.round(v))} min={1} max={8} step={1} unit="" />

                <SliderField label="Budget" value={budget} onChange={setBudget} min={20000} max={500000} step={5000} unit="฿" format={v => `฿${v.toLocaleString()}`} />

                {/* Robot Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">AMR Harvester Robot</label>
                  <button
                    onClick={() => setHasRobot(!hasRobot)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${hasRobot ? 'bg-emerald-500' : 'bg-border'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${hasRobot ? 'left-[26px]' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="md:col-span-2">
              <button
                onClick={handleDesign}
                disabled={designing}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold text-base hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              >
                {designing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    Designing...
                  </span>
                ) : '🤖 Auto Design Farm Layout'}
              </button>
            </div>
          </motion.div>
        )}

        {tab === 'result' && result?.success && (
          <motion.div
            key="result"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard icon="🌱" label="Plants" value={result.metrics?.total_plants ?? 0} />
              <MetricCard icon="📦" label="Racks" value={`${result.metrics?.num_racks ?? 0} × ${result.metrics?.num_tiers ?? 0}T`} />
              <MetricCard icon="🍓" label="Yield/Cycle" value={`${result.metrics?.yield_per_cycle_kg ?? 0} kg`} />
              <MetricCard icon="💰" label="ROI" value={`${result.metrics?.roi_months ?? '—'} mo`} />
              <MetricCard icon="⚡" label="Energy" value={`${result.metrics?.daily_energy_kwh ?? 0} kWh/d`} />
              <MetricCard icon="📐" label="Aisle" value={`${result.metrics?.aisle_width_m ?? 0} m`} />
              <MetricCard icon="📆" label="Annual Yield" value={`${result.metrics?.annual_yield_kg ?? 0} kg`} />
              <MetricCard icon="💵" label="Revenue" value={`฿${(result.metrics?.annual_revenue_thb ?? 0).toLocaleString()}/yr`} />
            </div>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-amber-400">⚠️ {w}</p>
                ))}
              </div>
            )}

            {/* BOM Table */}
            <div className="rounded-2xl bg-card/80 border border-border/50 overflow-hidden">
              <div className="p-4 border-b border-border/30">
                <h3 className="text-sm font-semibold text-foreground">
                  📋 Bill of Materials — Total: <span className="text-emerald-400">฿{result.total_cost_thb?.toLocaleString()}</span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border/20">
                      <th className="text-left p-3">Item</th>
                      <th className="text-left p-3">Spec</th>
                      <th className="text-center p-3">Qty</th>
                      <th className="text-right p-3">Unit ฿</th>
                      <th className="text-right p-3">Total ฿</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.bom?.map((item, i) => (
                      <tr key={i} className="border-b border-border/10 hover:bg-card/60 transition-colors">
                        <td className="p-3 text-foreground">{item.item}</td>
                        <td className="p-3 text-muted-foreground">{item.spec}</td>
                        <td className="p-3 text-center text-foreground">{item.qty}</td>
                        <td className="p-3 text-right text-muted-foreground">{item.unit_price.toLocaleString()}</td>
                        <td className="p-3 text-right text-foreground font-mono">{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Build Button */}
            <div className="flex gap-3">
              <button
                onClick={handleBuild}
                disabled={!info?.isaac?.available || building}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 transition-all shadow-lg shadow-violet-500/20"
              >
                {info?.isaac?.available ? '🔨 Build in Isaac Sim' : '❌ Isaac Sim Not Connected'}
              </button>
              <button
                onClick={() => setTab('design')}
                className="px-6 py-3 rounded-xl bg-card border border-border/50 text-foreground font-medium hover:bg-card/80 transition-all"
              >
                ← Edit Design
              </button>
            </div>
          </motion.div>
        )}

        {tab === 'build' && (
          <motion.div
            key="build"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="p-8 rounded-2xl bg-card/80 border border-border/50 text-center">
              {/* Status Icon */}
              <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl"
                style={{
                  background: buildStatus?.status === 'done' ? 'rgba(16,185,129,0.15)'
                    : buildStatus?.status === 'error' ? 'rgba(239,68,68,0.15)'
                    : 'rgba(99,102,241,0.15)',
                }}
              >
                {buildStatus?.status === 'done' ? '✅'
                  : buildStatus?.status === 'error' ? '❌'
                  : '⏳'}
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-1">
                {buildStatus?.status === 'queued' ? 'Queued...'
                  : buildStatus?.status === 'running' ? 'Building in Isaac Sim...'
                  : buildStatus?.status === 'done' ? 'Scene Built!'
                  : buildStatus?.status === 'error' ? 'Build Failed'
                  : 'Unknown'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Job: <span className="font-mono text-foreground">{buildJobId}</span>
                {buildStatus?.elapsed_seconds ? ` · ${buildStatus.elapsed_seconds}s` : ''}
              </p>

              {buildStatus?.status === 'running' && (
                <div className="mt-4 w-full h-1.5 rounded-full bg-border/30 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full"
                    animate={{ width: ['0%', '100%'] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              )}

              {buildStatus?.status === 'done' && buildStatus.usd_path && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-emerald-400 font-mono break-all">
                    📂 {buildStatus.usd_path}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Open Isaac Sim GUI → File → Open → Select this .usd file
                  </p>
                </div>
              )}

              {buildStatus?.status === 'error' && buildStatus.error && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{buildStatus.error}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════

function SliderField({
  label, value, onChange, min, max, step, unit, format
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; unit: string;
  format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <span className="text-xs font-mono text-foreground px-2 py-0.5 rounded-md bg-background/50">
          {format ? format(value) : `${value}${unit}`}
        </span>
      </div>
      <input
        type="range"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-1.5 rounded-full appearance-none bg-border/40 cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br
          [&::-webkit-slider-thumb]:from-emerald-400 [&::-webkit-slider-thumb]:to-cyan-500
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-xl bg-card/60 border border-border/30 backdrop-blur-sm">
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground mt-0.5 font-mono">{value}</div>
    </div>
  );
}
