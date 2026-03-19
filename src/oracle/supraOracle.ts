/**
 * SupraOracles & Price Oracle Module
 * Fetches HBAR/USDC price and calculates realized volatility
 */

import axios from "axios";
import { VolatilityData, VolatilityClassification } from "../types/index.js";
import * as dotenv from "dotenv";

dotenv.config();

// In-memory price history cache (last 100 data points)
let priceHistory: number[] = [];
const MAX_HISTORY = 100;

/**
 * Fetch price from CoinGecko API (fallback)
 */
async function getPriceFromCoinGecko(): Promise<{ hbar: number; usdc: number } | null> {
  try {
    const response = await axios.get("https://api.coingecko.com/api/v3/simple/price", {
      params: {
        ids: "hedera-hashgraph,usd-coin",
        vs_currencies: "usd",
      },
      timeout: 3000,
    });

    const hbarPrice = response.data["hedera-hashgraph"]?.usd || 0.15;
    const usdcPrice = response.data["usd-coin"]?.usd || 1.0;

    return { hbar: hbarPrice, usdc: usdcPrice };
  } catch (error) {
    console.warn(
      "⚠  CoinGecko API failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return null;
  }
}

/**
 * Fetch price from SupraOracles on-chain (Hedera EVM)
 * Returns HBAR/USDC price from pair index 64
 */
async function getPriceFromSupraOracles(): Promise<{ hbar: number; usdc: number } | null> {
  try {
    const supraAddress = process.env.SUPRA_ORACLE_ADDRESS;
    if (!supraAddress) {
      return null;
    }

    // In production, would use ethers.js to call getSvalue(64) on Supra contract
    // For now, return null to fall through to CoinGecko
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get current HBAR/USDC price with fallbacks
 */
export async function getHBARPrice(): Promise<{ hbar: number; usdc: number; rate: number }> {
  // Try SupraOracles first, then CoinGecko, then mock
  let prices = await getPriceFromSupraOracles();

  if (!prices) {
    prices = await getPriceFromCoinGecko();
  }

  if (!prices) {
    // Mock price for development
    console.warn("⚠  Using mock HBAR/USDC prices");
    prices = { hbar: 0.15, usdc: 1.0 };
  }

  const rate = prices.hbar / prices.usdc;

  // Update price history
  priceHistory.push(rate);
  if (priceHistory.length > MAX_HISTORY) {
    priceHistory = priceHistory.slice(-MAX_HISTORY);
  }

  return { hbar: prices.hbar, usdc: prices.usdc, rate };
}

/**
 * Calculate annualized realized volatility from price history
 * Uses log returns formula: vol = std(ln(p_t / p_t-1)) * sqrt(252)
 */
export function calculateRealizedVolatility(prices: number[]): number {
  if (prices.length < 2) {
    return 0;
  }

  // Calculate log returns
  const logReturns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const ret = Math.log(prices[i] / prices[i - 1]);
    logReturns.push(ret);
  }

  if (logReturns.length === 0) {
    return 0;
  }

  // Calculate mean
  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;

  // Calculate variance
  const variance =
    logReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / logReturns.length;

  // Standard deviation
  const stdDev = Math.sqrt(variance);

  // Annualize (252 trading days per year)
  const annualizedVol = stdDev * Math.sqrt(252);

  return annualizedVol;
}

/**
 * Classify volatility trend based on realized volatility
 */
export function classifyVolatilityTrend(volatility: number): VolatilityClassification {
  if (volatility < 0.15) return VolatilityClassification.STABLE;
  if (volatility < 0.5) return VolatilityClassification.VOLATILE;
  return VolatilityClassification.EXTREME;
}

/**
 * Get complete volatility data snapshot
 */
export async function getVolatilityData(): Promise<VolatilityData> {
  try {
    const priceData = await getHBARPrice();
    const currentPrice = priceData.rate;

    // Get 24h ago price from history (rough approximation if only recent data)
    const price24hAgo = priceHistory.length > 1 ? priceHistory[0] : currentPrice;
    const priceChange24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;

    // Calculate realized volatility
    const realizedVol = calculateRealizedVolatility(priceHistory);

    // Classify trend
    const classification = classifyVolatilityTrend(realizedVol);

    const volatilityData: VolatilityData = {
      currentPrice,
      priceChangePercent24h: Math.round(priceChange24h * 100) / 100,
      realizedVolatility: Math.round(realizedVol * 10000) / 10000,
      volatilityClassification: classification,
      dataSource: "coingecko",
      timestamp: new Date(),
      price_feed: {
        hbar: priceData.hbar,
        usdc: priceData.usdc,
        usd_value: currentPrice,
      },
    };

    console.log(
      `✓ Volatility: ${volatilityData.volatilityClassification} (${(volatilityData.realizedVolatility * 100).toFixed(2)}%) | ` +
        `Price: $${volatilityData.currentPrice.toFixed(4)} (${volatilityData.priceChangePercent24h > 0 ? "+" : ""}${volatilityData.priceChangePercent24h.toFixed(2)}%)`,
    );

    return volatilityData;
  } catch (error) {
    console.error("✗ Failed to get volatility data:", error);

    // Return safe default on error
    return {
      currentPrice: 0.15,
      priceChangePercent24h: 0,
      realizedVolatility: 0,
      volatilityClassification: VolatilityClassification.STABLE,
      dataSource: "mock",
      timestamp: new Date(),
      price_feed: {
        hbar: 0.15,
        usdc: 1.0,
        usd_value: 0.15,
      },
    };
  }
}

/**
 * Warm up price history with some initial data
 */
export async function warmupPriceHistory(numPoints: number = 10): Promise<void> {
  try {
    for (let i = 0; i < numPoints; i++) {
      await getHBARPrice();
      // Small delay between fetches to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    console.log(`✓ Warmed up price history with ${numPoints} data points`);
  } catch (error) {
    console.error("✗ Failed to warm up price history:", error);
  }
}

/**
 * Get current price history
 */
export function getPriceHistory(): number[] {
  return [...priceHistory];
}

export default {
  getHBARPrice,
  getVolatilityData,
  calculateRealizedVolatility,
  classifyVolatilityTrend,
  warmupPriceHistory,
  getPriceHistory,
};
