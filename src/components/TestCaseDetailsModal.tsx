import React from "react";
import { TestCase } from "@/types";
import { X } from "lucide-react";
import Image from "next/image";

interface TestCaseDetailsModalProps {
  testCase: TestCase | null;
  isOpen: boolean;
  onClose: () => void;
  onExecutionChange: (caseId: string, result: "pass" | "fail" | "untested") => void;
}

export function TestCaseDetailsModal({
  testCase,
  isOpen,
  onClose,
  onExecutionChange,
}: TestCaseDetailsModalProps) {
  if (!isOpen || !testCase) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-950 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-gray-800 flex justify-between items-start bg-slate-50/50 dark:bg-gray-900/50">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 font-mono uppercase tracking-wider">
                {testCase.category}
              </span>
              <span className="text-[10px] bg-slate-200 dark:bg-gray-800 text-slate-600 dark:text-gray-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                {testCase.status}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              {testCase.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm flex-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            {testCase.moduleName && (
              <div className="bg-slate-50 dark:bg-gray-900/50 p-3 rounded-xl border border-slate-100 dark:border-gray-800/60">
                <span className="font-semibold text-slate-500 dark:text-gray-400 block mb-1 text-xs">Module</span>
                <span className="text-slate-700 dark:text-gray-200">{testCase.moduleName}</span>
              </div>
            )}
            {testCase.preconditions && (
              <div className="bg-slate-50 dark:bg-gray-900/50 p-3 rounded-xl border border-slate-100 dark:border-gray-800/60">
                <span className="font-semibold text-slate-500 dark:text-gray-400 block mb-1 text-xs">Preconditions / Assumptions</span>
                <span className="text-slate-700 dark:text-gray-200">{testCase.preconditions}</span>
              </div>
            )}
            {testCase.testData && (
              <div className="bg-slate-50 dark:bg-gray-900/50 p-3 rounded-xl border border-slate-100 dark:border-gray-800/60 col-span-2">
                <span className="font-semibold text-slate-500 dark:text-gray-400 block mb-1 text-xs">Test Data</span>
                <span className="text-slate-700 dark:text-gray-200 font-mono text-xs bg-slate-200/50 dark:bg-gray-950 p-1.5 rounded inline-block">{testCase.testData}</span>
              </div>
            )}
            
            {testCase.sourceUrl && (
              <div className="col-span-2">
                <span className="font-semibold text-slate-700 dark:text-gray-300 block mb-2 text-sm">Attached Image</span>
                <div className="relative w-full h-64 rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden bg-slate-50 dark:bg-gray-900">
                  <Image
                    src={testCase.sourceUrl}
                    alt="Test Case Attachment"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <span className="font-semibold text-slate-700 dark:text-gray-300 block mb-2 text-sm">Test Steps</span>
            <div className="bg-white dark:bg-gray-950 p-4 rounded-xl border border-slate-200 dark:border-gray-800 space-y-2">
              {testCase.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 text-slate-700 dark:text-gray-300">
                  <span className="text-indigo-500 dark:text-indigo-400 font-bold font-mono text-xs mt-0.5">{idx + 1}.</span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="font-semibold text-slate-700 dark:text-gray-300 block mb-2 text-sm">Expected Result</span>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-500/20 rounded-xl">
              <span className="text-slate-700 dark:text-gray-200 leading-relaxed">{testCase.expectedResult}</span>
            </div>
          </div>

          {testCase.comments && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-gray-300 block mb-2 text-sm">Comments</span>
              <p className="text-slate-600 dark:text-gray-400 italic bg-slate-50 dark:bg-gray-900 p-3 rounded-xl border border-slate-100 dark:border-gray-800">
                {testCase.comments}
              </p>
            </div>
          )}
        </div>

        {/* Footer Execution Controls */}
        <div className="p-5 border-t border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900 flex items-center justify-between">
          <div className="flex flex-col text-[11px] text-slate-400 dark:text-gray-500">
            <span>Source: <strong className="text-slate-500 dark:text-gray-400">{testCase.provider}</strong></span>
            <span>Created: <strong className="text-slate-500 dark:text-gray-400">{new Date(testCase.createdAt).toLocaleDateString()}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm text-slate-600 dark:text-gray-300">Result:</span>
            <div className="flex bg-slate-200 dark:bg-gray-950 rounded-lg p-1 gap-1">
              <button
                onClick={() => onExecutionChange(testCase.id, "pass")}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                  testCase.executionResult === "pass" ? "bg-emerald-500 text-white shadow-md scale-105" : "text-slate-500 dark:text-gray-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-gray-800"
                }`}
              >
                Pass
              </button>
              <button
                onClick={() => onExecutionChange(testCase.id, "fail")}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                  testCase.executionResult === "fail" ? "bg-red-500 text-white shadow-md scale-105" : "text-slate-500 dark:text-gray-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-gray-800"
                }`}
              >
                Fail
              </button>
              <button
                onClick={() => onExecutionChange(testCase.id, "untested")}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                  !testCase.executionResult || testCase.executionResult === "untested" ? "bg-slate-500 text-white shadow-md scale-105" : "text-slate-500 dark:text-gray-400 hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"
                }`}
              >
                Untested
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
