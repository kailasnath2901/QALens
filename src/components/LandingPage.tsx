"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Sparkles, Layers, Gauge, Cpu, CheckCircle2, ArrowRight, ShieldCheck, Database, FileSpreadsheet, Send, Sun, Moon, ChevronRight, Zap, Box, Settings, Lock, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { EncryptedText } from "@/components/ui/encrypted-text";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { LinkPreview } from "@/components/ui/link-preview";

interface LandingPageProps {
  onOpenLogin: () => void;
}

export function LandingPage({ onOpenLogin }: LandingPageProps) {
  const { enableDemoUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [demoInput, setDemoInput] = useState("Verify credit card payment form boundary values & empty states");
  const [demoOutput, setDemoOutput] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = () => {
    if (!demoInput.trim() || isSimulating) return;
    setIsSimulating(true);
    setDemoOutput(null);

    setTimeout(() => {
      let simulatedResponse = [];
      const lowerInput = demoInput.toLowerCase();

      if (lowerInput.includes("login") || lowerInput.includes("auth") || lowerInput.includes("sign")) {
        simulatedResponse = [
          {
            title: "[Boundary Values] Verify maximum password length (128 chars)",
            category: "boundary_values",
            steps: ["Focus Password Input", "Paste 129 characters", "Click Login"],
            expectedResult: "Form truncates input or displays 'Password exceeds maximum length'."
          },
          {
            title: "[Empty States] Submit without email address",
            category: "empty_states",
            steps: ["Leave Email blank", "Enter Password", "Click Login"],
            expectedResult: "Inline warning displayed: 'Email address is required.'"
          }
        ];
      } else if (lowerInput.includes("search") || lowerInput.includes("filter")) {
        simulatedResponse = [
          {
            title: "[Empty States] Search with 0 results found",
            category: "empty_states",
            steps: ["Focus Search Bar", "Type non-existent query (e.g. 'xyz123')", "Press Enter"],
            expectedResult: "Displays friendly empty state illustration with 'No results found'."
          },
          {
            title: "[Boundary Values] Special characters in search query",
            category: "boundary_values",
            steps: ["Type '!@#$%^&*()' in search", "Click Search Icon"],
            expectedResult: "Query is sanitized and handled gracefully without crashing."
          }
        ];
      } else {
        simulatedResponse = [
          {
            title: `[Boundary Values] Verify invalid inputs for: ${demoInput.substring(0, 20)}...`,
            category: "boundary_values",
            steps: ["Focus primary input", "Enter invalid boundary data", "Submit"],
            expectedResult: "Form highlights input with appropriate validation error."
          },
          {
            title: "[Empty States] Submit form with missing required fields",
            category: "empty_states",
            steps: ["Leave required fields blank", "Click primary action button"],
            expectedResult: "Inline warnings displayed for all missing fields."
          }
        ];
      }

      setDemoOutput(JSON.stringify(simulatedResponse));
      setIsSimulating(false);
    }, 1200);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      theme === "dark" ? "bg-gray-950 text-gray-100" : "sorbet-bg text-slate-800"
    }`}>
      {/* Navigation Header */}
      <header className={`h-20 border-b backdrop-blur-md sticky top-0 z-50 px-4 sm:px-8 flex items-center justify-between transition-colors ${
        theme === "dark" ? "bg-gray-950/80 border-gray-800" : "bg-white/80 border-slate-200 shadow-sm"
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-gray-950 rounded-[14px] flex items-center justify-center p-1.5">
              <Image src="/images/qalens_logo.svg" alt="QAlens Logo" width={32} height={32} className="w-full h-full object-contain" />
            </div>
          </div>
          <span className="font-extrabold text-xl tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500">
            QAlens AI
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold">
          <a href="#features" className={`transition-colors ${theme === "dark" ? "text-gray-300 hover:text-white" : "text-slate-600 hover:text-indigo-600"}`}>
            Features
          </a>
          <a href="#pipeline" className={`transition-colors ${theme === "dark" ? "text-gray-300 hover:text-white" : "text-slate-600 hover:text-indigo-600"}`}>
            2-Step Pipeline
          </a>
          <a href="#demo" className={`transition-colors ${theme === "dark" ? "text-gray-300 hover:text-white" : "text-slate-600 hover:text-indigo-600"}`}>
            Live Demo
          </a>
          <a href="#tech" className={`transition-colors ${theme === "dark" ? "text-gray-300 hover:text-white" : "text-slate-600 hover:text-indigo-600"}`}>
            Technology
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all ${
              theme === "dark"
                ? "bg-gray-900 border-gray-800 text-amber-400 hover:bg-gray-800"
                : "bg-white border-slate-200 text-indigo-600 hover:bg-slate-50 shadow-sm"
            }`}
            title="Toggle Light / Dark Theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenLogin}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
              theme === "dark"
                ? "bg-gray-900 border-gray-800 text-gray-200 hover:text-white hover:border-gray-700"
                : "bg-white border-slate-200 text-slate-700 hover:text-indigo-600 shadow-sm"
            }`}
          >
            Sign In
          </button>

          <button
            onClick={() => enableDemoUser()}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch App (Preview)</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-16 px-4 sm:px-8 max-w-7xl mx-auto text-center overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <p className="mx-auto max-w-lg py-2 text-center text-xl sm:text-2xl font-bold tracking-tight">
            <EncryptedText
              text="Welcome to QAlens."
              encryptedClassName="text-neutral-500"
              revealedClassName={theme === "dark" ? "text-indigo-400" : "text-indigo-600"}
              revealDelayMs={50}
            />
          </p>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none">
            Think Forward with <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-600">
              Intelligent Test Management
            </span>
          </h1>

          <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
            theme === "dark" ? "text-gray-400" : "text-slate-600"
          }`}>
            Turn UI design screenshots & specs into structured boundary values, empty states, and accessibility test suites with 2-step prompt pipeline intelligence.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => enableDemoUser()}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all group"
            >
              <span>Start Free Workspace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href="#demo"
              className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                theme === "dark"
                  ? "bg-gray-900/80 border-gray-800 text-gray-200 hover:bg-gray-800"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
              }`}
            >
              <span>Try Live Generator Demo</span>
            </a>
          </div>
        </div>

        {/* Feature Grid with Glowing Effect */}
        <div id="features" className="relative z-10 mt-20 max-w-5xl mx-auto">
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <li className="list-none">
              <div className={`relative h-full rounded-2xl border p-4 ${theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-slate-50 border-slate-200"}`}>
                <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} />
                <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-1 font-bold text-lg">
                    01
                  </div>
                  <h3 className="font-bold text-sm mb-1">Upload UI Screenshot</h3>
                  <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}>
                    Step 1 vision model extracts form fields, buttons, and interaction flow entities.
                  </p>
                </div>
              </div>
            </li>

            <li className="list-none">
              <div className={`relative h-full rounded-2xl border p-4 ${theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-slate-50 border-slate-200"}`}>
                <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} />
                <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-1 font-bold text-lg">
                    02
                  </div>
                  <h3 className="font-bold text-sm mb-1">2-Step AI Pipeline</h3>
                  <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}>
                    Generates non-duplicate edge cases, boundary values, and WCAG accessibility tests.
                  </p>
                </div>
              </div>
            </li>

            <li className="list-none">
              <div className={`relative h-full rounded-2xl border p-4 ${theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-slate-50 border-slate-200"}`}>
                <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} />
                <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-1 font-bold text-lg">
                    03
                  </div>
                  <h3 className="font-bold text-sm mb-1">Export & Sync to Qase</h3>
                  <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}>
                    Export to CSV, Markdown, JSON, or push directly to Qase.io bulk endpoint.
                  </p>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Interactive Live Generator Simulator Section */}
      <section id="demo" className="py-16 px-4 sm:px-8 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">
            Interactive Sandbox Simulator
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">
            Interactive Feature Demo
          </h2>
        </div>

        <div className={`p-6 sm:p-8 rounded-3xl border ${
          theme === "dark" ? "bg-gray-900/90 border-gray-800 shadow-2xl" : "bg-white border-slate-200 shadow-xl"
        }`}>
          <div className="space-y-4">
            <label className={`block text-xs font-semibold ${theme === "dark" ? "text-gray-300" : "text-slate-700"}`}>
              Input Requirement Spec or Scenario Description:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                className={`flex-1 rounded-2xl px-4 py-3 text-xs border focus:outline-none focus:border-indigo-500 ${
                  theme === "dark" ? "bg-gray-950 border-gray-800 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              />
              <button
                onClick={handleSimulate}
                disabled={isSimulating}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSimulating ? "Extracting..." : "Simulate"}</span>
              </button>
            </div>

            {demoOutput && (
              <div className="mt-6 space-y-3 animate-fadeIn">
                <div className="text-[10px] text-gray-500 mb-2 uppercase font-sans font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Structured Output Example:</span>
                </div>
                {JSON.parse(demoOutput).map((tc: any, i: number) => (
                  <div key={i} className={`p-4 rounded-xl border text-left flex flex-col gap-2 ${theme === "dark" ? "bg-gray-950 border-gray-800" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${
                        tc.category === 'boundary_values' 
                          ? "bg-purple-500/10 text-purple-600 border-purple-500/20" 
                          : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                      }`}>{tc.category.replace('_', ' ')}</span>
                      <span className={`text-xs font-bold ${theme === "dark" ? "text-gray-200" : "text-slate-700"}`}>{tc.title}</span>
                    </div>
                    <div className={`text-[11px] ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}>
                      <strong>Steps:</strong> {tc.steps.join(" → ")}
                    </div>
                    <div className={`text-[11px] ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>
                      <strong>Expected:</strong> {tc.expectedResult}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tech Stack Preview Section */}
      <section id="tech" className="py-16 px-4 sm:px-8 max-w-5xl mx-auto w-full text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-8">Built With Modern Technologies</h2>
        <div className={`text-lg md:text-2xl max-w-3xl mx-auto mb-10 ${theme === "dark" ? "text-gray-400" : "text-slate-600"}`}>
          <LinkPreview url="https://nextjs.org" className="font-bold text-indigo-500">
            Next.js App Router
          </LinkPreview>{" "}
          and{" "}
          <LinkPreview url="https://tailwindcss.com" className="font-bold text-cyan-500">
            Tailwind CSS
          </LinkPreview>{" "}
          ensure a fast, resilient architecture.
        </div>
        <div className={`text-lg md:text-2xl max-w-3xl mx-auto ${theme === "dark" ? "text-gray-400" : "text-slate-600"}`}>
          Animated using{" "}
          <LinkPreview
            url="https://ui.aceternity.com"
            className="font-bold bg-clip-text text-transparent bg-gradient-to-br from-purple-500 to-pink-500"
          >
            Aceternity UI
          </LinkPreview>{" "}
          components powered by{" "}
          <LinkPreview url="https://framer.com/motion" className="font-bold text-indigo-500">
            Framer Motion
          </LinkPreview>.
        </div>
      </section>

      {/* Footer */}
      <footer className={`mt-auto border-t py-8 px-4 sm:px-8 text-center text-xs ${
        theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-500" : "bg-white border-slate-200 text-slate-500"
      }`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/images/qalens_logo.svg" alt="QAlens Logo" width={20} height={20} className="w-5 h-5" />
            <span className="font-bold text-gray-300">QAlens AI</span>
          </div>
          <p>© {new Date().getFullYear()} QAlens AI Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
