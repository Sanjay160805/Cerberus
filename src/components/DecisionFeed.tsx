"use client";
import { useEffect, useState } from "react";
import { AgentDecision } from "@/lib/types";

const ACTION_COLORS: Record<string, string> = {
  HOLD: "text-blue-400 bg-blue-900/30", HARVEST: "text-yellow-400 bg-yellow-900/30",
  PROTECT: "text-red-400 bg-red-900/30", WIDEN: "text-orange-400 bg-orange-900/30",
  TIGHTEN: "text-green-400 bg-green-900/30", REBALANCE: "text-purple-400 bg-purple-900/30",
};

export default function DecisionFeed() {
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);
  useEffect(() => {
    const load = async () => { const res = await fetch("/api/decisions?limit=10"); const data = await res.json(); if (data.ok) setDecisions(data.decisions); };
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
      <h2 className="text-white font-semibold text-lg mb-4">Decision Log</h2>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {decisions.length === 0 && <p className="text-gray-500 text-sm">No decisions yet. Start the agent.</p>}
        {decisions.map((d, i) => (
          <div key={i} className="border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${ACTION_COLORS[d.action] || "text-gray-400 bg-gray-800"}`}>{d.action}</span>
              <span className="text-gray-500 text-xs">{new Date(d.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mt-1">{d.reasoning}</p>
            <div className="flex gap-3 mt-2 text-xs text-gray-600">
              <span>Threat: {(d.threat_score * 100).toFixed(0)}%</span>
              <span>Price: ${d.price.toFixed(4)}</span>
              {d.tx_hash && <span className="text-green-600">✓ On-chain</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
