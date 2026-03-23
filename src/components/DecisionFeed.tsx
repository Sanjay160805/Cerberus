"use client";
import { useEffect, useState } from "react";
import DecisionDetailModal from "./DecisionDetailModal";
import { useWallet } from "@/context/WalletContext";

interface Decision {
  id: number;
  action: string;
  reason: string;
  reasoning?: string;
  threatScore: number;
  threat_score?: number;
  price: number;
  timestamp: string;
  sequence?: number;
  fromHCS?: boolean;
  volatility?: number;
  walletId?: string;
}

const DOT_COLORS: Record<string, string> = {
  TIGHTEN: "var(--purple)", PROTECT: "var(--accent)", HARVEST: "var(--yellow)",
  HOLD: "var(--blue)", WIDEN: "var(--mint)",
};

const HCS_TOPIC_ID = process.env.NEXT_PUBLIC_HCS_TOPIC_ID ?? "0.0.8314584";

export default function DecisionFeed({ expanded = false }: { expanded?: boolean }) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [source, setSource] = useState<string>("loading");
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const { accountId } = useWallet();

  useEffect(() => {
    const load = async () => {
      try {
        const walletParam = accountId ? `&wallet=${accountId}` : "";
        const d = await fetch(
          `/api/decisions?limit=${expanded ? 50 : 8}${walletParam}`
        ).then(r => r.json());
        setDecisions(d.decisions ?? []);
        setSource(d.source ?? "unknown");
      } catch {
        setDecisions([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [expanded, accountId]);

  const fmt = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
        " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } catch { return "—"; }
  };

  return (
    <div className="card">
      <div className="card-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        Decision Log
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {source === "hcs" && (
            <span className="badge" style={{
              background: "var(--mint)", color: "black",
            }}>
              ⛓ HCS
            </span>
          )}
          {(source === "sqlite" || source === "sqlite-fallback") && (
            <span className="badge" style={{
              background: "var(--surface)", color: "var(--text-primary)",
            }}>
              DB
            </span>
          )}
          <span className="mono" style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 700 }}>
            {decisions.length}
          </span>
        </div>
      </div>

      <div className="timeline" style={{
        maxHeight: expanded ? "none" : 320,
        overflowY: "auto",
        borderLeft: "var(--border-width) solid var(--text-primary)",
        marginLeft: "0.5rem",
        paddingLeft: "1.5rem",
      }}>
        {loading ? (
          <div style={{ padding: "1rem", border: "2px solid var(--border)", background: "var(--surface)", fontWeight: 700, textTransform: "uppercase" }}>
            LOADING FROM HEDERA...
          </div>
        ) : decisions.length === 0 ? (
          <div style={{ padding: "1.5rem", border: "2px dashed var(--border)", background: "var(--surface)", textAlign: "center", fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {accountId
              ? `NO DECISIONS FOR ${accountId}. RUN CYCLE.`
              : "CONNECT WALLET TO SEE DECISIONS."}
          </div>
        ) : decisions.map((d, i) => (
          <div 
            key={d.id ?? i} 
            className="timeline-item"
            onClick={() => setSelectedDecision(d)}
            style={{ 
              cursor: "pointer", 
              transition: "transform 0.1s, box-shadow 0.1s", 
              padding: "1rem", 
              border: "2px solid var(--border)",
              background: "var(--bg)",
              marginBottom: "1rem",
              position: "relative",
              boxShadow: "2px 2px 0px var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translate(-2px, -2px)";
              e.currentTarget.style.boxShadow = "4px 4px 0px var(--border)";
            }}
            onMouseLeave={(e) => {
               e.currentTarget.style.transform = "none";
               e.currentTarget.style.boxShadow = "2px 2px 0px var(--border)";
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "-1.5rem",
                top: "1.5rem",
                width: "2rem",
                height: "4px",
                background: "var(--text-primary)"
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <span className={`badge badge-${d.action?.toLowerCase()}`}>
                {d.action}
              </span>
              {d.sequence && (
                <span className="mono" style={{ fontSize: "0.75rem", color: "var(--text-primary)", fontWeight: 700 }}>
                  #{d.sequence}
                </span>
              )}
              <span className="mono" style={{
                fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: "auto", fontWeight: 600
              }}>
                {fmt(d.timestamp)}
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.5, fontWeight: 500, margin: "0.5rem 0" }}>
              {(d.reasoning || d.reason || "").slice(0, 120)}
              {(d.reasoning || d.reason || "").length > 120 ? "..." : ""}
            </p>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", alignItems: "center", borderTop: "2px solid var(--border)", paddingTop: "0.75rem" }}>
              <span className="mono" style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 700 }}>
                THREAT: <span style={{ background: "var(--yellow)", padding: "0 4px", border: "1px solid black" }}>{Math.round((d.threatScore ?? d.threat_score ?? 0) * 100)}%</span>
              </span>
              <span className="mono" style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 700 }}>
                PRICE: ${(d.price ?? 0).toFixed(4)}
              </span>
              {d.fromHCS && (
                <span style={{ fontSize: "0.7rem", color: "black", background: "var(--mint)", padding: "2px 6px", border: "1px solid black", fontWeight: 700, marginLeft: "auto" }}>
                  ON-CHAIN
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {source === "hcs" && (
        <div style={{
          marginTop: "1.5rem", padding: "0.75rem 1rem",
          background: "var(--mint)", border: "2px solid var(--border)",
          display: "flex", alignItems: "center", gap: "0.5rem",
          boxShadow: "2px 2px 0px var(--border)"
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <span style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 700, textTransform: "uppercase" }}>
            Live from Hedera HCS ·{" "}
            <a
              href={`https://hashscan.io/testnet/topic/${HCS_TOPIC_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--text-primary)", fontWeight: 900, textDecoration: "underline" }}
            >
              HashScan ↗
            </a>
          </span>
        </div>
      )}

      <DecisionDetailModal decision={selectedDecision} onClose={() => setSelectedDecision(null)} />
    </div>
  );
}