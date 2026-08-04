"use client";

import React from "react";
import Image from "next/image";

export function AceternityLoader() {
  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center">
      <div className="relative flex flex-col items-center gap-6">
        {/* Logo with spinning ring */}
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-gray-800" />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 border-r-indigo-500 animate-spin"
            style={{ animationDuration: "1s" }}
          />
          <div className="absolute inset-2 flex items-center justify-center">
            <Image
              src="/images/qalens_logo.svg"
              alt="QAlens"
              width={40}
              height={40}
              className="w-10 h-10 object-contain animate-pulse-soft"
              priority
            />
          </div>
        </div>

        {/* Wordmark */}
        <p className="text-sm font-medium text-gray-400 tracking-wide animate-pulse-soft">
          QAlens
        </p>
      </div>

      <style jsx global>{`
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse-soft {
          animation: pulse-soft 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}