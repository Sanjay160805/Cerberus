/**
 * Twitter Ingestor - SQLite Edition
 * Reads scraped tweets from local SQLite database and scores geopolitical relevance
 */

import Database from "better-sqlite3";
import path from "path";
import { IngestedTweet } from "../types/index.js";

// Geopolitical keywords to match
const GEOPOLITICAL_KEYWORDS = [
  // Conflict
  "war",
  "invasion",
  "conflict",
  "attack",
  "military",
  "armed",
  "battle",
  "combat",
  "siege",

  // Sanctions
  "sanctions",
  "embargo",
  "restrictions",
  "ban",
  "freeze",
  "asset freeze",
  "export control",

  // Political instability
  "coup",
  "uprising",
  "revolution",
  "unrest",
  "riot",
  "protest",
  "civil war",
  "civil unrest",

  // Diplomatic
  "diplomatic",
  "negotiation",
  "treaty",
  "agreement",
  "alliance",
  "coalition",
  "talks",
  "summit",

  // Regional crisis
  "crisis",
  "emergency",
  "disaster",
  "natural disaster",
  "earthquake",
  "tsunami",
  "hurricane",
  "flood",
  "economic crisis",
  "financial crisis",

  // Geopolitical entities
  "russia",
  "ukraine",
  "china",
  "taiwan",
  "iran",
  "israel",
  "palestine",
  "north korea",
  "south korea",
  "middle east",
  "usdc",
  "hbar",
  "crypto",
  "bitcoin",
  "ethereum",
];

let db: Database.Database | null = null;

/**
 * Initialize database connection
 */
function initDatabase(): Database.Database {
  if (db) return db;

  const dbPath = path.join(process.cwd(), "crypto_tweets.db");
  db = new Database(dbPath);

  // Ensure table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS tweets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      text TEXT,
      time TEXT,
      likes TEXT,
      retweets TEXT,
      replies TEXT,
      is_crypto BOOLEAN,
      scraped_at TEXT
    )
  `);

  console.log(`✓ Connected to SQLite database: ${dbPath}`);
  return db;
}

/**
 * Calculate geopolitical relevance score for tweet
 */
function calculateRelevanceScore(text: string): number {
  const lowerText = text.toLowerCase();
  let score = 0;

  for (const keyword of GEOPOLITICAL_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      score += 0.15;
    }
  }

  // Normalize score to 0-1 range
  score = Math.min(score, 1.0);

  return score;
}

/**
 * Extract geopolitical keywords from tweet
 */
function extractKeywords(text: string): string[] {
  const lowerText = text.toLowerCase();
  const keywords: string[] = [];

  for (const keyword of GEOPOLITICAL_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Convert string values to proper types
 */
function convertDatabaseRow(row: any): IngestedTweet {
  return {
    id: row.id.toString(),
    username: row.username || "unknown",
    text: row.text || "",
    time: row.time || new Date().toISOString(),
    likes: parseInt(row.likes) || 0,
    retweets: parseInt(row.retweets) || 0,
    replies: parseInt(row.replies) || 0,
    relevanceScore: 0, // Will be calculated
    geopoliticalKeywords: [],
    scrapedAt: new Date(row.scraped_at || Date.now()),
  };
}

/**
 * Fetch latest geopolitical tweets from SQLite database
 * Returns 20 most recent tweets with relevance scores
 */
export async function fetchGeopoliticalTweets(): Promise<IngestedTweet[]> {
  try {
    const database = initDatabase();

    // Fetch 20 most recent tweets
    const stmt = database.prepare(`
      SELECT id, username, text, time, likes, retweets, replies, is_crypto, scraped_at
      FROM tweets
      ORDER BY scraped_at DESC
      LIMIT 20
    `);

    const rows = stmt.all();

    // Convert to IngestedTweet array with relevance scores
    const tweets: IngestedTweet[] = rows.map((row: any) => {
      const tweet = convertDatabaseRow(row);
      tweet.relevanceScore = calculateRelevanceScore(tweet.text);
      tweet.geopoliticalKeywords = extractKeywords(tweet.text);
      return tweet;
    });

    // Filter by minimum relevance threshold and sort by score
    const filtered = tweets
      .filter((t) => t.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    console.log(
      `✓ Fetched ${filtered.length} geopolitical tweets from database`,
    );
    return filtered;
  } catch (error) {
    console.error("✗ Error fetching tweets:", error);
    return [];
  }
}

/**
 * Add a new tweet to the database (for testing)
 */
export async function addTweet(
  username: string,
  text: string,
  likes: number = 0,
  retweets: number = 0,
  replies: number = 0,
): Promise<number> {
  try {
    const database = initDatabase();
    const stmt = database.prepare(`
      INSERT INTO tweets (username, text, time, likes, retweets, replies, is_crypto, scraped_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      username,
      text,
      new Date().toISOString(),
      likes.toString(),
      retweets.toString(),
      replies.toString(),
      true,
      new Date().toISOString(),
    );

    return (result.lastInsertRowid as number) || 0;
  } catch (error) {
    console.error("✗ Error adding tweet:", error);
    throw error;
  }
}

/**
 * Get tweet count from database
 */
export async function getTweetCount(): Promise<number> {
  try {
    const database = initDatabase();
    const result = database.prepare("SELECT COUNT(*) as count FROM tweets").get();
    return (result as any).count || 0;
  } catch (error) {
    console.error("✗ Error getting tweet count:", error);
    return 0;
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log("✓ Database connection closed");
  }
}
