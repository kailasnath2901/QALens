"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { ChatGenerator } from "@/components/ChatGenerator";
import { StoredTestCases } from "@/components/StoredTestCases";
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
  const { user, isDemoUser, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<"tasks" | "generator" | "repository">("generator");
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
          ) : (
            <StoredTestCases
              project={activeProject}
              testCases={testCases}
              onRefreshData={refreshActiveData}
              onOpenExportModal={handleOpenExportModal}
              activeModule={activeModule}
              activeSubModule={activeSubModule}
              isLoading={isSwitching}
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
