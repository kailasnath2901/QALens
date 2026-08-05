"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TestCase, Module, SubModule, TestCaseCategory } from "@/types";
import { saveTestCase } from "@/lib/store";
import {
  GripVertical,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  ArrowRight,
  Layers,
  Plus,
  X,
  Loader2,
  Send,
} from "lucide-react";

// ─── Column Config ───
interface Column {
  id: string;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  accentColor: string; // top accent bar + badge tint source
  icon: React.ReactNode;
}

const COLUMNS: Column[] = [
  {
    id: "pending",
    title: "Pending",
    color: "text-slate-300",
    bgColor: "bg-slate-800/40",
    borderColor: "border-slate-600/40",
    accentColor: "bg-slate-400",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  {
    id: "in_progress",
    title: "In Progress",
    color: "text-blue-300",
    bgColor: "bg-blue-950/40",
    borderColor: "border-blue-500/40",
    accentColor: "bg-blue-400",
    icon: <ArrowRight className="w-3.5 h-3.5" />,
  },
  {
    id: "draft",
    title: "Draft",
    color: "text-amber-300",
    bgColor: "bg-amber-950/40",
    borderColor: "border-amber-500/40",
    accentColor: "bg-amber-400",
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  {
    id: "reviewed",
    title: "Reviewed",
    color: "text-cyan-300",
    bgColor: "bg-cyan-950/40",
    borderColor: "border-cyan-500/40",
    accentColor: "bg-cyan-400",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  {
    id: "approved",
    title: "Approved",
    color: "text-emerald-300",
    bgColor: "bg-emerald-950/40",
    borderColor: "border-emerald-500/40",
    accentColor: "bg-emerald-400",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  {
    id: "done",
    title: "Done",
    color: "text-green-300",
    bgColor: "bg-green-950/40",
    borderColor: "border-green-500/40",
    accentColor: "bg-green-400",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
];

// ─── Category Colors ───
const CATEGORY_COLORS: Record<string, string> = {
  functional: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  ui: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  api: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  security: "bg-red-500/15 text-red-300 border-red-500/20",
  performance: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  integration: "bg-teal-500/15 text-teal-300 border-teal-500/20",
  input_validation: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  empty_states: "bg-gray-500/15 text-gray-300 border-gray-500/20",
  error_handling: "bg-rose-500/15 text-rose-300 border-rose-500/20",
  boundary_values: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  accessibility: "bg-lime-500/15 text-lime-300 border-lime-500/20",
};

// Left-border accent per category (mirrors CATEGORY_COLORS, just the border shade)
const CATEGORY_BORDER_ACCENT: Record<string, string> = {
  functional: "border-l-indigo-500",
  ui: "border-l-purple-500",
  api: "border-l-cyan-500",
  security: "border-l-red-500",
  performance: "border-l-orange-500",
  integration: "border-l-teal-500",
  input_validation: "border-l-amber-500",
  empty_states: "border-l-gray-500",
  error_handling: "border-l-rose-500",
  boundary_values: "border-l-yellow-500",
  accessibility: "border-l-lime-500",
};

// ─── Droppable Column ───
function DroppableColumn({
  column,
  cards,
  onCardClick,
}: {
  column: Column;
  cards: TestCase[];
  onCardClick: (tc: TestCase) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`relative flex-shrink-0 w-[280px] flex flex-col rounded-xl border transition-all duration-200 ${column.borderColor} ${column.bgColor} overflow-hidden ${
        isOver ? "ring-2 ring-indigo-500/50 scale-[1.01]" : ""
      }`}
      style={{ height: "calc(100vh - 14rem)" }}
    >
      {/* Top accent bar */}
      <div className={`h-[3px] w-full ${column.accentColor} opacity-80`} />

      {/* Column Header */}
      <div className="px-3 py-2.5 border-b border-gray-700/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={column.color}>{column.icon}</span>
          <h3 className={`text-xs font-semibold ${column.color}`}>
            {column.title}
          </h3>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${column.bgColor} ${column.color} ${column.borderColor}`}
        >
          {cards.length}
        </span>
      </div>

      {/* Cards Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {cards.map((tc) => (
              <SortableCard
                key={tc.id}
                testCase={tc}
                onClick={() => onCardClick(tc)}
              />
            ))}
          </div>
        </SortableContext>

        {cards.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-center rounded-lg border-2 border-dashed border-gray-700/50 mt-1">
            <Layers className="w-6 h-6 text-gray-700 mb-1" />
            <p className="text-[10px] text-gray-600">Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sortable Card ───
function SortableCard({
  testCase,
  onClick,
}: {
  testCase: TestCase;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: testCase.id,
    data: { type: "testCase", testCase },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const categoryColor =
    CATEGORY_COLORS[testCase.category] ||
    "bg-slate-500/15 text-slate-300 border-slate-500/20";
  const borderAccent =
    CATEGORY_BORDER_ACCENT[testCase.category] || "border-l-slate-500";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-gray-900/80 border border-gray-700/50 border-l-[3px] ${borderAccent} rounded-xl p-3 transition-all duration-150 hover:border-gray-600/60 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 ${
        isDragging ? "opacity-50 shadow-lg shadow-indigo-500/10 z-50" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          className="cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3.5 h-3.5 text-gray-600 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <p className="text-xs font-medium text-gray-200 leading-snug mb-2 line-clamp-2">
            {testCase.title}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${categoryColor}`}
            >
              {testCase.category.replace(/_/g, " ")}
            </span>
            {testCase.tags?.slice(0, 1).map((tag, i) => (
              <span
                key={i}
                className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700/50"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Drag Overlay Card ───
function DragOverlayCard({ testCase }: { testCase: TestCase }) {
  const categoryColor =
    CATEGORY_COLORS[testCase.category] ||
    "bg-slate-500/15 text-slate-300 border-slate-500/20";

  return (
    <div className="bg-gray-900 border border-indigo-500/50 rounded-xl p-3 shadow-2xl shadow-indigo-500/20 rotate-2 w-72">
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-200 leading-snug mb-2 line-clamp-2">
            {testCase.title}
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${categoryColor}`}
            >
              {testCase.category.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Task Details Modal ───
function TaskDetailsModal({
  testCase,
  isOpen,
  onClose,
  onStatusChange,
}: {
  testCase: TestCase | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: TestCase["status"]) => void;
}) {
  if (!isOpen || !testCase) return null;

  const categoryColor =
    CATEGORY_COLORS[testCase.category] ||
    "bg-slate-500/15 text-slate-300 border-slate-500/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-modal-backdrop-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl animate-modal-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Task Details</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-8rem)] space-y-4">
          {/* Title */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              Title
            </label>
            <p className="text-sm font-medium text-white">{testCase.title}</p>
          </div>

          {/* Category & Status */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                Category
              </label>
              <span
                className={`text-[10px] font-semibold px-2 py-1 rounded border ${categoryColor}`}
              >
                {testCase.category.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                Status
              </label>
              <select
                value={testCase.status}
                onChange={(e) =>
                  onStatusChange(
                    testCase.id,
                    e.target.value as TestCase["status"]
                  )
                }
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Steps */}
          {testCase.steps && testCase.steps.length > 0 && (
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                Steps
              </label>
              <ol className="space-y-1.5">
                {testCase.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                    <span className="text-indigo-400 font-mono mt-0.5">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Expected Result */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              Expected Result
            </label>
            <p className="text-xs text-gray-300 bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              {testCase.expectedResult}
            </p>
          </div>

          {/* Preconditions */}
          {testCase.preconditions && (
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                Preconditions
              </label>
              <p className="text-xs text-gray-300">{testCase.preconditions}</p>
            </div>
          )}

          {/* Tags */}
          {testCase.tags && testCase.tags.length > 0 && (
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {testCase.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Test Data */}
          {testCase.testData && (
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                Test Data
              </label>
              <p className="text-xs text-gray-300 bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 font-mono">
                {testCase.testData}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create Task Modal ───
function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    category: TestCaseCategory;
    expectedResult: string;
    steps: string[];
  }) => void;
  isSubmitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TestCaseCategory>("functional");
  const [expectedResult, setExpectedResult] = useState("");
  const [steps, setSteps] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !expectedResult.trim()) return;
    onSubmit({ title, category, expectedResult, steps });
    setTitle("");
    setCategory("functional");
    setExpectedResult("");
    setSteps([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-modal-backdrop-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl animate-modal-in">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Create New Task</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Verify login with valid credentials"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TestCaseCategory)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="functional">Functional</option>
              <option value="ui">UI</option>
              <option value="api">API</option>
              <option value="security">Security</option>
              <option value="performance">Performance</option>
              <option value="integration">Integration</option>
              <option value="input_validation">Input Validation</option>
              <option value="error_handling">Error Handling</option>
              <option value="boundary_values">Boundary Values</option>
              <option value="accessibility">Accessibility</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Expected Result *
            </label>
            <textarea
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              placeholder="What should happen when this test passes?"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !expectedResult.trim() || isSubmitting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md hover:shadow-lg hover:shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {isSubmitting ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main TaskBoard Component ───
interface TaskBoardProps {
  testCases: TestCase[];
  activeModule: Module | null;
  activeSubModule: SubModule | null;
  onRefreshData: () => void;
  updateTestCase: (id: string, data: Partial<TestCase>) => Promise<void>;
  projectId: string;
  isLoading?: boolean;
}

export default function TaskBoard({
  testCases,
  activeModule,
  activeSubModule,
  onRefreshData,
  updateTestCase,
  projectId,
  isLoading = false,
}: TaskBoardProps) {
  const [activeCard, setActiveCard] = useState<TestCase | null>(null);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const getColumnCards = (status: string): TestCase[] => {
    return testCases.filter((tc) => tc.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const testCase = testCases.find((tc) => tc.id === active.id);
    if (testCase) {
      setActiveCard(testCase);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    let targetStatus: string | null = null;

    // Check if dropped on a column
    const column = COLUMNS.find((col) => col.id === overId);
    if (column) {
      targetStatus = column.id;
    } else {
      // Dropped on another card
      const overTestCase = testCases.find((tc) => tc.id === overId);
      if (overTestCase) {
        targetStatus = overTestCase.status;
      }
    }

    if (targetStatus) {
      const testCase = testCases.find((tc) => tc.id === activeId);
      if (testCase && testCase.status !== targetStatus) {
        await updateTestCase(activeId, { status: targetStatus as TestCase["status"] });
        onRefreshData();
      }
    }
  };

  const handleCreateTask = async (data: {
    title: string;
    category: TestCaseCategory;
    expectedResult: string;
    steps: string[];
  }) => {
    setIsSubmitting(true);
    try {
      await saveTestCase({
        projectId,
        moduleId: activeModule?.id || null,
        subModuleId: activeSubModule?.id || null,
        moduleName: activeModule?.name || null,
        title: data.title,
        category: data.category,
        preconditions: "",
        steps: data.steps.length > 0 ? data.steps : [],
        expectedResult: data.expectedResult,
        executionResult: "untested",
        sourceType: "manual",
        provider: "manual-authoring",
        status: "pending",
        tags: ["Task"],
      });
      setIsCreateModalOpen(false);
      onRefreshData();
    } catch (error) {
      console.error("Failed to create task:", error);
      alert("Failed to create task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: TestCase["status"]) => {
    await updateTestCase(id, { status });
    setSelectedCase((prev) => (prev ? { ...prev, status } : null));
    onRefreshData();
  };

  // Loading state when switching modules
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0a0d14]">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">Loading Tasks...</h3>
        <p className="text-xs text-gray-500">Fetching data for this module</p>
      </div>
    );
  }

  // Empty state - no module/submodule selected
  if (!activeModule) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
          <Layers className="w-7 h-7 text-indigo-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Select a Module to View Tasks
        </h3>
        <p className="text-sm text-slate-500 dark:text-gray-400 max-w-md mb-4">
          To view and manage tasks, please select a module from the sidebar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0d14]">
      {/* Board Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-800/80 bg-[#0a0d14]/80 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            {activeSubModule ? activeSubModule.name : activeModule?.name}
            <span className="text-gray-500 font-normal">Task Board</span>
          </h2>
          <span className="w-px h-4 bg-gray-700/60" />
          <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
            {testCases.length} tasks
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md hover:shadow-lg hover:shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </button>
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-gray-500">
            <GripVertical className="w-3 h-3" />
            <span>Drag cards to update status</span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div
        className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4 kanban-scroll"
        onWheel={(e) => {
          if (e.shiftKey) {
            e.preventDefault();
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 h-full" style={{ minWidth: "max-content" }}>
            {COLUMNS.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                cards={getColumnCards(column.id)}
                onCardClick={setSelectedCase}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCard ? <DragOverlayCard testCase={activeCard} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Details Modal */}
      <TaskDetailsModal
        testCase={selectedCase}
        isOpen={selectedCase !== null}
        onClose={() => setSelectedCase(null)}
        onStatusChange={handleStatusChange}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTask}
        isSubmitting={isSubmitting}
      />

      {/* Modal entrance animations */}
      <style jsx global>{`
        @keyframes modal-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-modal-backdrop-in {
          animation: modal-backdrop-in 0.15s ease-out;
        }
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-in {
          animation: modal-in 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}