'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Package, ShoppingCart, Loader2, Trash2 } from 'lucide-react';
import { useFarmStore } from '@/store/farm-store';
import { useAuth } from '@/lib/auth-context';
import { useCurrency } from '@/lib/currency-context';
import { supabase } from '@/core/database/client';
import { useI18n } from '@/lib/i18n/i18n-context';

interface UserDesign {
  id: string;
  created_at: string;
  target_yield_kg: number;
  calculated_area_m2: number;
  generated_bom: any[];
  crop_id: string;
  crops: { name: string; image_url: string };
}

export default function ProcurementDashboard() {
  const { goBackToMarketplace, setViewMode } = useFarmStore();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { t } = useI18n();
  const [designs, setDesigns] = useState<UserDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderingId, setOrderingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setViewMode('login');
      return;
    }

    const fetchDesigns = async () => {
      const { data, error } = await supabase
        .from('user_designs')
        .select('*, crops(name, image_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setDesigns(data as any);
      }
      setLoading(false);
    };

    fetchDesigns();
  }, [user, setViewMode]);

  const handleCreateOrder = async (design: UserDesign) => {
    if (!user) return;
    setOrderingId(design.id);

    try {
      const totalCost = design.generated_bom.reduce((acc, curr) => acc + curr.total_price, 0);

      const { data: order, error: orderError } = await supabase
        .from('procurement_orders')
        .insert({
          user_id: user.id,
          design_id: design.id,
          total_cost_usd: totalCost,
          status: 'processing',
          delivery_address: '123 Cyberpunk Avenue, Neo-Tokyo, 2045'
        })
        .select()
        .single();

      if (orderError || !order) throw new Error('Order creation failed');

      const itemsToInsert = design.generated_bom.map((bomItem) => ({
        order_id: order.id,
        item_category: bomItem.category,
        item_name: bomItem.name,
        quantity: bomItem.quantity,
        unit: bomItem.unit,
        unit_price_usd: bomItem.unit_price,
        total_price_usd: bomItem.total_price
      }));

      await supabase.from('procurement_items').insert(itemsToInsert);

      alert(t.procurement.orderSuccess);
      setViewMode('operations');
      
    } catch (err) {
      console.error(err);
      alert(t.procurement.orderFailed);
    } finally {
      setOrderingId(null);
    }
  };

  const handleDeleteDesign = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from('user_designs').delete().eq('id', id);
      setDesigns((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <button
          onClick={goBackToMarketplace}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          <span className="text-sm font-medium">{t.procurement.backToDiscovery}</span>
        </button>
      </div>

      <div className="py-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t.procurement.savedDesigns}</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-lg">
          {t.procurement.savedDesignsDesc}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-emerald-500" size={24} />
        </div>
      ) : designs.length === 0 ? (
        <div className="text-center py-20 bg-card/30 rounded-xl border border-border/50">
          <Package size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">{t.procurement.noSavedDesigns}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {designs.map((design) => {
            const totalCost = design.generated_bom.reduce((acc, curr) => acc + curr.total_price, 0);

            return (
              <div key={design.id} className="p-5 rounded-xl border border-border/60 bg-card hover:border-border transition-colors flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                      {design.crops?.image_url && (
                        <div className="p-1 rounded-lg bg-secondary/50 border border-border/50">
                           <img src={design.crops.image_url} alt="Crop" className="w-10 h-10 rounded-md object-cover" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-base text-foreground tracking-tight">{design.crops?.name || 'Unknown Crop'} Facility</h3>
                        <p className="text-xs text-emerald-500 font-mono mt-0.5">ID: {design.id.split('-')[0]}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteDesign(design.id, e)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete Design"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                     <div className="p-3 rounded-lg bg-secondary/30 border border-border/40">
                       <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{t.procurement.targetYield}</p>
                       <p className="text-base font-semibold font-mono text-foreground">{design.target_yield_kg} <span className="text-xs font-sans font-normal text-muted-foreground">kg</span></p>
                     </div>
                     <div className="p-3 rounded-lg bg-secondary/30 border border-border/40">
                       <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{t.procurement.footprint}</p>
                       <p className="text-base font-semibold font-mono text-foreground">{design.calculated_area_m2} <span className="text-xs font-sans font-normal text-muted-foreground">m²</span></p>
                     </div>
                  </div>

                  <div className="space-y-1.5 mb-6 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                    {design.generated_bom.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1.5 border-b border-border/30 last:border-0">
                        <span className="text-[13px] text-foreground/90">{item.name}</span>
                        <div className="text-right">
                           <p className="text-xs font-mono text-muted-foreground">{item.quantity} {item.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-end justify-between mt-2 pt-4 border-t border-border/40">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">{t.procurement.estimatedCapex}</p>
                    <p className="text-lg font-bold font-mono text-foreground">{formatCurrency(totalCost)}</p>
                  </div>
                  <button
                    onClick={() => handleCreateOrder(design)}
                    disabled={orderingId === design.id}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {orderingId === design.id ? <Loader2 className="animate-spin" size={16} /> : <ShoppingCart size={16} />}
                    {orderingId === design.id ? t.procurement.processing : t.procurement.confirmOrder}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
