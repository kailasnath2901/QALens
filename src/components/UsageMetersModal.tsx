"use client";

import React, { useEffect, useState } from "react";
import { X, Gauge, AlertCircle, RefreshCw, Sparkles, Cpu } from "lucide-react";
import providerLimits from "@/config/providerLimits.json";
import { calculateProviderStats, ProviderQuotaStats } from "@/lib/usageTracker";

interface UsageMetersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UsageMetersModal({ isOpen, onClose }: UsageMetersModalProps) {
  const [stats, setStats] = useState<Record<string, ProviderQuotaStats>>({});

  const refreshStats = () => {
    setStats(calculateProviderStats());
  };

  useEffect(() => {
    if (isOpen) {
      refreshStats();
      const timer = setInterval(refreshStats, 3000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl relative glow-cyan max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Live AI Provider Quotas & Meters
              </h2>
              <p className="text-xs text-gray-400">
                Track Requests Per Minute (RPM) & Requests Per Day (RPD)
              </p>
            </div>
          </div>

          <button
            onClick={refreshStats}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Meters Grid */}
        <div className="space-y-4">
          {providerLimits.providers.map((prov) => {
            const st = stats[prov.id] || {
              rpmUsed: 0,
              rpmLimit: prov.rpm,
              rpdUsed: 0,
              rpdLimit: prov.rpd,
              rpmPercent: 0,
              rpdPercent: 0,
              isCoolingDown: false
            };

            return (
              <div
                key={prov.id}
                className="bg-gray-950 border border-gray-800 rounded-xl p-4 transition-all hover:border-gray-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    <div>
                      <span className="font-semibold text-sm text-white">{prov.name}</span>
                      <span className="ml-2 text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700">
                        {prov.badge}
                      </span>
                    </div>
                  </div>

                  {st.isCoolingDown ? (
                    <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Cooling Down (Rate Limit)
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                      Active / Ready
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400 mb-3">{prov.description}</p>

                {/* Progress Meters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* RPM Progress */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">RPM (Last 60s)</span>
                      <span className="font-mono text-gray-200">{st.rpmUsed} / {st.rpmLimit}</span>
                    </div>
                    <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
                      <div
                        className={`h-full transition-all duration-500 ${
                          st.rpmPercent > 80 ? "bg-amber-500" : "bg-indigo-500"
                        }`}
                        style={{ width: `${st.rpmPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* RPD Progress */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">RPD (Today UTC)</span>
                      <span className="font-mono text-gray-200">{st.rpdUsed} / {st.rpdLimit}</span>
                    </div>
                    <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
                      <div
                        className={`h-full transition-all duration-500 ${
                          st.rpdPercent > 80 ? "bg-amber-500" : "bg-cyan-500"
                        }`}
                        style={{ width: `${st.rpdPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info note */}
        <div className="mt-5 p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-start gap-2">
          <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Free-tier limits are updated automatically in <code>providerLimits.json</code>. On 429 rate limit errors, QAlens auto-switches to the next available provider.
          </span>
        </div>
      </div>
    </div>
  );
}
