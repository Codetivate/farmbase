/**
 * =============================================================================
 * Store: farm-store.ts (Zustand)
 * =============================================================================
 *
 * PURPOSE:
 *   Global state management สำหรับหน้า Marketplace และ Crop Detail
 *   เก็บ crops, selected crop, environment parameters, simulation day, search/filter state
 *
 * HOW IT WORKS:
 *   ใช้ Zustand (lightweight state management) แทน Redux
 *   Component ใดก็ตามเรียก useFarmStore() เพื่อ read/write state ได้
 *
 * CONNECTED FILES:
 *   - Data source:      lib/supabase.ts (Crop, ResearchCitation types)
 *   - UI consumers:     features/marketplace/marketplace-feed.tsx (crop list)
 *                        features/marketplace/crop-card.tsx (แสดง crop)
 *                        features/marketplace/crop-detail-view.tsx (รายละเอียด crop)
 *                        features/simulation/* (3D simulation)
 *                        features/discovery/search-bar.tsx (search)
 *   - Data loader:      app/page.tsx (fetch crops จาก Supabase แล้ว setCrops)
 *
 * PYTHON INTEGRATION:
 *   Python ไม่เรียก store นี้โดยตรง แต่ใช้ Supabase client ดึงข้อมูล crops ได้:
 *   ```python
 *   from supabase import create_client
 *   supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
 *   crops = supabase.table("crops").select("*").execute()
 *   ```
 * =============================================================================
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Crop, ResearchCitation } from '@/lib/supabase';

/** สภาพแวดล้อมที่ใช้ใน 3D simulation (ปรับได้จาก environment-panel.tsx) */
interface EnvironmentState {
  temperature: number;
  humidity: number;
  co2: number;
  light: number;
}

export type ViewMode = 'marketplace' | 'detail' | 'papers' | 'login' | 'design-lab' | 'procurement' | 'operations';

/** State + Actions ทั้งหมดของ farm store */
interface FarmStore {
  crops: Crop[];
  selectedCrop: Crop | null;
  citations: ResearchCitation[];
  environment: EnvironmentState;
  simulationDay: number;
  searchQuery: string;
  activeTag: string | null;
  drawerOpen: boolean;
  viewMode: ViewMode;

  setCrops: (crops: Crop[]) => void;
  setSelectedCrop: (crop: Crop | null) => void;
  setCitations: (citations: ResearchCitation[]) => void;
  setEnvironment: (env: Partial<EnvironmentState>) => void;
  setSimulationDay: (day: number) => void;
  setSearchQuery: (query: string) => void;
  setActiveTag: (tag: string | null) => void;
  setDrawerOpen: (open: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  openCropDetail: (crop: Crop) => void;
  openDesignLab: (crop: Crop) => void;
  goBackToMarketplace: () => void;
}

export const useFarmStore = create<FarmStore>()(
  persist(
    (set) => ({
      crops: [],
  selectedCrop: null,
  citations: [],
  environment: {
    temperature: 7,
    humidity: 90,
    co2: 1000,
    light: 100,
  },
  simulationDay: 1,
  searchQuery: '',
  activeTag: null,
  drawerOpen: false,
  viewMode: 'marketplace',

  /** อัปเดตรายการ crop ทั้งหมด (เรียกจาก app/page.tsx หลัง fetch จาก Supabase) */
  setCrops: (crops) => set({ crops }),

  /** เลือก crop -> reset environment เป็นค่า optimal ของ crop นั้น + reset simulation day */
  setSelectedCrop: (crop) =>
    set(() => {
      if (!crop) return { selectedCrop: null };
      const opt = crop.optimal_conditions;
      return {
        selectedCrop: crop,
        environment: {
          temperature: opt.temperature.optimal,
          humidity: opt.humidity.optimal,
          co2: opt.co2.optimal,
          light: opt.light.optimal,
        },
        simulationDay: 1,
      };
    }),

  setCitations: (citations) => set({ citations }),

  /** อัปเดตสภาพแวดล้อมบางส่วน (เช่น ปรับแค่อุณหภูมิ) -> merge กับค่าเดิม */
  setEnvironment: (env) =>
    set((state) => ({
      environment: { ...state.environment, ...env },
    })),

  setSimulationDay: (day) => set({ simulationDay: day }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveTag: (tag) => set({ activeTag: tag }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  setViewMode: (mode) => set({ viewMode: mode }),

  /** เปิดหน้า crop detail: ตั้ง environment เป็น optimal + ตั้ง simulation day เป็น 70% ของ cycle */
  openCropDetail: (crop) =>
    set(() => {
      const opt = crop.optimal_conditions;
      return {
        selectedCrop: crop,
        viewMode: 'detail',
        environment: {
          temperature: opt.temperature.optimal,
          humidity: opt.humidity.optimal,
          co2: opt.co2.optimal,
          light: opt.light.optimal,
        },
        simulationDay: Math.round(crop.growth_params.cycle_days * 0.7),
      };
    }),

  /** เปิดหน้า Parametric Design Lab สำหรับพืชที่เลือก */
  openDesignLab: (crop) =>
    set(() => {
      const opt = crop.optimal_conditions;
      return {
        selectedCrop: crop,
        viewMode: 'design-lab',
        environment: {
          temperature: opt.temperature.optimal,
          humidity: opt.humidity.optimal,
          co2: opt.co2.optimal,
          light: opt.light.optimal,
        },
        simulationDay: 1,
      };
    }),

  /** กลับไปหน้า marketplace + ปิด drawer */
  goBackToMarketplace: () =>
    set({ viewMode: 'marketplace', drawerOpen: false }),
    }),
    {
      name: 'farmbase-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        viewMode: state.viewMode,
        selectedCrop: state.selectedCrop,
        environment: state.environment,
        simulationDay: state.simulationDay,
        searchQuery: state.searchQuery,
        activeTag: state.activeTag,
      }),
    }
  )
);
