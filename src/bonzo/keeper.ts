import { ThreatAnalysis, VaultPosition } from "@/lib/types";
import { VolatilityResult } from "@/analysis/volatilityCalculator";
import { getUserAccountData, deposit, withdraw } from "./lendingPool";
import { THREAT_THRESHOLD } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { KeeperAction } from "./types";
import { ethers } from "ethers";

const WHBAR_ADDRESS = process.env.BONZO_WETH_GATEWAY || "0x0000000000000000000000000000000000163b5a";
const ADJUST_FRACTION = 0.20;
const BONZO_CONTRACT_ID = "0.0.7154915";

async function getBonzoBalanceFromTransactions(accountId: string): Promise<number> {
  try {
    let totalDeposited = 0;
    let totalWithdrawn = 0;
    let nextUrl: string | null =
      `https://testnet.mirrornode.hedera.com/api/v1/transactions?account.id=${accountId}&limit=100&order=desc&transactiontype=CONTRACTCALL`;

    let pages = 0;
    while (nextUrl && pages < 5) {
      const res: Response = await fetch(nextUrl);
      const data: any = await res.json();
      const txs: any[] = data?.transactions ?? [];

      for (const tx of txs) {
        if (tx.result !== "SUCCESS") continue;
        if (tx.name !== "CONTRACTCALL") continue;
        if (tx.entity_id !== BONZO_CONTRACT_ID) continue;

        for (const transfer of tx.transfers ?? []) {
          if (transfer.account !== accountId) continue;
          if (transfer.amount < 0) {
            const netAmount = Math.abs(transfer.amount) - (tx.charged_tx_fee ?? 0);
            const hbar = netAmount / 1e8;
            if (hbar > 0.5) {
              totalDeposited += netAmount;
            }
          } else if (transfer.amount > 0) {
            totalWithdrawn += transfer.amount;
          }
        }
      }

      nextUrl = data?.links?.next
        ? `https://testnet.mirrornode.hedera.com${data.links.next}`
        : null;
      pages++;
    }

    const netHBAR = (totalDeposited - totalWithdrawn) / 1e8;
    logger.info(`Bonzo balance for ${accountId}: deposited=${totalDeposited / 1e8} withdrawn=${totalWithdrawn / 1e8} net=${netHBAR}`);
    return Math.max(0, parseFloat(netHBAR.toFixed(4)));
  } catch (err) {
    logger.error("getBonzoBalanceFromTransactions failed", err);
    return 0;
  }
}

export async function getVaultPosition(accountId?: string): Promise<VaultPosition> {
  if (!accountId) {
    return {
      asset: "HBAR", deposited: "0.0000", borrowed: "0.0000",
      healthFactor: "∞", apy: "94.15%", rewards: "0.0000",
    };
  }

  // Try EVM contract first
  try {
    const data = await getUserAccountData(accountId);
    const maxUint = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");
    if (data && data.totalCollateralETH > 0n) {
      const healthFactor = data.healthFactor === maxUint
        ? "∞" : (Number(data.healthFactor) / 1e18).toFixed(2);
      logger.info(`EVM position for ${accountId}: ${Number(data.totalCollateralETH) / 1e18} HBAR`);
      return {
        asset: "HBAR",
        deposited: (Number(data.totalCollateralETH) / 1e18).toFixed(4),
        borrowed: (Number(data.totalDebtETH) / 1e18).toFixed(4),
        healthFactor, apy: "94.15%",
        rewards: (Number(data.availableBorrowsETH) / 1e18).toFixed(4),
      };
    }
  } catch (err) {
    logger.warn("EVM contract call failed, using transaction history", err);
  }

  // Fallback: calculate from mirror node transaction history
  const balance = await getBonzoBalanceFromTransactions(accountId);
  logger.info(`Transaction-based balance for ${accountId}: ${balance} HBAR`);

  return {
    asset: "HBAR",
    deposited: balance.toFixed(4),
    borrowed: "0.0000",
    healthFactor: "∞",
    apy: "94.15%",
    rewards: "0.0000",
  };
}

export function determineKeeperAction(
  threat: ThreatAnalysis,
  volatility: VolatilityResult,
  price: number
): KeeperAction {
  if (threat.level === "CRITICAL" || threat.score > 0.85)
    return { type: "PROTECT", reason: `CRITICAL threat (score: ${threat.score.toFixed(2)}). ${threat.summary}. Withdrawing to safety.` };
  if (threat.level === "HIGH" || (threat.score > THREAT_THRESHOLD && volatility.isHigh))
    return { type: "WIDEN", reason: `High threat (${threat.score.toFixed(2)}) with ${volatility.level} volatility. Widening ranges.` };
  if (threat.sentiment === "BEARISH" && threat.score > 0.4)
    return { type: "HARVEST", reason: `Bearish sentiment with elevated threat (${threat.score.toFixed(2)}). Harvesting rewards now.` };
  if (threat.score < 0.3 && !volatility.isHigh)
    return { type: "TIGHTEN", reason: `Low threat (${threat.score.toFixed(2)}) and low volatility. Tightening ranges for higher fees.` };
  if (threat.sentiment === "BULLISH" && threat.score < 0.4)
    return { type: "HOLD", reason: `Bullish sentiment, low threat (${threat.score.toFixed(2)}). Accumulating rewards.` };
  return { type: "HOLD", reason: `Moderate conditions (threat: ${threat.score.toFixed(2)}, vol: ${volatility.realized.toFixed(4)}). Holding.` };
}

export async function executeKeeperAction(
  action: KeeperAction,
  currentDepositHBAR: number = 10.0
): Promise<string | null> {
  logger.info(`Executing keeper action: ${action.type}`);
  switch (action.type) {
    case "PROTECT": {
      const amount = ethers.parseUnits((currentDepositHBAR * 0.50).toFixed(8), 18);
      const txHash = await withdraw(WHBAR_ADDRESS, amount);
      if (txHash) { logger.info(`PROTECT — tx: ${txHash}`); return txHash; }
      return null;
    }
    case "WIDEN":
    case "HARVEST": {
      const amount = ethers.parseUnits((currentDepositHBAR * ADJUST_FRACTION).toFixed(8), 18);
      const txHash = await withdraw(WHBAR_ADDRESS, amount);
      if (txHash) { logger.info(`${action.type} — tx: ${txHash}`); return txHash; }
      return null;
    }
    case "TIGHTEN": {
      const amount = ethers.parseUnits((currentDepositHBAR * ADJUST_FRACTION).toFixed(8), 18);
      const txHash = await deposit(WHBAR_ADDRESS, amount);
      if (txHash) { logger.info(`TIGHTEN — tx: ${txHash}`); return txHash; }
      return null;
    }
    case "HOLD":
    default:
      logger.info("HOLD — no vault adjustment needed");
      return null;
  }
}