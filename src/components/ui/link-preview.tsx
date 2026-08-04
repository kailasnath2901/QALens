"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export const LinkPreview = ({
  url,
  className,
  children,
}: {
  url: string;
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <span className="group relative inline-block">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("relative z-10 transition-colors duration-200", className)}
      >
        {children}
      </a>
      
      {/* Tooltip Card */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 translate-y-2">
        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl shadow-indigo-500/20">
          <div className="flex h-28 w-full flex-col items-center justify-center bg-gray-950 p-2 text-center">
            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">Link Preview</span>
            <span className="text-xs text-gray-300 break-all">{url.replace("https://", "").replace("http://", "")}</span>
          </div>
        </div>
      </div>
    </span>
  );
};
