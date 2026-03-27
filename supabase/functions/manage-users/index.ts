/**
 * =============================================================================
 * Edge Function: manage-users
 * =============================================================================
 *
 * PURPOSE:
 *   Admin-only function สำหรับจัดการ user ในระบบ
 *   รองรับ 2 actions: "create" (สร้าง user ใหม่) และ "delete" (soft-delete โดยตั้ง is_active=false)
 *
 * FLOW:
 *   1. ตรวจ Authorization header -> ดึง caller จาก auth.getUser()
 *   2. ตรวจ user_profiles ว่า caller เป็น admin หรือไม่
 *   3. ถ้าเป็น admin -> ใช้ service role key สร้าง adminClient
 *   4. ทำ action ตามที่ร้องขอ (create/delete)
 *
 * SECURITY:
 *   - ต้อง login แล้วเท่านั้น (มี Authorization header)
 *   - ต้องเป็น admin เท่านั้น (ตรวจจาก user_profiles.role)
 *   - ใช้ callerClient (anon key + user token) เพื่อยืนยันตัวตน
 *   - ใช้ adminClient (service role key) เพื่อสร้าง/ลบ user
 *
 * CONNECTED FILES:
 *   - Frontend caller:  features/auth/user-management.tsx
 *   - DB tables:        auth.users (Supabase built-in), user_profiles
 *   - Trigger:          on_auth_user_created (auto-creates user_profiles record)
 *
 * CALLED BY:
 *   - POST ${SUPABASE_URL}/functions/v1/manage-users
 *   - Authorization: Bearer ${USER_JWT_TOKEN}  (ไม่ใช่ anon key, ต้องเป็น JWT ของ admin)
 *
 * REQUEST BODY (JSON):
 *   Create: { action: "create", email: string, password: string, full_name?: string, role?: string }
 *   Delete: { action: "delete", user_id: string }
 *
 * PYTHON INTEGRATION:
 *   ```python
 *   import requests
 *   resp = requests.post(
 *       f"{SUPABASE_URL}/functions/v1/manage-users",
 *       headers={"Authorization": f"Bearer {ADMIN_JWT_TOKEN}", "Content-Type": "application/json"},
 *       json={"action": "create", "email": "new@example.com", "password": "secure123", "role": "editor"}
 *   )
 *   ```
 * =============================================================================
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/** === MAIN HANDLER === */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();

    if (!caller) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: callerProfile } = await callerClient
      .from("user_profiles")
      .select("role, is_active")
      .eq("id", caller.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== "admin" || !callerProfile.is_active) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { email, password, full_name, role } = body;

      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: "Email and password are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: full_name || "" },
        });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (newUser?.user && role && role !== "viewer") {
        await adminClient
          .from("user_profiles")
          .update({ role, full_name: full_name || "" })
          .eq("id", newUser.user.id);
      } else if (newUser?.user && full_name) {
        await adminClient
          .from("user_profiles")
          .update({ full_name })
          .eq("id", newUser.user.id);
      }

      return new Response(
        JSON.stringify({ success: true, user_id: newUser?.user?.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      const { user_id } = body;

      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "user_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (user_id === caller.id) {
        return new Response(
          JSON.stringify({ error: "Cannot delete your own account" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await adminClient
        .from("user_profiles")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", user_id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
