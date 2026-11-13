"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { ChatGenerator } from "@/components/ChatGenerator";
import { StoredTestCases } from "@/components/StoredTestCases";
import { DocumentWorkspace } from "@/components/DocumentWorkspace";
import TaskBoard from "@/components/TaskBoard";
import { AuthModal } from "@/components/AuthModal";
import { UsageMetersModal } from "@/components/UsageMetersModal";
import { ExportModal } from "@/components/ExportModal";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { UserProfileModal } from "@/components/UserProfileModal";
import { LoginScreen } from "@/components/LoginScreen";
import { LandingPage } from "@/components/LandingPage";
import { AceternityLoader } from "@/components/AceternityLoader";
import { useAuth } from "@/context/AuthContext";
import { 
  getProjects, 
  getProjectTestCases, 
  getProjectChats,
  getModules,
  getSubModules,
  getSubModuleTestCases,
  getSubModuleChats,
  getModuleTestCases,
  getModuleChats,
  deleteProject,
  deleteModule,
  deleteSubModule,
  updateTestCase
} from "@/lib/store";
import { Project, TestCase, ChatMessage, Module, SubModule } from "@/types";

export default function Home() {
  const { user, userProfile, isDemoUser, loading, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<"tasks" | "generator" | "repository" | "docs">("generator");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);

  // Module/SubModule state
  const [modules, setModules] = useState<Module[]>([]);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [subModules, setSubModules] = useState<SubModule[]>([]);
  const [activeSubModule, setActiveSubModule] = useState<SubModule | null>(null);

  // Modals state
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Initial load
  useEffect(() => {
    async function loadInitialData() {
      if (user?.uid) {
        setIsDataLoading(true);
        try {
          const projs = await getProjects(user.uid);
          setProjects(projs);
          if (projs.length > 0) {
            const first = projs[0];
            setActiveProject(first);
            setTestCases(await getProjectTestCases(first.id));
            setChats(await getProjectChats(first.id));
            setModules(await getModules(first.id));
          } else {
            // Clear active states if no projects exist for this user
            setActiveProject(null);
            setTestCases([]);
            setChats([]);
            setModules([]);
            setSubModules([]);
            setActiveModule(null);
            setActiveSubModule(null);
          }
        } catch (err) {
          console.error("Failed to load initial data", err);
        } finally {
          setIsDataLoading(false);
        }
      }
    }
    loadInitialData();
  }, [user?.uid]);

  const handleSelectProject = async (proj: Project) => {
    setActiveProject(proj);
    setTestCases(await getProjectTestCases(proj.id));
    setChats(await getProjectChats(proj.id));
    setModules(await getModules(proj.id));
    setActiveModule(null);
    setActiveSubModule(null);
    setSubModules([]);
  };

  const handleSelectModule = async (mod: Module) => {
    setIsSwitching(true);
    // Clear data immediately to prevent glitch
    setTestCases([]);
    setChats([]);
    setActiveSubModule(null);
    setActiveModule(mod);
    setSubModules(await getSubModules(mod.id));
    // Load only module-level test cases and chats (not from submodules)
    setTestCases(await getModuleTestCases(mod.id));
    setChats(await getModuleChats(mod.id));
    setIsSwitching(false);
  };

  const handleSelectSubModule = async (subMod: SubModule) => {
    setIsSwitching(true);
    // Clear data immediately to prevent glitch
    setTestCases([]);
    setChats([]);
    setActiveSubModule(subMod);
    // Load only submodule-level test cases and chats
    setTestCases(await getSubModuleTestCases(subMod.id));
    setChats(await getSubModuleChats(subMod.id));
    setIsSwitching(false);
  };

  const refreshActiveData = async () => {
    if (activeProject) {
      if (activeSubModule) {
        // SubModule selected: load only submodule data
        setTestCases(await getSubModuleTestCases(activeSubModule.id));
        setChats(await getSubModuleChats(activeSubModule.id));
      } else if (activeModule) {
        // Only Module selected: load only module-level data (not from submodules)
        setTestCases(await getModuleTestCases(activeModule.id));
        setChats(await getModuleChats(activeModule.id));
      } else {
        // No module selected: load all project data
        setTestCases(await getProjectTestCases(activeProject.id));
        setChats(await getProjectChats(activeProject.id));
      }
      // Refresh modules list
      setModules(await getModules(activeProject.id));
      if (activeModule) {
        setSubModules(await getSubModules(activeModule.id));
      }
    }
  };

  const handleProjectCreated = async (newProj: Project) => {
    if (user?.uid) {
      const projs = await getProjects(user.uid);
      setProjects(projs);
      await handleSelectProject(newProj);
    }
  };

  const handleOpenCreateProject = () => {
    if (isDemoUser) {
      alert("Please sign in to create new projects.");
      return;
    }
    setIsCreateProjectModalOpen(true);
  };

  const handleOpenExportModal = () => {
    if (isDemoUser) {
      alert("Please sign in to export test suites.");
      return;
    }
    setIsExportModalOpen(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm("Are you sure you want to delete this project? This will delete all modules, submodules, test cases, and chats. This action cannot be undone.")) {
      await deleteProject(projectId);
      const projs = await getProjects(user!.uid);
      setProjects(projs);
      if (activeProject?.id === projectId) {
        if (projs.length > 0) {
          await handleSelectProject(projs[0]);
        } else {
          setActiveProject(null);
          setTestCases([]);
          setChats([]);
          setModules([]);
          setSubModules([]);
          setActiveModule(null);
          setActiveSubModule(null);
        }
      }
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (confirm("Are you sure you want to delete this module? This will delete all submodules, test cases, and chats in this module. This action cannot be undone.")) {
      await deleteModule(moduleId, activeProject!.id);
      await refreshActiveData();
      if (activeModule?.id === moduleId) {
        setActiveModule(null);
        setActiveSubModule(null);
        setSubModules([]);
      }
    }
  };

  const handleDeleteSubModule = async (subModuleId: string) => {
    if (confirm("Are you sure you want to delete this submodule? This will delete all test cases and chats in this submodule. This action cannot be undone.")) {
      await deleteSubModule(subModuleId, activeProject!.id);
      await refreshActiveData();
      if (activeSubModule?.id === subModuleId) {
        setActiveSubModule(null);
      }
    }
  };

  if (loading || isDataLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
        <AceternityLoader />
      </div>
    );
  }

  // Unauthenticated Flow: Landing Page -> Split Screen Login -> Dashboard Workspace
  if (!user) {
    if (showLogin) {
      return <LoginScreen onBackToLanding={() => setShowLogin(false)} />;
    }
    return <LandingPage onOpenLogin={() => setShowLogin(true)} />;
  }

  // Pending / Rejected Approval Gate for Non-Admins
  const isAdmin = userProfile?.role === "admin" || (process.env.NEXT_PUBLIC_ADMIN_EMAIL && user.email?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL.toLowerCase());
  const accountStatus = userProfile?.status || "pending";

  if (!isDemoUser && !isAdmin && accountStatus !== "approved") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <svg className="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">
            {accountStatus === "rejected" ? "Access Denied" : "Account Pending Approval"}
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            {accountStatus === "rejected"
              ? "Your account request was declined by the administrator. Please contact your QA Lead if this is in error."
              : "Welcome to QALens! Your account has been registered and is currently waiting for admin approval before you can access project workspaces."}
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 mb-6 text-xs text-left text-slate-400 font-mono">
            <div><strong>User:</strong> {userProfile?.displayName || user.email}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Status:</strong> <span className={accountStatus === "rejected" ? "text-red-400 font-bold" : "text-amber-400 font-bold"}>{accountStatus.toUpperCase()}</span></div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all"
          >
            Sign Out & Switch Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col font-sans transition-colors duration-300 overflow-hidden">
      {/* Top Navbar Header */}
      <Navbar
        activeProject={activeProject}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUsageModal={() => setIsUsageModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenUserProfileModal={() => setIsUserProfileModalOpen(true)}
        onToggleSidebarMobile={() => setIsSidebarOpen(!isSidebarOpen)}
        storedCount={testCases.length}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Projects Sidebar */}
        <Sidebar
          projects={projects}
          activeProject={activeProject}
          modules={modules}
          activeModule={activeModule}
          subModules={subModules}
          activeSubModule={activeSubModule}
          onSelectProject={(proj) => {
            handleSelectProject(proj);
            setIsSidebarOpen(false);
          }}
          onSelectModule={handleSelectModule}
          onSelectSubModule={handleSelectSubModule}
          onDeleteProject={handleDeleteProject}
          onDeleteModule={handleDeleteModule}
          onDeleteSubModule={handleDeleteSubModule}
          onOpenCreateProject={() => {
            handleOpenCreateProject();
            setIsSidebarOpen(false);
          }}
          onRefreshData={refreshActiveData}
          storedCount={testCases.length}
          userId={user.uid}
          isOpenMobile={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        {/* Workspace Container */}
        {activeProject ? (
          activeTab === "tasks" ? (
            <TaskBoard
              testCases={testCases}
              activeModule={activeModule}
              activeSubModule={activeSubModule}
              onRefreshData={refreshActiveData}
              updateTestCase={updateTestCase}
              projectId={activeProject.id}
              isLoading={isSwitching}
            />
          ) : activeTab === "generator" ? (
            <ChatGenerator
              project={activeProject}
              chats={chats}
              existingCases={testCases}
              onRefreshData={refreshActiveData}
              activeModule={activeModule}
              activeSubModule={activeSubModule}
              isLoading={isSwitching}
            />
          ) : activeTab === "repository" ? (
            <StoredTestCases
              project={activeProject}
              testCases={testCases}
              onRefreshData={refreshActiveData}
              onOpenExportModal={handleOpenExportModal}
              activeModule={activeModule}
              activeSubModule={activeSubModule}
              isLoading={isSwitching}
            />
          ) : (
            <DocumentWorkspace
              projectId={activeProject.id}
              moduleId={activeModule?.id}
              subModuleId={activeSubModule?.id}
              moduleName={activeSubModule?.name || activeModule?.name}
            />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-500">
            Select or create a project to start
          </div>
        )}
      </div>

      {/* Dialog Modals */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <UsageMetersModal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
      />

      {activeProject && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          testCases={testCases}
          projectName={activeProject.name}
        />
      )}

      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}
