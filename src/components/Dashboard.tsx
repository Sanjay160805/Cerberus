"use client";
import { useState, useEffect, useCallback } from "react";
import ThreatMeter from "./ThreatMeter";
import DecisionFeed from "./DecisionFeed";
import TweetFeed from "./TweetFeed";
import ScrapedTweetsBox from "./ScrapedTweetsBox";
import PositionCard from "./PositionCard";
import PriceChart from "./PriceChart";
import WalletConnect from "./WalletConnect";
import { useWallet } from "@/context/WalletContext";

export default function Dashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);
  const [tweetCount, setTweetCount] = useState(0);
  const [cycleRunning, setCycleRunning] = useState(false);
  const [lastCycle, setLastCycle] = useState<string | null>(null);
  const [hbarPrice, setHbarPrice] = useState<number>(0);
  const [lastScraped, setLastScraped] = useState<string | null>(null);
  const [nextUpdate, setNextUpdate] = useState<number>(60);
  const [vaultData, setVaultData] = useState<any>(null);
  const { connected, accountId, connect, disconnect } = useWallet();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const load = async () => {
      try {
        const [statusRes, tweetsRes] = await Promise.all([
          fetch("/api/status").then(r => r.json()),
          fetch("/api/tweets?limit=1").then(r => r.json()),
        ]);
        setAgentRunning(statusRes.agent?.running ?? false);
        setTweetCount(statusRes.agent?.tweetCount || tweetsRes.total || 0);
      } catch {}
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const query = accountId ? `?accountId=${accountId}` : "";
        const res = await fetch(`/api/positions${query}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const r = await res.json();
        
        if (r.ok) {
          setVaultData(r.position);
          let p = r.price?.value ?? 0;
          if (p === 0) {
            try {
              const cgRes = await fetch(
                "https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd"
              );
              if (cgRes.ok) {
                const cg = await cgRes.json();
                p = cg?.["hedera-hashgraph"]?.usd ?? 0;
              }
            } catch {}
          }
          setHbarPrice(p);
        }
      } catch (err) {
        console.error("[Dashboard] Failed to fetch positions:", err);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [accountId]);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/tweets?limit=1").then(x => x.json());
        const first = r.tweets?.[0];
        if (first?.scraped_at) {
          const scraped = new Date(first.scraped_at.replace(" ", "T"));
          setLastScraped(scraped.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
          const minsAgo = Math.floor((Date.now() - scraped.getTime()) / 60000);
          setNextUpdate(Math.max(0, 60 - minsAgo));
        }
      } catch {}
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNextUpdate(p => Math.max(0, p - 1)), 60000);
    return () => clearInterval(t);
  }, []);

  const handleStartStop = useCallback(async () => {
    await fetch(agentRunning ? "/api/agent/stop" : "/api/agent/start", { method: "POST" });
    setAgentRunning(p => !p);
  }, [agentRunning]);

  const handleRunCycle = useCallback(async () => {
    setCycleRunning(true);
    try {
      await fetch("/api/cycle", { method: "POST" });
      setLastCycle(new Date().toLocaleTimeString());
    } finally {
      setCycleRunning(false);
    }
  }, []);

  return (
    <div className="app-shell full-width">
      <div className="main-content" style={{ marginLeft: 0, width: "100%" }}>
        <div className="topbar">
          <div>
            <div className="topbar-title">CERBERUS_DASHBOARD_</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 700, textTransform: "uppercase" }}>
              Hedera Mainnet <span style={{ color: "var(--purple)" }}>·</span> Bonzo Finance <span style={{ color: "var(--mint)" }}>·</span> Real-time AI Agent
              {lastScraped && (
                <span style={{ marginLeft: "0.75rem", background: nextUpdate <= 5 ? "var(--mint)" : "var(--surface)", border: "1px solid var(--border)", padding: "0 4px" }}>
                  <span style={{ color: "var(--purple)" }}>·</span> TWEETS UPD: {lastScraped} <span style={{ color: "var(--purple)" }}>·</span> NEXT: {nextUpdate}m
                </span>
              )}
            </div>
          </div>
          <div className="topbar-right">
            {connected && (
              <>
                <button
                  className={`btn ${agentRunning ? "btn-outline" : "btn-primary"}`}
                  onClick={handleStartStop}
                  style={agentRunning ? { background: "var(--surface)", color: "var(--text-primary)" } : {}}
                >
                  {agentRunning ? "STOP AGENT" : "START AGENT"}
                </button>
                <button
                  className="btn btn-outline"
                  onClick={handleRunCycle}
                  disabled={cycleRunning}
                  style={{ background: "var(--yellow)" }}
                >
                  {cycleRunning ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="3"
                        style={{ animation: "spin 1s linear infinite" }}>
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                      RUNNING...
                    </>
                  ) : "⚡ RUN CYCLE"}
                </button>
              </>
            )}
            {!connected && (
              <div style={{
                fontSize: "0.8rem", color: "var(--text-primary)",
                padding: "0.4rem 0.75rem",
                background: "var(--yellow)",
                border: "2px solid var(--border)",
                boxShadow: "2px 2px 0px var(--border)",
                fontWeight: 700, textTransform: "uppercase"
              }}>
                CONNECT WALLET REQUIRED
              </div>
            )}
            <WalletConnect />
          </div>
        </div>

        {lastCycle && (
          <div style={{
            background: "var(--mint)", borderBottom: "3px solid var(--border)",
            padding: "0.5rem 1.5rem", fontSize: "0.85rem", color: "var(--text-primary)",
            display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 700,
            textTransform: "uppercase"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Cycle completed at {lastCycle}
          </div>
        )}

        <div className="page-content">
          <div className="stat-row">
            <div className="stat-box">
              <div className="stat-label">HBAR PRICE</div>
              <div className="stat-value mono" style={{ fontSize: "1.5rem" }}>
                {hbarPrice > 0 ? `$${hbarPrice.toFixed(4)}` : "—"}
              </div>
              <div className="stat-delta up" style={{ color: "black", background: "var(--mint)", padding: "0 4px", border: "1px solid black" }}>LIVE · COINGECKO</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">APY</div>
              <div className="stat-value mono" style={{ fontSize: "1.5rem", color: "var(--text-primary)", textShadow: "2px 2px 0px var(--mint)" }}>
                {vaultData?.apy ?? "94.15%"}
              </div>
              <div className="stat-delta neutral" style={{ background: "var(--purple)", color: "white", padding: "0 4px", border: "1px solid black" }}>BONZO FINANCE</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">TWEETS INDEXED</div>
              <div className="stat-value mono" style={{ fontSize: "1.5rem" }}>
                {tweetCount > 0 ? tweetCount.toLocaleString() : "—"}
              </div>
              <div className="stat-delta neutral" style={{ background: "var(--surface)", border: "1px solid black", padding: "0 4px" }}>
                {nextUpdate > 0 ? `NEXT: ${nextUpdate}M` : "UPDATING SOON..."}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">NETWORK</div>
              <div className="stat-value mono" style={{ fontSize: "1.5rem", color: "var(--text-primary)", textShadow: "2px 2px 0px var(--yellow)" }}>
                HEDERA
              </div>
              <div className="stat-delta neutral" style={{ background: "white", border: "1px solid black", padding: "0 4px", color: "black" }}>MAINNET · HCS ON</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <ThreatMeter />
            <PriceChart />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <TweetFeed />
            <PositionCard />
          </div>

          {/* Scraped Tweets raw signal log */}
          <div style={{ marginBottom: "1.5rem" }}>
            <ScrapedTweetsBox limit={12} />
          </div>

          <DecisionFeed expanded />
        </div>
      </div>
    </div>
  );
}