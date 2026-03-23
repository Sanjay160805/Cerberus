"use client";
import { useEffect, useState } from "react";

interface Tweet {
  id: number;
  username: string;
  text: string;
  scraped_at: string;
  likes?: number;
  retweets?: number;
  is_crypto?: number;
}

interface ScrapedTweetsBoxProps {
  limit?: number;
}

export default function ScrapedTweetsBox({ limit = 8 }: ScrapedTweetsBoxProps) {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      fetch(`/api/tweets?limit=${limit}`)
        .then(r => r.json())
        .then(d => {
          setTweets(d.tweets ?? []);
          setTotal(d.total ?? 0);
          if (d.tweets?.[0]?.scraped_at) {
            const t = new Date(d.tweets[0].scraped_at.replace(" ", "T"));
            setLastUpdated(t.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [limit]);

  const fmt = (ts: string) => {
    if (!ts) return "—";
    const d = new Date(ts.replace(" ", "T"));
    if (isNaN(d.getTime())) return ts.slice(0, 16);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="card-header" style={{ flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
        </svg>
        SCRAPED SIGNALS
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {lastUpdated && (
            <span className="mono" style={{ fontSize: "0.75rem", fontWeight: 700, background: "var(--mint)", border: "1px solid black", padding: "0 5px" }}>
              UPD {lastUpdated}
            </span>
          )}
          <span className="mono" style={{ fontSize: "0.8rem", fontWeight: 900, background: "var(--yellow)", border: "1.5px solid black", padding: "0 6px" }}>
            {total > 0 ? `${total.toLocaleString()} TOTAL` : "LOADING"}
          </span>
        </div>
      </div>

      {/* Tweet list */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {loading ? (
          <div style={{
            padding: "2rem",
            textAlign: "center",
            fontWeight: 700,
            fontSize: "0.85rem",
            border: "2px dashed var(--border)",
            background: "var(--surface)",
          }}>
            FETCHING SIGNALS...
          </div>
        ) : tweets.length === 0 ? (
          <div style={{
            padding: "2rem",
            textAlign: "center",
            fontWeight: 700,
            fontSize: "0.85rem",
            border: "2px dashed var(--border)",
            background: "var(--surface)",
          }}>
            NO SIGNALS AVAILABLE
          </div>
        ) : (
          tweets.map((tweet, i) => (
            <div
              key={tweet.id ?? i}
              style={{
                border: "2px solid var(--border)",
                background: i % 2 === 0 ? "var(--bg)" : "var(--surface)",
                padding: "0.75rem",
                boxShadow: "2px 2px 0px var(--border)",
                transition: "transform 0.1s, box-shadow 0.1s",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translate(-1px, -1px)";
                e.currentTarget.style.boxShadow = "3px 3px 0px var(--border)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "2px 2px 0px var(--border)";
              }}
            >
              {/* Row 1: username + time */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <span style={{
                    fontWeight: 900,
                    fontSize: "0.82rem",
                    textTransform: "uppercase",
                    background: "var(--mint)",
                    border: "1px solid black",
                    padding: "0 4px",
                  }}>
                    @{tweet.username}
                  </span>
                  {tweet.is_crypto === 1 && (
                    <span style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      background: "var(--yellow)",
                      border: "1px solid black",
                      padding: "0 3px",
                    }}>
                      CRYPTO
                    </span>
                  )}
                </div>
                <span className="mono" style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                  {fmt(tweet.scraped_at)}
                </span>
              </div>

              {/* Row 2: tweet text */}
              <p style={{
                fontSize: "0.82rem",
                lineHeight: 1.5,
                fontWeight: 500,
                color: "var(--text-primary)",
                margin: 0,
                wordBreak: "break-word",
              }}>
                {tweet.text?.slice(0, 120)}{(tweet.text?.length ?? 0) > 120 ? "…" : ""}
              </p>

              {/* Row 3: engagement metrics */}
              {(tweet.likes !== undefined || tweet.retweets !== undefined) && (
                <div style={{ display: "flex", gap: "1rem", marginTop: "0.4rem", paddingTop: "0.4rem", borderTop: "1.5px solid var(--border)" }}>
                  {tweet.likes !== undefined && (
                    <span className="mono" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                      ♥ {tweet.likes.toLocaleString()}
                    </span>
                  )}
                  {tweet.retweets !== undefined && (
                    <span className="mono" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                      ⟲ {tweet.retweets.toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
