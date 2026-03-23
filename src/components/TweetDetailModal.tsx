"use client";

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

interface TweetDetailModalProps {
  tweet: Tweet | null;
  onClose: () => void;
}

export default function TweetDetailModal({ tweet, onClose }: TweetDetailModalProps) {
  if (!tweet) return null;

  const fmt = (ts: string) => {
    if (!ts) return "—";
    const d = new Date(ts.replace(" ", "T"));
    if (isNaN(d.getTime())) return ts.slice(0, 16);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
      " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const isCrypto = tweet.is_crypto === 1;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Tweet Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          <div className="tweet-detail">
            <div className="tweet-detail-header">
              <div className="tweet-detail-author">
                <span className="tweet-detail-author-name">@{tweet.username}</span>
                <span className="tweet-detail-time">{fmt(tweet.scraped_at || tweet.time)}</span>
              </div>
            </div>

            <div className="tweet-detail-text">
              {tweet.text}
            </div>

            <div className="tweet-detail-meta">
              <div className="tweet-detail-meta-item">
                <div className="tweet-detail-meta-label">Likes</div>
                <div className="tweet-detail-meta-value">
                  ♥ {tweet.likes?.toLocaleString() ?? "—"}
                </div>
              </div>
              <div className="tweet-detail-meta-item">
                <div className="tweet-detail-meta-label">Retweets</div>
                <div className="tweet-detail-meta-value">
                  ⟲ {tweet.retweets?.toLocaleString() ?? "—"}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.75rem", fontWeight: 600 }}>
                CLASSIFICATION
              </div>
              <div className={`tweet-crypto-badge ${isCrypto ? "" : "not-crypto"}`}>
                {isCrypto ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Crypto Related
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    Not Crypto Related
                  </>
                )}
              </div>
            </div>

            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "var(--surface-hover)", borderRadius: "8px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <strong>Note:</strong> This tweet was automatically classified and used by the Cerberus AI agent to analyze market threats and make keeper decisions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
