"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";

interface Position {
  asset: string;
  deposited: string;
  borrowed: string;
  healthFactor: string;
  apy: string;
  rewards: string;
}

type Tab = "overview" | "deposit" | "withdraw";

export default function PositionCard() {
  const [pos, setPos] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [hbarPrice, setHbarPrice] = useState(0);
  const [tab, setTab] = useState<Tab>("overview");
  const { connected, accountId } = useWallet();

  const loadPosition = async () => {
    if (!connected || !accountId) {
      setPos(null);
      setLoading(false);
      return;
    }
    try {
      const url = `/api/positions?accountId=${encodeURIComponent(accountId)}`;
      const r = await fetch(url).then(d => d.json());
      setPos(r.position ?? null);
      const raw = r.price?.value ?? 0;
      if (raw > 0) {
        setHbarPrice(raw);
      } else {
        const cg = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd"
        ).then(d => d.json()).catch(() => ({}));
        setHbarPrice(cg?.["hedera-hashgraph"]?.usd ?? 0.085);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!connected || !accountId) {
      setPos(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadPosition();
    const t = setInterval(loadPosition, 30000);
    return () => clearInterval(t);
  }, [accountId, connected]);

  const deposited = parseFloat(pos?.deposited ?? "0");
  const usdValue = (deposited * hbarPrice).toFixed(2);
  const hf = pos?.healthFactor;
  const healthDisplay = hf === "Infinity" || hf === "∞" ? "∞" : hf ?? "—";
  const healthColor = healthDisplay === "∞" ? "#10b981"
    : parseFloat(hf ?? "0") > 1.5 ? "#10b981" : "#ef4444";

  const rows = pos ? [
    { label: "Deposited", value: `${pos.deposited} ${pos.asset}`, sub: `≈ $${usdValue}`, color: "#7c3aed" },
    { label: "Borrowed",  value: pos.borrowed === "0.0000" ? "None" : pos.borrowed, color: "var(--text-primary)" },
    { label: "Health",    value: healthDisplay, color: healthColor },
    { label: "APY",       value: pos.apy, color: "#10b981" },
    { label: "Rewards",   value: pos.rewards, color: "#7c3aed" },
  ] : [];

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "deposit",  label: "Deposit" },
    { id: "withdraw", label: "Withdraw" },
  ];

  return (
    <div className="card">
      <div className="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        Vault Position
        <span className="badge badge-low" style={{ marginLeft: "auto" }}>
          Bonzo · Testnet
        </span>
      </div>

      {/* Connected wallet indicator */}
      {connected && accountId && (
        <div style={{
          fontSize: "0.7rem", color: "var(--text-muted)",
          marginBottom: "0.75rem", fontFamily: "JetBrains Mono, monospace",
        }}>
          Showing position for <span style={{ color: "#7c3aed", fontWeight: 600 }}>{accountId}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem" }}>
        {tabs.map(t => (
          (!connected && t.id !== "overview") ? null : (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "0.3rem 0.75rem",
                borderRadius: 6, border: "none",
                fontSize: "0.75rem", fontWeight: 600,
                cursor: "pointer",
                background: tab === t.id ? "var(--accent)" : "var(--bg)",
                color: tab === t.id ? "white" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          )
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 70, height: 11, background: "#e8eaf0", borderRadius: 4, animation: "shimmer 1.5s infinite" }} />
                <div style={{ width: 90, height: 11, background: "#e8eaf0", borderRadius: 4, animation: "shimmer 1.5s infinite" }} />
              </div>
            ))}
          </div>
        ) : pos && deposited > 0 ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {rows.map(row => (
              <div key={row.label} className="data-row">
                <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{row.label}</span>
                <div style={{ textAlign: "right" }}>
                  <span className="mono" style={{ fontSize: "0.82rem", fontWeight: 600, color: row.color }}>
                    {row.value}
                  </span>
                  {row.sub && (
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{row.sub}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            {connected
              ? "No position found. Deposit HBAR on Bonzo Finance to get started."
              : "Connect your wallet to view your position."}
          </div>
        )
      )}

      {/* Deposit tab */}
      {tab === "deposit" && connected && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div style={{ background: "#f5f3ff", borderRadius: 8, padding: "0.75rem", fontSize: "0.75rem", color: "#5b21b6" }}>
            Current position: <strong>{pos?.deposited ?? "0.0000"} HBAR</strong> · APY: <strong>{pos?.apy ?? "94.15%"}</strong>
          </div>
          <div style={{ background: "#fafafa", borderRadius: 8, padding: "1rem", fontSize: "0.78rem", color: "#374151", lineHeight: 1.7, border: "1px solid #e8eaf0" }}>
            <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>How to deposit HBAR into Bonzo:</div>
            <ol style={{ paddingLeft: "1.1rem", margin: 0 }}>
              <li>Open HashPack → select your testnet account</li>
              <li>Click the button below to open Bonzo Finance</li>
              <li>Supply HBAR → approve in HashPack</li>
              <li>Return here — your position updates automatically ✓</li>
            </ol>
          </div>
          <a
            href="https://testnet.bonzo.finance"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "0.65rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            Open Bonzo Finance Testnet ↗
          </a>
        </div>
      )}

      {/* Withdraw tab */}
      {tab === "withdraw" && connected && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "0.75rem", fontSize: "0.75rem", color: "#065f46" }}>
            Available to withdraw: <strong>{pos?.deposited ?? "0.0000"} HBAR</strong>
          </div>
          <div style={{ background: "#fafafa", borderRadius: 8, padding: "1rem", fontSize: "0.78rem", color: "#374151", lineHeight: 1.7, border: "1px solid #e8eaf0" }}>
            <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>How to withdraw HBAR from Bonzo:</div>
            <ol style={{ paddingLeft: "1.1rem", margin: 0 }}>
              <li>Open HashPack → select your testnet account</li>
              <li>Click the button below to open Bonzo Finance</li>
              <li>Find your position → click Withdraw → approve in HashPack</li>
              <li>Return here — your position updates automatically ✓</li>
            </ol>
          </div>
          <a
            href="https://testnet.bonzo.finance"
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{ width: "100%", justifyContent: "center", padding: "0.65rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.4rem", background: "#ef4444", color: "white", border: "none" }}
          >
            Open Bonzo Finance Testnet ↗
          </a>
        </div>
      )}
    </div>
  );
}