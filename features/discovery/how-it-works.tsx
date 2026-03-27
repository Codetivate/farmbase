'use client';

import { motion } from 'framer-motion';
import { FlaskConical, Cuboid, ShoppingCart, Activity } from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18n-context';

export default function HowItWorks() {
  const { t } = useI18n();

  const steps = [
    {
      icon: FlaskConical,
      title: t.howItWorks?.step1Title || "1. AI Research Hub",
      desc: t.howItWorks?.step1Desc || "Discover crops backed by science.",
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      glow: 'shadow-cyan-500/20'
    },
    {
      icon: Cuboid,
      title: t.howItWorks?.step2Title || "2. Parametric Design Lab",
      desc: t.howItWorks?.step2Desc || "Generate 3D structural blueprints.",
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      glow: 'shadow-indigo-500/20'
    },
    {
      icon: ShoppingCart,
      title: t.howItWorks?.step3Title || "3. Smart Procurement",
      desc: t.howItWorks?.step3Desc || "Automatically source materials.",
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      glow: 'shadow-amber-500/20'
    },
    {
      icon: Activity,
      title: t.howItWorks?.step4Title || "4. Digital Twin",
      desc: t.howItWorks?.step4Desc || "Monitor live operations sensors.",
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      glow: 'shadow-emerald-500/20'
    }
  ];

  return (
    <section className="py-2 mb-8 max-w-5xl mx-auto px-4 w-full">
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection line for desktop */}
        <div className="hidden lg:block absolute top-[2.25rem] left-[12.5%] right-[12.5%] h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />

        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
            className={`
              relative p-5 rounded-2xl border ${step.border} bg-card/40 backdrop-blur-md
              hover:bg-card hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group
            `}
          >
            <div className={`
              w-12 h-12 rounded-xl ${step.bg} border ${step.border} mb-4 relative z-10 mx-auto lg:mx-0
              flex items-center justify-center ${step.color} shadow-lg ${step.glow}
              group-hover:scale-110 transition-transform duration-300 bg-background
            `}>
              <step.icon size={22} />
            </div>
            <div className="text-center lg:text-left">
              <h4 className="text-sm font-semibold text-foreground mb-1.5 leading-tight">{step.title}</h4>
              <p className="text-xs text-muted-foreground/80 leading-relaxed balance">{step.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
