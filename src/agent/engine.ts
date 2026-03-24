import { POLL_INTERVAL_MS, HEDERA_EVM_ADDRESS } from "@/lib/config";
import { fetchMarketData } from "./scraper";
import { getPrediction, Prediction } from "./predictor";
import {
  getVaultPosition, getUnderlyingBalance,
  depositToVault, redeemAllShares, redeemPercent, VaultPosition,
} from "@/bonzo/vault";
import { swapUnderlyingToUSDC, swapUSDCToUnderlying } from "@/bonzo/saucerswap";
import { logger } from "@/lib/serverLogger";

interface AgentState {
  inVault:      boolean;
  lastSignal:   string;
  lastAction:   string;
  lastActionAt: Date | null;
  cycleCount:   number;
}

const state: AgentState = {
  inVault:      true,   // Assumes starting in vault; verified each cycle
  lastSignal:   "UNKNOWN",
  lastAction:   "NONE",
  lastActionAt: null,
  cycleCount:   0,
};

async function executeExit(prediction: Prediction): Promise<void> {
  logger.info("━━━ ACTION: EXIT VAULT ━━━");
  if (prediction.urgency === "MEDIUM" && prediction.confidence < 70) {
    logger.info("[Agent] Medium urgency — partial exit (50%)");
    await redeemPercent(50, HEDERA_EVM_ADDRESS);
  } else {
    logger.info("[Agent] High urgency / high confidence — full exit");
    await redeemAllShares(HEDERA_EVM_ADDRESS);
  }
  logger.info("[Agent] Swapping underlying → USDC for safety ...");
  const swapResult = await swapUnderlyingToUSDC();
  logger.info(`[Agent] Protected ${swapResult.amountIn} underlying → ${swapResult.amountOut} USDC`);
  state.inVault     = false;
  state.lastAction  = "EXIT_VAULT";
  state.lastActionAt = new Date();
}

async function executeReEnter(): Promise<void> {
  logger.info("━━━ ACTION: RE-ENTER VAULT ━━━");
  const swapResult = await swapUSDCToUnderlying();
  logger.info(`[Agent] Swapped ${swapResult.amountIn} USDC → ${swapResult.amountOut} underlying`);
  const balance = await getUnderlyingBalance(HEDERA_EVM_ADDRESS);
  if (balance === 0n) {
    logger.error("[Agent] Underlying balance is zero after swap — aborting re-entry.");
    return;
  }
  logger.info(`[Agent] Depositing ${balance.toString()} underlying into Bonzo vault ...`);
  await depositToVault(balance, HEDERA_EVM_ADDRESS);
  state.inVault     = true;
  state.lastAction  = "RE_ENTER_VAULT";
  state.lastActionAt = new Date();
}

function executeHold(): void {
  logger.info("━━━ ACTION: HOLD — no changes ━━━");
  state.lastAction = "HOLD";
}

export async function runCycle(): Promise<void> {
  state.cycleCount++;
  logger.info(`\n${"═".repeat(60)}`);
  logger.info(`[Agent] Cycle #${state.cycleCount} | inVault (cached): ${state.inVault}`);

  try {
    const position: VaultPosition = await getVaultPosition(HEDERA_EVM_ADDRESS);
    logger.info(`[Agent] Current Position: ${position.sharesFormatted} shares (~${position.assetsFormatted} underlying)`);
    state.inVault = position.sharesBalance > 0n;
  } catch (err: any) {
    logger.error(`[Agent] Failed to read vault position: ${err.message}`);
  }

  const marketData = await fetchMarketData();
  const prediction = await getPrediction(marketData, state.inVault);
  state.lastSignal  = prediction.signal;

  try {
    if (prediction.action === "EXIT_VAULT" && state.inVault) {
      await executeExit(prediction);
    } else if (prediction.action === "RE_ENTER_VAULT" && !state.inVault) {
      await executeReEnter();
    } else {
      if (prediction.action === "EXIT_VAULT" && !state.inVault)
        logger.info("[Agent] EXIT signal but already out — HOLDing USDC.");
      if (prediction.action === "RE_ENTER_VAULT" && state.inVault)
        logger.info("[Agent] RE_ENTER signal but already in vault — HOLDing.");
      executeHold();
    }
  } catch (err: any) {
    logger.error(`[Agent] Action failed: ${err.message}`);
  }

  logger.info(`[Agent] Cycle complete. inVault=${state.inVault}  lastAction=${state.lastAction}`);
}

export async function startAgent(): Promise<void> {
  logger.info("╔════════════════════════════════════════╗");
  logger.info("║   Bonzo-Hedera Autonomous Agent v1.1   ║");
  logger.info("╚════════════════════════════════════════╝");
  logger.info(`[Agent] Poll interval: ${POLL_INTERVAL_MS / 1000}s`);

  // Initial run
  await runCycle().catch(err => logger.error(`[Agent] Initial cycle error: ${err.message}`));

  // Scheduled runs
  setInterval(async () => {
    try { await runCycle(); }
    catch (err: any) { logger.error(`[Agent] Unhandled cyclic error: ${err.message}`); }
  }, POLL_INTERVAL_MS);
}
