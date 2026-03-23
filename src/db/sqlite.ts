import { logger } from "@/lib/logger";

let db: any = null;

/**
 * PRODUCTION DATABASE: MANAGES LOCAL AUDIT LOGS FOR DECISIONS.
 * Signal data (tweets) is now fetched from the Vercel Scraper API instead.
 */
function getDb() {
  if (db) return db;
  if (typeof window === "undefined") {
    try {
      const Database = require("better-sqlite3");
      const path = require("path");
      
      // Separate the local audit database from the former signal database
      const dbPath = process.env.DB_PATH || path.join(process.cwd(), "cerberus_audit.db");
      
      db = new Database(dbPath);
      logger.info(`[Database] SQLite connected: ${dbPath}`);
      
      // Only keep the local decision/audit log table
      db.exec(`
        CREATE TABLE IF NOT EXISTS decisions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cycle INTEGER,
          timestamp TEXT,
          action TEXT,
          reasoning TEXT,
          threat_score REAL,
          volatility REAL,
          price REAL,
          executed INTEGER DEFAULT 0,
          tx_hash TEXT
        );
      `);
      
      // Cleanly remove the old signals table if it existed from previous versions
      try {
        db.exec("DROP TABLE IF EXISTS tweets;");
      } catch {}
      
    } catch (err) {
      logger.error("[Database] Initialization failed:", err);
      db = null;
    }
  }
  return db;
}

export function getDatabase() {
  return getDb();
}

/**
 * Real implementation only: no GitHub fallbacks or mock data.
 */
export async function getDatabaseAsync(): Promise<any> {
    return getDb();
}

export function isDbAvailable(): boolean {
  return getDb() !== null;
}