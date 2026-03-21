"use client";
import { useEffect, useState } from "react";

export function usePolling<T>(url: string, interval = 5000): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetch_() {
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (active) { setData(json); setError(null); }
      } catch (e) {
        if (active) setError(String(e));
      } finally {
        if (active) setLoading(false);
      }
    }
    fetch_();
    const timer = setInterval(fetch_, interval);
    return () => { active = false; clearInterval(timer); };
  }, [url, interval]);

  return { data, loading, error };
}
