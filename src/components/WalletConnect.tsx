"use client";
import { useWallet } from "@/context/WalletContext";
import { useState } from "react";

export default function WalletConnect() {
  const { connected, accountId, connecting, connect, disconnect } = useWallet();
  const [showDrop, setShowDrop] = useState(false);

  if (connected && accountId) {
    return (
      <div style={{ position: "relative" }}>
        <div
          onClick={() => setShowDrop(p => !p)}
          className="wallet-chip"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
              fill="currentColor"/>
          </svg>
          {accountId}
        </div>

        {showDrop && (
          <div
            onClick={() => { disconnect(); setShowDrop(false); }}
            style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              background: "var(--surface)", border: "var(--border-width) solid var(--border)",
              boxShadow: "var(--shadow)", padding: "0.5rem 1rem",
              fontSize: "0.8rem", color: "var(--accent-hover)", fontWeight: 700,
              whiteSpace: "nowrap", cursor: "pointer", zIndex: 999,
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}
          >
            Disconnect Wallet
          </div>
        )}
      </div>
    );
  }

  return (
    <button className="btn btn-primary" onClick={connect} disabled={connecting}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
          fill="currentColor"/>
      </svg>
      {connecting ? "Connecting..." : "Connect HashPack"}
    </button>
  );
}