import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateDonationRequest {
  amount_usd: number;
  amount_thb: number;
  usd_thb_rate: number;
  donor_message?: string;
}

interface ConfirmDonationRequest {
  donation_id: string;
  promptpay_ref?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "POST" && action === "create") {
      const body: CreateDonationRequest = await req.json();

      if (!body.amount_thb || body.amount_thb <= 0) {
        return new Response(
          JSON.stringify({ error: "Invalid amount" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data, error } = await supabase
        .from("donations")
        .insert({
          amount_usd: body.amount_usd || 0,
          amount_thb: body.amount_thb,
          usd_thb_rate: body.usd_thb_rate || 34.5,
          donor_message: body.donor_message || "",
          status: "pending",
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to create donation", details: error }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify({ donation: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "confirm") {
      const body: ConfirmDonationRequest = await req.json();

      if (!body.donation_id) {
        return new Response(
          JSON.stringify({ error: "donation_id required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: existing } = await supabase
        .from("donations")
        .select("*")
        .eq("id", body.donation_id)
        .maybeSingle();

      if (!existing) {
        return new Response(
          JSON.stringify({ error: "Donation not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (existing.status === "confirmed") {
        return new Response(
          JSON.stringify({ donation: existing, already_confirmed: true }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data, error } = await supabase
        .from("donations")
        .update({
          status: "confirmed",
          promptpay_ref: body.promptpay_ref || "",
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.donation_id)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to confirm", details: error }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify({ donation: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "status") {
      const donationId = url.searchParams.get("id");
      if (!donationId) {
        return new Response(
          JSON.stringify({ error: "id required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data } = await supabase
        .from("donations")
        .select("id, status, amount_thb, confirmed_at")
        .eq("id", donationId)
        .maybeSingle();

      if (!data) {
        return new Response(
          JSON.stringify({ error: "Not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify({ donation: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use ?action=create|confirm|status" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
