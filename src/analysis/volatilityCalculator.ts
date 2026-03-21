import { getPriceHistory, calculateRealizedVolatility } from "@/oracle/priceFeeds";
import { VOLATILITY_THRESHOLD } from "@/lib/constants";
import { logger } from "@/lib/logger";

export interface VolatilityResult {
  realized: number;
  isHigh: boolean;
  level: "LOW" | "MEDIUM" | "HIGH";
  trend: "INCREASING" | "DECREASING" | "STABLE";
}

export function calculateVolatility(): VolatilityResult {
  try {
    const vol = calculateRealizedVolatility();
    const history = getPriceHistory();
    let trend: "INCREASING" | "DECREASING" | "STABLE" = "STABLE";
    if (history.length >= 10) {
      const recent = history.slice(-5);
      const older = history.slice(-10, -5);
      const recentAvg = recent.reduce((s, p) => s + p.price, 0) / 5;
      const olderAvg = older.reduce((s, p) => s + p.price, 0) / 5;
      const change = (recentAvg - olderAvg) / olderAvg;
      if (change > 0.01) trend = "INCREASING";
      else if (change < -0.01) trend = "DECREASING";
    }
    return { realized: vol, isHigh: vol > VOLATILITY_THRESHOLD, level: vol > VOLATILITY_THRESHOLD * 2 ? "HIGH" : vol > VOLATILITY_THRESHOLD ? "MEDIUM" : "LOW", trend };
  } catch (error) {
    logger.error("Volatility calculation failed", error);
    return { realized: 0, isHigh: false, level: "LOW", trend: "STABLE" };
  }
}
