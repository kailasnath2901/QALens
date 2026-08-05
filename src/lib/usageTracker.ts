import { UsageLog } from "@/types";
import providerLimits from "@/config/providerLimits.json";

const STORAGE_KEY = "qasuite_usage_logs";

export function getLocalUsageLogs(): UsageLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function logProviderUsage(providerId: string, userId: string, type: "image" | "text"): UsageLog {
  const newLog: UsageLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    userId,
    provider: providerId,
    timestamp: Date.now(),
    type
  };

  if (typeof window !== "undefined") {
    const current = getLocalUsageLogs();
    const updated = [newLog, ...current].slice(0, 1000); // keep last 1000 logs
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  return newLog;
}

export interface ProviderQuotaStats {
  providerId: string;
  rpmUsed: number;
  rpmLimit: number;
  rpdUsed: number;
  rpdLimit: number;
  rpmPercent: number;
  rpdPercent: number;
  isCoolingDown: boolean;
}

export function calculateProviderStats(logs: UsageLog[] = getLocalUsageLogs()): Record<string, ProviderQuotaStats> {
  const now = Date.now();
  const sixtySecondsAgo = now - 60 * 1000;

  // UTC midnight timestamp
  const nowUtc = new Date(now);
  const utcMidnight = Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate());

  const stats: Record<string, ProviderQuotaStats> = {};

  providerLimits.providers.forEach((prov) => {
    const providerLogs = logs.filter(l => l.provider === prov.id);

    const rpmCount = providerLogs.filter(l => l.timestamp >= sixtySecondsAgo).length;
    const rpdCount = providerLogs.filter(l => l.timestamp >= utcMidnight).length;

    const rpmPercent = Math.min(100, Math.round((rpmCount / prov.rpm) * 100));
    const rpdPercent = Math.min(100, Math.round((rpdCount / prov.rpd) * 100));

    stats[prov.id] = {
      providerId: prov.id,
      rpmUsed: rpmCount,
      rpmLimit: prov.rpm,
      rpdUsed: rpdCount,
      rpdLimit: prov.rpd,
      rpmPercent,
      rpdPercent,
      isCoolingDown: rpmCount >= prov.rpm || rpdCount >= prov.rpd,
    };
  });

  return stats;
}
