"use client";

import React from "react";
import { FolderPlus, Folder, CheckCircle2, ChevronRight, Layers, FileText, X } from "lucide-react";
import { Project } from "@/types";

interface SidebarProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (proj: Project) => void;
  onOpenCreateProject: () => void;
  storedCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  projects,
  activeProject,
  onSelectProject,
  onOpenCreateProject,
  storedCount,
  isOpenMobile = false,
  onCloseMobile
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={onCloseMobile}
        />
      )}
      
      <aside className={`
        fixed md:relative z-50 w-64 border-r border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-950/95 md:dark:bg-gray-950/60 flex flex-col h-[calc(100vh-4rem)]
        transition-transform duration-300 ease-in-out backdrop-blur-xl md:backdrop-blur-none
        ${isOpenMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* Header / Create Project */}
        <div className="p-4 border-b border-slate-200 dark:border-gray-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              Projects Suite
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                {projects.length} Total
              </span>
              {onCloseMobile && (
                <button onClick={onCloseMobile} className="md:hidden text-slate-400 hover:text-slate-900 dark:hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

        <button
          onClick={onOpenCreateProject}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-slate-900 dark:text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all border border-indigo-500/40"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {projects.map((proj) => {
          const isActive = activeProject?.id === proj.id;
          return (
            <button
              key={proj.id}
              onClick={() => onSelectProject(proj)}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 border ${
                isActive
                  ? "bg-indigo-950/50 border-indigo-500/50 text-slate-900 dark:text-white shadow-sm"
                  : "bg-transparent border-transparent hover:bg-slate-50/60 dark:bg-gray-900/60 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:text-white"
              }`}
            >
              <div className={`mt-0.5 p-1.5 rounded-lg ${isActive ? "bg-indigo-600 text-slate-900 dark:text-white" : "bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400"}`}>
                <Folder className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold truncate block">
                    {proj.name}
                  </span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 ml-1" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate mt-0.5">
                  {proj.description || "No description"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Project Footer Summary */}
      {activeProject && (
        <div className="p-4 border-t border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/40">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Active Workspace Metrics
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 dark:bg-gray-900 p-2 rounded-lg border border-slate-200 dark:border-gray-800">
              <div className="flex items-center gap-1.5 text-indigo-400 mb-1">
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium text-slate-500 dark:text-gray-400">Stored</span>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{storedCount}</span>
            </div>

            <div className="bg-slate-50 dark:bg-gray-900 p-2 rounded-lg border border-slate-200 dark:border-gray-800">
              <div className="flex items-center gap-1.5 text-cyan-400 mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium text-slate-500 dark:text-gray-400">Pipeline</span>
              </div>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
