"use client";
import { useState, useEffect, useCallback } from "react";
import ThreatMeter from "./ThreatMeter";
import DecisionFeed from "./DecisionFeed";
import TweetFeed from "./TweetFeed";
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
        const r = await fetch("/api/positions").then(x => x.json());
        let p = r.price?.value ?? 0;
        if (p === 0) {
          const cg = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd"
          ).then(x => x.json()).catch(() => ({}));
          p = cg?.["hedera-hashgraph"]?.usd ?? 0;
        }
        setHbarPrice(p);
      } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

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
            <div className="topbar-title">Sentinel Dashboard</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Hedera Testnet · Bonzo Finance · Real-time AI Agent
              {lastScraped && (
                <span style={{ marginLeft: "0.75rem", color: nextUpdate <= 5 ? "#10b981" : "var(--text-muted)" }}>
                  · Tweets updated {lastScraped} · Next in {nextUpdate}m
                </span>
              )}
            </div>
          </div>
          <div className="topbar-right">
            {connected && (
              <>
                <button
                  className={`btn ${agentRunning ? "btn-ghost" : "btn-primary"}`}
                  onClick={handleStartStop}
                >
                  {agentRunning ? "Stop Agent" : "Start Agent"}
                </button>
                <button
                  className="btn btn-outline"
                  onClick={handleRunCycle}
                  disabled={cycleRunning}
                >
                  {cycleRunning ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        style={{ animation: "spin 1s linear infinite" }}>
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                      Running...
                    </>
                  ) : "⚡ Run Cycle"}
                </button>
              </>
            )}
            {!connected && (
              <div style={{
                fontSize: "0.75rem", color: "var(--text-muted)",
                padding: "0.4rem 0.75rem",
                background: "var(--bg)",
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}>
                Connect wallet to run agent
              </div>
            )}
            <button 
              className="dark-mode-toggle"
              onClick={() => setDarkMode(!darkMode)}
              title="Toggle dark mode"
            >
              {darkMode ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <WalletConnect />
          </div>
        </div>

        {lastCycle && (
          <div style={{
            background: "#f0fdf4", borderBottom: "1px solid #bbf7d0",
            padding: "0.35rem 1.5rem", fontSize: "0.75rem", color: "#166534",
            display: "flex", alignItems: "center", gap: "0.4rem"
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Cycle completed at {lastCycle}
          </div>
        )}

        <div className="page-content">
          <div className="stat-row">
            <div className="stat-box">
              <div className="stat-label">HBAR Price</div>
              <div className="stat-value" style={{ fontSize: "1.2rem" }}>
                {hbarPrice > 0 ? `$${hbarPrice.toFixed(4)}` : "—"}
              </div>
              <div className="stat-delta up">Live · CoinGecko</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">APY</div>
              <div className="stat-value" style={{ fontSize: "1.2rem", color: "#10b981" }}>
                94.15%
              </div>
              <div className="stat-delta neutral">Bonzo Finance</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Tweets Indexed</div>
              <div className="stat-value" style={{ fontSize: "1.2rem" }}>
                {tweetCount > 0 ? tweetCount.toLocaleString() : "—"}
              </div>
              <div className="stat-delta neutral">
                {nextUpdate > 0 ? `Next update in ${nextUpdate}m` : "Updating soon..."}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Network</div>
              <div className="stat-value" style={{ fontSize: "1rem", color: "#7c3aed" }}>
                Hedera
              </div>
              <div className="stat-delta neutral">Testnet · HCS Active</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", marginBottom: "1rem" }}>
            <ThreatMeter />
            <PriceChart />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", marginBottom: "1rem" }}>
            <TweetFeed />
            <PositionCard />
          </div>

          <DecisionFeed expanded />
        </div>
      </div>
    </div>
  );
}