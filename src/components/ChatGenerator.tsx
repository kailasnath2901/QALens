"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  Paperclip,
  Send,
  Check,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  X,
  ChevronDown,
  Zap,
  Eye,
  FileText as FileTextIcon,
  BookOpen,
  Database,
  Trash2,
  Cpu,
  PlusCircle,
  Edit3,
  Loader2,
  Box,
  Mic,
  MicOff,
  Volume2,
  Bot,
  MessageSquare
} from "lucide-react";
import { ChatMessage, TestCase, Project, ProviderInfo, Module, SubModule } from "@/types";
import providerLimits from "@/config/providerLimits.json";
import { logProviderUsage, calculateProviderStats, ProviderQuotaStats } from "@/lib/usageTracker";
import { saveChatMessage, saveTestCase, deleteTestCase, deleteChatMessage } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import { uploadImageToCloudinary } from "@/lib/upload";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";

interface ChatGeneratorProps {
  project: Project;
  chats: ChatMessage[];
  existingCases: TestCase[];
  onRefreshData: () => void;
  activeModule?: Module | null;
  activeSubModule?: SubModule | null;
  isLoading?: boolean;
}

// ─── SVG provider logos ─────────────────────────────────────────────────────

function GeminiLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="gem-g" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4" />
          <stop offset="0.5" stopColor="#9B72CB" />
          <stop offset="1" stopColor="#EA4335" />
        </linearGradient>
      </defs>
      <path d="M12 2C12 7.523 7.523 12 2 12c5.523 0 10 4.477 10 10 0-5.523 4.477-10 10-10-5.523 0-10-4.477-10-10z" fill="url(#gem-g)" />
    </svg>
  );
}



function GrokLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#111" />
      <text x="4" y="17" fontSize="14" fontWeight="800" fill="white" fontFamily="system-ui">X</text>
    </svg>
  );
}

function QaseLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#6366f1" />
      <text x="4" y="17" fontSize="12" fontWeight="700" fill="white" fontFamily="system-ui">QA</text>
    </svg>
  );
}

const PROVIDER_LOGOS: Record<string, React.ReactNode> = {
  "gemini-2.5-flash": <GeminiLogo size={18} />,
  "gemini-2.5-flash-lite": <GeminiLogo size={18} />,
  "gemini-2.5-pro": <GeminiLogo size={18} />,
  "grok-2": <GrokLogo size={18} />,
  "qase-aiden": <QaseLogo size={18} />,
};

const PROVIDER_TABS: Record<string, "basic" | "advanced"> = {
  "gemini-2.5-flash": "basic",
  "gemini-2.5-flash-lite": "basic",
  "grok-2": "basic",
  "gemini-2.5-pro": "advanced",
  "qase-aiden": "advanced",
};

// ─── Model Selector Popover ──────────────────────────────────────────────────

const POPOVER_WIDTH = 288;
const POPOVER_MARGIN = 8;

function ModelSelectorPopover({
  providers,
  selectedProvider,
  sourceType,
  onSelect,
  onClose,
  anchorEl,
}: {
  providers: ProviderInfo[];
  selectedProvider: string;
  sourceType: "image" | "text";
  onSelect: (id: string) => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}) {
  const [tab, setTab] = useState<"basic" | "advanced">(PROVIDER_TABS[selectedProvider] ?? "basic");
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      let left = rect.left;
      const top = rect.bottom + POPOVER_MARGIN;

      const maxLeft = window.innerWidth - POPOVER_WIDTH - POPOVER_MARGIN;
      if (left > maxLeft) left = Math.max(POPOVER_MARGIN, maxLeft);

      setCoords({ top, left });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [anchorEl]);

  useLayoutEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [anchorEl, onClose]);

  if (!coords) return null;

  const filtered = providers.filter((p) => PROVIDER_TABS[p.id] === tab);

  const handleSelect = (id: string, disabled: boolean) => {
    if (disabled) return;
    onSelect(id);
    onClose();
  };

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[999] w-72 bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-fadeIn"
      style={{ top: coords.top, left: coords.left }}
    >
      <div className="flex items-center gap-1 p-2 border-b border-slate-100 dark:border-gray-800">
        {(["basic", "advanced"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              tab === t
                ? "bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-white"
                : "text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300"
            }`}
          >
            {t === "basic" ? "✦ Basic" : "⚡ Advanced"}
          </button>
        ))}
      </div>

      <div className="p-1.5 space-y-0.5 max-h-80 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-[11px] text-slate-400 dark:text-gray-500 px-3 py-4 text-center">
            No models in this tab.
          </p>
        )}
        {filtered.map((p) => {
          const isActive = p.id === selectedProvider;
          const isVisionDisabled = sourceType === "image" && !p.supportsVision;
          return (
            <button
              key={p.id}
              type="button"
              disabled={isVisionDisabled}
              onClick={() => handleSelect(p.id, isVisionDisabled)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                isVisionDisabled
                  ? "opacity-35 cursor-not-allowed"
                  : isActive
                  ? "bg-slate-100 dark:bg-gray-800"
                  : "hover:bg-slate-50 dark:hover:bg-gray-800/70 cursor-pointer"
              }`}
            >
              <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 flex-shrink-0 overflow-hidden">
                {PROVIDER_LOGOS[p.id] ?? <Cpu className="w-4 h-4 text-indigo-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    {p.name}
                  </span>
                  {p.supportsVision ? (
                    <span className="text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">
                      VISION
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                      TEXT ONLY
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-gray-500 leading-tight block mt-0.5">
                  {p.description}
                </span>
              </div>

              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse block" />
                )}
                <span className="text-[9px] text-slate-400 dark:text-gray-600 font-mono whitespace-nowrap">
                  {p.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}


// ─── Review & Edit Test Case Modal ───────────────────────────────────────────

interface ReviewStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCase: Omit<TestCase, "id" | "projectId" | "createdAt">) => void;
  initialCase: Omit<TestCase, "id" | "projectId" | "createdAt">;
}

function ReviewStoreModal({ isOpen, onClose, onSave, initialCase }: ReviewStoreModalProps) {
  const [title, setTitle] = useState(initialCase.title);
  const [category, setCategory] = useState(initialCase.category);
  const [moduleName, setModuleName] = useState(initialCase.moduleName || "");
  const [preconditions, setPreconditions] = useState(initialCase.preconditions || "");
  const [testData, setTestData] = useState(initialCase.testData || "");
  const [expectedResult, setExpectedResult] = useState(initialCase.expectedResult);
  const [steps, setSteps] = useState<string[]>(initialCase.steps || []);
  const [newStep, setNewStep] = useState("");

  if (!isOpen) return null;

  const handleAddStep = () => {
    if (newStep.trim()) {
      setSteps([...steps, newStep.trim()]);
      setNewStep("");
    }
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, val: string) => {
    const next = [...steps];
    next[index] = val;
    setSteps(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...initialCase,
      title,
      category,
      moduleName: moduleName || undefined,
      preconditions: preconditions || undefined,
      testData: testData || undefined,
      expectedResult,
      steps,
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-sm font-bold text-indigo-500 dark:text-indigo-400 mb-4 uppercase tracking-wider flex items-center gap-2">
          <Edit3 className="w-4 h-4" /> Review & Edit Test Case before Storing
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Test Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="functional">Functional</option>
                <option value="input_validation">Input Validation</option>
                <option value="empty_states">Empty States</option>
                <option value="error_handling">Error Handling</option>
                <option value="boundary_values">Boundary Values</option>
                <option value="accessibility">Accessibility</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Module Name</label>
              <input
                type="text"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g. auth-flow"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Preconditions</label>
              <input
                type="text"
                value={preconditions}
                onChange={(e) => setPreconditions(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g. User is logged in"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Test Data</label>
              <input
                type="text"
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g. email@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Test Steps</label>
            <div className="space-y-2 mb-2 max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 dark:text-gray-650 w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    required
                    value={step}
                    onChange={(e) => handleStepChange(idx, e.target.value)}
                    className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-gray-850 focus:border-indigo-500 text-xs text-slate-700 dark:text-gray-300 py-0.5 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="text-red-500 hover:text-red-400 p-1 text-[10px]"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {steps.length === 0 && (
                <p className="text-[10px] text-slate-400 dark:text-gray-600 italic p-1">No steps added yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddStep(); } }}
                className="flex-1 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                placeholder="Type new step..."
              />
              <button
                type="button"
                onClick={handleAddStep}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-750 text-slate-900 dark:text-white text-xs font-semibold"
              >
                Add Step
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Expected Result</label>
            <textarea
              required
              rows={2}
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-750 text-slate-900 dark:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Store Case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ─── Main Component ──────────────────────────────────────────────────────────

export function ChatGenerator({ project, chats, existingCases, onRefreshData, activeModule, activeSubModule, isLoading = false }: ChatGeneratorProps) {
  const { user, userProfile, isDemoUser } = useAuth();
  const [selectedProvider, setSelectedProvider] = useState<string>("gemini");
  const [isModelOpen, setIsModelOpen] = useState(false);
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const [inputPrompt, setInputPrompt] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<"image" | "text">("text");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineState, setPipelineState] = useState<"idle" | "extracting" | "generating">("idle");
  const [storedCaseIds, setStoredCaseIds] = useState<Set<string>>(new Set());
  const [caseKeyToFirestoreId, setCaseKeyToFirestoreId] = useState<Record<string, string>>({});
  const [deletingCaseKey, setDeletingCaseKey] = useState<string | null>(null);
  const [storingAllForMsg, setStoringAllForMsg] = useState<string | null>(null);

  // Tony Assistant Dual Mode (Chat / Voice)
  const userFeatures = userProfile?.features || {
    enableTony: false,
    enableTonyVoice: false,
    enableTonyChat: false
  };
  const isTonyEnabled = !!userFeatures.enableTony;
  const isVoiceAllowed = isTonyEnabled && !!userFeatures.enableTonyVoice;
  const isChatAllowed = isTonyEnabled && !!userFeatures.enableTonyChat;

  const [assistantMode, setAssistantMode] = useState<"chat" | "voice">(isVoiceAllowed ? "voice" : "chat");
  const [tonyStatusText, setTonyStatusText] = useState<string>("Tony is in standby. Say 'Hey Tony' or tap to speak.");

  // Voice Assistant Hook
  const {
    isListening,
    isAwake,
    setIsAwake,
    transcript,
    audioLevel,
    startListening,
    stopListening,
    speak
  } = useVoiceAssistant({
    enabled: isVoiceAllowed,
    onWakeWord: () => {
      setTonyStatusText("Listening for your QA command...");
    },
    onStopWord: () => {
      setTonyStatusText("Tony paused. Say 'Hey Tony' to resume.");
    },
    onConfirmWord: () => {
      setTonyStatusText("Standing by.");
    },
    onCommandTranscript: (voiceCommand) => {
      handleTonyVoiceQuery(voiceCommand);
    }
  });

  const handleTonyVoiceQuery = async (queryText: string) => {
    if (!queryText.trim() || isGenerating) return;
    setIsGenerating(true);
    setTonyStatusText(`Analyzing: "${queryText}"...`);

    try {
      const res = await fetch("/api/tony", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: queryText,
          projectId: project.id,
          moduleId: activeModule?.id,
          subModuleId: activeSubModule?.id,
          projectName: project.name
        })
      });
      const data = await res.json();
      if (data.reply) {
        setTonyStatusText(data.reply);
        if (data.spokenText) {
          speak(data.spokenText);
        }
        // Save to chat log so user sees Tony's answer in feed
        await saveChatMessage({
          projectId: project.id,
          moduleId: activeModule?.id,
          subModuleId: activeSubModule?.id,
          sender: "ai",
          content: `[Tony]: ${data.reply}`,
          provider: "tony-gemini-live"
        });
        onRefreshData();
      }
    } catch (err) {
      console.error("Tony query error:", err);
      setTonyStatusText("Sorry, I could not process that request.");
    } finally {
      setIsGenerating(false);
      setIsAwake(false);
    }
  };

  // New States for Reviewing, Removing, and live AI Usage Stats
  const [removedCaseKeys, setRemovedCaseKeys] = useState<Set<string>>(new Set());
  const [editingCase, setEditingCase] = useState<Omit<TestCase, "id" | "projectId" | "createdAt"> | null>(null);
  const [editingCaseKey, setEditingCaseKey] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<Record<string, ProviderQuotaStats>>({});
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const providers: ProviderInfo[] = providerLimits.providers;
  const currentProviderObj = providers.find((p) => p.id === selectedProvider) || providers[0];
  const isTextOnlyModel = !currentProviderObj.supportsVision;

  // Refresh live usage stats
  const refreshUsage = () => {
    setUsageStats(calculateProviderStats());
  };

  useEffect(() => {
    refreshUsage();
    const interval = setInterval(refreshUsage, 5000);
    return () => clearInterval(interval);
  }, [chats, selectedProvider]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, pipelineState]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDemoUser) { alert("Please sign in to upload screenshots or requirements."); return; }
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => { setAttachedImage(ev.target?.result as string); setSourceType("image"); };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => { setInputPrompt(ev.target?.result as string); setSourceType("text"); };
      reader.readAsText(file);
    }
  };

  const removeAttachment = () => { setAttachedImage(null); setSourceType("text"); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const handleSend = async () => {
    if (isDemoUser) { alert("Please sign in to generate test cases with the AI engine."); return; }
    if (!inputPrompt.trim() && !attachedImage) return;
    if (isGenerating) return;

    let imgUrl = attachedImage;
    const userText = inputPrompt;
    const currentSource = sourceType;

    setInputPrompt("");
    setAttachedImage(null);
    setIsGenerating(true);
    setPipelineState("extracting");

    // Upload image if present
    if (imgUrl && user?.uid && imgUrl.startsWith("data:")) {
      try {
        imgUrl = await uploadImageToCloudinary(imgUrl, `qasuite/${user.uid}/test-inputs`);
      } catch { imgUrl = attachedImage; }
    }

    const userMsg = await saveChatMessage({ 
      projectId: project.id, 
      moduleId: activeModule?.id, 
      subModuleId: activeSubModule?.id, 
      sender: "user", 
      content: userText || "Attached UI Screenshot", 
      sourceUrl: imgUrl || null, 
      sourceType: currentSource 
    });
    onRefreshData();

    try {
      setPipelineState("generating");
      await logProviderUsage(selectedProvider, user?.uid || "anonymous", currentSource);

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: currentSource, inputText: userText, imageUrl: imgUrl, provider: selectedProvider, projectName: project.name }),
      });
      const data = await res.json();
      if (data.generatedCases?.length) {
        await saveChatMessage({
          projectId: project.id, 
          moduleId: activeModule?.id, 
          subModuleId: activeSubModule?.id,
          sender: "ai",
          content: `Generated ${data.generatedCases.length} categorized, non-duplicate test cases based on structured context.`,
          provider: data.providerUsed || selectedProvider,
          structuredContext: data.structuredContext,
          generatedCases: data.generatedCases,
          responseTo: userMsg.id,
        });
      } else {
        await saveChatMessage({ 
          projectId: project.id, 
          moduleId: activeModule?.id, 
          subModuleId: activeSubModule?.id,
          sender: "ai", 
          content: `AI Generation Warning: ${data.error || "Falling back to structured rule generator."}`, 
          responseTo: userMsg.id 
        });
      }
    } catch {
      await saveChatMessage({ 
        projectId: project.id, 
        moduleId: activeModule?.id, 
        subModuleId: activeSubModule?.id,
        sender: "ai", 
        content: "Error communicating with AI Provider pipeline. Please try again.", 
        responseTo: userMsg.id 
      });
    } finally {
      setIsGenerating(false);
      setPipelineState("idle");
      onRefreshData();
    }
  };

  const handleStoreCase = async (testCase: Omit<TestCase, "id" | "projectId" | "createdAt">, idxKey: string) => {
    const saved = await saveTestCase({ 
      ...testCase, 
      projectId: project.id, 
      moduleId: activeModule?.id, 
      subModuleId: activeSubModule?.id,
      status: "approved" 
    });
    setStoredCaseIds((prev) => new Set(prev).add(idxKey));
    setCaseKeyToFirestoreId((prev) => ({ ...prev, [idxKey]: saved.id }));
    onRefreshData();
  };

  const handleStoreAll = async (cases: Omit<TestCase, "id" | "projectId" | "createdAt">[], msgId: string) => {
    setStoringAllForMsg(msgId);
    for (let i = 0; i < cases.length; i++) {
      const key = `${msgId}_case_${i}`;
      if (!storedCaseIds.has(key) && !removedCaseKeys.has(key)) {
        const saved = await saveTestCase({ 
          ...cases[i], 
          projectId: project.id, 
          moduleId: activeModule?.id, 
          subModuleId: activeSubModule?.id,
          status: "approved" 
        });
        setStoredCaseIds((prev) => new Set(prev).add(key));
        setCaseKeyToFirestoreId((prev) => ({ ...prev, [key]: saved.id }));
      }
    }
    setStoringAllForMsg(null);
    onRefreshData();
  };

  const handleRemoveUnstoredCase = (caseKey: string) => {
    setRemovedCaseKeys((prev) => {
      const next = new Set(prev);
      next.add(caseKey);
      return next;
    });
  };

  const handleDeleteCase = async (caseKey: string) => {
    const firestoreId = caseKeyToFirestoreId[caseKey];
    if (!firestoreId) return;
    setDeletingCaseKey(caseKey);
    try {
      await deleteTestCase(firestoreId, project.id);
      setStoredCaseIds((prev) => {
        const next = new Set(prev);
        next.delete(caseKey);
        return next;
      });
      setCaseKeyToFirestoreId((prev) => {
        const next = { ...prev };
        delete next[caseKey];
        return next;
      });
      onRefreshData();
    } catch (e) {
      console.error("Failed to delete test case:", e);
    } finally {
      setDeletingCaseKey(null);
    }
  };

  const categoryColors: Record<string, string> = {
    functional: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    input_validation: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    empty_states: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    error_handling: "bg-red-500/10 text-red-400 border-red-500/20",
    boundary_values: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    accessibility: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#080b10] relative">

      {/* ─── Loading State (Full Overlay) ─── */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-[#080b10]">
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
            <Box className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Select a Module to Continue
          </h3>
          <p className="text-sm text-slate-500 dark:text-gray-400 max-w-md mb-4">
            To create or store test cases, please select a module from the sidebar. 
            If no modules exist yet, create one first.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-gray-500">
            <Box className="w-4 h-4" />
            <span>Project → Module → Test Cases</span>
          </div>
        </div>
      )}

      {/* ─── Top Model Bar (show when module is selected) ─── */}
      {activeModule && (
        <div className="h-12 border-b border-slate-200 dark:border-gray-800/80 bg-white/80 dark:bg-[#0a0d14]/80 backdrop-blur-md px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Active Model Pill */}
            <div>
              <button
                ref={modelBtnRef}
                type="button"
              onClick={() => setIsModelOpen((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                isModelOpen
                  ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400"
                  : "bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-200 hover:border-indigo-500/40"
              }`}
            >
              <div className="w-4 h-4 flex items-center justify-center">
                {PROVIDER_LOGOS[selectedProvider] ?? <Cpu className="w-3.5 h-3.5" />}
              </div>
              <span>{currentProviderObj.name}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isModelOpen ? "rotate-180" : ""}`} />
            </button>

            {isModelOpen && (
              <ModelSelectorPopover
                providers={providers}
                selectedProvider={selectedProvider}
                sourceType={sourceType}
                onSelect={setSelectedProvider}
                onClose={() => setIsModelOpen(false)}
                anchorEl={modelBtnRef.current}
              />
            )}
          </div>

          {/* Vision badge */}
          {currentProviderObj.supportsVision && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
              <Eye className="w-3 h-3" /> Vision Ready
            </span>
          )}
        </div>

        {/* Mode switch & Right metrics */}
        <div className="flex items-center gap-3 text-xs">
          {isTonyEnabled && (
            <div className="flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-900">
              {isVoiceAllowed && (
                <button
                  type="button"
                  onClick={() => setAssistantMode("voice")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    assistantMode === "voice"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Tony Voice</span>
                </button>
              )}
              {isChatAllowed && (
                <button
                  type="button"
                  onClick={() => setAssistantMode("chat")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    assistantMode === "chat"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
              )}
            </div>
          )}

          <span className="hidden lg:flex items-center gap-1.5 text-slate-400 dark:text-gray-500">
            Usage: <span className="font-mono text-indigo-500 dark:text-indigo-400 font-bold">{usageStats[selectedProvider]?.rpmUsed || 0}</span> / <span className="font-mono text-indigo-300">{currentProviderObj.rpm}</span> RPM
          </span>
          <span className="hidden lg:flex items-center gap-1.5 text-slate-400 dark:text-gray-500">
            Today: <span className="font-mono text-indigo-500 dark:text-indigo-400 font-bold">{usageStats[selectedProvider]?.rpdUsed || 0}</span> / <span className="font-mono text-indigo-300">{currentProviderObj.rpd}</span> RPD
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            2-Step Pipeline
          </span>
        </div>
      </div>
      )}

      {/* ─── Chat Feed ─── */}
      {activeModule && (
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          /* ── AetherAI-style Hero Empty State ── */
          <div className="h-full flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-600/5 blur-3xl" />
            </div>

            {/* Logo badge */}
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-cyan-500/10 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-600/10">
                <Sparkles className="w-7 h-7 text-indigo-400" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#080b10] shadow-[0_0_8px_#34d399]" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
              Good to See You! 👋
            </h2>
            <h3 className="text-base font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 mb-2">
              How Can I Assist Your Test Suite?
            </h3>
            <p className="text-xs text-slate-400 dark:text-gray-500 max-w-sm leading-relaxed mb-8">
              I'm available 24/7 for <strong className="text-slate-600 dark:text-gray-300">{project.name}</strong>. Upload a UI screenshot or paste requirements and I'll generate comprehensive, categorized test cases instantly.
            </p>

            {/* Feature hints grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left w-full max-w-md mb-8">
              <div className="group p-3.5 bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800/80 rounded-2xl hover:border-indigo-500/40 transition-all cursor-default">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-white">Vision Flow</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-gray-500 leading-relaxed">Upload a UI design screenshot → auto-extract form fields & buttons</p>
              </div>
              <div className="group p-3.5 bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800/80 rounded-2xl hover:border-cyan-500/40 transition-all cursor-default">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-white">Requirement PRD</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-gray-500 leading-relaxed">Paste text specs → generate boundary & empty-state cases</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
            {chats.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-bold border ${
                    msg.sender === "user"
                      ? "bg-indigo-600 border-indigo-500/50 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-100 dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-indigo-400"
                  }`}
                >
                  {msg.sender === "user" ? "YOU" : <Sparkles className="w-4 h-4" />}
                </div>

                {/* Bubble + Cards */}
                <div className={`space-y-3 max-w-2xl min-w-0 flex-1 ${msg.sender === "user" ? "flex flex-col items-end" : ""}`}>
                  <div className="relative group/msg w-full max-w-full">
                    <div
                      className={`px-4 py-3 rounded-2xl text-xs leading-relaxed pr-10 relative ${
                        msg.sender === "user"
                          ? "bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20 max-w-lg ml-auto"
                          : "bg-slate-50/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-800/80 text-slate-700 dark:text-gray-200 rounded-tl-sm shadow-sm"
                      }`}
                    >
                      {msg.sourceUrl && (
                        <div className="mb-3 rounded-xl overflow-hidden border border-indigo-400/30 max-w-xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={msg.sourceUrl} alt="Screenshot input" className="w-full object-cover" />
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Structured Context Badge (Step 1) */}
                      {msg.structuredContext && (
                        <div className="mt-3 p-3 bg-white dark:bg-gray-950/80 border border-slate-200 dark:border-gray-800 rounded-xl text-[11px]">
                          <div className="font-semibold text-indigo-400 flex items-center gap-1.5 mb-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Step 1 Context Extracted:</span>
                          </div>
                          <p className="text-slate-600 dark:text-gray-300 mb-2">{msg.structuredContext.summary}</p>
                          {msg.structuredContext.uiElements && (
                            <div className="flex flex-wrap gap-1">
                              {msg.structuredContext.uiElements.map((el, i) => (
                                <span key={i} className="bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 px-2 py-0.5 rounded text-[10px]">
                                  {el}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {msg.id && (
                        <button
                          type="button"
                          disabled={deletingMsgId !== null}
                          onClick={async () => {
                            if (confirm("Delete this conversation and its associated screenshot from QAlens?")) {
                              setDeletingMsgId(msg.id!);
                              try {
                                await deleteChatMessage(msg.id!);
                                onRefreshData();
                              } catch (e) {
                                console.error("Failed to delete chat message:", e);
                              } finally {
                                setDeletingMsgId(null);
                              }
                            }
                          }}
                          className={`absolute top-2.5 right-2.5 opacity-0 group-hover/msg:opacity-100 p-1 rounded-lg transition-all ${
                            msg.sender === "user"
                              ? "bg-indigo-700 hover:bg-red-500 hover:text-white text-indigo-300"
                              : "bg-slate-100 hover:bg-red-500 hover:text-white dark:bg-gray-800 text-slate-400 dark:text-gray-500"
                          }`}
                          title="Delete message & screenshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {deletingMsgId === msg.id && (
                        <div className="absolute inset-0 bg-white/70 dark:bg-[#0f1118]/70 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-10">
                          <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                          <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider ml-1.5 animate-pulse">Deleting...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ─── Generated Test Case Cards ─── */}
                  {msg.generatedCases && msg.generatedCases.length > 0 && (
                    <div className="space-y-3 w-full">
                      {/* Section header + Store All */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Step 2 — {msg.generatedCases.length} Cases Generated</span>
                        </div>

                        {/* Store All button */}
                        {msg.generatedCases.every((_, i) => storedCaseIds.has(`${msg.id}_case_${i}`)) ? (
                          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                            <Check className="w-3 h-3" /> All Stored
                          </span>
                        ) : (
                          <button
                            disabled={storingAllForMsg === msg.id}
                            onClick={() => handleStoreAll(msg.generatedCases!, msg.id!)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-bold shadow-md shadow-indigo-600/20 transition-all"
                          >
                            {storingAllForMsg === msg.id ? (
                              <><Sparkles className="w-3 h-3 animate-spin" /> Storing...</>
                            ) : (
                              <><Database className="w-3 h-3" /> Store All ({msg.generatedCases.filter((_, i) => !storedCaseIds.has(`${msg.id}_case_${i}`)).length})</>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Individual Cards */}
                      {msg.generatedCases.map((tc, idx) => {
                        const caseKey = `${msg.id}_case_${idx}`;
                        if (removedCaseKeys.has(caseKey)) return null;

                        const isStored = storedCaseIds.has(caseKey);
                        const catColor = categoryColors[tc.category] ?? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";

                        return (
                          <div
                            key={idx}
                            className={`group bg-white dark:bg-gray-900/80 border rounded-2xl p-4 transition-all shadow-sm ${
                              isStored
                                ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/5"
                                : "border-slate-200 dark:border-gray-800/80 hover:border-indigo-500/40 hover:shadow-md"
                            }`}
                          >
                            {/* Card header */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex items-start gap-2 min-w-0">
                                <div className="w-5 h-5 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <FileTextIcon className="w-3 h-3 text-indigo-400" />
                                </div>
                                <h4 className="font-semibold text-xs text-slate-900 dark:text-white leading-snug">{tc.title}</h4>
                              </div>
                              <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${catColor}`}>
                                {tc.category.replace("_", " ")}
                              </span>
                            </div>

                            {/* Meta info */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                              {tc.moduleName && (
                                <span className="text-[10px] text-slate-400 dark:text-gray-500">
                                  <span className="text-slate-500 dark:text-gray-400 font-medium">Module:</span> {tc.moduleName}
                                </span>
                              )}
                              {tc.preconditions && (
                                <span className="text-[10px] text-slate-400 dark:text-gray-500">
                                  <span className="text-slate-500 dark:text-gray-400 font-medium">Pre-req:</span> {tc.preconditions}
                                </span>
                              )}
                              {tc.testData && (
                                <span className="text-[10px] text-slate-400 dark:text-gray-500">
                                  <span className="text-slate-500 dark:text-gray-400 font-medium">Data:</span> {tc.testData}
                                </span>
                              )}
                            </div>

                            {/* Steps */}
                            <div className="bg-slate-50 dark:bg-gray-950/60 border border-slate-200 dark:border-gray-800/60 rounded-xl p-3 mb-3 space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider block mb-2">Test Steps</span>
                              {tc.steps.map((step, sIdx) => (
                                <div key={sIdx} className="flex items-start gap-2 text-[11px]">
                                  <span className="w-4 h-4 rounded-md bg-indigo-500/10 text-indigo-400 font-mono font-bold text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {sIdx + 1}
                                  </span>
                                  <span className="text-slate-600 dark:text-gray-300 leading-relaxed">{step}</span>
                                </div>
                              ))}
                            </div>

                            {/* Expected result */}
                            <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl mb-3">
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">Expected Result</span>
                              <span className="text-[11px] text-slate-600 dark:text-gray-300">{tc.expectedResult}</span>
                            </div>

                            {/* Action */}
                            <div className="flex items-center justify-end gap-2">
                              {isStored ? (
                                <>
                                  <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/30">
                                    <Check className="w-3 h-3" /> Stored
                                  </span>
                                  <button
                                    onClick={() => handleDeleteCase(caseKey)}
                                    disabled={deletingCaseKey === caseKey}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold transition-all disabled:opacity-40"
                                    title="Delete from project & Cloudinary"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    {deletingCaseKey === caseKey ? "..." : "Delete"}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleRemoveUnstoredCase(caseKey)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold transition-all"
                                    title="Discard generated case"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Discard
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingCase(tc);
                                      setEditingCaseKey(caseKey);
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-slate-250 dark:border-gray-700 text-slate-700 dark:text-gray-300 text-[10px] font-bold transition-all"
                                    title="Edit details before storing"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    Edit & Store
                                  </button>
                                  <button
                                    onClick={() => handleStoreCase(tc, caseKey)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shadow-sm shadow-indigo-600/20 transition-all"
                                  >
                                    <PlusCircle className="w-3 h-3" />
                                    Store Case
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Pipeline status */}
            {pipelineState !== "idle" && (
              <div className="flex items-center justify-center py-4">
                <div className="flex items-center gap-3 px-5 py-3 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {pipelineState === "extracting" ? "Step 1: Extracting Context & UI Elements..." : "Step 2: Generating Edge & Complementary Test Cases..."}
                    </span>
                    <span className="text-[10px] text-indigo-300">Running via {currentProviderObj.name}</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      )}

      {/* ─── Bottom Prompt Bar or Tony Voice HUD (show when module is selected) ─── */}
      {activeModule && (
        assistantMode === "voice" && isVoiceAllowed ? (
          /* Tony Voice Mode HUD */
          <div className="p-4 border-t border-slate-200 dark:border-gray-800/80 bg-white/95 dark:bg-[#0a0d14]/95 backdrop-blur-md flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (isListening) stopListening();
                  else startListening();
                }}
                className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isAwake
                    ? "bg-gradient-to-tr from-cyan-500 to-indigo-500 text-white shadow-cyan-500/30 scale-110"
                    : isListening
                    ? "bg-indigo-600 text-white shadow-indigo-600/30"
                    : "bg-slate-200 dark:bg-gray-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
                title={isListening ? "Listening... (Say 'Hey Tony' or speak command)" : "Tap to activate Tony"}
              >
                {/* Audio pulse ring */}
                {isListening && (
                  <span
                    className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-40 pointer-events-none"
                    style={{ transform: `scale(${1 + audioLevel / 60})` }}
                  />
                )}
                {isListening ? <Mic className="w-6 h-6 animate-pulse" /> : <MicOff className="w-6 h-6" />}
              </button>

              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-cyan-400" /> Tony Voice Assistant
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    isAwake 
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" 
                      : isListening 
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" 
                      : "bg-slate-500/20 text-slate-400 border border-slate-500/40"
                  }`}>
                    {isAwake ? "Awake & Processing" : isListening ? "Standing By" : "Muted"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 max-w-lg mt-0.5 truncate">
                  {tonyStatusText}
                </p>
              </div>
            </div>

            {/* Voice hint pills */}
            <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-gray-500 font-mono">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-800">
                "Hey Tony, give me a summary of notes"
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-800">
                "Stop Tony"
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-800">
                "OK Tony"
              </span>
            </div>
          </div>
        ) : (
          /* Standard Chat Input Mode */
          <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-gray-800/80 bg-white/80 dark:bg-[#0a0d14]/90 backdrop-blur-md">
            {attachedImage && (
              <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-gray-800/80 border border-slate-300 dark:border-gray-700 rounded-xl text-xs text-indigo-400">
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="font-medium">Screenshot Attached</span>
                <button onClick={removeAttachment} className="hover:text-red-400 ml-1 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2 bg-white dark:bg-gray-900/90 border border-slate-200 dark:border-gray-800 focus-within:border-indigo-500/60 rounded-2xl p-2 transition-all shadow-sm">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,.txt,.doc,.pdf"
                className="hidden"
              />

              {/* Attach btn — hidden for text-only models */}
              {!isTextOnlyModel && (
                <button
                  onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-slate-400 dark:text-gray-500 hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
              title="Attach Screenshot or Requirement File"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          )}

          <textarea
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder={
              attachedImage
                ? "Describe specific edge cases or boundary values for this screenshot..."
                : "Paste requirements, user stories, or describe what to test..."
            }
            rows={1}
            className="flex-1 bg-transparent border-none text-xs text-slate-900 dark:text-white placeholder-gray-500 focus:outline-none resize-none px-2 py-1.5 max-h-28"
          />

          {/* Active status */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium flex-shrink-0 pr-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </div>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={isGenerating || (!inputPrompt.trim() && !attachedImage)}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-md shadow-indigo-600/30 transition-all flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
        )
      )}

      {editingCase && editingCaseKey && (
        <ReviewStoreModal
          isOpen={true}
          onClose={() => {
            setEditingCase(null);
            setEditingCaseKey(null);
          }}
          initialCase={editingCase}
          onSave={async (updatedCase) => {
            await handleStoreCase(updatedCase, editingCaseKey);
            setEditingCase(null);
            setEditingCaseKey(null);
          }}
        />
      )}
    </div>
  );
}
