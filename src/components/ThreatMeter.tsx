"use client";
import { useEffect, useState } from "react";

export default function ThreatMeter() {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState("LOW");
  const [action, setAction] = useState("—");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [threatRatio, setThreatRatio] = useState("0.00%");

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/status").then(x => x.json());
        const d = r.agent?.lastDecision;
        if (d) {
          const threatScore = d.threatScore ?? d.threat_score ?? 0;
          setScore(threatScore);
          
          // Calculate threat level based on score
          let threatLevel = "LOW";
          if (threatScore >= 0.85) threatLevel = "CRITICAL";
          else if (threatScore >= 0.6) threatLevel = "HIGH";
          else if (threatScore >= 0.3) threatLevel = "MEDIUM";
          else threatLevel = "LOW";
          
          setLevel(threatLevel);
          setAction(d.action ?? "—");
          setReason(d.reasoning ?? d.reason ?? "");
          setThreatRatio(`${(threatScore * 100).toFixed(2)}%`);
        }
      } finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const pct = Math.round(score * 100);
  const levelColor: Record<string, string> = { LOW: "var(--mint)", MEDIUM: "var(--yellow)", HIGH: "var(--accent-hover)", CRITICAL: "var(--text-primary)" };
  const color = levelColor[level] ?? "var(--mint)";

  return (
    <div className="card">
      <div className="card-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Threat Level
        {!loading && (
          <span className="badge" style={{ marginLeft: "auto", background: color, color: level === "CRITICAL" ? "white" : "black" }}>
            {level}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ height: 80, background: "var(--surface-hover)", border: "2px solid var(--border)", animation: "shimmer 1.5s infinite" }} />
      ) : (
        <>
          <div className="mono" style={{ fontSize: "3rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1, marginBottom: "0.5rem", textShadow: `2px 2px 0px ${color}` }}>
            {pct}%
          </div>
          <div className="threat-bar-track">
            <div className="threat-bar-fill" style={{ width: `${pct}%`, background: color }} />
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-primary)", marginTop: "1rem", marginBottom: "1rem", fontWeight: 700, textTransform: "uppercase" }}>
            Hedera Chain Threat Ratio: <span style={{ color: "var(--text-primary)", background: "var(--yellow)", padding: "0 4px", border: "2px solid black" }}>{threatRatio}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1rem 0 0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 700, textTransform: "uppercase" }}>Last action:</span>
            <span className={`badge badge-${action.toLowerCase()}`}>{action}</span>
          </div>
          {reason && (
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, borderTop: "var(--border-width) dashed var(--border)", paddingTop: "1rem" }}>
              {reason}
            </p>
          )}
        </>
      )}
    </div>
  );
}