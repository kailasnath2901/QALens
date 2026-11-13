export type AccountStatus = "pending" | "approved" | "rejected";

export interface UserFeatures {
  enableTony: boolean;
  enableTonyVoice: boolean;
  enableTonyChat: boolean;
  enableGemini: boolean;
  enableGroq: boolean;
  maxProjects?: number;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role?: "admin" | "user" | string;
  status?: AccountStatus;
  features?: UserFeatures;
  createdAt: number;
  approvedAt?: number | null;
  approvedBy?: string | null;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  createdAt: number;
  testCaseCount?: number;
}

export interface ProjectDoc {
  id: string;
  projectId: string;
  moduleId?: string | null;
  subModuleId?: string | null;
  title: string;
  content: string;
  updatedAt: number;
  createdAt: number;
}

export interface Module {
  id: string;
  projectId: string;
  name: string;
  description: string;
  testCaseCount: number;
  createdAt: number;
}

export interface SubModule {
  id: string;
  moduleId: string;
  projectId: string;
  name: string;
  description: string;
  testCaseCount: number;
  createdAt: number;
}

export interface TestCaseStep {
  stepNumber: number;
  action: string;
  data?: string;
}

export type TestCaseCategory = "input_validation" | "empty_states" | "error_handling" | "boundary_values" | "accessibility" | "functional";

export interface TestCase {
  id: string;
  projectId: string;
  moduleId?: string | null;
  subModuleId?: string | null;
  moduleName?: string | null;
  title: string;
  category: TestCaseCategory;
  preconditions?: string | null;
  testData?: string | null;
  steps: string[];
  expectedResult: string;
  executionResult?: "pass" | "fail" | "untested" | null;
  comments?: string | null;
  sourceType: "image" | "text" | "manual";
  sourceUrl?: string | null;
  provider: string;
  status: "pending" | "in_progress" | "draft" | "reviewed" | "approved" | "done";
  createdAt: number;
  tags?: string[];
}

export interface StructuredContext {
  summary: string;
  uiElements?: string[];
  forms?: string[];
  entities?: string[];
  userFlows?: string[];
  keyRequirements?: string[];
}

export interface ChatMessage {
  id: string;
  projectId: string;
  moduleId?: string | null;
  subModuleId?: string | null;
  sender: "user" | "ai";
  content: string;
  sourceType?: "image" | "text";
  sourceUrl?: string | null;
  provider?: string;
  structuredContext?: StructuredContext | null;
  generatedCases?: Omit<TestCase, "id" | "projectId" | "createdAt">[];
  timestamp: number;
  pipelineStep?: "done" | "extracting" | "generating";
  responseTo?: string | null;
}

export interface UsageLog {
  id: string;
  userId: string;
  provider: string;
  timestamp: number;
  type: "image" | "text";
}

export interface ProviderInfo {
  id: string;
  name: string;
  rpm: number;
  rpd: number;
  supportsVision: boolean;
  supportsText: boolean;
  badge: string;
  description: string;
}
