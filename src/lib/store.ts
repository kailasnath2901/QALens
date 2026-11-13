import { Project, TestCase, ChatMessage, Module, SubModule, UserProfile, ProjectDoc } from "@/types";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  getDoc
} from "firebase/firestore";
import { deleteImageFromCloudinary } from "@/lib/upload";

const PROJECTS_COLLECTION = "projects";
const TESTCASES_COLLECTION = "testcases";
const CHATS_COLLECTION = "chats";
const MODULES_COLLECTION = "modules";
const SUBMODULES_COLLECTION = "submodules";

export async function getProjects(userId: string): Promise<Project[]> {
  try {
    const q = query(
      collection(db, PROJECTS_COLLECTION),
      where("ownerId", "==", userId)
    );
    const snapshot = await getDocs(q);
    const projects: Project[] = [];
    snapshot.forEach((docSnap) => {
      projects.push(docSnap.data() as Project);
    });
    // Sort locally by createdAt descending
    return projects.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error getting projects:", error);
    return [];
  }
}

export async function saveProject(project: Omit<Project, "id" | "createdAt">): Promise<Project> {
  const newId = `proj_${Date.now()}`;
  const newProj: Project = {
    ...project,
    id: newId,
    createdAt: Date.now(),
    testCaseCount: 0
  };

  try {
    await setDoc(doc(db, PROJECTS_COLLECTION, newId), newProj);
    return newProj;
  } catch (error) {
    console.error("Error saving project:", error);
    throw error;
  }
}

export async function getProjectTestCases(projectId: string): Promise<TestCase[]> {
  try {
    const q = query(
      collection(db, TESTCASES_COLLECTION),
      where("projectId", "==", projectId)
    );
    const snapshot = await getDocs(q);
    const testCases: TestCase[] = [];
    snapshot.forEach((docSnap) => {
      testCases.push(docSnap.data() as TestCase);
    });
    // Sort locally by createdAt descending
    return testCases.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error getting test cases:", error);
    return [];
  }
}

export async function saveTestCase(testCase: Omit<TestCase, "id" | "createdAt">): Promise<TestCase> {
  const newId = `tc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newCase: TestCase = {
    ...testCase,
    id: newId,
    createdAt: Date.now()
  };

  try {
    await setDoc(doc(db, TESTCASES_COLLECTION, newId), newCase);
    
    // Update testCaseCount in the project doc
    const projectRef = doc(db, PROJECTS_COLLECTION, testCase.projectId);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
      const projData = projectSnap.data() as Project;
      await updateDoc(projectRef, {
        testCaseCount: (projData.testCaseCount || 0) + 1
      });
    }

    return newCase;
  } catch (error) {
    console.error("Error saving test case:", error);
    throw error;
  }
}

export async function updateTestCase(caseId: string, updates: Partial<Omit<TestCase, "id" | "projectId" | "createdAt">>): Promise<void> {
  try {
    const caseRef = doc(db, TESTCASES_COLLECTION, caseId);
    await updateDoc(caseRef, updates);
  } catch (error) {
    console.error("Error updating test case:", error);
    throw error;
  }
}

export async function deleteTestCase(caseId: string, projectId: string): Promise<void> {
  try {
    const caseRef = doc(db, TESTCASES_COLLECTION, caseId);
    const caseSnap = await getDoc(caseRef);
    if (caseSnap.exists()) {
      const caseData = caseSnap.data() as TestCase;
      if (caseData.sourceUrl && caseData.sourceUrl.includes("cloudinary.com")) {
        await deleteImageFromCloudinary(caseData.sourceUrl);
      }
    }

    await deleteDoc(caseRef);
    
    // Decrement testCaseCount in the project doc
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
      const projData = projectSnap.data() as Project;
      await updateDoc(projectRef, {
        testCaseCount: Math.max(0, (projData.testCaseCount || 0) - 1)
      });
    }
  } catch (error) {
    console.error("Error deleting test case:", error);
    throw error;
  }
}

export async function getProjectChats(projectId: string): Promise<ChatMessage[]> {
  try {
    const q = query(
      collection(db, CHATS_COLLECTION),
      where("projectId", "==", projectId)
    );
    const snapshot = await getDocs(q);
    const chats: ChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      chats.push(docSnap.data() as ChatMessage);
    });
    // Sort locally by timestamp ascending
    return chats.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error("Error getting chats:", error);
    return [];
  }
}

export async function saveChatMessage(chat: Omit<ChatMessage, "id" | "timestamp">): Promise<ChatMessage> {
  const newId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newChat: ChatMessage = {
    ...chat,
    id: newId,
    timestamp: Date.now()
  };

  try {
    await setDoc(doc(db, CHATS_COLLECTION, newId), newChat);
    return newChat;
  } catch (error) {
    console.error("Error saving chat message:", error);
    throw error;
  }
}

export async function deleteChatMessage(chatId: string): Promise<void> {
  try {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      const chatData = chatSnap.data() as ChatMessage;

      // 1. If it is a user message, find and delete the linked AI response
      if (chatData.sender === "user") {
        const q = query(
          collection(db, CHATS_COLLECTION),
          where("responseTo", "==", chatId)
        );
        const snapshot = await getDocs(q);
        const deletePromises: Promise<void>[] = [];
        snapshot.forEach((docSnap) => {
          deletePromises.push(deleteChatMessage(docSnap.id));
        });
        await Promise.all(deletePromises);
      }

      // 2. Delete screenshot if stored in Cloudinary
      if (chatData.sourceUrl && chatData.sourceUrl.includes("cloudinary.com")) {
        await deleteImageFromCloudinary(chatData.sourceUrl);
      }
    }

    // 3. Delete the message itself
    await deleteDoc(chatRef);
  } catch (error) {
    console.error("Error deleting chat message:", error);
    throw error;
  }
}

// ─── Module CRUD ─────────────────────────────────────────────────────────────

export async function saveModule(module: Omit<Module, "id" | "createdAt" | "testCaseCount">): Promise<Module> {
  const newId = `mod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newModule: Module = {
    ...module,
    id: newId,
    testCaseCount: 0,
    createdAt: Date.now()
  };

  try {
    await setDoc(doc(db, MODULES_COLLECTION, newId), newModule);
    return newModule;
  } catch (error) {
    console.error("Error saving module:", error);
    throw error;
  }
}

export async function getModules(projectId: string): Promise<Module[]> {
  try {
    const q = query(
      collection(db, MODULES_COLLECTION),
      where("projectId", "==", projectId)
    );
    const snapshot = await getDocs(q);
    const modules: Module[] = [];
    snapshot.forEach((docSnap) => {
      modules.push(docSnap.data() as Module);
    });
    return modules.sort((a, b) => a.createdAt - b.createdAt);
  } catch (error) {
    console.error("Error getting modules:", error);
    return [];
  }
}

export async function updateModule(moduleId: string, updates: Partial<Omit<Module, "id" | "projectId" | "createdAt">>): Promise<void> {
  try {
    const moduleRef = doc(db, MODULES_COLLECTION, moduleId);
    await updateDoc(moduleRef, updates);
  } catch (error) {
    console.error("Error updating module:", error);
    throw error;
  }
}

export async function deleteModule(moduleId: string, projectId: string): Promise<void> {
  try {
    // Get all submodules in this module
    const subModules = await getSubModules(moduleId);
    
    // Delete each submodule (which will cascade delete its testcases and chats)
    for (const subMod of subModules) {
      await deleteSubModule(subMod.id, projectId);
    }

    // Get test cases directly in this module (not in submodules)
    const tcQuery = query(
      collection(db, TESTCASES_COLLECTION),
      where("moduleId", "==", moduleId)
    );
    const tcSnapshot = await getDocs(tcQuery);
    const deleteTcPromises: Promise<void>[] = [];
    tcSnapshot.forEach((docSnap) => {
      const tcData = docSnap.data() as TestCase;
      if (tcData.sourceUrl && tcData.sourceUrl.includes("cloudinary.com")) {
        deleteTcPromises.push(deleteImageFromCloudinary(tcData.sourceUrl));
      }
      deleteTcPromises.push(deleteDoc(doc(db, TESTCASES_COLLECTION, docSnap.id)));
    });
    await Promise.all(deleteTcPromises);

    // Delete chats directly in this module
    const chatQuery = query(
      collection(db, CHATS_COLLECTION),
      where("moduleId", "==", moduleId)
    );
    const chatSnapshot = await getDocs(chatQuery);
    const deleteChatPromises: Promise<void>[] = [];
    chatSnapshot.forEach((docSnap) => {
      deleteChatPromises.push(deleteDoc(doc(db, CHATS_COLLECTION, docSnap.id)));
    });
    await Promise.all(deleteChatPromises);

    // Update project testCaseCount
    const allTcQuery = query(
      collection(db, TESTCASES_COLLECTION),
      where("projectId", "==", projectId)
    );
    const allTcSnapshot = await getDocs(allTcQuery);
    await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), {
      testCaseCount: allTcSnapshot.size
    });

    // Delete the module itself
    await deleteDoc(doc(db, MODULES_COLLECTION, moduleId));
  } catch (error) {
    console.error("Error deleting module:", error);
    throw error;
  }
}

// ─── SubModule CRUD ──────────────────────────────────────────────────────────

export async function saveSubModule(subModule: Omit<SubModule, "id" | "createdAt" | "testCaseCount">): Promise<SubModule> {
  const newId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newSubModule: SubModule = {
    ...subModule,
    id: newId,
    testCaseCount: 0,
    createdAt: Date.now()
  };

  try {
    await setDoc(doc(db, SUBMODULES_COLLECTION, newId), newSubModule);
    return newSubModule;
  } catch (error) {
    console.error("Error saving sub module:", error);
    throw error;
  }
}

export async function getSubModules(moduleId: string): Promise<SubModule[]> {
  try {
    const q = query(
      collection(db, SUBMODULES_COLLECTION),
      where("moduleId", "==", moduleId)
    );
    const snapshot = await getDocs(q);
    const subModules: SubModule[] = [];
    snapshot.forEach((docSnap) => {
      subModules.push(docSnap.data() as SubModule);
    });
    return subModules.sort((a, b) => a.createdAt - b.createdAt);
  } catch (error) {
    console.error("Error getting sub modules:", error);
    return [];
  }
}

export async function updateSubModule(subModuleId: string, updates: Partial<Omit<SubModule, "id" | "moduleId" | "projectId" | "createdAt">>): Promise<void> {
  try {
    const subModuleRef = doc(db, SUBMODULES_COLLECTION, subModuleId);
    await updateDoc(subModuleRef, updates);
  } catch (error) {
    console.error("Error updating sub module:", error);
    throw error;
  }
}

export async function deleteSubModule(subModuleId: string, projectId: string): Promise<void> {
  try {
    // Get all test cases in this submodule
    const tcQuery = query(
      collection(db, TESTCASES_COLLECTION),
      where("subModuleId", "==", subModuleId)
    );
    const tcSnapshot = await getDocs(tcQuery);
    const deleteTcPromises: Promise<void>[] = [];
    tcSnapshot.forEach((docSnap) => {
      const tcData = docSnap.data() as TestCase;
      if (tcData.sourceUrl && tcData.sourceUrl.includes("cloudinary.com")) {
        deleteTcPromises.push(deleteImageFromCloudinary(tcData.sourceUrl));
      }
      deleteTcPromises.push(deleteDoc(doc(db, TESTCASES_COLLECTION, docSnap.id)));
    });
    await Promise.all(deleteTcPromises);

    // Get all chats in this submodule
    const chatQuery = query(
      collection(db, CHATS_COLLECTION),
      where("subModuleId", "==", subModuleId)
    );
    const chatSnapshot = await getDocs(chatQuery);
    const deleteChatPromises: Promise<void>[] = [];
    chatSnapshot.forEach((docSnap) => {
      deleteChatPromises.push(deleteDoc(doc(db, CHATS_COLLECTION, docSnap.id)));
    });
    await Promise.all(deleteChatPromises);

    // Update project testCaseCount
    const allTcQuery = query(
      collection(db, TESTCASES_COLLECTION),
      where("projectId", "==", projectId)
    );
    const allTcSnapshot = await getDocs(allTcQuery);
    await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), {
      testCaseCount: allTcSnapshot.size
    });

    // Delete the submodule itself
    await deleteDoc(doc(db, SUBMODULES_COLLECTION, subModuleId));
  } catch (error) {
    console.error("Error deleting sub module:", error);
    throw error;
  }
}

// ─── Get TestCases by SubModule ──────────────────────────────────────────────

export async function getSubModuleTestCases(subModuleId: string): Promise<TestCase[]> {
  try {
    const q = query(
      collection(db, TESTCASES_COLLECTION),
      where("subModuleId", "==", subModuleId)
    );
    const snapshot = await getDocs(q);
    const testCases: TestCase[] = [];
    snapshot.forEach((docSnap) => {
      testCases.push(docSnap.data() as TestCase);
    });
    return testCases.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error getting sub module test cases:", error);
    return [];
  }
}

export async function getSubModuleChats(subModuleId: string): Promise<ChatMessage[]> {
  try {
    const q = query(
      collection(db, CHATS_COLLECTION),
      where("subModuleId", "==", subModuleId)
    );
    const snapshot = await getDocs(q);
    const chats: ChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      chats.push(docSnap.data() as ChatMessage);
    });
    return chats.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error("Error getting sub module chats:", error);
    return [];
  }
}

// ─── Get Module-level TestCases (not in submodules) ──────────────────────────

export async function getModuleTestCases(moduleId: string): Promise<TestCase[]> {
  try {
    // Get test cases that are directly in this module (moduleId matches, subModuleId is undefined/null)
    const q = query(
      collection(db, TESTCASES_COLLECTION),
      where("moduleId", "==", moduleId)
    );
    const snapshot = await getDocs(q);
    const testCases: TestCase[] = [];
    snapshot.forEach((docSnap) => {
      const tc = docSnap.data() as TestCase;
      // Only include test cases that are directly in this module (not in a submodule)
      if (!tc.subModuleId) {
        testCases.push(tc);
      }
    });
    return testCases.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error getting module test cases:", error);
    return [];
  }
}

export async function getModuleChats(moduleId: string): Promise<ChatMessage[]> {
  try {
    // Get chats that are directly in this module (moduleId matches, subModuleId is undefined/null)
    const q = query(
      collection(db, CHATS_COLLECTION),
      where("moduleId", "==", moduleId)
    );
    const snapshot = await getDocs(q);
    const chats: ChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      const chat = docSnap.data() as ChatMessage;
      // Only include chats that are directly in this module (not in a submodule)
      if (!chat.subModuleId) {
        chats.push(chat);
      }
    });
    return chats.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error("Error getting module chats:", error);
    return [];
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  try {
    // Get all modules in this project
    const modules = await getModules(projectId);
    
    // Delete each module (which will cascade delete submodules and their data)
    for (const mod of modules) {
      await deleteModule(mod.id, projectId);
    }

    // Get any test cases not assigned to a module
    const tcQuery = query(
      collection(db, TESTCASES_COLLECTION),
      where("projectId", "==", projectId)
    );
    const tcSnapshot = await getDocs(tcQuery);
    const deleteTcPromises: Promise<void>[] = [];
    tcSnapshot.forEach((docSnap) => {
      const tcData = docSnap.data() as TestCase;
      if (tcData.sourceUrl && tcData.sourceUrl.includes("cloudinary.com")) {
        deleteTcPromises.push(deleteImageFromCloudinary(tcData.sourceUrl));
      }
      deleteTcPromises.push(deleteDoc(doc(db, TESTCASES_COLLECTION, docSnap.id)));
    });
    await Promise.all(deleteTcPromises);

    // Delete any chats not assigned to a module
    const chatQuery = query(
      collection(db, CHATS_COLLECTION),
      where("projectId", "==", projectId)
    );
    const chatSnapshot = await getDocs(chatQuery);
    const deleteChatPromises: Promise<void>[] = [];
    chatSnapshot.forEach((docSnap) => {
      deleteChatPromises.push(deleteDoc(doc(db, CHATS_COLLECTION, docSnap.id)));
    });
    await Promise.all(deleteChatPromises);

    // Delete the project itself
    await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId));
  } catch (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
}

// ─── Cleanup: Delete all data for fresh start ────────────────────────────────

export async function deleteAllData(userId: string): Promise<{ deleted: { projects: number; modules: number; subModules: number; testCases: number; chats: number } }> {
  try {
    const counts = { projects: 0, modules: 0, subModules: 0, testCases: 0, chats: 0 };

    // Get all projects for this user
    const projectsQuery = query(
      collection(db, PROJECTS_COLLECTION),
      where("ownerId", "==", userId)
    );
    const projectsSnapshot = await getDocs(projectsQuery);

    for (const projDoc of projectsSnapshot.docs) {
      const projectId = projDoc.id;

      // Delete all test cases for this project
      const tcQuery = query(collection(db, TESTCASES_COLLECTION), where("projectId", "==", projectId));
      const tcSnapshot = await getDocs(tcQuery);
      for (const tcDoc of tcSnapshot.docs) {
        const tcData = tcDoc.data() as TestCase;
        if (tcData.sourceUrl && tcData.sourceUrl.includes("cloudinary.com")) {
          await deleteImageFromCloudinary(tcData.sourceUrl).catch(() => {});
        }
        await deleteDoc(doc(db, TESTCASES_COLLECTION, tcDoc.id));
        counts.testCases++;
      }

      // Delete all chats for this project
      const chatQuery = query(collection(db, CHATS_COLLECTION), where("projectId", "==", projectId));
      const chatSnapshot = await getDocs(chatQuery);
      for (const chatDoc of chatSnapshot.docs) {
        const chatData = chatDoc.data() as ChatMessage;
        if (chatData.sourceUrl && chatData.sourceUrl.includes("cloudinary.com")) {
          await deleteImageFromCloudinary(chatData.sourceUrl).catch(() => {});
        }
        await deleteDoc(doc(db, CHATS_COLLECTION, chatDoc.id));
        counts.chats++;
      }

      // Delete all submodules for this project
      const subModQuery = query(collection(db, SUBMODULES_COLLECTION), where("projectId", "==", projectId));
      const subModSnapshot = await getDocs(subModQuery);
      for (const subModDoc of subModSnapshot.docs) {
        await deleteDoc(doc(db, SUBMODULES_COLLECTION, subModDoc.id));
        counts.subModules++;
      }

      // Delete all modules for this project
      const modQuery = query(collection(db, MODULES_COLLECTION), where("projectId", "==", projectId));
      const modSnapshot = await getDocs(modQuery);
      for (const modDoc of modSnapshot.docs) {
        await deleteDoc(doc(db, MODULES_COLLECTION, modDoc.id));
        counts.modules++;
      }

      // Delete the project itself
      await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId));
      counts.projects++;
    }

    return { deleted: counts };
  } catch (error) {
    console.error("Error deleting all data:", error);
    throw error;
  }
}

const DOCS_COLLECTION = "project_docs";

export async function getProjectDocs(projectId: string, moduleId?: string | null, subModuleId?: string | null): Promise<ProjectDoc[]> {
  try {
    const q = query(collection(db, DOCS_COLLECTION), where("projectId", "==", projectId));
    const snapshot = await getDocs(q);
    const docsList: ProjectDoc[] = [];
    snapshot.forEach((snap) => {
      const data = snap.data() as ProjectDoc;
      if (subModuleId) {
        if (data.subModuleId === subModuleId) docsList.push(data);
      } else if (moduleId) {
        if (data.moduleId === moduleId) docsList.push(data);
      } else {
        docsList.push(data);
      }
    });
    return docsList.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error("Error fetching project docs:", error);
    return [];
  }
}

export async function saveProjectDoc(docData: Omit<ProjectDoc, "id" | "createdAt" | "updatedAt">): Promise<ProjectDoc> {
  const newId = `doc_${Date.now()}`;
  const now = Date.now();
  const newDoc: ProjectDoc = {
    ...docData,
    id: newId,
    createdAt: now,
    updatedAt: now
  };
  await setDoc(doc(db, DOCS_COLLECTION, newId), newDoc);
  return newDoc;
}

export async function updateProjectDoc(docId: string, updates: Partial<Pick<ProjectDoc, "title" | "content">>): Promise<void> {
  const docRef = doc(db, DOCS_COLLECTION, docId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Date.now()
  });
}

export async function deleteProjectDoc(docId: string): Promise<void> {
  await deleteDoc(doc(db, DOCS_COLLECTION, docId));
}

// ==========================================
// ADMIN DASHBOARD FUNCTIONS
// ==========================================
const USERS_COLLECTION = "users";

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const snapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users: UserProfile[] = [];
    snapshot.forEach((docSnap) => {
      users.push(docSnap.data() as UserProfile);
    });
    return users.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error fetching all users for admin:", error);
    return [];
  }
}

export async function updateUserStatus(
  uid: string,
  status: "pending" | "approved" | "rejected",
  adminEmail: string
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      status,
      approvedAt: status === "approved" ? Date.now() : null,
      approvedBy: adminEmail
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    throw error;
  }
}

export async function updateUserFeatures(
  uid: string,
  features: Partial<UserProfile["features"]>
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const current = snap.data() as UserProfile;
      await updateDoc(userRef, {
        features: {
          ...(current.features || { enableTony: true, enableGemini: true, enableGroq: true, maxProjects: 10 }),
          ...features
        }
      });
    }
  } catch (error) {
    console.error("Error updating user features:", error);
    throw error;
  }
}

export async function updateUserRole(uid: string, role: "admin" | "user"): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, { role });
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
}

export async function deleteUserAccount(uid: string): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await deleteDoc(userRef);
  } catch (error) {
    console.error("Error deleting user account:", error);
    throw error;
  }
}

export async function updateUserProjectLimit(uid: string, maxProjects: number): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const current = snap.data() as UserProfile;
      await updateDoc(userRef, {
        features: {
          ...(current.features || { enableTony: false, enableTonyVoice: false, enableTonyChat: false, enableGemini: false, enableGroq: false }),
          maxProjects
        }
      });
    }
  } catch (error) {
    console.error("Error updating user project limit:", error);
    throw error;
  }
}

export async function getSystemReportStats() {
  try {
    const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
    const projectsSnap = await getDocs(collection(db, PROJECTS_COLLECTION));
    const testCasesSnap = await getDocs(collection(db, TESTCASES_COLLECTION));
    const modulesSnap = await getDocs(collection(db, MODULES_COLLECTION));

    let passedCases = 0;
    let failedCases = 0;
    let untestedCases = 0;

    testCasesSnap.forEach(d => {
      const tc = d.data();
      if (tc.executionResult === "pass") passedCases++;
      else if (tc.executionResult === "fail") failedCases++;
      else untestedCases++;
    });

    return {
      totalUsers: usersSnap.size,
      totalProjects: projectsSnap.size,
      totalModules: modulesSnap.size,
      totalTestCases: testCasesSnap.size,
      executionStats: {
        pass: passedCases,
        fail: failedCases,
        untested: untestedCases
      }
    };
  } catch (err) {
    console.error("Error fetching system report stats:", err);
    return null;
  }
}
