"use client";

import React, { useState, useEffect } from "react";
import { ProjectDoc } from "@/types";
import { getProjectDocs, saveProjectDoc, updateProjectDoc, deleteProjectDoc } from "@/lib/store";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Sparkles, 
  Check, 
  Clock, 
  FileCode,
  BookOpen,
  Layout,
  Layers,
  ChevronRight
} from "lucide-react";

interface DocumentWorkspaceProps {
  projectId: string;
  moduleId?: string | null;
  subModuleId?: string | null;
  moduleName?: string | null;
}

export function DocumentWorkspace({
  projectId,
  moduleId,
  subModuleId,
  moduleName
}: DocumentWorkspaceProps) {
  const [docs, setDocs] = useState<ProjectDoc[]>([]);
  const [activeDoc, setActiveDoc] = useState<ProjectDoc | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const list = await getProjectDocs(projectId, moduleId, subModuleId);
      setDocs(list);
      if (list.length > 0 && !activeDoc) {
        setActiveDoc(list[0]);
        setTitle(list[0].title);
        setContent(list[0].content);
      }
    } catch (err) {
      console.error("Error loading docs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [projectId, moduleId, subModuleId]);

  const handleSelectDoc = (d: ProjectDoc) => {
    setActiveDoc(d);
    setTitle(d.title);
    setContent(d.content);
  };

  const handleCreateDoc = async () => {
    const defaultTitle = `PRD & QA Spec - ${moduleName || "General"}`;
    const defaultContent = `# 📋 QA Requirements & Test Strategy

## 1. Feature Overview
Describe the user problem this feature solves and the target audience.

## 2. Key Acceptance Criteria
- [ ] User can authenticate via Email/Password
- [ ] Rate limits trigger error alert
- [ ] Responsive across mobile and desktop

## 3. Test Scenarios & Edge Cases
1. Invalid credentials boundary test
2. Token expiration handling
3. Session persistence on refresh

## 4. Automation & Testing Notes
- Target framework: Playwright / Cypress
- Priority: High
`;

    setIsSaving(true);
    try {
      const created = await saveProjectDoc({
        projectId,
        moduleId: moduleId || null,
        subModuleId: subModuleId || null,
        title: defaultTitle,
        content: defaultContent
      });
      setDocs(prev => [created, ...prev]);
      setActiveDoc(created);
      setTitle(created.title);
      setContent(created.content);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDoc = async () => {
    if (!activeDoc) return;
    setIsSaving(true);
    try {
      await updateProjectDoc(activeDoc.id, { title, content });
      setDocs(prev => prev.map(d => d.id === activeDoc.id ? { ...d, title, content, updatedAt: Date.now() } : d));
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this document? This cannot be undone.")) {
      await deleteProjectDoc(id);
      const updated = docs.filter(d => d.id !== id);
      setDocs(updated);
      if (activeDoc?.id === id) {
        const next = updated[0] || null;
        setActiveDoc(next);
        setTitle(next ? next.title : "");
        setContent(next ? next.content : "");
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Left Documents Navigation Panel */}
      <div className="w-full md:w-72 border-r border-slate-800/80 bg-slate-900/40 backdrop-blur p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              PRDs & Docs
            </span>
          </div>
          <button
            onClick={handleCreateDoc}
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-all shadow-sm shadow-indigo-600/20"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>

        {/* Docs List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">Loading specs...</div>
          ) : docs.length === 0 ? (
            <div className="text-center py-10 px-3 text-slate-500 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-400" />
              <p>No specs written yet.</p>
              <button
                onClick={handleCreateDoc}
                className="mt-2 text-indigo-400 hover:underline"
              >
                Create your first QA spec
              </button>
            </div>
          ) : (
            docs.map((d) => {
              const isSelected = activeDoc?.id === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => handleSelectDoc(d)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer border text-xs transition-all ${
                    isSelected
                      ? "bg-indigo-600/15 border-indigo-500/40 text-white shadow-sm"
                      : "bg-slate-900/60 border-slate-800/60 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-indigo-400" : "text-slate-500"}`} />
                    <span className="truncate font-medium">{d.title || "Untitled Doc"}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteDoc(d.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded text-slate-500 transition-opacity"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Document Content Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {activeDoc ? (
          <>
            {/* Document Header Bar */}
            <div className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/30">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{moduleName || "Workspace"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-white font-medium truncate max-w-xs">{title || "Untitled"}</span>
              </div>

              <div className="flex items-center gap-3">
                {savedBadge && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium animate-fadeIn">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
                <button
                  onClick={handleSaveDoc}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Saving..." : "Save Doc"}</span>
                </button>
              </div>
            </div>

            {/* Document Content Input */}
            <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document Title (e.g., Auth Module PRD & Test Strategy)"
                className="w-full text-2xl font-bold bg-transparent border-b border-transparent hover:border-slate-800 focus:border-indigo-500/50 pb-2 text-white placeholder-slate-600 focus:outline-none transition-colors"
              />

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your QA specifications, requirements, acceptance criteria, or markdown notes here..."
                rows={25}
                className="w-full bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all resize-none shadow-inner"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <Layout className="w-12 h-12 mb-3 text-slate-700" />
            <h3 className="text-base font-semibold text-slate-400 mb-1">No Document Selected</h3>
            <p className="text-xs text-slate-600 max-w-sm mb-4">
              Create or select a PRD / QA Spec from the sidebar to outline test plans and requirements.
            </p>
            <button
              onClick={handleCreateDoc}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-3.5 h-3.5" /> Create New Spec
            </button>
          </div>
        )}
      </div>
    </div>
  );
}