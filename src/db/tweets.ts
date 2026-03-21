import { getDb } from "./sqlite";
import { Tweet } from "@/lib/types";

export function getRecentTweets(limit = 50): Tweet[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM tweets ORDER BY scraped_at DESC LIMIT ?`).all(limit) as Tweet[];
}

export function getCryptoTweets(limit = 100, hoursBack = 72): Tweet[] {
  const db = getDb();
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
  return db.prepare(`SELECT * FROM tweets WHERE is_crypto = 1 AND scraped_at >= ? ORDER BY scraped_at DESC LIMIT ?`).all(since, limit) as Tweet[];
}

export function getAllCryptoTweets(limit = 200): Tweet[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM tweets WHERE is_crypto = 1 ORDER BY scraped_at DESC LIMIT ?`).all(limit) as Tweet[];
}

export function getTweetCount(): number {
  const db = getDb();
  const result = db
    .prepare("SELECT COUNT(*) as count FROM tweets WHERE is_crypto = 1")
    .get() as { count: number };
  return result.count;
}
