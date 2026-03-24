"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { useBonzoTx } from "@/hooks/useBonzoTx";

interface Position {
  asset: string;
  deposited: string;
  borrowed: string;
  healthFactor: string;
  apy: string;
  rewards: string;
}

type Tab = "overview" | "deposit" | "withdraw";

/* ── small inline spinner ── */
function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        marginRight: 8,
        verticalAlign: "middle",
      }}
    />
  );
}

export default function PositionCard() {
  const [pos, setPos] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [hbarPrice, setHbarPrice] = useState(0);
  const [tab, setTab] = useState<Tab>("overview");

  /* deposit / withdraw amount inputs */
  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");

  const { connected, accountId } = useWallet();
  const bonzo = useBonzoTx(accountId);

  const loadPosition = async () => {
    if (!connected || !accountId) { setPos(null); setLoading(false); return; }
    try {
      const res = await fetch(`/api/positions?accountId=${encodeURIComponent(accountId)}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const r = await res.json();
      
      if (r.ok) {
        setPos(r.position ?? null);
        let p = r.price?.value ?? 0;
        if (p === 0) {
          try {
            const cgRes = await fetch(
              "https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd"
            );
            if (cgRes.ok) {
              const cg = await cgRes.json();
              p = cg?.["hedera-hashgraph"]?.usd ?? 0.085;
            }
          } catch {}
        }
        setHbarPrice(p);
      } else {
        console.error("[PositionCard] API returned error:", r.error);
        setPos(null);
      }
    } catch (err) {
      console.error("[PositionCard] Failed to load position:", err);
      setPos(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!connected || !accountId) { setPos(null); setLoading(false); return; }
    setLoading(true);
    loadPosition();
    const t = setInterval(loadPosition, 30000);
    return () => clearInterval(t);
  }, [accountId, connected]);

  /* after a successful tx refresh position */
  useEffect(() => {
    if (bonzo.txHash) {
      const timer = setTimeout(() => {
        bonzo.reset();
        setLoading(true);
        loadPosition();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [bonzo.txHash]);

  const deposited = parseFloat(pos?.deposited ?? "0");
  const usdValue = (deposited * hbarPrice).toFixed(2);
  const hf = pos?.healthFactor;
  const healthDisplay = hf === "Infinity" || hf === "∞" ? "∞" : hf ?? "—";

  const rows = pos
    ? [
        { label: "Deposited", value: `${pos.deposited} ${pos.asset}`, sub: `≈ $${usdValue}`, bg: "var(--purple)" },
        { label: "Borrowed",  value: pos.borrowed === "0.0000" ? "None" : pos.borrowed, bg: "var(--surface)" },
        { label: "Health",    value: healthDisplay, bg: healthDisplay === "∞" ? "var(--mint)" : "var(--accent)" },
        { label: "APY",       value: pos.apy, bg: "var(--yellow)" },
        { label: "Rewards",   value: pos.rewards, bg: "var(--blue)" },
      ]
    : [];

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "deposit",  label: "Deposit" },
    { id: "withdraw", label: "Withdraw" },
  ];

  /* ── shared action button style ── */
  const actionBtnStyle = (color = "var(--text-primary)"): React.CSSProperties => ({
    width: "100%",
    padding: "0.75rem",
    border: "2px solid var(--border)",
    background: color,
    color: color === "var(--text-primary)" ? "var(--surface)" : "var(--text-primary)",
    fontWeight: 900,
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    cursor: bonzo.loading ? "not-allowed" : "pointer",
    opacity: bonzo.loading ? 0.7 : 1,
    boxShadow: "3px 3px 0px var(--border)",
    transition: "all 0.1s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  /* ── shared amount input style ── */
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.6rem 0.75rem",
    border: "2px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text-primary)",
    fontFamily: "monospace",
    fontSize: "1rem",
    fontWeight: 700,
    outline: "none",
    boxSizing: "border-box",
  };

  /* ── tx feedback block ── */
  const TxFeedback = () => {
    if (bonzo.loading) return (
      <div style={{ padding: "0.75rem", border: "2px solid var(--border)", background: "var(--surface)", fontSize: "0.8rem", fontWeight: 700, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Spinner /> 
          {bonzo.totalSteps > 1 
            ? `STEP ${bonzo.step}/${bonzo.totalSteps}: ${bonzo.step === 1 ? "SWAPPING HBAR" : bonzo.step === 2 ? "APPROVING USDC" : "REBALANCING VAULT"}`
            : "WAITING FOR HASHPACK SIGNATURE…"}
        </div>
        {bonzo.totalSteps > 1 && (
          <div style={{ height: 4, background: "var(--border)", width: "100%" }}>
            <div style={{ height: "100%", background: "var(--purple)", width: `${(bonzo.step / bonzo.totalSteps) * 100}%`, transition: "width 0.3s" }} />
          </div>
        )}
      </div>
    );

    if (bonzo.txHash) return (
      <div style={{ padding: "0.75rem", border: "2px solid var(--border)", background: "var(--mint)", fontSize: "0.78rem", fontWeight: 700 }}>
        ✓ TX SUBMITTED&nbsp;
        <a
          href={`https://hashscan.io/mainnet/transaction/${bonzo.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "underline", wordBreak: "break-all" }}
        >
          {bonzo.txHash.slice(0, 20)}…
        </a>
        &nbsp;(refreshing position…)
      </div>
    );
    if (bonzo.error) return (
      <div style={{ padding: "0.75rem", border: "2px solid var(--border)", background: "var(--accent)", fontSize: "0.78rem", fontWeight: 700, wordBreak: "break-word" }}>
        ✗ ERROR: {bonzo.error}
      </div>
    );
    return null;
  };

  return (
    <>
      {/* keyframe for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div className="card">
        <div className="card-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="0"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          Vault Position
          <span className="badge" style={{ marginLeft: "auto", background: "var(--purple)" }}>
            Bonzo · Mainnet
          </span>
        </div>

        {/* connected wallet indicator */}
        {connected && accountId && (
          <div className="mono" style={{
            fontSize: "0.8rem", color: "var(--text-primary)",
            marginBottom: "1rem", fontWeight: 700,
            background: "var(--surface)", border: "2px solid var(--border)",
            padding: "0.4rem 0.75rem", display: "inline-block",
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
                onClick={() => { setTab(t.id); bonzo.reset(); }}
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

        {/* ── OVERVIEW TAB ── */}
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
                  boxShadow: "2px 2px 0px var(--border)",
                }}>
                  <span style={{ color: "var(--text-primary)", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>{row.label}</span>
                  <div style={{ textAlign: "right" }}>
                    <span className="mono" style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{row.value}</span>
                    {row.sub && <div className="mono" style={{ fontSize: "0.7rem", color: "var(--text-primary)", opacity: 0.8 }}>{row.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "1.5rem", border: "2px dashed var(--border)", textAlign: "center", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
              {connected ? "NO POSITION FOUND. DEPOSIT HBAR BELOW." : "CONNECT WALLET TO VIEW VAULT"}
            </div>
          )
        )}

        {/* ── DEPOSIT TAB ── */}
        {tab === "deposit" && connected && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* current position banner */}
            <div style={{ background: "var(--mint)", border: "2px solid var(--border)", padding: "1rem", fontSize: "0.85rem", fontWeight: 700 }}>
              CURRENT POSITION: {pos?.deposited ?? "0.0000"} HBAR &nbsp;·&nbsp; APY: {pos?.apy ?? "94.15%"}
            </div>

            {/* amount input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
                Amount (HBAR)
              </label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                placeholder="e.g. 10"
                value={depositAmt}
                onChange={e => setDepositAmt(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* tx feedback */}
            <TxFeedback />

            {/* deposit button */}
            <button
              disabled={bonzo.loading || !depositAmt || parseFloat(depositAmt) <= 0}
              onClick={async () => {
                bonzo.reset();
                await bonzo.deposit(depositAmt);
              }}
              style={actionBtnStyle("var(--text-primary)")}
            >
              {bonzo.loading ? <><Spinner />SIGNING…</> : "⬆ DEPOSIT HBAR"}
            </button>

            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              HashPack will open a signing popup. Confirm the transaction to supply HBAR to Bonzo&nbsp;Lend.
            </div>
          </div>
        )}

        {/* ── WITHDRAW TAB ── */}
        {tab === "withdraw" && connected && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* available banner */}
            <div style={{ background: "var(--accent)", border: "2px solid var(--border)", padding: "1rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
              AVAILABLE TO WITHDRAW: {pos?.deposited ?? "0.0000"} HBAR
            </div>

            {/* amount input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
                Amount (HBAR)
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  max={pos?.deposited ?? undefined}
                  placeholder="e.g. 5"
                  value={withdrawAmt}
                  onChange={e => setWithdrawAmt(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                {/* MAX button */}
                {pos && deposited > 0 && (
                  <button
                    onClick={() => setWithdrawAmt(pos.deposited)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      border: "2px solid var(--border)",
                      background: "var(--surface-hover)",
                      color: "var(--text-primary)",
                      fontSize: "0.7rem",
                      fontWeight: 900,
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    MAX
                  </button>
                )}
              </div>
            </div>

            {/* tx feedback */}
            <TxFeedback />

            {/* withdraw button */}
            <button
              disabled={bonzo.loading || !withdrawAmt || parseFloat(withdrawAmt) <= 0}
              onClick={async () => {
                bonzo.reset();
                await bonzo.withdraw(withdrawAmt);
              }}
              style={actionBtnStyle()}
            >
              {bonzo.loading ? <><Spinner />SIGNING…</> : "⬇ WITHDRAW HBAR"}
            </button>

            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              HashPack will open a signing popup. Confirm the transaction to withdraw from Bonzo&nbsp;Lend.
            </div>
          </div>
        )}
      </div>
    </>
  );
}