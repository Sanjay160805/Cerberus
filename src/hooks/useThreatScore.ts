"use client";
import { usePolling } from "./useWebSocket";

interface StatusData {
  ok: boolean;
  agent: { running: boolean; lastDecision: { action: string; threat_score: number; reasoning: string; timestamp: string } | null; tweetCount: number };
}

export function useThreatScore() {
  const { data, loading, error } = usePolling<StatusData>("/api/status", 10000);
  return {
    threatScore: data?.agent?.lastDecision?.threat_score ?? 0,
    lastAction: data?.agent?.lastDecision?.action ?? "HOLD",
    lastReasoning: data?.agent?.lastDecision?.reasoning ?? "",
    agentRunning: data?.agent?.running ?? false,
    tweetCount: data?.agent?.tweetCount ?? 0,
    loading,
    error,
  };
}
