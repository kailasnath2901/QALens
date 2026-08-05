"use client";

import React, { useState, useRef } from "react";
import {
  Search,
  Download,
  Trash2,
  CheckCircle2,
  Send,
  Plus,
  Tag,
  Filter,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Database,
  Image as ImageIcon,
  Loader2,
  X,
  ListPlus,
  Upload,
  FileSpreadsheet
} from "lucide-react";
import { TestCase, TestCaseCategory, Project, Module, SubModule } from "@/types";
import { saveTestCase, updateTestCase, deleteTestCase } from "@/lib/store";
import { ConfirmModal } from "@/components/ConfirmModal";
import { TestCaseDetailsModal } from "@/components/TestCaseDetailsModal";
import { TestStepsModal } from "@/components/TestStepsModal";
import { uploadImageToCloudinary } from "@/lib/upload";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import * as XLSX from "xlsx";

interface StoredTestCasesProps {
  project: Project;
  testCases: TestCase[];
  onRefreshData: () => void;
  onOpenExportModal: () => void;
  activeModule?: Module | null;
  activeSubModule?: SubModule | null;
  isLoading?: boolean;
}

interface ImportMapping {
  title: number;
  expectedResult: number;
  category: number;
  priority: number;
  status: number;
  automationStatus: number;
  comments: number;
}

export function StoredTestCases({
  project,
  testCases,
  onRefreshData,
  onOpenExportModal,
  activeModule,
  activeSubModule,
  isLoading = false
}: StoredTestCasesProps) {
  const { user, isDemoUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);

  // Quick-Add Bottom Bar State
  const [quickTitle, setQuickTitle] = useState("");
  const [quickTestData, setQuickTestData] = useState("");
  const [quickSteps, setQuickSteps] = useState<string[]>([]);
  const [isStepsModalOpen, setIsStepsModalOpen] = useState(false);
  const [quickExpected, setQuickExpected] = useState("");
  const [quickCategory, setQuickCategory] = useState<TestCaseCategory>("functional");
  const [quickImage, setQuickImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<Record<string, unknown>[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importMapping, setImportMapping] = useState<ImportMapping>({
    title: -1,
    expectedResult: -1,
    category: -1,
    priority: -1,
    status: -1,
    automationStatus: -1,
    comments: -1
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const categories: { id: string; label: string }[] = [
    { id: "all", label: "All Categories" },
    { id: "input_validation", label: "Input Validation" },
    { id: "empty_states", label: "Empty States" },
    { id: "error_handling", label: "Error Handling" },
    { id: "boundary_values", label: "Boundary Values" },
    { id: "accessibility", label: "Accessibility" },
    { id: "functional", label: "Functional" }
  ];

  const filteredCases = testCases.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.expectedResult.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || c.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || c.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleStatusChange = async (caseId: string, status: "pending" | "in_progress" | "draft" | "reviewed" | "approved" | "done") => {
    await updateTestCase(caseId, { status });
    onRefreshData();
  };

  const handleExecutionChange = async (caseId: string, executionResult: "pass" | "fail" | "untested") => {
    await updateTestCase(caseId, { executionResult });
    onRefreshData();
  };

  const handleDelete = (caseId: string) => {
    setDeletingCaseId(caseId);
  };

  const confirmDelete = async () => {
    if (deletingCaseId) {
      await deleteTestCase(deletingCaseId, project.id);
      setDeletingCaseId(null);
      onRefreshData();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDemoUser) {
      alert("Please sign in to attach images to test cases.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setQuickImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !quickExpected.trim()) return;
    if (isSubmitting) return;

    if (isDemoUser && quickImage) {
      alert("Please sign in to save test cases with image attachments.");
      return;
    }

    setIsSubmitting(true);
    let uploadedImageUrl: string | undefined = undefined;

    if (quickImage) {
      try {
        uploadedImageUrl = await uploadImageToCloudinary(
          quickImage,
          `qasuite/${user?.uid}/${project.id}/testcases`
        );
      } catch (error) {
        console.error("Failed to upload image:", error);
        alert("Failed to upload image. Test case will be saved without it.");
      }
    }

    const stepsArray = quickSteps.length > 0
      ? quickSteps
      : ["Navigate to feature", "Perform user action", "Verify expected state"];

    await saveTestCase({
      projectId: project.id,
      moduleId: activeModule?.id,
      subModuleId: activeSubModule?.id,
      moduleName: activeModule?.name || null,
      title: quickTitle,
      category: quickCategory,
      preconditions: "User is active on system",
      testData: quickTestData || undefined,
      steps: stepsArray,
      expectedResult: quickExpected,
      executionResult: "untested",
      sourceType: quickImage ? "image" : "manual",
      sourceUrl: uploadedImageUrl,
      provider: "manual-authoring",
      status: "approved",
      tags: ["Manual-Store"]
    });

    setQuickTitle("");
    setQuickTestData("");
    setQuickSteps([]);
    setQuickExpected("");
    setQuickImage(null);
    setIsSubmitting(false);
    setIsAdding(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onRefreshData();
  };

  // Import handlers
  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
        
        if (jsonData.length > 0) {
          const headers = Object.keys(jsonData[0]);
          setImportHeaders(headers);
          setImportData(jsonData);
          
          // Auto-detect column mappings
          const autoMapping: ImportMapping = {
            title: -1,
            expectedResult: -1,
            category: -1,
            priority: -1,
            status: -1,
            automationStatus: -1,
            comments: -1
          };

          headers.forEach((header, idx) => {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes("test description") || lowerHeader.includes("title") || lowerHeader.includes("name")) {
              autoMapping.title = idx;
            } else if (lowerHeader.includes("expected result") || lowerHeader.includes("expected")) {
              autoMapping.expectedResult = idx;
            } else if (lowerHeader.includes("test type") || lowerHeader.includes("type") || lowerHeader.includes("category")) {
              autoMapping.category = idx;
            } else if (lowerHeader.includes("test priority") || lowerHeader.includes("priority")) {
              autoMapping.priority = idx;
            } else if (lowerHeader.includes("status")) {
              autoMapping.status = idx;
            } else if (lowerHeader.includes("automation")) {
              autoMapping.automationStatus = idx;
            } else if (lowerHeader.includes("comment")) {
              autoMapping.comments = idx;
            }
          });

          setImportMapping(autoMapping);
        }
      } catch (error) {
        console.error("Failed to parse file:", error);
        alert("Failed to parse file. Please check the file format.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (importData.length === 0 || importMapping.title === -1) {
      alert("Please map the title column at minimum.");
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: importData.length });

    try {
      for (let i = 0; i < importData.length; i++) {
        const row = importData[i];
        const headers = Object.keys(row);
        
        const title = String(row[headers[importMapping.title]] || "").trim();
        const expectedResult = importMapping.expectedResult !== -1 
          ? String(row[headers[importMapping.expectedResult]] || "").trim()
          : "Verify functionality works as expected";
        
        if (!title) continue;

        // Map category
        let category: TestCaseCategory = "functional";
        if (importMapping.category !== -1) {
          const categoryStr = String(row[headers[importMapping.category]] || "").toLowerCase().trim();
          if (categoryStr.includes("validation") || categoryStr.includes("input")) {
            category = "input_validation";
          } else if (categoryStr.includes("empty")) {
            category = "empty_states";
          } else if (categoryStr.includes("error")) {
            category = "error_handling";
          } else if (categoryStr.includes("boundary")) {
            category = "boundary_values";
          } else if (categoryStr.includes("accessibility")) {
            category = "accessibility";
          }
        }

        // Map priority to tags
        const tags: string[] = ["Imported"];
        if (importMapping.priority !== -1) {
          const priority = String(row[headers[importMapping.priority]] || "").trim();
          if (priority) tags.push(`Priority: ${priority}`);
        }

        // Map status
        let status: "pending" | "in_progress" | "draft" | "reviewed" | "approved" | "done" = "approved";
        if (importMapping.status !== -1) {
          const statusStr = String(row[headers[importMapping.status]] || "").toLowerCase().trim();
          if (statusStr.includes("draft")) {
            status = "draft";
          } else if (statusStr.includes("review")) {
            status = "reviewed";
          }
        }

        // Map comments
        let comments = "";
        if (importMapping.comments !== -1) {
          comments = String(row[headers[importMapping.comments]] || "").trim();
        }

        await saveTestCase({
          projectId: project.id,
          moduleId: activeModule?.id || null,
          subModuleId: activeSubModule?.id || null,
          moduleName: activeModule?.name || null,
          title,
          category,
          preconditions: "Imported from spreadsheet",
          steps: ["Navigate to feature", "Perform user action", "Verify expected state"],
          expectedResult: expectedResult || "Verify functionality works as expected",
          executionResult: "untested",
          sourceType: "manual",
          provider: "spreadsheet-import",
          status,
          tags,
          comments: comments || null
        });

        setImportProgress({ current: i + 1, total: importData.length });
      }

      onRefreshData();
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportData([]);
      setImportHeaders([]);
      alert(`Successfully imported ${importData.length} test cases!`);
    } catch (error) {
      console.error("Failed to import test cases:", error);
      alert("Failed to import some test cases. Please try again.");
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-950 relative">
      {/* ─── Loading State (Full Overlay) ─── */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-gray-950">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Loading...</h3>
          <p className="text-xs text-slate-500 dark:text-gray-400">Fetching data for this module</p>
        </div>
      )}

      {/* ─── No Module Selected State ─── */}
      {!isLoading && !activeModule && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
            <Database className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Select a Module to View Test Cases
          </h3>
          <p className="text-sm text-slate-500 dark:text-gray-400 max-w-md mb-4">
            To view, create, or import test cases, please select a module from the sidebar. 
            If no modules exist yet, create one first.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-gray-500">
            <Database className="w-4 h-4" />
            <span>Project → Module → Test Cases</span>
          </div>
        </div>
      )}

      {/* ─── Header & Filter Controls (show when module is selected) ─── */}
      {activeModule && (
      <div className="p-4 border-b border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 dark:text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stored test cases..."
              className="w-full bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-xs text-slate-600 dark:text-gray-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:bg-gray-700 text-slate-900 dark:text-white text-xs font-semibold border border-slate-300 dark:border-gray-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? "Cancel Add" : "Quick Add Case"}</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:bg-gray-700 text-slate-900 dark:text-white text-xs font-semibold border border-slate-300 dark:border-gray-700 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>

          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Suite ({testCases.length})</span>
          </button>
        </div>
      </div>
      )}

      {/* Quick Add Form Drawer */}
      {isAdding && (
        <form onSubmit={handleQuickAdd} className="p-4 bg-slate-50/90 dark:bg-gray-900/90 border-b border-indigo-500/30 animate-fadeIn space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Quick Add New Test Case to Repository
            </span>
            <select
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value as TestCaseCategory)}
              className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-xs text-indigo-300 rounded-lg px-2 py-1"
            >
              <option value="functional">Functional</option>
              <option value="input_validation">Input Validation</option>
              <option value="empty_states">Empty States</option>
              <option value="error_handling">Error Handling</option>
              <option value="boundary_values">Boundary Values</option>
              <option value="accessibility">Accessibility</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Test case title..."
              className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              required
            />
            <button
              type="button"
              onClick={() => setIsStepsModalOpen(true)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors border ${
                quickSteps.length > 0 
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                  : "bg-white dark:bg-gray-950 border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:text-white"
              }`}
            >
              <ListPlus className="w-4 h-4" />
              <span>{quickSteps.length > 0 ? `${quickSteps.length} Steps Added` : "Add Test Steps"}</span>
            </button>
            <input
              type="text"
              value={quickExpected}
              onChange={(e) => setQuickExpected(e.target.value)}
              placeholder="Expected result..."
              className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white text-xs font-semibold"
            >
              Save to Repository
            </button>
          </div>
        </form>
      )}

      {/* Main Repository List (only show when submodule is selected) */}
      {activeSubModule && (
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredCases.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <Database className="w-12 h-12 text-gray-600 mb-3" />
            <h4 className="text-sm font-semibold text-slate-600 dark:text-gray-300 mb-1">
              No test cases stored yet in this project
            </h4>
            <p className="text-xs text-slate-400 dark:text-gray-500 max-w-sm">
              Use the AI Chat Generator to generate test cases or use the bottom quick-add bar below to store test cases!
            </p>
          </div>
        ) : (
          filteredCases.map((tc) => {
            return (
              <div
                key={tc.id}
                className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl p-4 transition-all hover:border-slate-300 dark:border-gray-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 cursor-pointer" onClick={() => setSelectedCaseId(tc.id)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white hover:text-indigo-300">
                        {tc.title}
                      </span>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                        {tc.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-gray-400 line-clamp-1">
                      <strong className="text-slate-600 dark:text-gray-300">Expected:</strong> {tc.expectedResult}
                    </p>
                  </div>

                  {/* Right Status Controls */}
                  <div className="flex items-center gap-2">
                    <select
                      value={tc.status}
                      onChange={(e) => handleStatusChange(tc.id, e.target.value as "pending" | "in_progress" | "draft" | "reviewed" | "approved" | "done")}
                      className={`text-[11px] font-semibold rounded-lg px-2.5 py-1 border focus:outline-none ${
                        tc.status === "approved"
                          ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
                          : tc.status === "done"
                          ? "bg-green-950/60 text-green-300 border-green-500/40"
                          : tc.status === "reviewed"
                          ? "bg-cyan-950/60 text-cyan-300 border-cyan-500/40"
                          : tc.status === "in_progress"
                          ? "bg-blue-950/60 text-blue-300 border-blue-500/40"
                          : tc.status === "pending"
                          ? "bg-slate-800/60 text-slate-300 border-slate-500/40"
                          : "bg-amber-950/60 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="draft">Draft</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="approved">Approved</option>
                      <option value="done">Done</option>
                    </select>

                    <button
                      onClick={() => handleDelete(tc.id)}
                      className="p-1.5 rounded-lg text-slate-400 dark:text-gray-500 hover:text-red-400 hover:bg-slate-100 dark:bg-gray-800 transition-colors"
                      title="Delete Test Case"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      )}

      {/* Sticky Bottom Prompt Bar to Quick-Store New Cases (show when module is selected) */}
      {activeModule && (
      <div className="p-4 border-t border-slate-200 dark:border-gray-800 bg-slate-50/90 dark:bg-gray-900/90 backdrop-blur-md">
        {quickImage && (
          <div className="mb-2 relative inline-block">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300 dark:border-gray-700">
              <Image src={quickImage} alt="Attachment Preview" fill className="object-cover" />
            </div>
            <button
              onClick={() => {
                setQuickImage(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-slate-900 dark:text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <form onSubmit={handleQuickAdd} className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 focus-within:border-indigo-500 rounded-2xl p-2 transition-all">
          <Database className="w-4 h-4 text-indigo-400 ml-2 flex-shrink-0 hidden sm:block" />

          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Type test case title..."
            className="flex-1 min-w-[140px] bg-transparent border-none text-xs text-slate-900 dark:text-white placeholder-gray-500 focus:outline-none px-2"
          />

          <input
            type="text"
            value={quickTestData}
            onChange={(e) => setQuickTestData(e.target.value)}
            placeholder="Test Data..."
            className="w-28 sm:w-32 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-gray-600 focus:outline-none"
          />

          <button
            type="button"
            onClick={() => setIsStepsModalOpen(true)}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors whitespace-nowrap ${
              quickSteps.length > 0 
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                : "bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:text-white"
            }`}
            title="Add Test Steps"
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span className="text-xs">{quickSteps.length > 0 ? `${quickSteps.length} Steps` : "Steps"}</span>
          </button>

          <input
            type="text"
            value={quickExpected}
            onChange={(e) => setQuickExpected(e.target.value)}
            placeholder="Expected result..."
            className="flex-1 min-w-[120px] bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-gray-600 focus:outline-none"
          />

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-xl border transition-colors ${
              quickImage ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400" : "bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:text-white"
            }`}
            title="Attach Screenshot"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            type="submit"
            disabled={!quickTitle.trim() || isSubmitting}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-slate-900 dark:text-white text-xs font-semibold shadow-md flex items-center gap-1.5"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isSubmitting ? "Uploading..." : "Store Case"}</span>
          </button>
        </form>
      </div>
      )}

      <ConfirmModal
        isOpen={deletingCaseId !== null}
        onClose={() => setDeletingCaseId(null)}
        onConfirm={confirmDelete}
        title="Delete Test Case"
        message="Are you sure you want to delete this test case? This action cannot be undone."
      />
      
      <TestCaseDetailsModal
        testCase={testCases.find(tc => tc.id === selectedCaseId) || null}
        isOpen={selectedCaseId !== null}
        onClose={() => setSelectedCaseId(null)}
        onExecutionChange={handleExecutionChange}
      />

      <TestStepsModal
        isOpen={isStepsModalOpen}
        onClose={() => setIsStepsModalOpen(false)}
        onSave={setQuickSteps}
        initialSteps={quickSteps}
      />

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Import Test Cases from Spreadsheet
              </h3>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportData([]);
                  setImportHeaders([]);
                }}
                className="p-1.5 rounded-lg text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importData.length === 0 ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-gray-300">
                  Upload an XLSX or CSV file to import test cases. Supported columns: Test Description, Expected Result, Test Priority, Test Type, Status, Automation Status, Comments.
                </p>
                <div className="border-2 border-dashed border-slate-300 dark:border-gray-700 rounded-xl p-8 text-center">
                  <Upload className="w-10 h-10 text-slate-400 dark:text-gray-500 mx-auto mb-3" />
                  <p className="text-xs text-slate-500 dark:text-gray-400 mb-3">
                    Drag and drop your file here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    ref={importFileInputRef}
                    onChange={handleImportFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => importFileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    Select File
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-gray-800 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{importFile?.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400">{importData.length} rows found</p>
                  </div>
                  <button
                    onClick={() => {
                      setImportFile(null);
                      setImportData([]);
                      setImportHeaders([]);
                    }}
                    className="text-slate-400 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">Column Mapping</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Title (Required)
                      </label>
                      <select
                        value={importMapping.title}
                        onChange={(e) => setImportMapping({ ...importMapping, title: parseInt(e.target.value) })}
                        className="w-full bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value={-1}>Select column...</option>
                        {importHeaders.map((header, idx) => (
                          <option key={idx} value={idx}>{header}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Expected Result
                      </label>
                      <select
                        value={importMapping.expectedResult}
                        onChange={(e) => setImportMapping({ ...importMapping, expectedResult: parseInt(e.target.value) })}
                        className="w-full bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value={-1}>Select column...</option>
                        {importHeaders.map((header, idx) => (
                          <option key={idx} value={idx}>{header}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Category
                      </label>
                      <select
                        value={importMapping.category}
                        onChange={(e) => setImportMapping({ ...importMapping, category: parseInt(e.target.value) })}
                        className="w-full bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value={-1}>Select column...</option>
                        {importHeaders.map((header, idx) => (
                          <option key={idx} value={idx}>{header}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Priority
                      </label>
                      <select
                        value={importMapping.priority}
                        onChange={(e) => setImportMapping({ ...importMapping, priority: parseInt(e.target.value) })}
                        className="w-full bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value={-1}>Select column...</option>
                        {importHeaders.map((header, idx) => (
                          <option key={idx} value={idx}>{header}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Status
                      </label>
                      <select
                        value={importMapping.status}
                        onChange={(e) => setImportMapping({ ...importMapping, status: parseInt(e.target.value) })}
                        className="w-full bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value={-1}>Select column...</option>
                        {importHeaders.map((header, idx) => (
                          <option key={idx} value={idx}>{header}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Comments
                      </label>
                      <select
                        value={importMapping.comments}
                        onChange={(e) => setImportMapping({ ...importMapping, comments: parseInt(e.target.value) })}
                        className="w-full bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value={-1}>Select column...</option>
                        {importHeaders.map((header, idx) => (
                          <option key={idx} value={idx}>{header}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-700 dark:text-gray-300 mb-2">Preview (First 3 rows)</p>
                  <div className="overflow-x-auto border border-slate-200 dark:border-gray-800 rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-gray-800">
                          {importHeaders.slice(0, 5).map((header, idx) => (
                            <th key={idx} className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-gray-300">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 3).map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-t border-slate-200 dark:border-gray-800">
                            {Object.values(row).slice(0, 5).map((cell, cellIdx) => (
                              <td key={cellIdx} className="px-3 py-2 text-slate-600 dark:text-gray-300 max-w-[150px] truncate">
                                {String(cell || "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-gray-800">
                  <button
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportFile(null);
                      setImportData([]);
                      setImportHeaders([]);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-750 text-slate-900 dark:text-white text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importMapping.title === -1 || isImporting}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Importing {importProgress.current}/{importProgress.total}...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        Import {importData.length} Test Cases
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
