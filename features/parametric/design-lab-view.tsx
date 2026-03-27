'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Box, Droplets, Thermometer, Wind, Zap, Loader2, ShoppingCart, Sun, Check, TrendingUp } from 'lucide-react';
import { useFarmStore } from '@/store/farm-store';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useCurrency } from '@/lib/currency-context';
import { supabase } from '@/lib/supabase';
import { Slider } from '@/components/ui/slider';
import ParametricMeshCanvas from './parametric-mesh';
import { generateParametricDesign, BOMItem } from '@/lib/api-client';

export default function DesignLabView() {
  const { selectedCrop, goBackToMarketplace, setViewMode } = useFarmStore();
  const { user } = useAuth();
  const { t } = useI18n();
  const { formatCurrency } = useCurrency();
  const [targetYield, setTargetYield] = useState<number>(100); // kg
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bomList, setBomList] = useState<BOMItem[] | null>(null);
  const [includeSmartGrid, setIncludeSmartGrid] = useState(false);
  const [error, setError] = useState('');

  if (!selectedCrop) return null;

  const yieldPerM2 = selectedCrop.market_data?.yield_per_sqm_kg || 10;
  const calculatedArea = (targetYield / yieldPerM2).toFixed(1);
  const cycleDays = selectedCrop.growth_params?.cycle_days || 30;

  const handleGenerateBom = async () => {
    setIsGenerating(true);
    setError('');
    
    const req = {
      crop_id: selectedCrop.id,
      target_yield_kg: targetYield,
      yield_per_m2: yieldPerM2,
      target_temp_c: selectedCrop.optimal_conditions.temperature.optimal,
    };
    
    const res = await generateParametricDesign(req);
    setIsGenerating(false);
    
    if (res && res.bom) {
      const finalBom = [...res.bom];
      
      if (includeSmartGrid) {
        const gridFactor = Math.ceil(parseFloat(calculatedArea) / 15);
        finalBom.push({
          category: 'Energy',
          name: 'Solar PV Array (5kW) + Smart Inverter',
          quantity: gridFactor,
          unit: 'set',
          unit_price: 150000,
          total_price: 150000 * gridFactor
        });
        finalBom.push({
          category: 'Energy',
          name: 'BESS (Battery Energy Storage 10kWh)',
          quantity: gridFactor,
          unit: 'unit',
          unit_price: 120000,
          total_price: 120000 * gridFactor
        });
      }
      
      setBomList(finalBom);
    } else {
      setError(t.designLab.failedToConnect);
    }
  };

  const handleSaveAndProcure = async () => {
    if (!user) {
      setError(t.designLab.loginRequired);
      return;
    }
    
    setIsSaving(true);
    setError('');
    
    const { data, error: insertError } = await supabase
      .from('user_designs')
      .insert({
        user_id: user.id,
        crop_id: selectedCrop.id,
        target_yield_kg: targetYield,
        calculated_area_m2: parseFloat(calculatedArea),
        generated_bom: bomList,
        ifc_model_status: 'pending'
      })
      .select()
      .single();
      
    setIsSaving(false);
    
    if (insertError) {
      console.error(insertError);
      setError(t.designLab.failedToSave);
    } else if (data) {
      setViewMode('procurement');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={goBackToMarketplace}
          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">{t.designLab.backToDiscovery}</span>
        </button>
        <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-xs font-bold uppercase tracking-wider">
          {t.designLab.title}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col - Parameters */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-2xl border border-border bg-card/50 backdrop-blur-md shadow-xl">
            <h2 className="text-xl font-bold text-foreground mb-1">{t.cropNames[selectedCrop.name] || selectedCrop.name} {t.designLab.facility}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t.designLab.adjustYieldDesc}</p>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold">{t.designLab.targetYield}</label>
                  <span className="text-sm font-mono text-cyan-500">{targetYield} kg</span>
                </div>
                <Slider
                  defaultValue={[100]}
                  max={5000}
                  min={10}
                  step={10}
                  onValueChange={(val) => setTargetYield(val[0])}
                  className="py-4"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t.designLab.requiredArea}</p>
                  <p className="text-2xl font-bold font-mono text-foreground">{calculatedArea} <span className="text-sm">m²</span></p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t.designLab.cyclesYear}</p>
                  <p className="text-2xl font-bold font-mono text-foreground">{(365 / cycleDays).toFixed(1)}</p>
                </div>
              </div>

              {/* Smart Grid Integration Toggle */}
              <div 
                className={`mt-6 p-4 rounded-xl border cursor-pointer flex items-start gap-3 transition-colors ${includeSmartGrid ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-border bg-secondary/30 hover:bg-secondary/50'}`} 
                onClick={() => setIncludeSmartGrid(!includeSmartGrid)}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${includeSmartGrid ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-muted-foreground'}`}>
                  {includeSmartGrid && <Check size={12} className="text-white" />}
                </div>
                <div>
                  <h4 className={`text-sm font-semibold flex items-center gap-2 ${includeSmartGrid ? 'text-emerald-400' : 'text-foreground'}`}>
                    <Sun size={14} className={includeSmartGrid ? 'text-yellow-400' : 'text-muted-foreground'}/> 
                    Add Smart Grid & BESS
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Install Solar PV and Battery Storage to enable AI Energy Arbitrage and Net Metering.</p>
                </div>
              </div>

            </div>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card/50 backdrop-blur-md shadow-xl">
             <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">{t.designLab.requiredSystems}</h3>
             <div className="space-y-3">
               <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50">
                 <Thermometer className="text-orange-500" size={18} />
                 <div className="flex-1">
                   <p className="text-sm font-medium">{t.designLab.hvac}</p>
                   <p className="text-xs text-muted-foreground">{t.designLab.maintainsTemp} {selectedCrop.optimal_conditions.temperature.optimal}°C</p>
                 </div>
               </div>
               <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50">
                 <Droplets className="text-blue-500" size={18} />
                 <div className="flex-1">
                   <p className="text-sm font-medium">{t.designLab.irrigation}</p>
                   <p className="text-xs text-muted-foreground">{t.designLab.targetRh} {selectedCrop.optimal_conditions.humidity.optimal}% RH</p>
                 </div>
               </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50">
                 <Zap className="text-yellow-500" size={18} />
                 <div className="flex-1">
                   <p className="text-sm font-medium">{t.designLab.growLights}</p>
                   <p className="text-xs text-muted-foreground">{t.designLab.ledSpectrum} {selectedCrop.optimal_conditions.light.optimal} μmol</p>
                 </div>
               </div>
             </div>
          </div>
        </div>

        {/* Right Col - 3D Parametric Mesh */}
        <div className="lg:col-span-8 space-y-4">
           <div className="w-full h-[400px] lg:h-[500px] rounded-2xl border border-border bg-black/40 overflow-hidden relative">
              <div className="absolute inset-0 z-0">
                <ParametricMeshCanvas areaM2={parseFloat(calculatedArea)} />
              </div>
              <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
                 <div className="px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm border border-border shadow-lg">
                   <p className="text-xs text-cyan-400 font-mono font-medium">{t.designLab.liveMesh}: {calculatedArea} m²</p>
                 </div>
              </div>
           </div>

           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-md shadow-xl gap-4">
             <div>
               <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                 <Box size={16} className="text-cyan-500" /> {t.designLab.buildingFuture}
               </h4>
               <p className="text-sm text-muted-foreground mt-1">{t.designLab.exportBomDesc}</p>
             </div>
             <button 
               onClick={handleGenerateBom}
               disabled={isGenerating}
               className="flex items-center gap-2 px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 border border-cyan-400 text-white text-sm font-bold transition-all w-full sm:w-auto justify-center"
             >
               {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
               {t.designLab.generateBom}
             </button>
           </div>
           
           {error && (
             <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
               {error}
             </div>
           )}

           {bomList && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-md shadow-xl space-y-4"
             >
               <h4 className="text-xs font-bold text-cyan-500 uppercase tracking-widest flex items-center gap-2">
                 <Box size={14} /> {t.designLab.generatedBom}
               </h4>
               <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                 {bomList.map((item, idx) => (
                   <motion.div 
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: idx * 0.05 }}
                     key={idx} 
                     className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/80 border border-border hover:border-cyan-500/30 transition-colors"
                   >
                     <div>
                       <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">
                         {item.category === 'Structure' ? 'โครงสร้าง' :
                          item.category === 'Sensors' ? 'เซ็นเซอร์' : 
                          item.category === 'Climate' ? 'สภาพแวดล้อม' : 
                          item.category === 'Irrigation' ? 'ระบบน้ำ' : item.category}
                       </p>
                       <p className="text-sm font-semibold text-foreground">{item.name}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-sm font-mono font-bold text-foreground">
                         {item.quantity} <span className="text-xs text-muted-foreground font-sans font-medium">{item.unit === 'Panels' ? 'แผง' : item.unit === 'Units' ? 'ชิ้น' : item.unit === 'Systems' ? 'ระบบ' : item.unit === 'Nodes' ? 'สมาร์ทโหนด' : item.unit}</span>
                       </p>
                       <p className="text-xs text-cyan-500 font-mono font-bold mt-1">
                         {formatCurrency(item.total_price)}
                       </p>
                     </div>
                   </motion.div>
                 ))}
               </div>
               <div className="pt-4 border-t border-border/50 flex justify-between items-center bg-cyan-500/5 p-4 rounded-xl">
                 <span className="text-sm font-bold text-foreground uppercase tracking-wider">{t.designLab.totalCapex}</span>
                 <span className="text-xl font-mono font-bold text-cyan-500 drop-shadow-sm">
                   {formatCurrency(bomList.reduce((acc, curr) => acc + curr.total_price, 0))}
                 </span>
               </div>

               <button
                 onClick={handleSaveAndProcure}
                 disabled={isSaving}
                 className="w-full mt-2 flex items-center justify-center gap-2 px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 border border-emerald-400 text-white text-sm font-bold transition-all"
               >
                 {isSaving ? <Loader2 className="animate-spin" size={18} /> : <ShoppingCart size={18} />}
                 {t.designLab.saveAndCheckout}
               </button>
             </motion.div>
           )}
        </div>
      </div>
    </motion.div>
  );
}
