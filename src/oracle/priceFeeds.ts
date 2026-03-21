import { getHBARPrice, PriceData } from './supraClient';

let cachedPrice: PriceData | null = null;
let lastFetch = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min cache (oracle updates hourly anyway)

export async function getHBARUSDPrice(): Promise<number> {
  const now = Date.now();
  if (cachedPrice && now - lastFetch < CACHE_TTL_MS) {
    return cachedPrice.price;
  }
  cachedPrice = await getHBARPrice();
  lastFetch = now;
  return cachedPrice.price;
}

export async function getPriceFeedMeta(): Promise<PriceData | null> {
  return cachedPrice;
}