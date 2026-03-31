'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n/i18n-context';
import EnergyBomPanel from './energy-bom-panel';

// ═══════════════════════════════════════════════════════
// FARM REGISTRY
// ═══════════════════════════════════════════════════════
interface FarmProfile {
  id: string;
  name: string;
  type: string;
  location: string;
  region: string;
  area_m2: number;
  crop: string;
  status: 'online' | 'offline' | 'maintenance';
  targets: Record<string, { value: number; unit: string; min: number; max: number; citation: string }>;
}

const FARMS: FarmProfile[] = [
  {
    id: 'FB-001',
    name: 'Farmbase Alpha',
    type: 'Indoor PFAL',
    location: 'Bangkok, Thailand',
    region: 'ap-southeast-1',
    area_m2: 12,
    crop: 'Tochiotome Strawberry',
    status: 'online',
    targets: {
      temp:  { value: 20,   unit: '°C',       min: 18,  max: 23,   citation: 'Kozai 2016, Hidaka 2017' },
      rh:    { value: 75,   unit: '%',        min: 65,  max: 85,   citation: 'Kozai Ch.8 — >85% Botrytis risk' },
      co2:   { value: 1000, unit: 'ppm',      min: 800, max: 1200, citation: 'Kozai 2019 SDG paper' },
      ec:    { value: 1.4,  unit: 'mS/cm',    min: 1.0, max: 1.8,  citation: 'FAO NFT / Tochiotome spec' },
      ph:    { value: 5.8,  unit: '',          min: 5.5, max: 6.2,  citation: 'FAO hydroponic guideline' },
      ppfd:  { value: 450,  unit: 'µmol/m²/s', min: 300, max: 500,  citation: 'Hidaka 2017 — 14hr photoperiod' },
      vpd:   { value: 0.8,  unit: 'kPa',      min: 0.5, max: 1.2,  citation: 'Puccinelli 2024' },
    },
  },
  {
    id: 'FB-002',
    name: 'Farmbase Beta',
    type: 'Greenhouse',
    location: 'Chiang Mai, Thailand',
    region: 'ap-south-1',
    area_m2: 48,
    crop: 'Akihime Strawberry',
    status: 'offline',
    targets: {
      temp:  { value: 22,   unit: '°C',       min: 18,  max: 25,   citation: 'Akihime cultivar spec' },
      rh:    { value: 70,   unit: '%',        min: 60,  max: 80,   citation: 'Greenhouse standard' },
      co2:   { value: 800,  unit: 'ppm',      min: 600, max: 1000, citation: 'Semi-closed enrichment' },
      ec:    { value: 1.2,  unit: 'mS/cm',    min: 0.8, max: 1.6,  citation: 'Akihime EC range' },
      ph:    { value: 6.0,  unit: '',          min: 5.5, max: 6.5,  citation: 'Soil-based guideline' },
      ppfd:  { value: 350,  unit: 'µmol/m²/s', min: 200, max: 500,  citation: 'Supplemental + natural' },
      vpd:   { value: 0.9,  unit: 'kPa',      min: 0.4, max: 1.3,  citation: 'Greenhouse VPD range' },
    },
  },
];

const PARAM_LABELS: Record<string, string> = {
  temp: 'temp',
  rh:   'humidity',
  co2:  'co2',
  ec:   'ec',
  ph:   'ph',
  ppfd: 'ppfd',
  vpd:  'vpd',
};

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════
interface WeatherData {
  temp_c: number;
  humidity: number;
  city: string;
  desc: string;
}

interface LiveReadings {
  temp: number;
  rh: number;
  co2: number;
  ec: number;
  ph: number;
  ppfd: number;
  vpd: number;
  day: number;
  phase: string;
  health: number;
}

type Section = 'overview' | 'energy' | 'bom' | 'robot';

// ═══════════════════════════════════════════════════════
// STATUS BADGE — Supabase-style flat badge
// ═══════════════════════════════════════════════════════
function Badge({ variant, children }: { variant: 'success' | 'error' | 'warning' | 'neutral' | 'info'; children: React.ReactNode }) {
  const styles = {
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    error:   'bg-red-500/15 text-red-400 border-red-500/25',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    neutral: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/25',
    info:    'bg-sky-500/15 text-sky-400 border-sky-500/25',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border ${styles[variant]}`}>
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════
function Sidebar({
  farms, selectedFarmId, onSelectFarm, section, onSelectSection,
  connected, simMode, onStartSim, onStopSim, sidebarOpen, onToggleSidebar,
  t,
}: {
  farms: FarmProfile[];
  selectedFarmId: string;
  onSelectFarm: (id: string) => void;
  section: Section;
  onSelectSection: (s: Section) => void;
  connected: boolean;
  simMode: boolean;
  onStartSim: () => void;
  onStopSim: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  t: any;
}) {
  const cr = t.controlRoom;
  const SECTIONS: { key: Section; label: string }[] = [
    { key: 'overview', label: cr.overview },
    { key: 'energy',   label: cr.energy },
    { key: 'bom',      label: cr.bom },
    { key: 'robot',    label: cr.robotics },
  ];
  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onToggleSidebar} />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 z-40 lg:z-auto
        h-screen w-[260px] shrink-0
        bg-[hsl(var(--card))] border-r border-[hsl(var(--border))]
        flex flex-col
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="px-4 h-14 flex items-center gap-3 border-b border-[hsl(var(--border))]">
          <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">F</span>
          </div>
          <span className="text-sm font-semibold text-foreground">Farmbase</span>
          <Badge variant={connected ? 'success' : simMode ? 'info' : 'neutral'}>
            {connected ? 'LIVE' : simMode ? 'SIM' : 'OFF'}
          </Badge>
        </div>

        {/* Farm List */}
        <div className="px-3 py-3">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
            {cr.projects}
          </div>
          {farms.map(f => (
            <button
              key={f.id}
              onClick={() => onSelectFarm(f.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors mb-0.5 ${
                f.id === selectedFarmId
                  ? 'bg-[hsl(var(--surface-2))] text-foreground'
                  : 'text-muted-foreground hover:bg-[hsl(var(--surface-2))]/50 hover:text-foreground'
              }`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                f.status === 'online' ? 'bg-emerald-400'
                : f.status === 'maintenance' ? 'bg-amber-400'
                : 'bg-neutral-500'
              }`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{f.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {f.type} | {f.region}
                </div>
              </div>
              <div className="flex gap-1">
                <Badge variant={f.status === 'online' ? 'success' : 'neutral'}>
                  {f.status === 'online' ? 'ACTIVE' : f.status.toUpperCase()}
                </Badge>
              </div>
            </button>
          ))}
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))]/50 transition-colors border border-dashed border-[hsl(var(--border))] mt-2">
            <span className="text-lg leading-none">+</span>
            {cr.newProject}
          </button>
        </div>

        {/* Divider */}
        <div className="mx-3 border-t border-[hsl(var(--border))]" />

        {/* Section Navigation */}
        <div className="px-3 py-3 flex-1">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
            {cr.monitoring}
          </div>
          {SECTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => onSelectSection(s.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm transition-colors mb-0.5 ${
                section === s.key
                  ? 'bg-[hsl(var(--surface-2))] text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-[hsl(var(--surface-2))]/50 hover:text-foreground'
              }`}
            >
              {s.label}
              {section === s.key && (
                <div className="ml-auto w-1 h-4 rounded-full bg-emerald-400" />
              )}
            </button>
          ))}
        </div>

        {/* Bottom Controls */}
        <div className="px-3 py-3 border-t border-[hsl(var(--border))] space-y-2">
          {!connected && !simMode && (
            <button onClick={onStartSim}
              className="w-full px-3 py-2 text-sm font-medium rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
              {cr.startSimulation}
            </button>
          )}
          {simMode && (
            <button onClick={onStopSim}
              className="w-full px-3 py-2 text-sm font-medium rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
              {cr.stopSimulation}
            </button>
          )}
          <div className="text-[11px] text-muted-foreground text-center">
            {cr.controlVersion}
          </div>
        </div>
      </aside>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// OVERVIEW SECTION
// ═══════════════════════════════════════════════════════
function OverviewSection({
  farm, live, weather, compliance, total, t,
}: {
  farm: FarmProfile;
  live: LiveReadings | null;
  weather: WeatherData | null;
  compliance: number;
  total: number;
  t: any;
}) {
  const cr = t.controlRoom;
  const paramLabelMap: Record<string, string> = {
    temp: cr.temp, rh: cr.humidity, co2: cr.co2,
    ec: cr.ec, ph: cr.ph, ppfd: cr.ppfd, vpd: cr.vpd,
  };
  const weatherDescMap: Record<string, string> = {
    'Clear': cr.clear, 'Partly cloudy': cr.partlyCloudy,
    'Foggy': cr.foggy, 'Rain': cr.rain, 'Storm': cr.storm,
  };
  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Farm Status */}
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">{cr.status}</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {live ? `${compliance}/${total}` : '—'}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{cr.parametersInRange}</div>
            </div>
            <Badge variant={!live ? 'neutral' : compliance === total ? 'success' : 'warning'}>
              {!live ? cr.noData : compliance === total ? cr.healthy : cr.alert}
            </Badge>
          </div>
          {live && (
            <div className="mt-3 h-1.5 rounded-full bg-[hsl(var(--surface-3))] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${compliance === total ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ width: `${(compliance / total) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Weather */}
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">{cr.weather}</div>
          {weather ? (
            <>
              <div className="text-2xl font-bold text-foreground tabular-nums">{weather.temp_c.toFixed(1)}°C</div>
              <div className="text-xs text-muted-foreground mt-0.5">{weather.humidity}% RH · {weather.city}</div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{weatherDescMap[weather.desc] || weather.desc}</span>
                {Math.abs(weather.temp_c - farm.targets.temp.value) > 8 && (
                  <Badge variant="warning">ΔT {Math.abs(weather.temp_c - farm.targets.temp.value).toFixed(0)}°C</Badge>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-foreground tabular-nums">—</div>
              <div className="text-xs text-muted-foreground mt-0.5">{cr.loadingWeather}</div>
            </>
          )}
        </div>

        {/* Crop */}
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">{cr.cropCycle}</div>
          {live ? (
            <>
              <div className="text-2xl font-bold text-foreground tabular-nums">{cr.day} {live.day}</div>
              <div className="text-xs text-muted-foreground mt-0.5 capitalize">{live.phase} {cr.phase}</div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{cr.health}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[hsl(var(--surface-3))] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${live.health * 100}%` }} />
                </div>
                <span className="text-xs font-medium text-foreground tabular-nums">{(live.health * 100).toFixed(0)}%</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-foreground tabular-nums">—</div>
              <div className="text-xs text-muted-foreground mt-0.5">{cr.noActiveSimulation}</div>
            </>
          )}
        </div>
      </div>

      {/* Parameters Table */}
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        <div className="px-5 py-3 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{cr.realtimeParams}</h3>
          <span className="text-[11px] text-muted-foreground">{farm.crop} · {farm.area_m2}m²</span>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[1fr_100px_130px_80px_80px] px-5 py-2 border-b border-[hsl(var(--border))]/50 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          <span>{cr.parameter}</span>
          <span className="text-right">{cr.current}</span>
          <span className="text-right">{cr.targetRange}</span>
          <span className="text-right">{cr.delta}</span>
          <span className="text-right">{cr.statusCol}</span>
        </div>

        {/* Table Rows */}
        {live ? (
          Object.keys(farm.targets).map(key => {
            const target = farm.targets[key];
            const current = live[key as keyof LiveReadings] as number;
            const inRange = current >= target.min && current <= target.max;
            const diff = current - target.value;
            const isDecimal = key !== 'co2';

            return (
              <div
                key={key}
                className="grid grid-cols-[1fr_100px_130px_80px_80px] px-5 py-3 border-b border-[hsl(var(--border))]/30 hover:bg-[hsl(var(--surface-2))]/40 transition-colors group"
              >
                <div>
                  <span className="text-sm text-foreground font-medium">{paramLabelMap[key] || PARAM_LABELS[key]}</span>
                  <span className="text-[11px] text-muted-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {target.citation}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-mono tabular-nums ${inRange ? 'text-foreground' : 'text-red-400'}`}>
                    {isDecimal ? current.toFixed(1) : current.toFixed(0)}
                  </span>
                  <span className="text-[11px] text-muted-foreground ml-1">{target.unit}</span>
                </div>
                <div className="text-right text-sm text-muted-foreground font-mono tabular-nums">
                  {isDecimal ? target.min.toFixed(1) : target.min} – {isDecimal ? target.max.toFixed(1) : target.max} {target.unit}
                </div>
                <div className="text-right">
                  <span className={`text-sm font-mono tabular-nums ${
                    Math.abs(diff) < (target.max - target.min) * 0.1
                      ? 'text-emerald-400' : inRange ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {diff > 0 ? '+' : ''}{isDecimal ? diff.toFixed(1) : diff.toFixed(0)}
                  </span>
                </div>
                <div className="text-right">
                  <Badge variant={inRange ? 'success' : 'error'}>
                    {inRange ? cr.ok : cr.alert}
                  </Badge>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center">
            <div className="text-sm text-muted-foreground mb-3">{cr.noSensorData}</div>
            <div className="text-xs text-muted-foreground">
              {cr.noSensorDataHint} <span className="text-emerald-400 font-medium">{cr.startSimulation}</span> {cr.clickStartSim}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ROBOT SECTION (placeholder)
// ═══════════════════════════════════════════════════════
function RobotSection({ t }: { t: any }) {
  const cr = t.controlRoom;
  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">{cr.robotTitle}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--surface-2))]/30">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{cr.robot}</div>
          <div className="text-sm font-medium text-foreground">Franka Panda</div>
          <div className="text-xs text-muted-foreground mt-1">7-DOF · 3kg payload · Gripper</div>
          <div className="mt-3"><Badge variant="neutral">{cr.standby}</Badge></div>
        </div>
        <div className="p-4 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--surface-2))]/30">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{cr.vision}</div>
          <div className="text-sm font-medium text-foreground">Intel RealSense D435</div>
          <div className="text-xs text-muted-foreground mt-1">RGB-D · 1280×720 · End-effector</div>
          <div className="mt-3"><Badge variant="neutral">{cr.notConnected}</Badge></div>
        </div>
        <div className="p-4 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--surface-2))]/30">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{cr.isaacSim}</div>
          <div className="text-sm font-medium text-foreground">{cr.digitalTwin}</div>
          <div className="text-xs text-muted-foreground mt-1">USD: /World/Robot/FrankaPanda</div>
          <div className="mt-3"><Badge variant="info">{cr.simReady}</Badge></div>
        </div>
      </div>
      <div className="mt-6 p-4 rounded-md border border-dashed border-[hsl(var(--border))] text-center">
        <div className="text-sm text-muted-foreground">{cr.hilNotConnected}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {cr.hilHint} <code className="text-emerald-400 font-mono text-[11px]">python.bat build_farm.py</code>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════
export default function ControlRoomDashboard() {
  const { t } = useI18n();
  const cr = t.controlRoom;
  const [selectedFarmId, setSelectedFarmId] = useState(FARMS[0].id);
  const [live, setLive] = useState<LiveReadings | null>(null);
  const [connected, setConnected] = useState(false);
  const [simMode, setSimMode] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const simRef = useRef<NodeJS.Timeout | null>(null);

  const SECTIONS_LOCAL: { key: Section; label: string }[] = [
    { key: 'overview', label: cr.overview },
    { key: 'energy',   label: cr.energy },
    { key: 'bom',      label: cr.bom },
    { key: 'robot',    label: cr.robotics },
  ];

  const farm = FARMS.find(f => f.id === selectedFarmId)!;

  // ── Weather ──
  useEffect(() => {
    (async () => {
      try {
        let lat = 13.7563, lon = 100.5018, city = 'Bangkok';
        try {
          const geo = await fetch('https://ipapi.co/json/');
          if (geo.ok) { const g = await geo.json(); lat = g.latitude||lat; lon = g.longitude||lon; city = g.city||city; }
        } catch {/* */}
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`);
        if (r.ok) {
          const d = await r.json(); const c = d.current; const code = c.weather_code;
          const desc = code <= 1 ? 'Clear' : code <= 3 ? 'Partly cloudy' : code <= 48 ? 'Foggy' : code <= 67 ? 'Rain' : 'Storm';
          setWeather({ temp_c: c.temperature_2m, humidity: c.relative_humidity_2m, city, desc });
        }
      } catch {/* */}
    })();
  }, []);

  // ── WebSocket ──
  const connectWs = useCallback(() => {
    try {
      const ws = new WebSocket('ws://localhost:8000/ws');
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onmessage = (evt) => {
        try {
          const d = JSON.parse(evt.data);
          if (d.autonomous?.sensors) {
            const s = d.autonomous.sensors;
            const cr = d.autonomous.crop;
            setLive({
              temp: s.temperature_c, rh: s.humidity_rh, co2: s.co2_ppm,
              ec: s.ec_ms_cm, ph: s.ph, ppfd: s.ppfd, vpd: s.vpd_kpa,
              day: cr?.days_after_sowing ?? 0, phase: cr?.phase ?? 'unknown', health: cr?.health ?? 0,
            });
          }
        } catch {/* */}
      };
      ws.onclose = () => { setConnected(false); setTimeout(connectWs, 3000); };
      ws.onerror = () => { setConnected(false); ws.close(); };
    } catch { setConnected(false); setTimeout(connectWs, 3000); }
  }, []);

  useEffect(() => {
    connectWs();
    return () => { wsRef.current?.close(); if (simRef.current) clearInterval(simRef.current); };
  }, [connectWs]);

  // ── Simulation ──
  const startSim = () => {
    setSimMode(true);
    let day = 0;
    simRef.current = setInterval(() => {
      day++;
      const phase = day < 14 ? 'seedling' : day < 45 ? 'vegetative' : day < 75 ? 'flowering'
        : day < 100 ? 'fruiting' : day < 120 ? 'ripening' : 'harvest_ready';
      setLive({
        temp: farm.targets.temp.value + (Math.random() - 0.5) * 1.5,
        rh: farm.targets.rh.value + (Math.random() - 0.5) * 6,
        co2: farm.targets.co2.value + (Math.random() - 0.5) * 80,
        ec: farm.targets.ec.value + (Math.random() - 0.5) * 0.3,
        ph: farm.targets.ph.value + (Math.random() - 0.5) * 0.4,
        ppfd: farm.targets.ppfd.value + (Math.random() - 0.5) * 30,
        vpd: farm.targets.vpd.value + (Math.random() - 0.5) * 0.15,
        day, phase, health: Math.min(1, 0.88 + Math.random() * 0.12),
      });
      if (day >= 130) day = 0;
    }, 800);
  };
  const stopSim = () => {
    setSimMode(false);
    if (simRef.current) clearInterval(simRef.current);
    setLive(null);
  };

  const handleSelectFarm = (id: string) => {
    setSelectedFarmId(id);
    stopSim();
    setSidebarOpen(false);
  };

  // Compliance
  const compliance = live ? Object.keys(farm.targets).filter(k => {
    const tgt = farm.targets[k];
    const v = live[k as keyof LiveReadings] as number;
    return v >= tgt.min && v <= tgt.max;
  }).length : 0;
  const total = Object.keys(farm.targets).length;

  return (
    <div className="flex min-h-[calc(100vh-80px)] -mx-4 sm:-mx-6">
      {/* Sidebar */}
      <Sidebar
        farms={FARMS}
        selectedFarmId={selectedFarmId}
        onSelectFarm={handleSelectFarm}
        section={section}
        onSelectSection={(s: Section) => { setSection(s); setSidebarOpen(false); }}
        connected={connected}
        simMode={simMode}
        onStartSim={startSim}
        onStopSim={stopSim}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        t={t}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Breadcrumb Bar */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden mr-2 p-1 rounded hover:bg-[hsl(var(--surface-2))] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-muted-foreground">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            <span className="text-sm text-muted-foreground">{cr.title}</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-sm text-foreground font-medium">{farm.name}</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-sm text-foreground">{SECTIONS_LOCAL.find(s => s.key === section)?.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
              {farm.id}
            </span>
            <Badge variant={farm.status === 'online' ? 'success' : 'neutral'}>
              {farm.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {section === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <OverviewSection farm={farm} live={live} weather={weather} compliance={compliance} total={total} t={t} />
              </motion.div>
            )}
            {section === 'energy' && (
              <motion.div key="energy" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <EnergyBomPanel initialTab="energy" />
              </motion.div>
            )}
            {section === 'bom' && (
              <motion.div key="bom" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <EnergyBomPanel initialTab="bom" />
              </motion.div>
            )}
            {section === 'robot' && (
              <motion.div key="robot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <RobotSection t={t} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
