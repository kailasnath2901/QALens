import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, ListChecks } from "lucide-react";

interface TestStepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (steps: string[]) => void;
  initialSteps: string[];
}

export function TestStepsModal({ isOpen, onClose, onSave, initialSteps }: TestStepsModalProps) {
  const [steps, setSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSteps(initialSteps);
      setCurrentStep("");
    }
  }, [isOpen, initialSteps]);

  if (!isOpen) return null;

  const handleAddStep = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentStep.trim()) return;
    setSteps([...steps, currentStep.trim()]);
    setCurrentStep("");
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(steps);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-gray-800 flex justify-between items-center bg-slate-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Test Steps</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">Define the execution steps for this test case</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          <form onSubmit={handleAddStep} className="flex gap-2">
            <input
              type="text"
              value={currentStep}
              onChange={(e) => setCurrentStep(e.target.value)}
              placeholder="e.g. Click the 'Login' button..."
              className="flex-1 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!currentStep.trim()}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 disabled:opacity-50 text-slate-700 dark:text-gray-300 font-semibold text-sm flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </form>

          {steps.length > 0 ? (
            <div className="space-y-2 mt-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-950 group">
                  <span className="text-indigo-500 font-mono font-bold text-xs mt-0.5">{idx + 1}.</span>
                  <p className="flex-1 text-sm text-slate-700 dark:text-gray-300 leading-relaxed">{step}</p>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="p-1.5 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    title="Remove Step"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-gray-800 rounded-xl text-slate-500 dark:text-gray-400 text-sm">
              No steps added yet. Type a step above and click Add.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-gray-800 hover:bg-slate-300 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Steps</span>
          </button>
        </div>
      </div>
    </div>
  );
}
