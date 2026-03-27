/**
 * =============================================================================
 * Edge Function: triage-feedback
 * =============================================================================
 *
 * PURPOSE:
 *   รับ feedback_id แล้วใช้ AI (OpenAI) วิเคราะห์ feedback ที่ user ส่งมา
 *   เพื่อจัดลำดับความสำคัญอัตโนมัติ (auto_fix / needs_review / likely_invalid)
 *   ช่วยลดภาระ admin ในการอ่าน feedback ทีละชิ้น
 *
 * FLOW:
 *   1. รับ { feedback_id } จาก frontend
 *   2. ดึง paper_feedback record จาก DB
 *   3. ดึง paper_submissions ที่เกี่ยวข้อง (เพื่อให้ AI มี context)
 *   4. ส่ง feedback + paper context ให้ AI วิเคราะห์
 *   5. อัปเดต paper_feedback (status = "ai_triaged") พร้อม ai_analysis, ai_recommendation
 *   6. บันทึก audit log ใน paper_audit_log
 *
 * CONNECTED FILES:
 *   - Frontend caller:  features/papers/feedback-dashboard.tsx (ปุ่ม Triage)
 *   - DB tables:        paper_feedback, paper_submissions, paper_audit_log
 *   - External API:     OpenAI (gpt-4o-mini)
 *
 * CALLED BY:
 *   - POST ${SUPABASE_URL}/functions/v1/triage-feedback
 *   - Authorization: Bearer ${SUPABASE_ANON_KEY}
 *
 * REQUEST BODY (JSON):
 *   { feedback_id: string }
 *
 * RESPONSE (JSON):
 *   {
 *     id: string,
 *     status: "ai_triaged",
 *     ai_analysis: string,         // คำอธิบายจาก AI ว่า feedback valid หรือไม่
 *     ai_recommendation: string,   // "auto_fix" | "needs_review" | "likely_invalid"
 *     ai_confidence: number        // 0-100
 *   }
 *
 * PYTHON INTEGRATION:
 *   ```python
 *   import requests
 *   resp = requests.post(
 *       f"{SUPABASE_URL}/functions/v1/triage-feedback",
 *       headers={"Authorization": f"Bearer {SUPABASE_ANON_KEY}", "Content-Type": "application/json"},
 *       json={"feedback_id": "uuid-here"}
 *   )
 *   result = resp.json()
 *   ```
 * =============================================================================
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/** Request body: ระบุ feedback_id ที่ต้องการให้ AI triage */
interface TriageRequest {
  feedback_id: string;
}

/**
 * ใช้ OpenAI วิเคราะห์ feedback พร้อม context ของ paper
 * AI จะประเมิน: feedback valid ไหม? แนะนำ auto_fix/needs_review/likely_invalid
 * ถ้าไม่มี OPENAI_API_KEY จะ fallback เป็นกฎง่ายๆ (rule-based)
 */
async function triageWithAI(
  feedbackType: string,
  fieldName: string,
  originalValue: string,
  suggestedValue: string,
  feedbackNotes: string,
  paperTitle: string,
  paperAuthors: string,
  paperYear: number,
  paperJournal: string,
  aiSummary: string
): Promise<{
  analysis: string;
  recommendation: string;
  confidence: number;
}> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    let confidence = 50;
    let recommendation = "needs_review";

    if (feedbackType === "data_error" && suggestedValue) {
      confidence = 60;
      recommendation = "needs_review";
    }
    if (feedbackType === "outdated") {
      confidence = 40;
      recommendation = "needs_review";
    }

    return {
      analysis: `Feedback received for ${fieldName || "general"} field. Type: ${feedbackType}. User suggests: "${suggestedValue || feedbackNotes}". Manual review recommended as AI triage is unavailable.`,
      recommendation,
      confidence,
    };
  }

  const prompt = `You are a research data quality analyst for Farmbase, an agricultural technology platform. A user has submitted feedback about a research paper's data. Your job is to assess whether this feedback is likely valid and recommend an action.

PAPER CONTEXT:
- Title: ${paperTitle}
- Authors: ${paperAuthors}
- Year: ${paperYear}
- Journal: ${paperJournal}
- AI Summary: ${aiSummary}

FEEDBACK:
- Type: ${feedbackType}
- Field: ${fieldName || "general"}
- Current value: ${originalValue || "N/A"}
- Suggested correction: ${suggestedValue || "N/A"}
- User explanation: ${feedbackNotes || "No notes provided"}

Analyze this feedback and respond in valid JSON:
{
  "analysis": "2-3 sentence assessment of the feedback validity. Consider: Is the suggested correction plausible? Does it align with what you know about this topic? Are there any red flags suggesting the feedback is incorrect?",
  "recommendation": "<one of: auto_fix | needs_review | likely_invalid>",
  "confidence": <number 0-100. 90+: very confident in recommendation. 70-89: fairly confident. 50-69: uncertain, needs human. Below 50: low confidence>
}

Guidelines for recommendation:
- "auto_fix": The correction is clearly factual and verifiable (e.g., wrong publication year, misspelled author name, incorrect DOI)
- "needs_review": The feedback is plausible but subjective or requires domain expertise (e.g., disagreement with AI summary, confidence score disputes)
- "likely_invalid": The feedback seems incorrect, spam, or based on misunderstanding`;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) throw new Error(`OpenAI error: ${resp.status}`);

    const data = await resp.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content);

    return {
      analysis: parsed.analysis || "",
      recommendation: parsed.recommendation || "needs_review",
      confidence: Math.max(0, Math.min(100, parsed.confidence || 50)),
    };
  } catch {
    return {
      analysis: "AI triage failed. Manual review required.",
      recommendation: "needs_review",
      confidence: 30,
    };
  }
}

/**
 * === MAIN HANDLER ===
 * รับ { feedback_id } -> ดึง feedback + paper context -> AI triage -> อัปเดต DB + audit log
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { feedback_id }: TriageRequest = await req.json();

    if (!feedback_id) {
      return new Response(
        JSON.stringify({ error: "feedback_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: feedback, error: fbError } = await supabase
      .from("paper_feedback")
      .select("*")
      .eq("id", feedback_id)
      .maybeSingle();

    if (fbError || !feedback) {
      return new Response(
        JSON.stringify({ error: "Feedback not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: submission } = await supabase
      .from("paper_submissions")
      .select("*")
      .eq("id", feedback.submission_id)
      .maybeSingle();

    const result = await triageWithAI(
      feedback.feedback_type,
      feedback.field_name,
      feedback.original_value,
      feedback.suggested_value,
      feedback.feedback_notes,
      submission?.title || "",
      submission?.authors || "",
      submission?.year || 0,
      submission?.journal || "",
      submission?.ai_summary || ""
    );

    await supabase
      .from("paper_feedback")
      .update({
        ai_analysis: result.analysis,
        ai_recommendation: result.recommendation,
        ai_confidence: result.confidence,
        ai_processed_at: new Date().toISOString(),
        status: "ai_triaged",
        updated_at: new Date().toISOString(),
      })
      .eq("id", feedback_id);

    await supabase.from("paper_audit_log").insert({
      submission_id: feedback.submission_id,
      action: "feedback_triaged",
      actor_email: "ai-triage",
      details: {
        feedback_id,
        recommendation: result.recommendation,
        confidence: result.confidence,
        feedback_type: feedback.feedback_type,
      },
    });

    return new Response(
      JSON.stringify({
        id: feedback_id,
        status: "ai_triaged",
        ai_analysis: result.analysis,
        ai_recommendation: result.recommendation,
        ai_confidence: result.confidence,
      }),
      {
        status: 200,
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
