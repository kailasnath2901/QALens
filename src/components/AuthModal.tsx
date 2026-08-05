"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, Mail, Lock, User as UserIcon, ShieldCheck, ArrowRight, AlertCircle, Eye, EyeOff, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

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

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { loginWithEmail, signupWithEmail, enableDemoUser } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

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
      onClose();
    } catch (err: unknown) {
      const formatted = formatFirebaseError(err);
      setError(formatted);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoClick = () => {
    enableDemoUser();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl relative glow-indigo max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center p-1.5 shadow-md">
            <Image src="/images/qasuite_logo.svg" alt="QASuite Logo" width={32} height={32} className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {mode === "login" ? "Sign In to QASuite" : "Register QASuite User"}
            </h2>
            <p className="text-xs text-gray-400">
              Firebase Auth & AI Test Management
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex p-1 bg-gray-950 rounded-xl border border-gray-800 mb-5">
          <button
            onClick={() => handleModeSwitch("login")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === "login" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => handleModeSwitch("signup")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === "signup" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start gap-2 leading-relaxed">
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Username *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="qa_architect"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="qa.lead@company.com"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300 transition-colors"
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300 transition-colors"
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
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 mt-2"
          >
            <span>{submitting ? "Authenticating..." : mode === "login" ? "Sign In" : "Register User"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-gray-900 px-2 text-gray-500 font-mono">Or Continue As</span>
          </div>
        </div>

        <button
          onClick={handleDemoClick}
          className="w-full py-2 px-4 rounded-xl bg-gray-950 hover:bg-gray-800 border border-gray-800 text-gray-300 text-xs font-medium flex items-center justify-center gap-2 transition-all"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Continue with Instant Demo Session</span>
        </button>
      </div>
    </div>
  );
}
