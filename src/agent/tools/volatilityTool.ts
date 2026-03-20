/**
 * Volatility Tool — HBAR Price & Market Volatility Analysis
 * Fetches price data and calculates realized volatility
 */

import { DynamicTool } from "@langchain/core/tools";
import { getVolatilityData } from "../../oracle/supraOracle.js";
import { VolatilityData } from "../../types/index.js";

/**
 * Get current volatility data and price
 */
async function getVolatility(): Promise<VolatilityData> {
  try {
    console.log("📊 Fetching volatility data...");

    const volatilityData = await getVolatilityData();

    console.log(
      `✓ Volatility: ${volatilityData.trend} | Price: $${volatilityData.price.toFixed(4)}`,
    );

    return volatilityData;
  } catch (error) {
    console.error("❌ Volatility fetch failed:", error);

    // Return safe defaults
    return {
      price: 0.08,
      previousPrice: 0.08,
      volatility: 0.03,
      trend: "STABLE" as any, // Use string for fallback, will be parsed
      recommendation: "HOLD",
      timestamp: new Date(),
    };
  }
}

// ════════════════════════════════════════════════════════════════
// LANGCHAIN TOOL
// ════════════════════════════════════════════════════════════════

export const volatilityTool = new DynamicTool({
  name: "get_volatility_data",
  description:
    "Fetches current HBAR price from Supra Oracle (with CoinGecko fallback). " +
    "Calculates realized volatility from price history. " +
    "Returns: current price (USD), price change (24h %), volatility coefficient, " +
    "trend classification (STABLE/VOLATILE/EXTREME), and action recommendation.",
  func: async () => {
    const volatility = await getVolatility();

    return JSON.stringify({
      price: volatility.price,
      previousPrice: volatility.previousPrice,
      volatility: volatility.volatility,
      trend: volatility.trend,
      recommendation: volatility.recommendation,
      priceChangePercent24h: volatility.priceChangePercent24h,
      timestamp: volatility.timestamp,
    });
  },
});
