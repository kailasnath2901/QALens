"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  FolderPlus, 
  Folder, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown,
  Layers, 
  FileText, 
  X,
  Plus,
  Trash2,
  Edit3,
  MoreVertical,
  Box,
  GitBranch,
  Loader2
} from "lucide-react";
import { Project, Module, SubModule } from "@/types";
import { saveModule, saveSubModule, updateModule, updateSubModule, deleteAllData } from "@/lib/store";

interface SidebarProps {
  projects: Project[];
  activeProject: Project | null;
  modules: Module[];
  activeModule: Module | null;
  subModules: SubModule[];
  activeSubModule: SubModule | null;
  onSelectProject: (proj: Project) => void;
  onSelectModule: (mod: Module) => void;
  onSelectSubModule: (subMod: SubModule) => void;
  onDeleteProject: (projectId: string) => void;
  onDeleteModule: (moduleId: string) => void;
  onDeleteSubModule: (subModuleId: string) => void;
  onOpenCreateProject: () => void;
  onRefreshData: () => void;
  storedCount: number;
  userId?: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  projects,
  activeProject,
  modules,
  activeModule,
  subModules,
  activeSubModule,
  onSelectProject,
  onSelectModule,
  onSelectSubModule,
  onDeleteProject,
  onDeleteModule,
  onDeleteSubModule,
  onOpenCreateProject,
  onRefreshData,
  storedCount,
  userId,
  isOpenMobile = false,
  onCloseMobile
}: SidebarProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [showModuleMenu, setShowModuleMenu] = useState<string | null>(null);
  const [showSubModuleMenu, setShowSubModuleMenu] = useState<string | null>(null);
  const [showProjectMenu, setShowProjectMenu] = useState<string | null>(null);

  // Module creation state
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [newModuleDesc, setNewModuleDesc] = useState("");
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  // SubModule creation state
  const [isCreatingSubModule, setIsCreatingSubModule] = useState(false);
  const [newSubModuleName, setNewSubModuleName] = useState("");
  const [newSubModuleDesc, setNewSubModuleDesc] = useState("");
  const [editingSubModule, setEditingSubModule] = useState<SubModule | null>(null);
  const [isSubmittingModule, setIsSubmittingModule] = useState(false);
  const [isSubmittingSubModule, setIsSubmittingSubModule] = useState(false);

  // Deleting state
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null);
  const [deletingSubModuleId, setDeletingSubModuleId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  // Migration state
  const [isCleaning, setIsCleaning] = useState(false);

  // Refs for clicking outside menus
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const moduleMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const subModuleMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (showProjectMenu && projectMenuRef.current && !projectMenuRef.current.contains(target)) {
        setShowProjectMenu(null);
      }
      
      if (showModuleMenu) {
        const menuRef = moduleMenuRefs.current.get(showModuleMenu);
        if (menuRef && !menuRef.contains(target)) {
          setShowModuleMenu(null);
        }
      }
      
      if (showSubModuleMenu) {
        const menuRef = subModuleMenuRefs.current.get(showSubModuleMenu);
        if (menuRef && !menuRef.contains(target)) {
          setShowSubModuleMenu(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProjectMenu, showModuleMenu, showSubModuleMenu]);

  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // Auto-expand first project and active project/module
  useEffect(() => {
    if (projects.length > 0 && expandedProjects.size === 0) {
      setExpandedProjects(new Set([projects[0].id]));
    }
  }, [projects]);

  useEffect(() => {
    if (activeProject) {
      setExpandedProjects(prev => {
        if (prev.has(activeProject.id)) return prev;
        const next = new Set(prev);
        next.add(activeProject.id);
        return next;
      });
    }
  }, [activeProject]);

  useEffect(() => {
    if (activeModule) {
      setExpandedModules(prev => {
        if (prev.has(activeModule.id)) return prev;
        const next = new Set(prev);
        next.add(activeModule.id);
        return next;
      });
    }
  }, [activeModule]);

  const handleCreateModule = async () => {
    if (!newModuleName.trim() || !activeProject) return;
    
    setIsSubmittingModule(true);
    try {
      await saveModule({
        projectId: activeProject.id,
        name: newModuleName,
        description: newModuleDesc
      });
      
      setNewModuleName("");
      setNewModuleDesc("");
      setIsCreatingModule(false);
      onRefreshData();
    } finally {
      setIsSubmittingModule(false);
    }
  };

  const handleEditModule = async () => {
    if (!editingModule || !newModuleName.trim()) return;
    
    setIsSubmittingModule(true);
    try {
      await updateModule(editingModule.id, {
        name: newModuleName,
        description: newModuleDesc
      });
      
      setNewModuleName("");
      setNewModuleDesc("");
      setEditingModule(null);
      onRefreshData();
    } finally {
      setIsSubmittingModule(false);
    }
  };

  const handleCreateSubModule = async () => {
    if (!newSubModuleName.trim() || !activeModule || !activeProject) return;
    
    setIsSubmittingSubModule(true);
    try {
      await saveSubModule({
        moduleId: activeModule.id,
        projectId: activeProject.id,
        name: newSubModuleName,
        description: newSubModuleDesc
      });
      
      setNewSubModuleName("");
      setNewSubModuleDesc("");
      setIsCreatingSubModule(false);
      onRefreshData();
    } finally {
      setIsSubmittingSubModule(false);
    }
  };

  const handleEditSubModule = async () => {
    if (!editingSubModule || !newSubModuleName.trim()) return;
    
    setIsSubmittingSubModule(true);
    try {
      await updateSubModule(editingSubModule.id, {
        name: newSubModuleName,
        description: newSubModuleDesc
      });
      
      setNewSubModuleName("");
      setNewSubModuleDesc("");
      setEditingSubModule(null);
      onRefreshData();
    } finally {
      setIsSubmittingSubModule(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    setDeletingModuleId(moduleId);
    setShowModuleMenu(null);
    try {
      await onDeleteModule(moduleId);
    } finally {
      setDeletingModuleId(null);
    }
  };

  const handleDeleteSubModule = async (subModuleId: string) => {
    setDeletingSubModuleId(subModuleId);
    setShowSubModuleMenu(null);
    try {
      await onDeleteSubModule(subModuleId);
    } finally {
      setDeletingSubModuleId(null);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setDeletingProjectId(projectId);
    setShowProjectMenu(null);
    try {
      await onDeleteProject(projectId);
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleDeleteAllData = async () => {
    if (!userId) return;
    
    const confirmed = confirm(
      "WARNING: This will delete ALL your projects, modules, submodules, test cases, chats, and images . This action cannot be undone.\n\nAre you absolutely sure you want to proceed?"
    );
    
    if (!confirmed) return;
    
    const secondConfirm = confirm("This is your last chance to cancel. Click OK to permanently delete ALL data.");
    if (!secondConfirm) return;
    
    setIsCleaning(true);
    try {
      const result = await deleteAllData(userId);
      alert(`Successfully deleted:\n- ${result.deleted.projects} projects\n- ${result.deleted.modules} modules\n- ${result.deleted.subModules} submodules\n- ${result.deleted.testCases} test cases\n- ${result.deleted.chats} chats`);
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete all data:", error);
      alert("Failed to delete all data. Please try again.");
    } finally {
      setIsCleaning(false);
    }
  };

  // Check if a module or its children are being deleted
  const isModuleDeleting = (moduleId: string) => {
    if (deletingModuleId === moduleId) return true;
    if (subModules.some(s => s.moduleId === moduleId && deletingSubModuleId === s.id)) return true;
    return false;
  };

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
        fixed md:relative z-50 w-64 border-r border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-950/95 md:dark:bg-gray-950/60 flex flex-col min-h-0
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
          const isExpanded = expandedProjects.has(proj.id);
          const isProjDeleting = deletingProjectId === proj.id;
          return (
            <div key={proj.id}>
              <div className={`flex items-center group ${isActive ? "bg-indigo-950/50 border-indigo-500/50" : ""}`}>
                <button
                  onClick={() => {
                    if (isProjDeleting) return;
                    onSelectProject(proj);
                    if (activeProject?.id === proj.id) {
                      toggleProjectExpand(proj.id);
                    } else {
                      setExpandedProjects(prev => {
                        const next = new Set(prev);
                        next.add(proj.id);
                        return next;
                      });
                    }
                  }}
                  disabled={isProjDeleting}
                  className={`flex-1 text-left p-3 rounded-xl transition-all flex items-start gap-3 border ${
                    isProjDeleting
                      ? "opacity-50 cursor-not-allowed"
                      : isActive
                      ? "bg-indigo-950/50 border-indigo-500/50 text-slate-900 dark:text-white shadow-sm"
                      : "bg-transparent border-transparent hover:bg-slate-50/60 dark:bg-gray-900/60 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:text-white"
                  }`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg ${isActive ? "bg-indigo-600 text-slate-900 dark:text-white" : "bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400"}`}>
                    {isProjDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <Folder className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate block">
                        {proj.name}
                      </span>
                      {isActive && !isProjDeleting && <ChevronRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 ml-1" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate mt-0.5">
                      {proj.description || "No description"}
                    </p>
                  </div>
                </button>
                
                {/* Project Menu Button */}
                {isActive && !isProjDeleting && (
                  <div className="relative" ref={projectMenuRef}>
                    <button
                      onClick={() => setShowProjectMenu(showProjectMenu === proj.id ? null : proj.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {showProjectMenu === proj.id && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl shadow-lg z-50">
                        <button
                          onClick={() => handleDeleteProject(proj.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Project
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modules & SubModules Tree */}
              {isActive && isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 dark:border-gray-800 pl-3">
                  {modules.filter(m => m.projectId === proj.id).map((mod) => {
                    const isModActive = activeModule?.id === mod.id;
                    const isModExpanded = expandedModules.has(mod.id);
                    const isModDeleting = isModuleDeleting(mod.id);
                    return (
                      <div key={mod.id}>
                        <div className={`flex items-center group ${isModActive ? "bg-indigo-950/30" : ""}`}>
                          <button
                            onClick={() => {
                              if (isModDeleting) return;
                              onSelectModule(mod);
                              if (activeModule?.id === mod.id) {
                                toggleModuleExpand(mod.id);
                              } else {
                                setExpandedModules(prev => {
                                  const next = new Set(prev);
                                  next.add(mod.id);
                                  return next;
                                });
                              }
                            }}
                            disabled={isModDeleting}
                            className={`flex-1 text-left p-2 rounded-lg transition-all flex items-center gap-2 ${
                              isModDeleting
                                ? "opacity-50 cursor-not-allowed"
                                : isModActive
                                ? "bg-indigo-950/30 text-slate-900 dark:text-white"
                                : "text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800/50 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            {isModDeleting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isModExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <Box className="w-3 h-3" />
                            )}
                            <span className="text-xs font-medium truncate">{mod.name}</span>
                          </button>
                          
                          {/* Module Menu Button */}
                          {!isModDeleting && (
                            <div className="relative" ref={(el) => { if (el) moduleMenuRefs.current.set(mod.id, el); }}>
                              <button
                                onClick={() => setShowModuleMenu(showModuleMenu === mod.id ? null : mod.id)}
                                className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="w-3 h-3" />
                              </button>
                              {showModuleMenu === mod.id && (
                                <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl shadow-lg z-50">
                                  <button
                                    onClick={() => {
                                      setEditingModule(mod);
                                      setNewModuleName(mod.name);
                                      setNewModuleDesc(mod.description);
                                      setShowModuleMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 rounded-xl"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteModule(mod.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* SubModules */}
                        {isModActive && isModExpanded && (
                          <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 dark:border-gray-800 pl-2">
                            {subModules.filter(s => s.moduleId === mod.id).map((subMod) => {
                              const isSubModActive = activeSubModule?.id === subMod.id;
                              const isSubModDeleting = deletingSubModuleId === subMod.id;
                              return (
                                <div key={subMod.id} className={`flex items-center group ${isSubModDeleting ? "opacity-50" : ""}`}>
                                  <button
                                    onClick={() => {
                                      if (isSubModDeleting) return;
                                      onSelectSubModule(subMod);
                                    }}
                                    disabled={isSubModDeleting}
                                    className={`flex-1 text-left p-1.5 rounded-lg transition-all flex items-center gap-2 ${
                                      isSubModDeleting
                                        ? "cursor-not-allowed"
                                        : isSubModActive
                                        ? "bg-indigo-950/30 text-slate-900 dark:text-white"
                                        : "text-slate-500 dark:text-gray-500 hover:bg-slate-50 dark:hover:bg-gray-800/50 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                                  >
                                    {isSubModDeleting ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <GitBranch className="w-3 h-3" />
                                    )}
                                    <span className="text-[11px] font-medium truncate">{subMod.name}</span>
                                  </button>
                                  
                                  {/* SubModule Menu Button */}
                                  {!isSubModDeleting && (
                                    <div className="relative" ref={(el) => { if (el) subModuleMenuRefs.current.set(subMod.id, el); }}>
                                      <button
                                        onClick={() => setShowSubModuleMenu(showSubModuleMenu === subMod.id ? null : subMod.id)}
                                        className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <MoreVertical className="w-3 h-3" />
                                      </button>
                                      {showSubModuleMenu === subMod.id && (
                                        <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl shadow-lg z-50">
                                          <button
                                            onClick={() => {
                                              setEditingSubModule(subMod);
                                              setNewSubModuleName(subMod.name);
                                              setNewSubModuleDesc(subMod.description);
                                              setShowSubModuleMenu(null);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 rounded-xl"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSubModule(subMod.id)}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            
                            {/* Add SubModule Button */}
                            <button
                              onClick={() => setIsCreatingSubModule(true)}
                              className="w-full flex items-center gap-2 p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/5 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span className="text-[10px] font-medium">Add SubModule</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Add Module Button */}
                  <button
                    onClick={() => setIsCreatingModule(true)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">Add Module</span>
                  </button>
                </div>
              )}
            </div>
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
          
          {/* Delete All Data Button */}
          <button
            onClick={handleDeleteAllData}
            disabled={isCleaning}
            className="w-full mt-3 flex items-center justify-center gap-2 p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-colors disabled:opacity-50"
          >
            {isCleaning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span className="text-[10px] font-medium">
              {isCleaning ? "Deleting..." : "Delete All Data"}
            </span>
          </button>
        </div>
      )}
    </aside>

    {/* Create Module Modal */}
    {(isCreatingModule || editingModule) && (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-sm font-bold text-indigo-500 dark:text-indigo-400 mb-4 uppercase tracking-wider">
            {editingModule ? "Edit Module" : "Create New Module"}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Module Name
              </label>
              <input
                type="text"
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g., Authentication"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={newModuleDesc}
                onChange={(e) => setNewModuleDesc(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                placeholder="Optional description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsCreatingModule(false);
                  setEditingModule(null);
                  setNewModuleName("");
                  setNewModuleDesc("");
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-750 text-slate-900 dark:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={editingModule ? handleEditModule : handleCreateModule}
                disabled={!newModuleName.trim() || isSubmittingModule}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-2"
              >
                {isSubmittingModule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingModule ? "Save Changes" : "Create Module"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Create SubModule Modal */}
    {(isCreatingSubModule || editingSubModule) && (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-sm font-bold text-indigo-500 dark:text-indigo-400 mb-4 uppercase tracking-wider">
            {editingSubModule ? "Edit SubModule" : "Create New SubModule"}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                SubModule Name
              </label>
              <input
                type="text"
                value={newSubModuleName}
                onChange={(e) => setNewSubModuleName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g., Login Flow"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={newSubModuleDesc}
                onChange={(e) => setNewSubModuleDesc(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                placeholder="Optional description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsCreatingSubModule(false);
                  setEditingSubModule(null);
                  setNewSubModuleName("");
                  setNewSubModuleDesc("");
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-750 text-slate-900 dark:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={editingSubModule ? handleEditSubModule : handleCreateSubModule}
                disabled={!newSubModuleName.trim() || isSubmittingSubModule}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-2"
              >
                {isSubmittingSubModule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingSubModule ? "Save Changes" : "Create SubModule"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
