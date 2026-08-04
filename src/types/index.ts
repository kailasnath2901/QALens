export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role?: string;
  createdAt: number;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  createdAt: number;
  testCaseCount?: number;
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
  moduleName?: string;
  title: string;
  category: TestCaseCategory;
  preconditions?: string;
  testData?: string;
  steps: string[];
  expectedResult: string;
  executionResult?: "pass" | "fail" | "untested";
  comments?: string;
  sourceType: "image" | "text" | "manual";
  sourceUrl?: string | null;
  provider: string;
  status: "draft" | "reviewed" | "approved";
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
  sender: "user" | "ai";
  content: string;
  sourceType?: "image" | "text";
  sourceUrl?: string | null;
  provider?: string;
  structuredContext?: StructuredContext;
  generatedCases?: Omit<TestCase, "id" | "projectId" | "createdAt">[];
  timestamp: number;
  pipelineStep?: "done" | "extracting" | "generating";
  responseTo?: string;
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
