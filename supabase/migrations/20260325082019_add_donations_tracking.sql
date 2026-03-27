/*
  # Add Donations Tracking

  1. New Tables
    - `donations`
      - `id` (uuid, primary key)
      - `amount_usd` (numeric) - amount in USD
      - `amount_thb` (numeric) - amount in THB sent to PromptPay
      - `usd_thb_rate` (numeric) - exchange rate used
      - `promptpay_ref` (text) - PromptPay transaction reference
      - `status` (text) - pending, confirmed, expired, failed
      - `donor_message` (text) - optional message from donor
      - `confirmed_at` (timestamptz) - when payment was confirmed
      - `expires_at` (timestamptz) - when the QR code expires
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `donations` table
    - Insert policy for anyone (anonymous donations allowed)
    - Select policy for authenticated users only
    - Update policy for authenticated users only
*/

CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_usd numeric NOT NULL DEFAULT 0,
  amount_thb numeric NOT NULL DEFAULT 0,
  usd_thb_rate numeric NOT NULL DEFAULT 34.5,
  promptpay_ref text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  donor_message text DEFAULT '',
  confirmed_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create donations"
  ON donations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view donations"
  ON donations FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update donations"
  ON donations FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_promptpay_ref ON donations(promptpay_ref);
