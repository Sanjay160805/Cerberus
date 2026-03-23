"use client";
import { useEffect, useState } from "react";
import TweetDetailModal from "./TweetDetailModal";

interface Tweet {
  id: number;
  username: string;
  text: string;
  time: string;
  scraped_at: string;
  likes?: number;
  retweets?: number;
  is_crypto?: number;
}

export default function TweetFeed() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [total, setTotal] = useState(0);
  const [cryptoTotal, setCryptoTotal] = useState(0);
  const [selectedTweet, setSelectedTweet] = useState<Tweet | null>(null);

  useEffect(() => {
    const load = () => fetch("/api/tweets?limit=10").then(r => r.json())
      .then(d => {
        setTweets(d.tweets ?? []);
        setTotal(d.total ?? 0);
        setCryptoTotal(d.cryptoTotal ?? 0);
      }).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const fmt = (ts: string) => {
    if (!ts) return "—";
    const d = new Date(ts.replace(" ", "T"));
    if (isNaN(d.getTime())) return ts.slice(0, 16);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <div className="card">
        <div className="card-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
          </svg>
          Signal Feed
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {cryptoTotal > 0 && (
              <span className="badge" style={{ background: "var(--yellow)", color: "black" }}>
                {cryptoTotal.toLocaleString()} CRYPTO
              </span>
            )}
            <span className="mono" style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 700 }}>
              {total > 0 ? `${total.toLocaleString()}` : "LOADING"}
            </span>
          </div>
        </div>

        <div style={{ maxHeight: 320, overflowY: "auto", paddingRight: "0.5rem" }}>
          {tweets.length === 0 ? (
            <div style={{ padding: "1.5rem", border: "2px dashed var(--border)", background: "var(--surface)", textAlign: "center", fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              NO SIGNALS LOADED.
            </div>
          ) : tweets.map((t, i) => (
            <div 
              key={t.id ?? i} 
              className="tweet-item"
              onClick={() => setSelectedTweet(t)}
              style={{ 
                cursor: "pointer", 
                border: "2px solid var(--border)", 
                padding: "1rem", 
                marginBottom: "1rem", 
                background: "var(--bg)",
                boxShadow: "2px 2px 0px var(--border)",
                transition: "transform 0.1s, box-shadow 0.1s"
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
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "var(--text-primary)", textTransform: "uppercase", background: "var(--mint)", padding: "0 4px", border: "1px solid black" }}>
                    @{t.username}
                  </span>
                  {t.is_crypto === 1 && (
                    <span className="badge" style={{ background: "var(--yellow)", color: "black", padding: "0.1rem 0.4rem" }}>
                      CRYPTO
                    </span>
                  )}
                </div>
                <span className="mono" style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                  {fmt(t.scraped_at || t.time)}
                </span>
              </div>

              <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.5, fontWeight: 500, margin: "0.5rem 0" }}>
                {`${t.text?.slice(0, 100)}${(t.text?.length ?? 0) > 100 ? "..." : ""}`}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.75rem", borderTop: "2px solid var(--border)", paddingTop: "0.75rem" }}>
                {t.likes !== undefined && (
                  <span className="mono" style={{ fontSize: "0.75rem", color: "var(--text-primary)", fontWeight: 700 }}>
                    ♥ {t.likes}
                  </span>
                )}
                {t.retweets !== undefined && (
                  <span className="mono" style={{ fontSize: "0.75rem", color: "var(--text-primary)", fontWeight: 700 }}>
                    ⟲ {t.retweets}
                  </span>
                )}
                <span style={{
                  fontSize: "0.75rem", color: "var(--surface)", background: "var(--text-primary)",
                  marginLeft: "auto", fontWeight: 700, padding: "0.2rem 0.5rem", border: "1px solid black"
                }}>
                  VIEW →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TweetDetailModal tweet={selectedTweet} onClose={() => setSelectedTweet(null)} />
    </>
  );
}