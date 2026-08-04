"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Sparkles, Database, Gauge, LogIn, LogOut, ChevronRight, Sun, Moon, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Project } from "@/types";
import { ConfirmModal } from "@/components/ConfirmModal";

interface NavbarProps {
  activeProject: Project | null;
  activeTab: "generator" | "repository";
  setActiveTab: (tab: "generator" | "repository") => void;
  onOpenUsageModal: () => void;
  onOpenAuthModal: () => void;
  onOpenUserProfileModal?: () => void;
  onToggleSidebarMobile?: () => void;
  storedCount: number;
}

export function Navbar({
  activeProject,
  activeTab,
  setActiveTab,
  onOpenUsageModal,
  onOpenAuthModal,
  onOpenUserProfileModal,
  onToggleSidebarMobile,
  storedCount
}: NavbarProps) {
  const { user, userProfile, logout, isDemoUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  return (
    <header className={`h-16 border-b sticky top-0 z-40 px-3 sm:px-4 flex items-center justify-between transition-colors ${
      theme === "dark" ? "bg-gray-950/80 border-gray-800 backdrop-blur-md" : "bg-white/90 border-slate-200 backdrop-blur-md shadow-sm text-slate-800"
    }`}>
      {/* Brand & Project Info */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {onToggleSidebarMobile && (
          <button
            onClick={onToggleSidebarMobile}
            className="md:hidden p-1.5 rounded-lg border text-gray-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-gray-950 rounded-[10px] flex items-center justify-center p-1">
              <Image src="/images/qalens_logo.svg" alt="QAlens Logo" width={28} height={28} className="w-6 h-6 object-contain" />
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-lg tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500">
              QAlens
            </span>
            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-500 rounded border border-indigo-500/20">
              AI 2.0
            </span>
          </div>
        </div>

        {activeProject && (
          <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400 border-l border-gray-800 pl-4">
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="font-semibold text-indigo-400 max-w-[180px] truncate">
              {activeProject.name}
            </span>
          </div>
        )}
      </div>

      {/* Main Tab Switcher */}
      {activeProject && (
        <div className={`flex items-center p-1 rounded-xl border ${
          theme === "dark" ? "bg-gray-900/90 border-gray-800/80" : "bg-slate-100 border-slate-200"
        }`}>
          <button
            onClick={() => setActiveTab("generator")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "generator"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : theme === "dark" ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Generate Test Cases</span>
            <span className="sm:hidden">Generate</span>
          </button>

          <button
            onClick={() => setActiveTab("repository")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "repository"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : theme === "dark" ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Stored Cases</span>
            <span className="sm:hidden">Stored</span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-500 rounded-full border border-indigo-500/20">
              {storedCount}
            </span>
          </button>
        </div>
      )}

      {/* Usage Meter, Theme Toggle & User Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={toggleTheme}
          className={`p-1.5 sm:p-2 rounded-xl border transition-all ${
            theme === "dark"
              ? "bg-gray-900 border-gray-800 text-amber-400 hover:bg-gray-800"
              : "bg-white border-slate-200 text-indigo-600 hover:bg-slate-50 shadow-sm"
          }`}
          title="Toggle Light / Dark Sorbet Theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenUsageModal}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            theme === "dark" ? "bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800" : "bg-white border-slate-200 text-slate-700 shadow-sm"
          }`}
          title="View AI Provider Quotas & Rate Limits"
        >
          <Gauge className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="hidden md:inline">AI Limits</span>
        </button>

        {user ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenUserProfileModal}
              className={`hidden xl:flex items-center gap-3 p-1.5 pr-3 rounded-xl border transition-all text-left ${
                theme === "dark" 
                  ? "bg-gray-900/50 border-gray-800 hover:bg-gray-800/80" 
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 shadow-sm"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 overflow-hidden flex items-center justify-center relative">
                {userProfile?.photoURL || (user as any)?.photoURL ? (
                  <Image src={userProfile?.photoURL || (user as any)?.photoURL} alt="Profile" fill className="object-cover" />
                ) : (
                  <span className="text-indigo-500 font-bold text-xs">
                    {userProfile?.displayName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold">
                  {userProfile?.displayName || user.displayName || user.email?.split("@")[0] || "QA Specialist"}
                </span>
                <span className="text-[10px] text-indigo-500 font-mono">
                  {userProfile?.role || (isDemoUser ? "Demo Session" : "QA Member")}
                </span>
              </div>
            </button>
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className={`p-2 rounded-xl border transition-colors ${
                theme === "dark" ? "bg-gray-900 border-gray-800 text-gray-400 hover:text-red-400" : "bg-white border-slate-200 text-slate-500 hover:text-red-500 shadow-sm"
              }`}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => logout()}
        title="Sign Out"
        message="Are you sure you want to end your current session? You will need to log back in to access your projects."
        confirmText="Sign Out"
      />
    </header>
  );
}
