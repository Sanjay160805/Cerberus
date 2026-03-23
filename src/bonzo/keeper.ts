import { ThreatAnalysis, VaultPosition } from "@/lib/types";
import { VolatilityResult } from "@/analysis/volatilityCalculator";
import { getUserAccountData } from "./lendingPool";
import { THREAT_THRESHOLD } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { KeeperAction } from "./types";
import { depositHBAR, withdrawHBAR } from "./wethGateway";
import { BONZO_LENDING_POOL } from "@/lib/constants";

const ADJUST_FRACTION = 0.20;

// ─── Vault position ────────────────────────────────────────────────────────────
export async function getVaultPosition(
  accountId?: string
): Promise<VaultPosition> {
  if (!accountId) {
    return {
      asset: "HBAR",
      deposited: "0.0000",
      borrowed: "0.0000",
      healthFactor: "∞",
      apy: "94.15%",
      rewards: "0.0000",
    };
  }

  try {
    const data = await getUserAccountData(accountId);
    if (!data) throw new Error("Could not retrieve user account data from Bonzo");

    const healthFactor =
      Number(data.healthFactor) / 1e18 > 1e15
        ? "∞"
        : (Number(data.healthFactor) / 1e18).toFixed(2);
    
    return {
      asset: "HBAR",
      deposited: (Number(data.totalCollateralETH) / 1e18).toFixed(4),
      borrowed: (Number(data.totalDebtETH) / 1e18).toFixed(4),
      healthFactor,
      apy: "94.15%",
      rewards: (Number(data.availableBorrowsETH) / 1e18).toFixed(4),
    };
  } catch (err) {
    logger.error("Real-time Bonzo position fetch failed:", err);
    throw err; // Real implementation only, no fallbacks
  }
}

// ─── Keeper decision ───────────────────────────────────────────────────────────
export function determineKeeperAction(
  threat: ThreatAnalysis,
  volatility: VolatilityResult,
  price: number
): KeeperAction {
  if (threat.level === "CRITICAL" || threat.score > 0.85)
    return {
      type: "PROTECT",
      reason:
        `CRITICAL threat (score: ${threat.score.toFixed(2)}). ` +
        `${threat.summary}. Withdrawing to safety.`,
    };
  if (
    threat.level === "HIGH" ||
    (threat.score > THREAT_THRESHOLD && volatility.isHigh)
  )
    return {
      type: "WIDEN",
      reason:
        `High threat (${threat.score.toFixed(2)}) with ` +
        `${volatility.level} volatility. Widening ranges.`,
    };
  if (threat.sentiment === "BEARISH" && threat.score > 0.4)
    return {
      type: "HARVEST",
      reason:
        `Bearish sentiment with elevated threat (${threat.score.toFixed(2)}). ` +
        `Harvesting rewards now.`,
    };
  if (threat.score < 0.3 && !volatility.isHigh)
    return {
      type: "TIGHTEN",
      reason:
        `Low threat (${threat.score.toFixed(2)}) and low volatility. ` +
        `Tightening ranges for higher fees.`,
    };
  if (threat.sentiment === "BULLISH" && threat.score < 0.4)
    return {
      type: "HOLD",
      reason:
        `Bullish sentiment, low threat (${threat.score.toFixed(2)}). ` +
        `Accumulating rewards.`,
    };
  return {
    type: "HOLD",
    reason:
      `Moderate conditions (threat: ${threat.score.toFixed(2)}, ` +
      `vol: ${volatility.realized.toFixed(4)}). Holding.`,
  };
}

// ─── Execute action ────────────────────────────────────────────────────────────
export async function executeKeeperAction(
  action: KeeperAction,
  currentDepositHBAR: number = 16.0,
  accountId?: string
): Promise<string | null> {
  logger.info(`Executing keeper action: ${action.type}`);

  switch (action.type) {
    case "PROTECT": {
      const amountNative = currentDepositHBAR * 0.50;
      const amountWei = BigInt(Math.floor(amountNative * 1e8)) * BigInt(1e10);
      return await withdrawHBAR(BONZO_LENDING_POOL, amountWei, accountId);
    }

    case "WIDEN":
    case "HARVEST": {
      const amountNative = currentDepositHBAR * ADJUST_FRACTION;
      const amountWei = BigInt(Math.floor(amountNative * 1e8)) * BigInt(1e10);
      return await withdrawHBAR(BONZO_LENDING_POOL, amountWei, accountId);
    }

    case "TIGHTEN": {
      const amountNative = currentDepositHBAR * ADJUST_FRACTION;
      const amountWei = BigInt(Math.floor(amountNative * 1e8)) * BigInt(1e10);
      return await depositHBAR(BONZO_LENDING_POOL, amountWei, accountId);
    }

    case "HOLD":
    default:
      logger.info("HOLD — no vault adjustment needed");
      return null;
  }
}