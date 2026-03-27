/**
 * =============================================================================
 * Edge Function: process-upload
 * =============================================================================
 *
 * PURPOSE:
 *   รับไฟล์เอกสาร (PDF, TXT, CSV, JSON, MD, XLS, XLSX) อัปโหลดไป Supabase Storage
 *   แล้วใช้ AI (OpenAI) วิเคราะห์เนื้อหา สรุปผล และสร้าง tags อัตโนมัติ
 *   รองรับ 2 โหมด:
 *     1. multipart/form-data: อัปโหลดไฟล์ใหม่ + วิเคราะห์ทันที
 *     2. JSON body { upload_id }: re-process ไฟล์ที่อัปโหลดไว้แล้ว
 *
 * FLOW (โหมดอัปโหลดใหม่):
 *   1. Frontend (paper-store.ts > submitFileUpload/submitBatchFiles) ส่ง FormData มา
 *   2. Validate ไฟล์ (ขนาด max 25MB, ชนิดไฟล์ที่อนุญาต)
 *   3. อัปโหลดไฟล์ไป Supabase Storage bucket "training-files"
 *   4. สร้าง record ใน training_uploads (status = "processing")
 *   5. ดึงข้อความจากไฟล์ (text-based) หรือ mark เป็น binary
 *   6. ส่งให้ OpenAI วิเคราะห์ -> สรุป + tags + confidence
 *   7. อัปเดต training_uploads (status = "completed")
 *
 * CONNECTED FILES:
 *   - Frontend caller:  store/paper-store.ts > submitFileUpload(), submitBatchFiles()
 *   - DB tables:        training_uploads, crops
 *   - Storage bucket:   training-files
 *   - External API:     OpenAI (gpt-4o-mini)
 *
 * CALLED BY:
 *   - POST ${SUPABASE_URL}/functions/v1/process-upload
 *   - Content-Type: multipart/form-data (อัปโหลดไฟล์) หรือ application/json (re-process)
 *
 * PYTHON INTEGRATION:
 *   ```python
 *   import requests
 *   with open("paper.pdf", "rb") as f:
 *       resp = requests.post(
 *           f"{SUPABASE_URL}/functions/v1/process-upload",
 *           headers={"Authorization": f"Bearer {SUPABASE_ANON_KEY}"},
 *           files={"file": f},
 *           data={"email": "user@example.com", "crop_id": "uuid-here", "purpose": "reference"}
 *       )
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

/** Request body สำหรับ re-process mode (JSON) */
interface ProcessRequest {
  upload_id: string;
}

/**
 * ใช้ OpenAI (gpt-4o-mini) วิเคราะห์เนื้อหาเอกสาร
 * ถ้าไม่มี OPENAI_API_KEY จะ fallback เป็น summary พื้นฐาน
 * Return: { summary, tags, confidence, model }
 */
async function extractAndSummarize(
  filename: string,
  fileType: string,
  textContent: string,
  purpose: string,
  cropName: string
): Promise<{
  summary: string;
  tags: string[];
  confidence: number;
  model: string;
}> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    return {
      summary: `Document "${filename}" uploaded for ${purpose}. ${
        textContent
          ? `Content preview: ${textContent.slice(0, 500)}...`
          : "Binary file - text extraction unavailable without AI."
      }`,
      tags: ["needs-manual-review", "no-ai-key"],
      confidence: 20,
      model: "fallback",
    };
  }

  const prompt = `You are a research document analyst for Farmbase, an agricultural technology platform. Analyze this uploaded document and provide a structured summary.

Document: ${filename}
Type: ${fileType}
Purpose: ${purpose}
${cropName ? `Related Crop: ${cropName}` : ""}
Content (first 4000 chars):
${textContent.slice(0, 4000)}

Respond in valid JSON:
{
  "summary": "3-5 sentence summary of the document's content and relevance to agriculture/farming research. Highlight key data points, methodologies, or findings.",
  "tags": ["array", "of", "relevant", "tags"],
  "confidence": <number 0-100 reflecting how well the document was understood>
}`;

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
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) throw new Error(`OpenAI error: ${resp.status}`);

    const data = await resp.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content);

    return {
      summary: parsed.summary || "",
      tags: parsed.tags || [],
      confidence: Math.max(0, Math.min(100, parsed.confidence || 50)),
      model: "gpt-4o-mini",
    };
  } catch {
    return {
      summary: `AI analysis failed for "${filename}". Manual review required.`,
      tags: ["ai-error", "needs-manual-review"],
      confidence: 10,
      model: "error-fallback",
    };
  }
}

/**
 * === MAIN HANDLER ===
 * แยก 2 โหมดตาม content-type:
 *   - multipart/form-data -> อัปโหลดไฟล์ใหม่ พร้อมวิเคราะห์
 *   - application/json    -> re-process ไฟล์เดิมที่มีอยู่แล้วใน DB
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const email = (formData.get("email") as string) || "anonymous";
      const cropId = (formData.get("crop_id") as string) || "";
      const purpose = (formData.get("purpose") as string) || "reference";
      const privacyLevel =
        (formData.get("privacy_level") as string) || "internal";
      const retentionDays = parseInt(
        (formData.get("retention_days") as string) || "0",
        10
      );

      if (!file) {
        return new Response(
          JSON.stringify({ error: "No file provided" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const maxSize = 25 * 1024 * 1024;
      if (file.size > maxSize) {
        return new Response(
          JSON.stringify({ error: "File too large. Max 25MB." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const allowedTypes = [
        "application/pdf",
        "text/plain",
        "text/csv",
        "application/json",
        "text/markdown",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (!allowedTypes.includes(file.type) && !file.name.endsWith(".md")) {
        return new Response(
          JSON.stringify({
            error: "Unsupported file type. Allowed: PDF, TXT, CSV, JSON, MD, XLS, XLSX",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `uploads/${Date.now()}_${sanitizedName}`;

      const arrayBuffer = await file.arrayBuffer();

      const { error: storageError } = await supabase.storage
        .from("training-files")
        .upload(storagePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      let finalStoragePath = storagePath;
      if (storageError) {
        finalStoragePath = `pending/${Date.now()}_${sanitizedName}`;
      }

      const { data: upload, error: insertError } = await supabase
        .from("training_uploads")
        .insert({
          filename: file.name,
          file_type: file.type,
          file_size_bytes: file.size,
          storage_path: finalStoragePath,
          uploaded_by_email: email,
          crop_id: cropId || null,
          purpose,
          processing_status: "processing",
          privacy_level: privacyLevel,
          retention_days: retentionDays,
        })
        .select()
        .single();

      if (insertError || !upload) {
        return new Response(
          JSON.stringify({ error: "Failed to create upload record", details: insertError }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      let textContent = "";
      if (
        file.type === "text/plain" ||
        file.type === "text/csv" ||
        file.type === "text/markdown" ||
        file.type === "application/json" ||
        file.name.endsWith(".md")
      ) {
        textContent = new TextDecoder().decode(arrayBuffer);
      } else {
        textContent = `[Binary file: ${file.name}, ${file.size} bytes, type: ${file.type}]`;
      }

      let cropName = "";
      if (cropId) {
        const { data: crop } = await supabase
          .from("crops")
          .select("name")
          .eq("id", cropId)
          .maybeSingle();
        cropName = crop?.name || "";
      }

      const ai = await extractAndSummarize(
        file.name,
        file.type,
        textContent,
        purpose,
        cropName
      );

      await supabase
        .from("training_uploads")
        .update({
          ai_extracted_text: textContent.slice(0, 50000),
          ai_summary: ai.summary,
          ai_tags: ai.tags,
          ai_confidence: ai.confidence,
          ai_model_used: ai.model,
          ai_processed_at: new Date().toISOString(),
          processing_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", upload.id);

      return new Response(
        JSON.stringify({
          id: upload.id,
          filename: file.name,
          processing_status: "completed",
          ai_summary: ai.summary,
          ai_tags: ai.tags,
          ai_confidence: ai.confidence,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { upload_id }: ProcessRequest = await req.json();

    if (!upload_id) {
      return new Response(
        JSON.stringify({ error: "upload_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: upload } = await supabase
      .from("training_uploads")
      .select("*")
      .eq("id", upload_id)
      .maybeSingle();

    if (!upload) {
      return new Response(
        JSON.stringify({ error: "Upload not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabase
      .from("training_uploads")
      .update({ processing_status: "processing", updated_at: new Date().toISOString() })
      .eq("id", upload_id);

    let cropName = "";
    if (upload.crop_id) {
      const { data: crop } = await supabase
        .from("crops")
        .select("name")
        .eq("id", upload.crop_id)
        .maybeSingle();
      cropName = crop?.name || "";
    }

    const ai = await extractAndSummarize(
      upload.filename,
      upload.file_type,
      upload.ai_extracted_text || "",
      upload.purpose,
      cropName
    );

    await supabase
      .from("training_uploads")
      .update({
        ai_summary: ai.summary,
        ai_tags: ai.tags,
        ai_confidence: ai.confidence,
        ai_model_used: ai.model,
        ai_processed_at: new Date().toISOString(),
        processing_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", upload_id);

    return new Response(
      JSON.stringify({
        id: upload_id,
        processing_status: "completed",
        ai_summary: ai.summary,
        ai_tags: ai.tags,
        ai_confidence: ai.confidence,
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
