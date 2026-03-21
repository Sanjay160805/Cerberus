import fs from 'fs';

const GITHUB_RAW_DB_URL =
  'https://github.com/Sanjay160805/Sentinel/raw/data/tweets.db';

let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getLocalDbPath(): Promise<string> {
  const tmpPath = '/tmp/tweets.db';

  if (Date.now() - cachedAt < CACHE_TTL_MS) return tmpPath;

  const res = await fetch(GITHUB_RAW_DB_URL, {
    headers: { 'User-Agent': 'Sentinel-App' },
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const buffer = await res.arrayBuffer();
  fs.writeFileSync(tmpPath, Buffer.from(buffer));

  cachedAt = Date.now();
  return tmpPath;
}