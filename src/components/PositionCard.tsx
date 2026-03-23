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

  const rows = pos ? [
    { label: "Deposited", value: `${pos.deposited} ${pos.asset}`, sub: `≈ $${usdValue}`, bg: "var(--purple)" },
    { label: "Borrowed",  value: pos.borrowed === "0.0000" ? "None" : pos.borrowed, bg: "var(--surface)" },
    { label: "Health",    value: healthDisplay, bg: healthDisplay === "∞" ? "var(--mint)" : "var(--accent)" },
    { label: "APY",       value: pos.apy, bg: "var(--yellow)" },
    { label: "Rewards",   value: pos.rewards, bg: "var(--blue)" },
  ] : [];

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "deposit",  label: "Deposit" },
    { id: "withdraw", label: "Withdraw" },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="11" width="18" height="11" rx="0"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        Vault Position
        <span className="badge" style={{ marginLeft: "auto", background: "var(--purple)" }}>
          Bonzo · Testnet
        </span>
      </div>

      {/* Connected wallet indicator */}
      {connected && accountId && (
        <div className="mono" style={{
          fontSize: "0.8rem", color: "var(--text-primary)",
          marginBottom: "1rem", fontWeight: 700,
          background: "var(--surface)", border: "2px solid var(--border)",
          padding: "0.4rem 0.75rem", display: "inline-block"
        }}>
          WALLET: <span style={{ background: "var(--mint)", padding: "0 4px" }}>{accountId}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {tabs.map(t => (
          (!connected && t.id !== "overview") ? null : (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "0.4rem 1rem",
                border: "2px solid var(--border)",
                fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase",
                cursor: "pointer",
                background: tab === t.id ? "var(--text-primary)" : "var(--surface)",
                color: tab === t.id ? "var(--surface)" : "var(--text-primary)",
                boxShadow: tab === t.id ? "none" : "2px 2px 0px var(--border)",
                transform: tab === t.id ? "translate(2px, 2px)" : "none",
                transition: "all 0.1s",
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
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem", border: "2px solid var(--border)", background: "var(--surface-hover)" }}>
                <div style={{ width: 70, height: 12, background: "var(--border)" }} />
                <div style={{ width: 90, height: 12, background: "var(--border)" }} />
              </div>
            ))}
          </div>
        ) : pos && deposited > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {rows.map(row => (
              <div key={row.label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "0.6rem 1rem", border: "2px solid var(--border)", background: row.bg,
                boxShadow: "2px 2px 0px var(--border)"
              }}>
                <span style={{ color: "var(--text-primary)", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>{row.label}</span>
                <div style={{ textAlign: "right" }}>
                  <span className="mono" style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
                    {row.value}
                  </span>
                  {row.sub && (
                    <div className="mono" style={{ fontSize: "0.7rem", color: "var(--text-primary)", opacity: 0.8 }}>{row.sub}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "1.5rem", border: "2px dashed var(--border)", textAlign: "center", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
            {connected
              ? "NO POSITION FOUND. DEPOSIT HBAR ON BONZO."
              : "CONNECT WALLET TO VIEW VAULT"}
          </div>
        )
      )}

      {/* Deposit tab */}
      {tab === "deposit" && connected && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ background: "var(--mint)", border: "2px solid var(--border)", padding: "1rem", fontSize: "0.85rem", fontWeight: 700 }}>
            CURRENT POSITION: {pos?.deposited ?? "0.0000"} HBAR<br/>APY: {pos?.apy ?? "94.15%"}
          </div>
          <div style={{ background: "var(--surface)", border: "2px solid var(--border)", padding: "1.5rem" }}>
            <div style={{ fontWeight: 900, fontSize: "0.9rem", marginBottom: "0.75rem", textTransform: "uppercase" }}>How to deposit:</div>
            <ol style={{ paddingLeft: "1.2rem", margin: 0, fontWeight: 600, fontSize: "0.8rem", gap: "0.5rem", display: "flex", flexDirection: "column" }}>
              <li>Open HashPack → testnet</li>
              <li>Open Bonzo Finance via button</li>
              <li>Supply HBAR → approve tx</li>
              <li>Return here to update</li>
            </ol>
          </div>
          <a
            href="https://testnet.bonzo.finance"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
          >
            OPEN BONZO ↗
          </a>
        </div>
      )}

      {/* Withdraw tab */}
      {tab === "withdraw" && connected && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ background: "var(--accent)", border: "2px solid var(--border)", padding: "1rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
            AVAILABLE: {pos?.deposited ?? "0.0000"} HBAR
          </div>
          <div style={{ background: "var(--surface)", border: "2px solid var(--border)", padding: "1.5rem" }}>
            <div style={{ fontWeight: 900, fontSize: "0.9rem", marginBottom: "0.75rem", textTransform: "uppercase" }}>How to withdraw:</div>
            <ol style={{ paddingLeft: "1.2rem", margin: 0, fontWeight: 600, fontSize: "0.8rem", gap: "0.5rem", display: "flex", flexDirection: "column" }}>
              <li>Open HashPack → testnet</li>
              <li>Open Bonzo Finance</li>
              <li>Select Withdraw → approve tx</li>
              <li>Return here to update</li>
            </ol>
          </div>
          <a
            href="https://testnet.bonzo.finance"
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{ width: "100%", justifyContent: "center", background: "var(--text-primary)", color: "var(--surface)" }}
          >
            OPEN BONZO ↗
          </a>
        </div>
      )}
    </div>
  );
}