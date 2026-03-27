-- Migration for Phase 2: Parametric Architecture & Design Lab

CREATE TABLE IF NOT EXISTS public.design_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_type TEXT NOT NULL, -- e.g., 'temperature_threshold'
    operator TEXT NOT NULL,       -- e.g., '<', '>', '='
    value NUMERIC NOT NULL,       -- e.g., 15
    material_action TEXT NOT NULL, -- e.g., 'auto_select_insulated_panels'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.materials_db (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    supplier_link TEXT,
    unit_cost NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- normally references auth.users(id), leaving loose for local dev simplicity
    crop_id UUID NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
    target_yield_kg NUMERIC NOT NULL,
    calculated_area_m2 NUMERIC,
    generated_bom JSONB DEFAULT '[]'::jsonb,
    ifc_model_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.design_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials_db ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_designs ENABLE ROW LEVEL SECURITY;

-- Basic Public Read Policies for Reference Data
CREATE POLICY "Allow public read access to design_rules"
    ON public.design_rules FOR SELECT USING (true);

CREATE POLICY "Allow public read access to materials_db"
    ON public.materials_db FOR SELECT USING (true);

-- Users can only manage their own designs
CREATE POLICY "Users can manage their own designs"
    ON public.user_designs FOR ALL USING (auth.uid() = user_id);

-- Updated at trigger setup
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_designs_updated_at
    BEFORE UPDATE ON public.user_designs
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
