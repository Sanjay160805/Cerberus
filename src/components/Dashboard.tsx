"use client";
import { useState } from "react";
import StatusBadge from "./StatusBadge";
import ThreatMeter from "./ThreatMeter";
import DecisionFeed from "./DecisionFeed";
import TweetFeed from "./TweetFeed";
import PositionCard from "./PositionCard";
import PriceChart from "./PriceChart";
import { useThreatScore } from "@/hooks/useThreatScore";
import { usePositions } from "@/hooks/usePositions";

export default function Dashboard() {
  const { threatScore, lastAction, lastReasoning, agentRunning, tweetCount } = useThreatScore();
  const { position, price, loading } = usePositions();
  const [cycling, setCycling] = useState(false);
  const [agentStatus, setAgentStatus] = useState(false);

  const triggerCycle = async () => {
    setCycling(true);
    try { await fetch("/api/cycle", { method: "POST" }); }
    finally { setTimeout(() => setCycling(false), 3000); }
  };

  const toggleAgent = async () => {
    const endpoint = agentStatus ? "/api/agent/stop" : "/api/agent/start";
    await fetch(endpoint, { method: "POST" });
    setAgentStatus(!agentStatus);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">🛡️ Sentinel</h1>
            <p className="text-gray-400 text-sm">Intelligent Keeper Agent · Hedera + Bonzo Finance</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-sm">{tweetCount} tweets ingested</span>
            <StatusBadge running={agentRunning} />
            <button onClick={toggleAgent} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${agentStatus ? "bg-red-900/50 text-red-400 hover:bg-red-900" : "bg-green-900/50 text-green-400 hover:bg-green-900"}`}>
              {agentStatus ? "Stop Agent" : "Start Agent"}
            </button>
            <button onClick={triggerCycle} disabled={cycling} className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-900/50 text-blue-400 hover:bg-blue-900 disabled:opacity-50 transition">
              {cycling ? "Running..." : "⚡ Run Cycle"}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <ThreatMeter score={threatScore} action={lastAction} reasoning={lastReasoning} />
            <PriceChart price={price} />
            <PositionCard position={position} loading={loading} />
          </div>
          <div className="space-y-6"><DecisionFeed /></div>
          <div className="space-y-6"><TweetFeed /></div>
        </div>
      </main>
    </div>
  );
}
