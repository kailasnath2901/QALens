import { Project, TestCase, ChatMessage } from "@/types";
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
