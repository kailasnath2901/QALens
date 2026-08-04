"use client";

import React, { useState, useRef } from "react";
import { X, UserCircle, Upload, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "@/lib/upload";
import Image from "next/image";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { userProfile, updateUserProfile, isDemoUser } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || "");
  const [role, setRole] = useState(userProfile?.role || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    if (isDemoUser) {
      alert("Demo users cannot upload profile pictures.");
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // If they already have a photo, delete it first
        if (userProfile.photoURL && userProfile.photoURL.includes("cloudinary.com")) {
          await deleteImageFromCloudinary(userProfile.photoURL);
        }

        // Upload to cloudinary with folder structure
        const imageUrl = await uploadImageToCloudinary(
          base64String,
          `qalens/${userProfile.uid}/profile-image`
        );
        await updateUserProfile({ photoURL: imageUrl });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Check console for details.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (isDemoUser) {
      alert("Demo users cannot edit profile details.");
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile({ displayName, role });
      onClose();
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-gray-800"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <UserCircle className="w-6 h-6 text-indigo-400" />
          Edit Profile
        </h2>

        <div className="flex flex-col items-center mb-6">
          <div className="relative w-24 h-24 mb-3 rounded-full border-4 border-slate-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950 flex items-center justify-center">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            ) : userProfile?.photoURL ? (
              <Image src={userProfile.photoURL} alt="Profile" fill className="object-cover" />
            ) : (
              <UserCircle className="w-12 h-12 text-gray-600" />
            )}
            
            {!isUploading && !isDemoUser && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Upload className="w-6 h-6 text-slate-900 dark:text-white" />
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <p className="text-xs text-slate-400 dark:text-gray-500">Click image to upload new avatar</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              placeholder="e.g. John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-gray-300 mb-1.5">
              Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              placeholder="e.g. QA Lead, Product Manager"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-300 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isDemoUser}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 text-slate-900 dark:text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
