"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";

export default function PriceChart() {
  const [price, setPrice] = useState(0);
  const [source, setSource] = useState("mock");
  const [history, setHistory] = useState<{ t: string; v: number }[]>([]);
  const [change, setChange] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/positions").then(x => x.json());
        let p = r.price?.value ?? 0;
        let src = r.price?.source ?? "mock";
        if (p === 0) {
          const cg = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd").then(x => x.json()).catch(() => ({}));
          p = cg?.["hedera-hashgraph"]?.usd ?? 0.085;
          src = "coingecko";
        }
        setPrice(p); setSource(src);
        setHistory(prev => {
          const next = [...prev, { t: new Date().toLocaleTimeString(), v: p }].slice(-24);
          if (next.length >= 2) setChange(((next[next.length - 1].v - next[0].v) / next[0].v) * 100);
          return next;
        });
      } finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const srcLabel: Record<string, string> = { supra: "SUPRA", rest_api: "REST API", coingecko: "COINGECKO", mock: "MOCK" };
  const srcColor: Record<string, string> = { supra: "var(--text-primary)", rest_api: "var(--text-primary)", coingecko: "var(--text-primary)", mock: "var(--text-primary)" };
  const srcBg: Record<string, string>    = { supra: "var(--purple)", rest_api: "var(--purple)", coingecko: "var(--mint)", mock: "var(--surface)" };

  return (
    <div className="card">
      <div className="card-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        Price Feed
        <span className="badge" style={{ marginLeft: "auto", background: srcBg[source] ?? "var(--surface)", color: srcColor[source] ?? "var(--text-primary)" }}>
          {srcLabel[source] ?? source.toUpperCase()}
        </span>
      </div>

      {loading ? (
        <div style={{ height: 100, background: "var(--surface-hover)", border: "2px solid var(--border)", animation: "shimmer 1.5s infinite" }} />
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginBottom: "0.5rem" }}>
            <span className="mono" style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.05em", color: "var(--text-primary)", textShadow: "2px 2px 0px var(--yellow)" }}>
              ${price.toFixed(6)}
            </span>
            <span className="mono" style={{ fontSize: "0.9rem", fontWeight: 700, background: change >= 0 ? "var(--mint)" : "var(--accent)", color: change >= 0 ? "black" : "white", padding: "0 6px", border: "2px solid var(--border)" }}>
              {change >= 0 ? "+" : ""}{change.toFixed(2)}%
            </span>
          </div>
          <div className="mono" style={{ fontSize: "0.8rem", color: "var(--text-primary)", marginBottom: "1.5rem", fontWeight: 700 }}>HBAR / USDT</div>

          {history.length > 1 ? (
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={history}>
                <YAxis domain={["dataMin", "dataMax"]} hide />
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "3px solid var(--border)", borderRadius: 0, fontSize: "0.8rem", fontFamily: "var(--font-mono)", fontWeight: 700, boxShadow: "4px 4px 0px var(--border)", padding: "0.5rem" }}
                  itemStyle={{ color: "var(--text-primary)" }}
                  formatter={(v) => [`$${Number(v).toFixed(6)}`, "HBAR"]}
                  labelStyle={{ display: "none" }}
                />
                <Line type="stepAfter" dataKey="v" stroke="var(--text-primary)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "var(--yellow)", stroke: "var(--border)", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: "0.85rem", background: "var(--surface)", border: "2px dashed var(--border)", fontWeight: 700, textTransform: "uppercase" }}>
              Collecting feed...
            </div>
          )}
        </>
      )}
    </div>
  );
}