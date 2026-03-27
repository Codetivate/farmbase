/*
  # Phase 4: Digital Twins & Telemetry
  Creates edge hardware linkage to user_designs and time-series sensor tracking.
*/

CREATE TABLE public.digital_twins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  design_id uuid REFERENCES public.user_designs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'provisioning', -- provisioning, active, offline, maintenance
  hardware_mac_address text UNIQUE,
  latest_telemetry jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.digital_twins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digital twins"
  ON public.digital_twins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digital twins"
  ON public.digital_twins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own digital twins"
  ON public.digital_twins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TABLE public.sensor_telemetry (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  twin_id uuid REFERENCES public.digital_twins(id) ON DELETE CASCADE,
  temperature numeric,
  humidity numeric,
  co2 numeric,
  light numeric,
  soil_ph numeric,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE public.sensor_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own telemetry"
  ON public.sensor_telemetry FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.digital_twins
      WHERE digital_twins.id = sensor_telemetry.twin_id
      AND digital_twins.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert telemetry"
  ON public.sensor_telemetry FOR INSERT
  WITH CHECK (true); -- In a real app this would be restricted to edge devices API keys

-- Enable RLS for real app

