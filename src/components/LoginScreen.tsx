"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Sparkles, Mail, Lock, User as UserIcon, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff, ExternalLink, Sun, Moon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

function formatFirebaseError(err: unknown): string {
  if (!err) return "Authentication error occurred.";
  const raw = err instanceof Error ? err.message : String(err);

  if (raw.includes("OPERATION_NOT_ALLOWED") || raw.includes("operation-not-allowed")) {
    return "OPERATION_NOT_ALLOWED: Email/Password sign-in is currently disabled in your Firebase Console (qalens-60f2d). Enable 'Email/Password' under Firebase Console -> Authentication -> Sign-in method, OR click 'Launch with Instant Demo Workspace' below!";
  }
  if (raw.includes("email-already-in-use")) {
    return "This email address is already registered. Switch to 'Sign In' to log into your account.";
  }
  if (raw.includes("invalid-credential") || raw.includes("user-not-found") || raw.includes("wrong-password")) {
    return "Invalid email or password. Please verify your credentials and try again.";
  }
  if (raw.includes("invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (raw.includes("weak-password")) {
    return "Password must be at least 6 characters long.";
  }
  return raw.replace(/^Firebase:\s*/, "");
}

interface LoginScreenProps {
  onBackToLanding?: () => void;
}

export function LoginScreen({ onBackToLanding }: LoginScreenProps) {
  const { loginWithEmail, signupWithEmail, enableDemoUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleModeSwitch = (newMode: "login" | "signup") => {
    setMode(newMode);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
      if (!username.trim()) {
        setError("Username is required.");
        return;
      }
      if (!email.trim() || !email.includes("@")) {
        setError("Please enter a valid email address.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please verify and try again.");
        return;
      }
    } else {
      if (!email.trim() || !password) {
        setError("Please enter both email and password.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password);
      }
    } catch (err: unknown) {
      const formatted = formatFirebaseError(err);
      setError(formatted);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${theme === "dark" ? "bg-gray-950 text-gray-100" : "sorbet-bg text-slate-800"}`}>
      {/* Top Header Floating Controls */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
              theme === "dark"
                ? "bg-gray-900 border-gray-800 text-gray-300 hover:text-white"
                : "bg-white border-slate-200 text-slate-600 hover:text-indigo-600 shadow-sm"
            }`}
          >
            ← Back to Product Page
          </button>
        )}

        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl border transition-all ${
            theme === "dark"
              ? "bg-gray-900 border-gray-800 text-amber-400 hover:bg-gray-800"
              : "bg-white border-slate-200 text-indigo-600 hover:bg-slate-50 shadow-sm"
          }`}
          title="Toggle Light / Dark Sorbet Theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Split-Screen Left Side: Nexus Style Branding */}
      <div className={`w-full md:w-1/2 p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden ${
        theme === "dark" ? "bg-gray-900/60 border-r border-gray-800/80" : "bg-white/80 border-r border-slate-200/80 shadow-sm"
      }`}>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 p-1.5 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Image src="/images/qalens_logo.svg" alt="QAlens Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500">
                QAlens
              </span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-500 rounded border border-indigo-500/20">
                AI 2.0
              </span>
            </div>
          </div>

          <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-6">
            Autonomous Test Suite <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-600">
              Intelligence
            </span>
          </h1>

          <p className={`text-xs lg:text-sm leading-relaxed max-w-md ${theme === "dark" ? "text-gray-400" : "text-slate-600"}`}>
            Transform screenshots and requirement specifications into boundary, empty-state, and accessibility test suites with 2-step AI pipeline precision.
          </p>
        </div>

        {/* Middle Feature Highlights */}
        <div className="relative z-10 my-8 space-y-3 text-xs">
          <div className={`p-3 rounded-2xl border flex items-center gap-3 ${theme === "dark" ? "bg-gray-950/80 border-gray-800 text-gray-300" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Multi-Model AI Engine (Gemini 2.5 Flash, Groq, Qase AIDEN)</span>
          </div>
          <div className={`p-3 rounded-2xl border flex items-center gap-3 ${theme === "dark" ? "bg-gray-950/80 border-gray-800 text-gray-300" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
            <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>Real-time RPM & RPD Usage Limits Metering</span>
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-gray-500">
          © {new Date().getFullYear()} QAlens AI Inc. • Privacy • Terms
        </div>
      </div>

      {/* Split-Screen Right Side: Sign In / Register Form */}
      <div className="w-full md:w-1/2 p-6 sm:p-12 lg:p-16 flex items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          {/* Mode Switcher Tabs */}
          <div className={`flex p-1 rounded-2xl border ${theme === "dark" ? "bg-gray-950 border-gray-800" : "bg-slate-100 border-slate-200"}`}>
            <button
              onClick={() => handleModeSwitch("login")}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                mode === "login"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : theme === "dark" ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => handleModeSwitch("signup")}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                mode === "signup"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : theme === "dark" ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Register User
            </button>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-1">
              {mode === "login" ? "Sign in to QAlens" : "Create QAlens Account"}
            </h2>
            <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-slate-500"}`}>
              {mode === "login" ? "Welcome back! Please enter your credentials." : "Register a new user account with Firebase Auth."}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-xs text-amber-200 flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                {error.includes("OPERATION_NOT_ALLOWED") && (
                  <div className="mt-2 pt-2 border-t border-amber-500/20">
                    <a
                      href="https://console.firebase.google.com/u/0/project/qalens-60f2d/authentication/providers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-300 underline hover:text-cyan-200 inline-flex items-center gap-1 font-semibold"
                    >
                      <span>Enable Email/Password in Firebase Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${theme === "dark" ? "text-gray-300" : "text-slate-700"}`}>
                  Username *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="qa_architect"
                    className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 border ${
                      theme === "dark" ? "bg-gray-950 border-gray-800 text-white placeholder-gray-600" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                    }`}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${theme === "dark" ? "text-gray-300" : "text-slate-700"}`}>
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="qa.architect@company.com"
                  className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 border ${
                    theme === "dark" ? "bg-gray-950 border-gray-800 text-white placeholder-gray-600" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                  }`}
                  required
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${theme === "dark" ? "text-gray-300" : "text-slate-700"}`}>
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full rounded-xl pl-10 pr-10 py-2.5 text-xs focus:outline-none focus:border-indigo-500 border ${
                    theme === "dark" ? "bg-gray-950 border-gray-800 text-white placeholder-gray-600" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-gray-400 hover:text-indigo-500 transition-colors"
                  title={showPassword ? "Hide Password" : "Show Password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${theme === "dark" ? "text-gray-300" : "text-slate-700"}`}>
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full rounded-xl pl-10 pr-10 py-2.5 text-xs focus:outline-none focus:border-indigo-500 border ${
                      theme === "dark" ? "bg-gray-950 border-gray-800 text-white placeholder-gray-600" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-gray-400 hover:text-indigo-500 transition-colors"
                    title={showConfirmPassword ? "Hide Password" : "Show Password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 mt-2"
            >
              <span>{submitting ? "Authenticating..." : mode === "login" ? "Sign In" : "Register Account"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${theme === "dark" ? "border-gray-800" : "border-slate-200"}`} />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className={`px-3 font-mono ${theme === "dark" ? "bg-gray-950 text-gray-500" : "bg-white text-slate-400"}`}>
                Or Instant Preview
              </span>
            </div>
          </div>

          <button
            onClick={() => enableDemoUser()}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border ${
              theme === "dark"
                ? "bg-gray-900 hover:bg-gray-800 border-gray-800 text-gray-200"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Launch with Instant Demo Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
}
