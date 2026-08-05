"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserProfile } from "@/types";

interface AuthContextType {
  user: User | { uid: string; email: string; displayName: string; photoURL?: string } | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isDemoUser: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  enableDemoUser: () => void;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | { uid: string; email: string; displayName: string; photoURL?: string } | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(false);

  const loadExtendedProfile = async (uid: string, fallbackName: string | null, photoURL?: string | null, email?: string | null) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const stored = userDocSnap.data();
        setUserProfile({
          uid,
          email: email || stored.email || "",
          displayName: fallbackName || stored.displayName || "",
          photoURL: photoURL || stored.photoURL || "",
          role: stored.role || "",
          createdAt: stored.createdAt || Date.now()
        });
      } else {
        const newProfile = {
          uid,
          email: email || "",
          displayName: fallbackName || "",
          photoURL: photoURL || "",
          role: "",
          createdAt: Date.now()
        };
        setUserProfile(newProfile);
        // Save initial profile
        await setDoc(userDocRef, newProfile);
      }
    } catch {
      setUserProfile({ uid, email: email || "", displayName: fallbackName || "", photoURL: photoURL || "", role: "", createdAt: Date.now() });
    }
  };

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          loadExtendedProfile(firebaseUser.uid, firebaseUser.displayName, firebaseUser.photoURL, firebaseUser.email);
          setIsDemoUser(false);
        } else if (!isDemoUser) {
          setUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } catch {
      setUser(null);
      setUserProfile(null);
      setLoading(false);
    }
  }, [isDemoUser]);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setIsDemoUser(false);
    } finally {
      setLoading(false);
    }
  };

  const signupWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      setIsDemoUser(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setUser(null);
    setUserProfile(null);
    setIsDemoUser(false);
    setLoading(false);
  };

  const enableDemoUser = () => {
    const demoData = {
      uid: "demo_user_123",
      email: "qa.lead@qasuite.dev",
      displayName: "Lead QA Engineer",
      photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo"
    };
    setUser(demoData);
    setUserProfile({
      ...demoData,
      role: "QA Lead",
      createdAt: Date.now()
    });
    setIsDemoUser(true);
    setLoading(false);
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    
    // Update Firebase Auth if applicable
    if (updates.displayName || updates.photoURL) {
      if (user && "updateProfile" in user && typeof updateProfile === "function") {
        try {
          await updateProfile(user as User, {
            displayName: updates.displayName || user.displayName,
            photoURL: updates.photoURL || user.photoURL
          });
        } catch (e) {
          console.error("Failed to update firebase profile", e);
        }
      }
    }

    // Update local context and storage
    const newProfile = { ...userProfile, ...updates } as UserProfile;
    setUserProfile(newProfile);
    
    // Also merge into `user` state if it's the simple object
    if (user && !("updateProfile" in user)) {
      setUser({ ...user, ...updates } as any);
    }

    try {
      await setDoc(doc(db, "users", user.uid), newProfile, { merge: true });
    } catch (e) {
      console.error("Failed to save profile to Firestore", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isDemoUser,
        loginWithEmail,
        signupWithEmail,
        logout,
        enableDemoUser,
        updateUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
