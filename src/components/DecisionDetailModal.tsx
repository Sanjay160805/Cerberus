"use client";

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
}

interface DecisionDetailModalProps {
  decision: Decision | null;
  onClose: () => void;
}

export default function DecisionDetailModal({ decision, onClose }: DecisionDetailModalProps) {
  if (!decision) return null;

  const fmt = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
        " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch { return "—"; }
  };

  const threatScore = decision.threatScore ?? decision.threat_score ?? 0;
  const threatPct = Math.round(threatScore * 100);
  const threatLevel = threatScore >= 0.85 ? "CRITICAL" : threatScore >= 0.6 ? "HIGH" : threatScore >= 0.3 ? "MEDIUM" : "LOW";
  const levelColor: Record<string, string> = { LOW: "#10b981", MEDIUM: "#f59e0b", HIGH: "#ef4444", CRITICAL: "#9d174d" };
  const actionColor: Record<string, string> = {
    TIGHTEN: "#7c3aed", PROTECT: "#ef4444", HARVEST: "#f59e0b",
    HOLD: "#3b82f6", WIDEN: "#10b981",
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Decision Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          <div className="decision-detail">
            <div className="decision-detail-header">
              <div className="decision-detail-action" style={{ color: actionColor[decision.action] }}>
                {decision.action}
              </div>
              {decision.sequence && (
                <div className="mono" style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  Cycle #{decision.sequence}
                </div>
              )}
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {fmt(decision.timestamp)}
              </div>
            </div>

            <div className="decision-detail-text">
              {decision.reasoning || decision.reason}
            </div>

            <div className="decision-detail-meta">
              <div className="decision-detail-meta-item">
                <div className="decision-detail-meta-label">Threat Level</div>
                <div className="decision-detail-meta-value" style={{ color: levelColor[threatLevel] }}>
                  {threatPct}% ({threatLevel})
                </div>
              </div>
              <div className="decision-detail-meta-item">
                <div className="decision-detail-meta-label">HBAR Price</div>
                <div className="decision-detail-meta-value">
                  ${decision.price.toFixed(4)}
                </div>
              </div>
              <div className="decision-detail-meta-item">
                <div className="decision-detail-meta-label">Volatility</div>
                <div className="decision-detail-meta-value">
                  {(decision.volatility || 0).toFixed(4)}
                </div>
              </div>
            </div>

            {decision.fromHCS && (
              <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#d1fae5", borderRadius: "8px", border: "1px solid #10b981", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span style={{ fontSize: "0.85rem", color: "#065f46", fontWeight: 600 }}>
                  This decision was permanently recorded on Hedera HCS
                </span>
              </div>
            )}

            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "var(--surface-hover)", borderRadius: "8px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <strong>About this decision:</strong> The Cerberus AI agent analyzed market threat signals, calculated volatility, and determined this keeper action based on Gemini AI analysis. This decision was automatically logged to maintain an immutable on-chain audit trail.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
