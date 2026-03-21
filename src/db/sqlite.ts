import Database from "better-sqlite3";
import path from "path";
import { logger } from "@/lib/logger";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const dbPath = path.join(process.cwd(), "crypto_tweets.db");
  try {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    initTables(db);
    logger.info(`SQLite connected: ${dbPath}`);
  } catch (error) {
    logger.error("SQLite connection failed", error);
    throw error;
  }
  return db;
}

function initTables(db: Database.Database) {
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
    );
    CREATE TABLE IF NOT EXISTS agent_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle INTEGER,
      timestamp TEXT,
      action TEXT,
      reasoning TEXT,
      threat_score REAL,
      volatility REAL,
      price REAL,
      executed BOOLEAN DEFAULT 0,
      tx_hash TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tweets_scraped_at ON tweets(scraped_at);
    CREATE INDEX IF NOT EXISTS idx_tweets_is_crypto ON tweets(is_crypto);
    CREATE INDEX IF NOT EXISTS idx_decisions_timestamp ON agent_decisions(timestamp);
  `);
}
