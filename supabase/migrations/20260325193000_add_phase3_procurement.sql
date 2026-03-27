-- Migration for Phase 3: Smart Procurement Hub

CREATE TABLE IF NOT EXISTS public.procurement_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    design_id UUID NOT NULL REFERENCES public.user_designs(id) ON DELETE CASCADE,
    total_cost_usd NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
    delivery_address TEXT,
    tracking_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.procurement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.procurement_orders(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.materials_db(id) ON DELETE SET NULL,
    item_category TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    unit_price_usd NUMERIC NOT NULL,
    total_price_usd NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.procurement_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_items ENABLE ROW LEVEL SECURITY;

-- Security Policies: Users can manage their own orders
CREATE POLICY "Users can read own orders"
    ON public.procurement_orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
    ON public.procurement_orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
    ON public.procurement_orders FOR UPDATE USING (auth.uid() = user_id);

-- Items inherit policy through joining with orders (or just checking auth)
CREATE POLICY "Users can read own items"
    ON public.procurement_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.procurement_orders po WHERE po.id = order_id AND po.user_id = auth.uid()));

CREATE POLICY "Users can insert own items"
    ON public.procurement_items FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.procurement_orders po WHERE po.id = order_id AND po.user_id = auth.uid()));

-- Updated_at trigger for orders
CREATE TRIGGER procurement_orders_updated_at
    BEFORE UPDATE ON public.procurement_orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
