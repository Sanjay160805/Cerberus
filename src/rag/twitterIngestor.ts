/**
 * Twitter Ingestor — Reads from SQLite (NOT Twitter API)
 * Fetches cryptotweets from sqlite database and scores relevance
 */

import Database from "better-sqlite3";
import path from "path";
import { IngestedTweet } from "../types/index.js";

// ════════════════════════════════════════════════════════════════
// GEOPOLITICAL KEYWORDS
// ════════════════════════════════════════════════════════════════

const GEOPOLITICAL_KEYWORDS = [
  // Military/Conflict
  "war",
  "invasion",
  "military",
  "attack",
  "conflict",
  "combat",
  "strike",
  "bombing",
  "artillery",

  // Political Crisis
  "sanctions",
  "coup",
  "revolution",
  "uprising",
  "protest",
  "emergency",
  "crisis",
  "regime",
  "government collapse",

  // Nuclear/Extreme Threats
  "nuclear",
  "radiation",
  "weapons of mass destruction",
  "wmd",

  // Crypto Specific
  "bitcoin",
  "ethereum",
  "crypto",
  "blockchain",
  "hbar",
  "hedera",
  "defi",
  "nft",

  // Security Threats
  "hack",
  "breach",
  "exploit",
  "vulnerability",
  "malware",
  "threat",

  // Market Indicators
  "crash",
  "collapse",
  "unstable",
  "volatile",
  "freefall",
  "plunge",
  "drop",

  // Geographic Regions
  "russia",
  "ukraine",
  "china",
  "taiwan",
  "iran",
  "north korea",
  "middle east",
  "israel",
  "usa",
  "eu",
  "europe",

  // Regulatory
  "ban",
  "freeze",
  "restrict",
  "regulation",
  "compliance",
];

// ════════════════════════════════════════════════════════════════
// SQLITE CONNECTION
// ════════════════════════════════════════════════════════════════

let db: Database.Database | null = null;

function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = path.join(process.cwd(), "crypto_tweets.db");

  try {
    db = new Database(dbPath);
    console.log(`✓ Connected to SQLite: ${dbPath}`);
    return db;
  } catch (error) {
    console.warn(`⚠ Could not open crypto_tweets.db: ${error}`);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// RELEVANCE SCORING
// ════════════════════════════════════════════════════════════════

function calculateRelevanceScore(text: string): {
  score: number;
  keywords: string[];
} {
  const lowerText = text.toLowerCase();
  const matchedKeywords: string[] = [];
  let scoreContribution = 0;

  // Check each keyword
  for (const keyword of GEOPOLITICAL_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    const matches = lowerText.match(regex);

    if (matches) {
      const count = matches.length;
      matchedKeywords.push(keyword);
      // More matches = higher score (capped per keyword)
      scoreContribution += Math.min(count * 0.1, 0.3);
    }
  }

  // Normalize to 0-1
  const score = Math.min(scoreContribution / 2, 1.0);

  return { score, keywords: matchedKeywords };
}

// ════════════════════════════════════════════════════════════════
// FETCH TWEETS FROM SQLITE
// ════════════════════════════════════════════════════════════════

export async function fetchGeopoliticalTweets(): Promise<IngestedTweet[]> {
  try {
    const database = getDatabase();

    // Query: get last 20 tweets ordered by scraped_at DESC
    const query = `
      SELECT id, username, text, time, likes, retweets, replies, is_crypto, scraped_at
      FROM tweets
      WHERE is_crypto = 1
      ORDER BY scraped_at DESC
      LIMIT 20
    `;

    const rows = database.prepare(query).all() as any[];

    if (rows.length === 0) {
      console.log("⚠ No tweets found in database");
      return [];
    }

    // Transform and score tweets
    const ingestedTweets: IngestedTweet[] = rows
      .map((row) => {
        const { score, keywords } = calculateRelevanceScore(row.text);

        return {
          id: row.id,
          username: row.username,
          text: row.text,
          time: new Date(row.time),
          likes: row.likes || 0,
          retweets: row.retweets || 0,
          replies: row.replies || 0,
          relevanceScore: score,
          geopoliticalKeywords: keywords,
          scrapedAt: new Date(row.scraped_at),
          is_crypto: row.is_crypto === 1,
        };
      })
      // Filter: only tweets with relevance > 0
      .filter((t) => t.relevanceScore > 0)
      // Sort by relevance descending
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    console.log(
      `✓ Fetched ${ingestedTweets.length} relevant tweets from database`,
    );
    return ingestedTweets;
  } catch (error: any) {
    if (error.code === "SQLITE_CANTOPEN") {
      console.warn(
        "⚠ crypto_tweets.db not found. Run Python scraper first.",
      );
      return [];
    }
    console.error("❌ Error fetching tweets:", error);
    return [];
  }
}

// ════════════════════════════════════════════════════════════════
// GET TWEET COUNT
// ════════════════════════════════════════════════════════════════

export async function getTweetCount(): Promise<number> {
  try {
    const database = getDatabase();
    const result = database
      .prepare("SELECT COUNT(*) as count FROM tweets WHERE is_crypto = 1")
      .get() as { count: number };

    return result.count;
  } catch (error) {
    console.warn("⚠ Could not get tweet count:", error);
    return 0;
  }
}

// ════════════════════════════════════════════════════════════════
// CLOSE DATABASE
// ════════════════════════════════════════════════════════════════

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log("✓ Database connection closed");
  }
}
