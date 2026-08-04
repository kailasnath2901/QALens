"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { ChatGenerator } from "@/components/ChatGenerator";
import { StoredTestCases } from "@/components/StoredTestCases";
import { AuthModal } from "@/components/AuthModal";
import { UsageMetersModal } from "@/components/UsageMetersModal";
import { ExportModal } from "@/components/ExportModal";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { UserProfileModal } from "@/components/UserProfileModal";
import { LoginScreen } from "@/components/LoginScreen";
import { LandingPage } from "@/components/LandingPage";
import { AceternityLoader } from "@/components/AceternityLoader";
import { useAuth } from "@/context/AuthContext";
import { getProjects, getProjectTestCases, getProjectChats } from "@/lib/store";
import { Project, TestCase, ChatMessage } from "@/types";

export default function Home() {
  const { user, isDemoUser, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<"generator" | "repository">("generator");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);

  // Modals state
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isDataLoading, setIsDataLoading] = useState(false);

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
          } else {
            // Clear active states if no projects exist for this user
            setActiveProject(null);
            setTestCases([]);
            setChats([]);
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
  };

  const refreshActiveData = async () => {
    if (activeProject) {
      setTestCases(await getProjectTestCases(activeProject.id));
      setChats(await getProjectChats(activeProject.id));
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
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
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
          onSelectProject={(proj) => {
            handleSelectProject(proj);
            setIsSidebarOpen(false);
          }}
          onOpenCreateProject={() => {
            handleOpenCreateProject();
            setIsSidebarOpen(false);
          }}
          storedCount={testCases.length}
          isOpenMobile={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        {/* Workspace Container */}
        {activeProject ? (
          activeTab === "generator" ? (
            <ChatGenerator
              project={activeProject}
              chats={chats}
              existingCases={testCases}
              onRefreshData={refreshActiveData}
            />
          ) : (
            <StoredTestCases
              project={activeProject}
              testCases={testCases}
              onRefreshData={refreshActiveData}
              onOpenExportModal={handleOpenExportModal}
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
