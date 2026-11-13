import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { StructuredContext, TestCase } from "@/types";

export const maxDuration = 60;

const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.7-flash"];
const GROQ_VISION_MODEL = "qwen/qwen3.8-27b";
const GROQ_TEXT_MODEL = "qwen/qwen3.8-27b";

function cleanAIResponse(text: string, expectArray: boolean = false): string {
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match && match[1]) {
    try { JSON.parse(match[1]); return match[1]; } catch {}
  }
  const openChar = expectArray ? "[" : "{";
  const closeChar = expectArray ? "]" : "}";
  const firstOpen = cleaned.indexOf(openChar);
  const lastClose = cleaned.lastIndexOf(closeChar);
  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    const slice = cleaned.slice(firstOpen, lastClose + 1);
    try { JSON.parse(slice); return slice; } catch {}
  }
  return cleaned;
}

interface GenerateRequestBody {
  sourceType: "image" | "text";
  inputText?: string;
  imageUrl?: string;
  provider: string;
  existingTestCases?: TestCase[];
  cachedContext?: StructuredContext;
}

type Step1Result = {
  context: StructuredContext;
  resolvedProvider: "gemini" | "groq";
  resolvedModel: string;
};

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return { base64, mimeType: contentType };
}

async function callGroqChat(
  apiKey: string,
  messages: { role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }[],
  model: string = GROQ_TEXT_MODEL,
): Promise<string | null> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 4096 }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn(`Groq API error (${res.status}):`, err.slice(0, 300));
    return null;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? null;
}

function isGroqProvider(provider?: string): boolean {
  return provider === "grok-2" || provider === "qase-aiden";
}

function isGeminiProvider(provider?: string): boolean {
  return !!provider && provider.startsWith("gemini");
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequestBody = await req.json();
    const { sourceType, inputText, imageUrl, provider = "grok-2", existingTestCases = [], cachedContext } = body;

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    let structuredContext: StructuredContext;
    let resolvedProvider: "gemini" | "groq";
    let resolvedModel: string;

    if (cachedContext && cachedContext.summary) {
      structuredContext = cachedContext;
      if (isGroqProvider(provider)) {
        resolvedProvider = "groq";
        resolvedModel = GROQ_TEXT_MODEL;
      } else {
        resolvedProvider = "gemini";
        resolvedModel = GEMINI_MODELS[0];
      }
    } else {
      const step1Result = await runStep1ExtractContext({
        sourceType, inputText, imageUrl, geminiKey, groqKey, provider,
      });
      structuredContext = step1Result.context;
      resolvedProvider = step1Result.resolvedProvider;
      resolvedModel = step1Result.resolvedModel;
    }

    const generatedCases = await runStep2GenerateTestCases({
      structuredContext, resolvedProvider, resolvedModel, existingTestCases, geminiKey, groqKey,
    });

    return NextResponse.json({
      success: true,
      structuredContext,
      generatedCases,
      providerUsed: provider,
      resolvedModel,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to generate test cases";
    console.error("AI Generation Error:", err);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

async function runStep1ExtractContext({
  sourceType, inputText, imageUrl, geminiKey, groqKey, provider,
}: {
  sourceType: "image" | "text";
  inputText?: string;
  imageUrl?: string;
  geminiKey?: string;
  groqKey?: string;
  provider?: string;
}): Promise<Step1Result> {
  const imagePrompt = `You are a Senior QA Automation Architect. Analyze this UI screenshot in extreme detail. Identify EVERY visible element.

For a CALL SCREEN, identify: microphone/mute button, call end/hang up button, video toggle, camera switch, speaker/audio route, contact name, call timer, keypad, and any other controls.

Extract:
1. A precise summary describing the screen and its state.
2. A detailed list of ALL visible UI elements with their purpose.
3. Any forms, inputs, or tappable controls.
4. Primary user flows possible from this screen.

Respond ONLY in valid JSON:
{
  "summary": "...",
  "uiElements": ["..."],
  "forms": ["..."],
  "userFlows": ["..."]
}`;

  const textPrompt = (input: string) => `You are a Senior QA Automation Architect. Analyze this text requirement / PRD. Extract:
1. Summary of the feature.
2. Key functional requirements.
3. Business logic rules & entities.
4. Primary User Flows.

Requirement Input:
${input}

Respond ONLY in valid JSON:
{
  "summary": "...",
  "keyRequirements": ["..."],
  "entities": ["..."],
  "userFlows": ["..."]
}`;

  // ── Groq path (grok-2, qase-aiden) ──
  if (isGroqProvider(provider)) {
    if (!groqKey) throw new Error("Groq API key missing. Set GROQ_API_KEY in .env.local");

    if (sourceType === "image" && imageUrl) {
      console.log(`Step 1: Groq ${GROQ_VISION_MODEL} (image)...`);
      const { base64, mimeType } = await fetchImageAsBase64(imageUrl);
      const content = await callGroqChat(groqKey, [{
        role: "user",
        content: [
          { type: "text", text: imagePrompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      }], GROQ_VISION_MODEL);
      if (content) {
        const cleanJson = cleanAIResponse(content, false);
        try {
          const parsed = JSON.parse(cleanJson);
          if (parsed.summary && parsed.uiElements) {
            console.log(`Step 1: Success with Groq ${GROQ_VISION_MODEL}`);
            return { context: parsed, resolvedProvider: "groq", resolvedModel: GROQ_VISION_MODEL };
          }
        } catch (e) { console.warn("Step 1 Groq vision JSON parse failed:", e); }
      }
      throw new Error("Groq image analysis failed. Check your GROQ_API_KEY and rate limits.");
    }

    console.log(`Step 1: Groq ${GROQ_TEXT_MODEL} (text)...`);
    const content = await callGroqChat(groqKey, [{ role: "user", content: textPrompt(inputText || "") }], GROQ_TEXT_MODEL);
    if (content) {
      const cleanJson = cleanAIResponse(content, false);
      try {
        const parsed = JSON.parse(cleanJson);
        if (parsed.summary) {
          console.log(`Step 1: Success with Groq ${GROQ_TEXT_MODEL}`);
          return { context: parsed, resolvedProvider: "groq", resolvedModel: GROQ_TEXT_MODEL };
        }
      } catch (e) { console.warn("Step 1 Groq text JSON parse failed:", e); }
    }
    throw new Error("Groq text analysis failed. Check your GROQ_API_KEY and rate limits.");
  }

  // ── Gemini path (gemini-*) — NO Groq fallback ──
  if (isGeminiProvider(provider)) {
    if (!geminiKey) throw new Error("Gemini API key missing. Set GEMINI_API_KEY in .env.local");

    for (const model of GEMINI_MODELS) {
      try {
        console.log(`Step 1: Gemini ${model}...`);
        const ai = new GoogleGenAI({ apiKey: geminiKey });

        if (sourceType === "image" && imageUrl) {
          const { base64, mimeType } = await fetchImageAsBase64(imageUrl);
          const response = await ai.models.generateContent({
            model,
            contents: [imagePrompt, { inlineData: { mimeType, data: base64 } }],
            config: { responseMimeType: "application/json" },
          });
          if (response.text) {
            try {
              const parsed = JSON.parse(response.text);
              if (parsed.summary && parsed.uiElements) {
                console.log(`Step 1: Success with Gemini ${model}`);
                return { context: parsed, resolvedProvider: "gemini", resolvedModel: model };
              }
            } catch {}
          }
        } else {
          const response = await ai.models.generateContent({
            model,
            contents: textPrompt(inputText || ""),
            config: { responseMimeType: "application/json" },
          });
          if (response.text) {
            try {
              const parsed = JSON.parse(response.text);
              if (parsed.summary) {
                console.log(`Step 1: Success with Gemini ${model} (text)`);
                return { context: parsed, resolvedProvider: "gemini", resolvedModel: model };
              }
            } catch {}
          }
        }
      } catch (e) {
        console.warn(`Step 1 Gemini ${model} failed:`, e);
      }
    }
    throw new Error("All Gemini models failed. Check your GEMINI_API_KEY and rate limits.");
  }

  throw new Error(`Unknown provider: ${provider}`);
}

async function runStep2GenerateTestCases({
  structuredContext, resolvedProvider, resolvedModel, existingTestCases, geminiKey, groqKey,
}: {
  structuredContext: StructuredContext;
  resolvedProvider: "gemini" | "groq";
  resolvedModel: string;
  existingTestCases: TestCase[];
  geminiKey?: string;
  groqKey?: string;
}): Promise<Omit<TestCase, "id" | "projectId" | "createdAt">[]> {
  const existingTitles = existingTestCases.map((c) => c.title).join("; ");

  const promptText = `You are a Lead QA Engineer generating comprehensive test cases.
Based on the structured context below, generate 6-10 distinct, complementary test cases.

Context:
${JSON.stringify(structuredContext, null, 2)}

Existing Test Cases (DO NOT DUPLICATE):
${existingTitles || "None yet."}

CRITICAL: Reference the ACTUAL UI elements from the context above. Do NOT use generic placeholders.

Generate test cases covering: functional, input_validation, error_handling, boundary_values, accessibility, empty_states.

Output MUST be a raw JSON array:
[
  {
    "moduleName": "Module name from context",
    "title": "[Category] Specific descriptive title",
    "category": "functional",
    "preconditions": "Pre-conditions",
    "testData": "Test data if needed",
    "steps": ["Step 1...", "Step 2...", "Step 3..."],
    "expectedResult": "Specific expected behavior",
    "executionResult": "untested",
    "comments": "",
    "sourceType": "text",
    "provider": "${resolvedModel}",
    "status": "draft",
    "tags": ["AI-Generated"]
  }
]

Valid categories: "functional", "input_validation", "error_handling", "boundary_values", "accessibility", "empty_states"`;

  if (resolvedProvider === "groq") {
    if (!groqKey) throw new Error("Groq API key missing");
    console.log(`Step 2: Groq ${GROQ_TEXT_MODEL}...`);
    const content = await callGroqChat(groqKey, [{ role: "user", content: promptText }], GROQ_TEXT_MODEL);
    if (content) {
      const cleanJson = cleanAIResponse(content, true);
      try {
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.warn(`Step 2 Groq JSON parse failed:`, e);
      }
    }
    return [];
  }

  // Gemini
  if (!geminiKey) throw new Error("Gemini API key missing");
  const modelsToTry = [resolvedModel, ...GEMINI_MODELS.filter(m => m !== resolvedModel)];
  const ai = new GoogleGenAI({ apiKey: geminiKey });

  for (const m of modelsToTry) {
    try {
      console.log(`Step 2: Trying Gemini model ${m}...`);
      const response = await ai.models.generateContent({
        model: m,
        contents: promptText,
        config: { responseMimeType: "application/json" },
      });
      if (response.text) {
        try {
          const parsed = JSON.parse(response.text);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    } catch (e: any) {
      console.warn(`Step 2 Gemini model ${m} failed:`, e?.message?.slice(0, 100));
    }
  }

  // Fallback to Groq if all Gemini models failed
  if (groqKey) {
    try {
      console.log(`Step 2: Fallback to Groq ${GROQ_TEXT_MODEL}...`);
      const content = await callGroqChat(groqKey, [{ role: "user", content: promptText }], GROQ_TEXT_MODEL);
      if (content) {
        const cleanJson = cleanAIResponse(content, true);
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (groqErr) {
      console.warn("Step 2 Groq fallback error:", groqErr);
    }
  }

  return [];
}
