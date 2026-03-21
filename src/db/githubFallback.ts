// src/db/githubFallback.ts
import https from 'https';

const GITHUB_RAW_DB_URL =
  'https://github.com/Sanjay160805/Sentinel/raw/data/crypto_tweets.db';

/**
 * Downloads tweets.db from the data branch into /tmp (writable on Vercel).
 * Returns the local path. Cached for the lifetime of the Lambda warm instance.
 */
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // re-download at most every 5 min

export async function getLocalDbPath(): Promise<string> {
  const tmpPath = '/tmp/tweets.db';

  if (Date.now() - cachedAt < CACHE_TTL_MS) return tmpPath;

  await new Promise<void>((resolve, reject) => {
    const file = require('fs').createWriteStream(tmpPath);
    https.get(GITHUB_RAW_DB_URL, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });

  cachedAt = Date.now();
  return tmpPath;
}