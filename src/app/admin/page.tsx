"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  getAllUsers, 
  updateUserStatus, 
  updateUserFeatures, 
  updateUserRole,
  deleteUserAccount,
  updateUserProjectLimit,
  getSystemReportStats
} from "@/lib/store";
import { UserProfile, AccountStatus } from "@/types";
import { 
  ShieldCheck, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mic, 
  Sparkles, 
  Zap, 
  ArrowLeft, 
  Search, 
  Filter, 
  Settings, 
  RefreshCw,
  Lock,
  Layers,
  Trash2,
  Sliders,
  BarChart3,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  FileCode
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { user, userProfile, loading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AccountStatus>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // System Report State
  const [activeTab, setActiveTab] = useState<"users" | "reports" | "limits">("users");
  const [systemStats, setSystemStats] = useState<any>(null);

  const currentEmail = userProfile?.email?.toLowerCase() || user?.email?.toLowerCase();
  const isAdmin = userProfile?.role === "admin" || currentEmail === "admin@qalens.com";

  const loadData = async () => {
    setFetching(true);
    try {
      const [userData, statsData] = await Promise.all([
        getAllUsers(),
        getSystemReportStats()
      ]);
      setUsers(userData);
      setSystemStats(statsData);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const handleStatusChange = async (uid: string, newStatus: AccountStatus) => {
    setActionLoading(uid);
    try {
      await updateUserStatus(uid, newStatus, currentEmail || "admin");
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus } : u));
    } catch (err) {
      alert("Failed to update user status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (uid: string, email: string | null) => {
    if (confirm(`Are you sure you want to completely delete the account for ${email || uid}? This action is irreversible.`)) {
      setActionLoading(uid);
      try {
        await deleteUserAccount(uid);
        setUsers(prev => prev.filter(u => u.uid !== uid));
      } catch (err) {
        alert("Failed to delete user account.");
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleUpdateLimit = async (uid: string, newLimit: number) => {
    setActionLoading(uid);
    try {
      await updateUserProjectLimit(uid, newLimit);
      setUsers(prev => prev.map(u => {
        if (u.uid === uid) {
          return {
            ...u,
            features: {
              ...(u.features || { enableTony: false, enableTonyVoice: false, enableTonyChat: false, enableGemini: false, enableGroq: false }),
              maxProjects: newLimit
            }
          };
        }
        return u;
      }));
    } catch (err) {
      alert("Failed to update project limit.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleFeature = async (
    uid: string, 
    feature: "enableTony" | "enableTonyVoice" | "enableTonyChat" | "enableGemini" | "enableGroq", 
    currentVal: boolean
  ) => {
    setActionLoading(uid);
    try {
      await updateUserFeatures(uid, { [feature]: !currentVal });
      setUsers(prev => prev.map(u => {
        if (u.uid === uid) {
          return {
            ...u,
            features: {
              ...(u.features || { enableTony: false, enableTonyVoice: false, enableTonyChat: false, enableGemini: false, enableGroq: false, maxProjects: 10 }),
              [feature]: !currentVal
            }
          };
        }
        return u;
      }));
    } catch (err) {
      alert("Failed to toggle feature flag.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRole = async (uid: string, currentRole?: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (confirm(`Change this user's role to ${newRole.toUpperCase()}?`)) {
      setActionLoading(uid);
      try {
        await updateUserRole(uid, newRole);
        setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      } catch (err) {
        alert("Failed to update role.");
      } finally {
        setActionLoading(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-slate-400 max-w-md mb-6 text-sm">
          You do not have administrative privileges to view the QALens Admin Dashboard.
        </p>
        <Link 
          href="/" 
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Workspace
        </Link>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.displayName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || (u.status || "pending") === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalUsers = users.length;
  const pendingCount = users.filter(u => (u.status || "pending") === "pending").length;
  const approvedCount = users.filter(u => u.status === "approved").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
              title="Back to QALens App"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base tracking-tight">QALens</span>
                  <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 uppercase">
                    Master Admin Console
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "users" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Approvals</span>
            </button>
            <button
              onClick={() => setActiveTab("limits")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "limits" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Limits & Quotas</span>
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "reports" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>System Reports</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={loadData}
              disabled={fetching}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              title="Refresh All Data"
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin text-indigo-400" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-slate-400">Total Users</span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{totalUsers}</div>
            <p className="text-xs text-slate-500 mt-1">Registered in Firestore</p>
          </div>

          <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-amber-400">Pending Approvals</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-300">{pendingCount}</div>
            <p className="text-xs text-amber-500/80 mt-1">Waiting for approval</p>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-emerald-400">Active Approved</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-300">{approvedCount}</div>
            <p className="text-xs text-emerald-500/80 mt-1">Full access granted</p>
          </div>

          <div className="p-5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-cyan-400">Total Test Cases</span>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-cyan-300">{systemStats?.totalTestCases || 0}</div>
            <p className="text-xs text-cyan-500/80 mt-1">Across {systemStats?.totalProjects || 0} projects</p>
          </div>
        </div>

        {/* TAB 1: USER APPROVALS & FEATURE ACCESS */}
        {activeTab === "users" && (
          <>
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user by name or email..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 flex items-center gap-1.5 ml-1">
                  <Filter className="w-3.5 h-3.5" /> Status:
                </span>
                <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
                  {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setStatusFilter(tab)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-all ${
                        statusFilter === tab 
                          ? "bg-indigo-600 text-white shadow-sm" 
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Users Management Table */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px] font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Account Status</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Tony Assistant</th>
                      <th className="py-3.5 px-4">AI Providers</th>
                      <th className="py-3.5 px-4 text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No users found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const status = u.status || "pending";
                        const isUserActioning = actionLoading === u.uid;
                        const features = u.features || { 
                          enableTony: false, 
                          enableTonyVoice: false, 
                          enableTonyChat: false, 
                          enableGemini: false, 
                          enableGroq: false, 
                          maxProjects: 10 
                        };

                        return (
                          <tr key={u.uid} className="hover:bg-slate-800/30 transition-colors">
                            {/* User Identity */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 uppercase">
                                  {(u.displayName || u.email || "U")[0]}
                                </div>
                                <div>
                                  <div className="font-semibold text-white">{u.displayName || "No Name"}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Status Badge */}
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                                status === "approved"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : status === "rejected"
                                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}>
                                {status === "approved" && <CheckCircle className="w-3 h-3" />}
                                {status === "rejected" && <XCircle className="w-3 h-3" />}
                                {status === "pending" && <Clock className="w-3 h-3" />}
                                {status.toUpperCase()}
                              </span>
                            </td>

                            {/* Role */}
                            <td className="py-3.5 px-4">
                              <button
                                onClick={() => handleToggleRole(u.uid, u.role)}
                                disabled={isUserActioning}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border transition-all ${
                                  u.role === "admin"
                                    ? "bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20"
                                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                                }`}
                              >
                                {u.role || "USER"}
                              </button>
                            </td>

                            {/* Tony Assistant Controls */}
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={() => handleToggleFeature(u.uid, "enableTony", !!features.enableTony)}
                                  disabled={isUserActioning}
                                  className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg border text-[11px] transition-all ${
                                    features.enableTony
                                      ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                                      : "bg-slate-800/60 text-slate-500 border-slate-700/60"
                                  }`}
                                >
                                  <span className="font-semibold">Tony Assistant:</span>
                                  <span>{features.enableTony ? "ON" : "OFF"}</span>
                                </button>

                                {features.enableTony && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleToggleFeature(u.uid, "enableTonyVoice", !!features.enableTonyVoice)}
                                      disabled={isUserActioning}
                                      title="Toggle Voice Mode"
                                      className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-all ${
                                        features.enableTonyVoice
                                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                          : "bg-slate-800 text-slate-500 border-slate-700 opacity-60"
                                      }`}
                                    >
                                      <Mic className="w-2.5 h-2.5" /> Voice
                                    </button>
                                    <button
                                      onClick={() => handleToggleFeature(u.uid, "enableTonyChat", !!features.enableTonyChat)}
                                      disabled={isUserActioning}
                                      title="Toggle Text Chat Mode"
                                      className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-all ${
                                        features.enableTonyChat
                                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                                          : "bg-slate-800 text-slate-500 border-slate-700 opacity-60"
                                      }`}
                                    >
                                      Chat
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* AI Providers Permissions */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleToggleFeature(u.uid, "enableGemini", !!features.enableGemini)}
                                  disabled={isUserActioning}
                                  title="Toggle Gemini"
                                  className={`p-1 rounded border text-[10px] font-medium transition-all ${
                                    features.enableGemini 
                                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" 
                                      : "bg-slate-800 text-slate-500 border-slate-700 opacity-50"
                                  }`}
                                >
                                  <Sparkles className="w-3.5 h-3.5 inline mr-1" /> Gemini
                                </button>
                                <button
                                  onClick={() => handleToggleFeature(u.uid, "enableGroq", !!features.enableGroq)}
                                  disabled={isUserActioning}
                                  title="Toggle Groq"
                                  className={`p-1 rounded border text-[10px] font-medium transition-all ${
                                    features.enableGroq 
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                                      : "bg-slate-800 text-slate-500 border-slate-700 opacity-50"
                                  }`}
                                >
                                  <Zap className="w-3.5 h-3.5 inline mr-1" /> Groq
                                </button>
                              </div>
                            </td>

                            {/* Actions (Approve, Reject, Delete) */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {status !== "approved" && (
                                  <button
                                    onClick={() => handleStatusChange(u.uid, "approved")}
                                    disabled={isUserActioning}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-medium transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-3 h-3" /> Approve
                                  </button>
                                )}

                                {status !== "rejected" && (
                                  <button
                                    onClick={() => handleStatusChange(u.uid, "rejected")}
                                    disabled={isUserActioning}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 border border-slate-700"
                                  >
                                    <XCircle className="w-3 h-3" /> Reject
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteUser(u.uid, u.email)}
                                  disabled={isUserActioning}
                                  className="p-1.5 bg-slate-800/80 hover:bg-red-500/20 hover:text-red-400 text-slate-500 rounded-lg transition-colors border border-slate-700/60"
                                  title="Delete User Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: LIMITS & PROJECT QUOTAS */}
        {activeTab === "limits" && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur shadow-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" /> User Workspace Quotas & Limits
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure maximum project counts and generation caps per user to prevent database bloat and quota exhaustion.
              </p>
            </div>

            <div className="divide-y divide-slate-800">
              {users.map((u) => {
                const limit = u.features?.maxProjects ?? 10;
                return (
                  <div key={u.uid} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-sm text-white">{u.displayName || "No Name"}</div>
                      <div className="text-xs font-mono text-slate-400">{u.email}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">Max Projects Allowed:</span>
                      <select
                        value={limit}
                        onChange={(e) => handleUpdateLimit(u.uid, Number(e.target.value))}
                        disabled={actionLoading === u.uid}
                        className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      >
                        <option value={3}>3 Projects (Trial)</option>
                        <option value={5}>5 Projects (Standard)</option>
                        <option value={10}>10 Projects (Default)</option>
                        <option value={25}>25 Projects (Pro)</option>
                        <option value={100}>100 Projects (Enterprise)</option>
                        <option value={999}>Unlimited (Admin)</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM REPORTS & ANALYTICS */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase">Passed Tests</span>
                </div>
                <div className="text-3xl font-bold text-white">{systemStats?.executionStats?.pass || 0}</div>
                <p className="text-xs text-slate-500 mt-1">Verified working test cases</p>
              </div>

              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase">Failed Tests</span>
                </div>
                <div className="text-3xl font-bold text-white">{systemStats?.executionStats?.fail || 0}</div>
                <p className="text-xs text-slate-500 mt-1">Defects & broken flows flagged</p>
              </div>

              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase">Untested Backlog</span>
                </div>
                <div className="text-3xl font-bold text-white">{systemStats?.executionStats?.untested || 0}</div>
                <p className="text-xs text-slate-500 mt-1">Awaiting QA verification</p>
              </div>
            </div>

            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-indigo-400" /> Workspace Hierarchy Health
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400">Total Projects in DB:</span>
                  <span className="text-indigo-400 font-bold text-sm">{systemStats?.totalProjects || 0}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400">Total Functional Modules:</span>
                  <span className="text-cyan-400 font-bold text-sm">{systemStats?.totalModules || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}