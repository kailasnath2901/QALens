import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { TestCase, Module, SubModule } from "@/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { message, projectId, moduleId, subModuleId, projectName } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    // 1. Gather Project Context from Firestore
    let contextData = {
      project: projectName || "Current Project",
      modulesCount: 0,
      testCasesCount: 0,
      testCasesPreview: [] as { title: string; category: string; status: string; expected: string }[],
      summaryStats: { passed: 0, failed: 0, untested: 0 }
    };

    if (projectId) {
      try {
        const tcQuery = query(collection(db, "testcases"), where("projectId", "==", projectId));
        const tcSnap = await getDocs(tcQuery);
        const cases: TestCase[] = [];
        tcSnap.forEach(d => cases.push(d.data() as TestCase));

        contextData.testCasesCount = cases.length;
        cases.forEach(c => {
          if (c.executionResult === "pass") contextData.summaryStats.passed++;
          else if (c.executionResult === "fail") contextData.summaryStats.failed++;
          else contextData.summaryStats.untested++;
        });

        contextData.testCasesPreview = cases.slice(0, 10).map(c => ({
          title: c.title,
          category: c.category,
          status: c.status,
          expected: c.expectedResult
        }));

        const modQuery = query(collection(db, "modules"), where("projectId", "==", projectId));
        const modSnap = await getDocs(modQuery);
        contextData.modulesCount = modSnap.size;
      } catch (err) {
        console.warn("Could not query Firestore for Tony context:", err);
      }
    }

    // 2. Call Gemini model as "Tony" with multi-model fallback & Groq backup
    const systemPrompt = `You are "Tony", an elite, autonomous AI QA Architect and Lead Automation Engineer for QALens (inspired by JARVIS).
Your demeanor: confident, razor-sharp, concise, proactive, and technically supreme.
When spoken to or chatting:
- You have real-time visibility into the QA workspace.
- Current Workspace Data:
  * Project: ${contextData.project}
  * Modules: ${contextData.modulesCount}
  * Total Test Cases: ${contextData.testCasesCount} (Passed: ${contextData.summaryStats.passed}, Failed: ${contextData.summaryStats.failed}, Untested: ${contextData.summaryStats.untested})
  * Recent Test Cases Sample: ${JSON.stringify(contextData.testCasesPreview, null, 2)}

Instructions:
1. If the user asks for a summary of a project or notes (e.g. "give me a summary on notes", "how is our coverage looking?"), provide a direct, intelligent executive summary with actionable QA recommendations.
2. If asked to generate test scenarios, outline them clearly with preconditions, action, and expected behavior.
3. Keep spoken voice responses punchy and natural (under 4-5 sentences when possible) while answering questions precisely.`;

    let reply = "";
    const geminiModels = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.7-flash"];
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    for (const modelName of geminiModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `${systemPrompt}\n\nUser: ${message}\n\nTony:`,
        });
        if (response && response.text) {
          reply = response.text.trim();
          break;
        }
      } catch (gemErr: any) {
        console.warn(`Gemini model ${modelName} error:`, gemErr?.message?.slice(0, 100));
      }
    }

    // Groq fallback if Gemini models failed or throttled
    if (!reply && process.env.GROQ_API_KEY) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "qwen/qwen3.8-27b",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message }
            ],
            max_tokens: 2048,
          }),
        });
        if (groqRes.ok) {
          const groqData = await groqRes.json();
          reply = groqData.choices?.[0]?.message?.content?.trim() || "";
        }
      } catch (groqErr) {
        console.warn("Groq backup fallback error:", groqErr);
      }
    }

    if (!reply) {
      reply = "I've analyzed the request, but encountered no output from the neural engine. How else may I assist you?";
    }

    return NextResponse.json({
      success: true,
      reply,
      spokenText: reply.replace(/[*#_`]/g, "").slice(0, 300) // cleaned for TTS
    });
  } catch (error: any) {
    console.error("Tony assistant error:", error);
    return NextResponse.json({ 
      error: error?.message || "Tony was unable to process the command." 
    }, { status: 500 });
  }
}