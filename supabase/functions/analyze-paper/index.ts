// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalyzeRequest {
  doi?: string;
  url?: string;
  crop_id: string;
  submitted_by_email: string;
  source_type?: string;
  ai_provider?: string;
  ai_model?: string;
  extract_knowledge?: boolean;
}

interface CrossRefWork {
  title?: string[];
  author?: { given?: string; family?: string }[];
  "container-title"?: string[];
  published?: { "date-parts"?: number[][] };
  abstract?: string;
  DOI?: string;
}

interface AIResult {
  summary: string;
  confidence: number;
  tags: string[];
  model: string;
  provider: string;
  knowledge_extracted?: KnowledgeExtraction[];
  tokens_used?: number;
}

interface KnowledgeExtraction {
  title: string;
  content: string;
  node_type: string;
  domain: string;
  confidence: number;
  tags: string[];
}

// ---------------------------------------------------------------------------
// AI Provider Registry -- add new providers here
// ---------------------------------------------------------------------------

interface ProviderConfig {
  envKey: string;
  defaultModel: string;
  costPer1kTokens: Record<string, number>;
  call: (prompt: string, model: string, apiKey: string) => Promise<AIResult>;
}

const PROVIDER_REGISTRY: Record<string, ProviderConfig> = {
  google: {
    envKey: "GOOGLE_AI_API_KEY",
    defaultModel: "gemini-3.1-pro",
    costPer1kTokens: {
      "gemini-3.1-pro": 0.00125,
      "gemini-2.5-flash-preview-05-20": 0.0005,
    },
    call: async (prompt, model, apiKey) => {
      const modelId = model || "gemini-3.1-pro";
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Gemini API error ${resp.status}: ${errText}`);
      }
      const data = await resp.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in Gemini response");
      const parsed = JSON.parse(jsonMatch[0]);
      const tokensUsed =
        (data.usageMetadata?.promptTokenCount || 0) +
        (data.usageMetadata?.candidatesTokenCount || 0);
      return {
        summary: parsed.summary || "",
        confidence: Math.max(0, Math.min(100, parsed.confidence_score || 50)),
        tags: parsed.relevance_tags || [],
        model: modelId,
        provider: "google",
        knowledge_extracted: parsed.knowledge_nodes || [],
        tokens_used: tokensUsed,
      };
    },
  },

  anthropic: {
    envKey: "ANTHROPIC_API_KEY",
    defaultModel: "claude-sonnet-4-20250514",
    costPer1kTokens: {
      "claude-sonnet-4-20250514": 0.015,
      "claude-haiku-4-20250514": 0.005,
    },
    call: async (prompt, model, apiKey) => {
      const modelId = model || "claude-sonnet-4-20250514";
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Anthropic API error ${resp.status}: ${errText}`);
      }
      const data = await resp.json();
      const content = data.content?.[0]?.text || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in Anthropic response");
      const parsed = JSON.parse(jsonMatch[0]);
      const tokensUsed =
        (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
      return {
        summary: parsed.summary || "",
        confidence: Math.max(0, Math.min(100, parsed.confidence_score || 50)),
        tags: parsed.relevance_tags || [],
        model: modelId,
        provider: "anthropic",
        knowledge_extracted: parsed.knowledge_nodes || [],
        tokens_used: tokensUsed,
      };
    },
  },

  openai: {
    envKey: "OPENAI_API_KEY",
    defaultModel: "gpt-4o-mini",
    costPer1kTokens: {
      "gpt-4o-mini": 0.00015,
      "gpt-4o": 0.005,
    },
    call: async (prompt, model, apiKey) => {
      const modelId = model || "gpt-4o-mini";
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 2048,
          response_format: { type: "json_object" },
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`OpenAI API error ${resp.status}: ${errText}`);
      }
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content);
      const tokensUsed =
        (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);
      return {
        summary: parsed.summary || "",
        confidence: Math.max(0, Math.min(100, parsed.confidence_score || 50)),
        tags: parsed.relevance_tags || [],
        model: modelId,
        provider: "openai",
        knowledge_extracted: parsed.knowledge_nodes || [],
        tokens_used: tokensUsed,
      };
    },
  },
};

const PROVIDER_PRIORITY = ["google", "anthropic", "openai"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchCrossRefMetadata(
  doi: string
): Promise<CrossRefWork | null> {
  try {
    const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//, "");
    const resp = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`,
      {
        headers: {
          "User-Agent": "Farmbase/1.0 (mailto:research@farmbase.io)",
          Accept: "application/json",
        },
      }
    );
    if (!resp.ok) return null;
    const json = await resp.json();
    return json.message as CrossRefWork;
  } catch {
    return null;
  }
}

function extractMetadata(work: CrossRefWork) {
  const title = work.title?.[0] || "";
  const authors = (work.author || [])
    .map((a) => [a.given, a.family].filter(Boolean).join(" "))
    .join(", ");
  const journal = work["container-title"]?.[0] || "";
  const year =
    work.published?.["date-parts"]?.[0]?.[0] || new Date().getFullYear();
  const abstract = work.abstract || "";
  const doi = work.DOI || "";
  return { title, authors, journal, year, abstract, doi };
}

function buildAnalysisPrompt(
  title: string,
  authors: string,
  journal: string,
  year: number,
  abstract: string,
  cropName: string,
  extractKnowledge: boolean
): string {
  const knowledgeSection = extractKnowledge
    ? `,
  "knowledge_nodes": [
    {
      "title": "Short title for this knowledge unit",
      "content": "Detailed description of the finding, method, or concept",
      "node_type": "one of: concept, finding, method, material, technique",
      "domain": "e.g. agriculture, biology, environmental_science",
      "confidence": "<0-100 how confident you are in this extraction>",
      "tags": ["relevant", "tags"]
    }
  ]`
    : "";

  return `You are a research analyst for an agricultural technology platform called Farmbase. Analyze this research paper and provide a structured assessment.

Paper Title: ${title}
Authors: ${authors}
Journal: ${journal}
Year: ${year}
Abstract: ${abstract || "Not available"}

Target Crop: ${cropName}

Respond in valid JSON with these fields:
{
  "summary": "A 2-3 sentence summary focused on how this paper's findings apply to controlled environment agriculture (CEA) for the target crop. Be specific about key parameters, methods, or findings.",
  "confidence_score": <number 0-100 reflecting how directly applicable this paper is to CEA cultivation of the target crop. 90+: directly studies this crop under CEA. 70-89: studies this crop but not CEA. 50-69: related crop or general CEA. Below 50: tangentially related>,
  "relevance_tags": ["array", "of", "tags"],
  "extracted_variables": {
    "temperature": { "key": "temperature", "label": "Temperature", "value": "extracted value or empty", "unit": "C", "confidence": 80 },
    "humidity": { "key": "humidity", "label": "Humidity", "value": "", "unit": "%", "confidence": 0 },
    "co2": { "key": "co2", "label": "CO2 Level", "value": "", "unit": "ppm", "confidence": 0 },
    "light": { "key": "light", "label": "Light Intensity", "value": "", "unit": "umol/m2/s", "confidence": 0 },
    "yield": { "key": "yield", "label": "Yield", "value": "", "unit": "g/m2", "confidence": 0 }
  }${knowledgeSection}
}

Tags should describe what the paper covers, e.g.: "temperature-optimization", "yield-modeling", "substrate-composition", "light-spectrum", "CO2-enrichment", "humidity-control", "growth-kinetics", "economic-analysis"

Only fill in extracted_variables where the paper provides actual data. Set confidence to 0 and value to empty string for variables not found in the paper.`;
}

function detectBestProvider(): { provider: string; model: string } {
  for (const name of PROVIDER_PRIORITY) {
    const cfg = PROVIDER_REGISTRY[name];
    if (cfg && Deno.env.get(cfg.envKey)) {
      return { provider: name, model: cfg.defaultModel };
    }
  }
  return { provider: "none", model: "crossref-fallback" };
}

async function generateAISummary(
  title: string,
  authors: string,
  journal: string,
  year: number,
  abstract: string,
  cropName: string,
  requestedProvider: string,
  requestedModel: string,
  extractKnowledge: boolean
): Promise<AIResult> {
  const prompt = buildAnalysisPrompt(
    title, authors, journal, year, abstract, cropName, extractKnowledge
  );

  let providerName = requestedProvider;
  let model = requestedModel;

  if (!providerName || providerName === "auto") {
    const detected = detectBestProvider();
    providerName = detected.provider;
    model = model || detected.model;
  }

  const cfg = PROVIDER_REGISTRY[providerName];

  if (!cfg) {
    const fallbackSummary = abstract
      ? `This paper titled "${title}" by ${authors} (${year}, ${journal}) discusses research relevant to ${cropName} cultivation. ${abstract.slice(0, 300)}...`
      : `This paper titled "${title}" by ${authors} (${year}, ${journal}) presents research relevant to ${cropName} cultivation. Full abstract not available.`;
    return {
      summary: fallbackSummary,
      confidence: abstract ? 55 : 30,
      tags: ["needs-manual-review", "auto-extracted"],
      model: "crossref-fallback",
      provider: "none",
      tokens_used: 0,
    };
  }

  const apiKey = Deno.env.get(cfg.envKey);
  if (!apiKey) {
    return {
      summary: `[${providerName} API key not configured] Paper: "${title}" by ${authors}`,
      confidence: 40,
      tags: ["api-key-missing", "needs-manual-review"],
      model: `missing-key-${providerName}`,
      provider: providerName,
      tokens_used: 0,
    };
  }

  try {
    return await cfg.call(prompt, model || cfg.defaultModel, apiKey);
  } catch (err) {
    return {
      summary: abstract
        ? `[AI analysis unavailable - ${providerName}] Abstract: ${abstract.slice(0, 400)}`
        : `[AI analysis unavailable - ${providerName}] Paper: "${title}" by ${authors}`,
      confidence: 40,
      tags: ["ai-error", "needs-manual-review"],
      model: `error-${providerName}`,
      provider: providerName,
      tokens_used: 0,
    };
  }
}

async function storeKnowledgeNodes(
  supabase: ReturnType<typeof createClient>,
  nodes: KnowledgeExtraction[],
  submissionId: string,
  userId: string
) {
  if (!nodes || nodes.length === 0) return;

  const inserts = nodes.map((node) => ({
    user_id: userId,
    node_type: node.node_type || "finding",
    title: node.title,
    content: node.content,
    source_paper_id: submissionId,
    domain: node.domain || "agriculture",
    confidence_score: node.confidence || 50,
    ai_model_used: "auto",
    tags: node.tags || [],
    is_verified: false,
    language: "en",
  }));

  await supabase.from("knowledge_nodes").insert(inserts);
}

async function trackCost(
  supabase: ReturnType<typeof createClient>,
  providerName: string,
  model: string,
  tokensUsed: number
) {
  if (!tokensUsed) return;

  const cfg = PROVIDER_REGISTRY[providerName];
  const unitCost = cfg?.costPer1kTokens[model] || 0.001;
  const totalCost = (tokensUsed / 1000) * unitCost;
  const billingPeriod = new Date().toISOString().slice(0, 7);

  await supabase.from("cost_tracking").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    cost_category: "ai_tokens",
    provider: providerName,
    model_name: model,
    input_units: tokensUsed,
    output_units: 0,
    unit_cost: unitCost,
    total_cost: totalCost,
    currency: "USD",
    billing_period: billingPeriod,
  });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      doi, url, crop_id, submitted_by_email,
      ai_provider, ai_model, extract_knowledge,
    }: AnalyzeRequest = await req.json();

    if (!crop_id) {
      return new Response(
        JSON.stringify({ error: "crop_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!doi && !url) {
      return new Response(
        JSON.stringify({ error: "Either doi or url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: crop } = await supabase
      .from("crops")
      .select("name")
      .eq("id", crop_id)
      .maybeSingle();

    const cropName = crop?.name || "Unknown Crop";

    const { data: submission, error: insertError } = await supabase
      .from("paper_submissions")
      .insert({
        doi: doi || "",
        url: url || "",
        crop_id,
        submitted_by_email: submitted_by_email || "anonymous",
        status: "analyzing",
      })
      .select()
      .single();

    if (insertError || !submission) {
      return new Response(
        JSON.stringify({ error: "Failed to create submission", details: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("paper_audit_log").insert({
      submission_id: submission.id,
      action: "submitted",
      actor_email: submitted_by_email || "anonymous",
      details: { doi, url, crop_id, ai_provider: ai_provider || "auto" },
    });

    let metadata = {
      title: "", authors: "", journal: "",
      year: new Date().getFullYear(), abstract: "", doi: doi || "",
    };

    if (doi) {
      const crossRefData = await fetchCrossRefMetadata(doi);
      if (crossRefData) {
        metadata = extractMetadata(crossRefData);
      } else {
        await supabase
          .from("paper_submissions")
          .update({
            status: "error",
            error_message: "Could not fetch paper metadata from CrossRef. Please verify the DOI.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", submission.id);

        await supabase.from("paper_audit_log").insert({
          submission_id: submission.id,
          action: "error",
          actor_email: "system",
          details: { error: "CrossRef lookup failed", doi },
        });

        return new Response(
          JSON.stringify({ id: submission.id, status: "error", error: "CrossRef lookup failed for this DOI" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const shouldExtract = extract_knowledge !== false;

    const ai = await generateAISummary(
      metadata.title, metadata.authors, metadata.journal,
      metadata.year, metadata.abstract, cropName,
      ai_provider || "auto", ai_model || "", shouldExtract
    );

    await supabase
      .from("paper_submissions")
      .update({
        title: metadata.title,
        authors: metadata.authors,
        journal: metadata.journal,
        year: metadata.year,
        abstract_text: metadata.abstract,
        doi: metadata.doi,
        ai_summary: ai.summary,
        ai_confidence_score: ai.confidence,
        ai_relevance_tags: ai.tags,
        ai_model_used: `${ai.provider}/${ai.model}`,
        status: "review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", submission.id);

    await supabase.from("paper_audit_log").insert({
      submission_id: submission.id,
      action: "analyzed",
      actor_email: "system",
      details: {
        ai_provider: ai.provider,
        ai_model: ai.model,
        confidence: ai.confidence,
        tags: ai.tags,
        tokens_used: ai.tokens_used || 0,
        knowledge_nodes_extracted: ai.knowledge_extracted?.length || 0,
      },
    });

    if (shouldExtract && ai.knowledge_extracted?.length) {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      let userId = "00000000-0000-0000-0000-000000000000";
      if (token) {
        const { data: userData } = await supabase.auth.getUser(token);
        if (userData?.user?.id) userId = userData.user.id;
      }
      await storeKnowledgeNodes(supabase, ai.knowledge_extracted, submission.id, userId);
    }

    if (ai.tokens_used) {
      await trackCost(supabase, ai.provider, ai.model, ai.tokens_used);
    }

    const result = {
      id: submission.id,
      status: "review",
      title: metadata.title,
      authors: metadata.authors,
      journal: metadata.journal,
      year: metadata.year,
      ai_summary: ai.summary,
      ai_confidence_score: ai.confidence,
      ai_relevance_tags: ai.tags,
      ai_model_used: `${ai.provider}/${ai.model}`,
      ai_provider: ai.provider,
      knowledge_nodes_count: ai.knowledge_extracted?.length || 0,
      tokens_used: ai.tokens_used || 0,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
