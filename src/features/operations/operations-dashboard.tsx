'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Thermometer, Droplets, Wind, Zap, Server, Hammer, CheckCircle2, ChevronDown, Check, Beaker, Bot, Fan, History, Loader2, Battery, Sun, TrendingUp } from 'lucide-react';
import { useFarmStore } from '@/store/farm-store';
import { useI18n } from '@/lib/i18n/i18n-context';

interface TelemetryNode {
  temp: number;
  humidity: number;
  co2: number;
  light: number;
}

export default function OperationsDashboard() {
  const { setViewMode, selectedCrop } = useFarmStore();
  const { t } = useI18n();
  
  const [activeTab, setActiveTab] = useState<'4d-guide' | 'telemetry'>('telemetry');
  const [isLoading, setIsLoading] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [facilityOpen, setFacilityOpen] = useState(false);
  
  // Simulated Live Telemetry (Strawberry Targets)
  const [telemetry, setTelemetry] = useState<TelemetryNode>({
    temp: 8.5,
    humidity: 65.0,
    co2: 600,
    light: 350
  });

  const [energyData, setEnergyData] = useState({ solar: 4.2, battery: 85, gridSell: 1.5 });

  // Target config (White Jewel Strawberry - Night Mode)
  const targets = {
    temp: 8.0,
    humidity: 65.0,
    co2: 600,
    light: 350
  };

  useEffect(() => {
    if (activeTab !== 'telemetry') return;
    const interval = setInterval(() => {
      setTelemetry(prev => {
        const volatility = aiEnabled ? 1 : 2.5; 
        let newTemp = prev.temp + (Math.random() * 0.4 - 0.2) * volatility;
        if (aiEnabled && Math.abs(newTemp - targets.temp) > 0.5) {
          newTemp += (targets.temp - newTemp) * 0.5;
        }

        return {
          temp: +newTemp.toFixed(1),
          humidity: +(prev.humidity + (Math.random() * 1.0 - 0.5) * volatility).toFixed(1),
          co2: Math.max(0, Math.round(prev.co2 + (Math.random() * 10 - 5) * volatility)),
          light: Math.max(0, Math.round(prev.light + (Math.random() * 2 - 1) * volatility))
        };
      });
      setEnergyData(prev => ({
        solar: Math.max(0, +(prev.solar + (Math.random() * 0.4 - 0.2)).toFixed(1)),
        battery: Math.min(100, Math.max(0, +(prev.battery + (Math.random() * 0.1 - 0.05)).toFixed(1))),
        gridSell: Math.max(0, +(prev.gridSell + (Math.random() * 0.2 - 0.1)).toFixed(1)),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [activeTab, aiEnabled]);

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 800);
  }, []);

  // Use a monochromatic sleek color scheme resembling Supabase
  const sensors = [
    { id: 'temp', icon: Thermometer, color: 'text-blue-400', label: t.operations.tempLabel || 'Temp', value: telemetry.temp.toFixed(1), unit: '°C', target: `${targets.temp} °C`, active: true },
    { id: 'rh', icon: Droplets, color: 'text-blue-400', label: t.operations.rhLabel || 'RH', value: telemetry.humidity.toFixed(1), unit: t.operations.rhUnit || '%', target: `${targets.humidity} ${t.operations.rhUnit || '%'}`, active: true },
    { id: 'co2', icon: Wind, color: 'text-emerald-400', label: t.operations.co2Label || 'CO2', value: telemetry.co2, unit: 'ppm', target: `${targets.co2} ppm`, active: true },
    { id: 'light', icon: Zap, color: 'text-yellow-400', label: t.operations.lightLabel || 'Light', value: telemetry.light, unit: t.operations.umolUnit || 'μmol', target: `${targets.light} ${t.operations.umolUnit || 'μmol'}`, active: aiEnabled } 
  ];

  const aiLogs = [
    { time: new Date().toLocaleTimeString(), msg: "SYNC: AI VPP (Virtual Power Plant) Active", icon: TrendingUp },
    { time: new Date(Date.now() - 45000).toLocaleTimeString(), msg: `Shifted HVAC load to Solar. Selling ${energyData.gridSell.toFixed(1)}kW to grid.`, icon: Sun },
    { time: new Date(Date.now() - 120000).toLocaleTimeString(), msg: `AI initiated Temp Swing to ${targets.temp}°C to boost Brix score.`, icon: Thermometer },
    { time: new Date(Date.now() - 360000).toLocaleTimeString(), msg: `Loaded target parameters for Premium White Strawberry.`, icon: Beaker },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-5xl mx-auto pb-10"
    >
      {/* Header & Facility Selector */}
      <div className="flex justify-between items-center pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode('procurement')}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setFacilityOpen(!facilityOpen)}
              className="flex items-center gap-2 group p-1 -ml-1 rounded-md hover:bg-secondary/50 transition-colors"
            >
              <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2 transition-colors">
                Premium Strawberry Farm (Bangkok)
                <ChevronDown size={16} className="text-muted-foreground mt-0.5" />
              </h2>
            </button>
            <span className="flex h-1.5 w-1.5 absolute -right-1 top-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center bg-secondary/30 p-1 rounded-lg border border-border/50">
          <button 
            onClick={() => setActiveTab('telemetry')}
            className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all flex items-center gap-2 ${
              activeTab === 'telemetry' ? 'bg-card shadow-sm text-foreground border border-border/40' : 'text-muted-foreground hover:text-foreground border border-transparent'
            }`}
          >
            <Server size={14} /> {t.operations.sensorData}
          </button>
          <button 
             onClick={() => setActiveTab('4d-guide')}
            className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all flex items-center gap-2 ${
              activeTab === '4d-guide' ? 'bg-card shadow-sm text-foreground border border-border/40' : 'text-muted-foreground hover:text-foreground border border-transparent'
            }`}
          >
            <Hammer size={14} /> {t.operations.guide4d}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
             <Loader2 className="animate-spin text-emerald-500" size={24} />
             <p className="text-sm font-mono text-muted-foreground">{t.operations.connectingToEdge}</p>
          </div>
        </div>
      ) : activeTab === 'telemetry' ? (
        <motion.div 
          key="telemetry"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid lg:grid-cols-12 gap-5"
        >
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* Supabase Style AI Control Panel */}
            <div className={`border rounded-xl p-5 flex items-center justify-between transition-all duration-300 ${aiEnabled ? 'bg-secondary/50 border-emerald-500/30' : 'bg-card border-border/50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-300 ${aiEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground'}`}>
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className={`font-semibold text-sm transition-colors ${aiEnabled ? 'text-emerald-500' : 'text-foreground'}`}>
                    {t.operations.aiAutoPilot || 'AI Auto-Pilot'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{aiEnabled ? (t.operations.aiActive || 'Active') : (t.operations.manualMode || 'Manual')}</p>
                </div>
              </div>
              <button 
                onClick={() => setAiEnabled(!aiEnabled)}
                className={`w-10 h-6 rounded-full transition-colors duration-300 relative flex items-center shrink-0 ${aiEnabled ? 'bg-emerald-500' : 'bg-secondary border border-border'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${aiEnabled ? 'translate-x-5' : 'translate-x-1 bg-muted-foreground'}`} />
              </button>
            </div>

            {/* Supabase Style Sensor List */}
            <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-4 px-5 py-3 bg-secondary/20 border-b border-border/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-2">{t.operations.sensorData}</div>
                <div className="hidden sm:block">CURRENT</div>
                <div className="text-right">TARGET</div>
              </div>
              <div className="divide-y divide-border/40">
                {sensors.map((s, idx) => (
                  <div key={s.id} className={`grid grid-cols-4 items-center px-5 py-4 transition-all ${s.active ? 'hover:bg-secondary/10' : 'opacity-40 grayscale'}`}>
                    <div className="col-span-2 flex items-center gap-3">
                       <span className={`${s.color}`}><s.icon size={16} /></span>
                       <span className="text-sm font-medium text-foreground/90">{s.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1 col-span-1 justify-self-start">
                      <span className="text-xl font-mono text-foreground">{s.value}</span>
                      <span className="text-[11px] text-muted-foreground/70">{s.unit}</span>
                    </div>
                    <div className="text-right flex items-center justify-end">
                       <span className={`inline-flex text-[11px] px-2 py-0.5 rounded border font-mono transition-colors ${aiEnabled && s.active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-transparent text-muted-foreground border-border/40'}`}>
                         {aiEnabled ? s.target : '0.0'}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Grid & Energy Panel */}
            <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm p-6 relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sun className="text-yellow-500" size={20} />
                  <h3 className="font-semibold text-foreground text-sm">Smart Grid & AI Energy Arbitrage</h3>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">Net Metering Active</span>
              </div>
              
              <div className="grid grid-cols-3 gap-6">
                {/* Solar Output */}
                <div className="space-y-1 relative before:absolute before:inset-y-0 before:-right-3 before:w-[1px] before:bg-border/50">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Solar Output</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-mono text-foreground font-semibold">{energyData.solar.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">kW</span>
                  </div>
                  <span className="text-[10px] text-emerald-500 flex items-center gap-1 mt-1">
                    <TrendingUp size={10} /> +12% Peak
                  </span>
                </div>

                {/* Battery Level */}
                <div className="space-y-1 relative before:absolute before:inset-y-0 before:-right-3 before:w-[1px] before:bg-border/50 pl-3">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">BESS Charge</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-mono text-foreground font-semibold">{energyData.battery.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${energyData.battery}%` }}></div>
                  </div>
                </div>

                {/* Grid Sales */}
                <div className="space-y-1 pl-3">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Selling to Grid</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-mono text-emerald-400 font-semibold">{energyData.gridSell.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">kW/h</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Zap size={10} className="text-yellow-500" /> Offset MEA Rate
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Supabase Style Sidebar Log */}
          <div className="lg:col-span-4">
            <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm h-full">
              <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-5 text-foreground">
                 <History size={14} className="text-muted-foreground" />
                 {t.operations.systemLogs || 'Action Log'}
              </h3>
              
              <div className="space-y-5 relative before:absolute before:inset-0 before:left-[9px] before:h-full before:w-[1px] before:bg-border/60">
                {aiLogs.map((log, i) => (
                  <div key={i} className="relative flex items-start gap-3 group">
                    <div className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full bg-card border border-border shadow-sm text-emerald-500 shrink-0 mt-0.5">
                       <log.icon size={10} />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground block mb-0.5">{log.time}</span>
                      <p className="text-[12px] text-foreground/80 leading-relaxed">{log.msg}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </motion.div>
      ) : (
        <motion.div 
          key="4d-guide"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 md:p-8 rounded-xl bg-card border border-border/60 shadow-sm"
        >
          <div className="mb-8">
            <h3 className="text-xl font-bold tracking-tight flex items-center gap-2 text-foreground">
               <Hammer className="text-emerald-500" size={24} />
               {t.operations.guideTitle}
            </h3>
            <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed max-w-xl">{t.operations.guideSubtitle}</p>
          </div>

          <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[1.45rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[1px] before:bg-gradient-to-b before:from-transparent before:via-border/60 before:to-transparent">
            
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-[6px] border-background bg-emerald-500 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform hover:scale-105 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Check size={18} strokeWidth={3} />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded-xl bg-secondary/50 border border-border/80">
                <h4 className="font-semibold text-foreground mb-1 text-sm">{t.operations.phase1Title}</h4>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{t.operations.phase1Desc}</p>
              </div>
            </div>

            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-[6px] border-background bg-emerald-500 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform hover:scale-105 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                2
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded-xl bg-card border border-emerald-500/30 relative overflow-hidden transition-colors">
                <h4 className="font-semibold text-emerald-500 mb-1 text-sm">{t.operations.phase2Title}</h4>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{t.operations.phase2Desc}</p>
                <div className="mt-3 bg-secondary/50 px-2 py-1.5 rounded-md flex justify-between font-mono text-[10px] text-muted-foreground border border-border/40">
                  <span>Part: ST-01 / ST-05</span>
                  <span>Est: 4 {t.card.days}</span>
                </div>
              </div>
            </div>

             <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-[6px] border-background bg-secondary text-muted-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                3
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded-xl bg-secondary/20 border border-border/40 text-muted-foreground">
                <h4 className="font-semibold mb-1 text-sm">{t.operations.phase3Title}</h4>
                <p className="text-[12px]">{t.operations.phase3Desc}</p>
              </div>
            </div>

             <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-[6px] border-background bg-secondary text-muted-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                4
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded-xl bg-secondary/20 border border-border/40 text-muted-foreground">
                <h4 className="font-semibold mb-1 text-sm">{t.operations.phase4Title}</h4>
                <p className="text-[12px]">{t.operations.phase4Desc}</p>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
