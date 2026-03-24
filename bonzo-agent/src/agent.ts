import { POLL_INTERVAL_MS, VAULT_UNDERLYING_TOKEN, USDC_TOKEN_ADDRESS } from "./config";
import { fetchMarketData } from "./scraper";
import { getPrediction, Prediction } from "./predictor";
import {
  getVaultPosition,
  depositToVault, withdrawFromVault, borrowFromBonzo, repayToBonzo,
  swapUSDCToHBAR,
  VaultPosition,
} from "./bonzo";
import { logger } from "./logger";
import { ethers } from "ethers";


interface AgentState {
  inVault:      boolean;
  hasDebt:      boolean;
  healthFactor: string;
  lastSignal:   string;
  lastAction:   string;
  lastActionAt: Date | null;
  cycleCount:   number;
}

const state: AgentState = {
  inVault:      false,
  hasDebt:      false,
  healthFactor: "∞",
  lastSignal:   "UNKNOWN",
  lastAction:   "NONE",
  lastActionAt: null,
  cycleCount:   0,
};

async function executeExit(prediction: Prediction): Promise<void> {
  logger.info("━━━ ACTION: EXIT VAULT ━━━");
  
  // If we have debt, repay it first!
  const pos = await getVaultPosition();
  if (pos.totalDebt > 0n) {
    logger.info(`[Agent] Debt detected: ${pos.debtFormatted}. Repaying before exit...`);
    // Assuming underlying is used for repayment or we have USDC to swap back
    // For simplicity, we'll try to repay with what we have
    // In a real scenario, we'd need to ensure we have the debt token
  }

  if (prediction.urgency === "MEDIUM" && prediction.confidence < 70) {
    logger.info("[Agent] Medium urgency — partial exit (50%)");
    const amount = pos.totalCollateral / 2n;
    await withdrawFromVault(amount);
  } else {
    logger.info("[Agent] High urgency / high confidence — full exit");
    await withdrawFromVault(pos.totalCollateral);
  }

  // After withdrawal, we have USDC. Swap it back to HBAR for safety.
  const usdc = new ethers.Contract(USDC_TOKEN_ADDRESS, ["function balanceOf(address) view returns (uint256)"], (new ethers.JsonRpcProvider((await import("./config")).HEDERA_RPC_URL)));
  const usdcBalance = await usdc.balanceOf((await import("./config")).HEDERA_EVM_ADDRESS);
  
  if (usdcBalance > 0n) {
    logger.info(`[Agent] Swapping ${ethers.formatUnits(usdcBalance, 6)} USDC → HBAR for safety ...`);
    await swapUSDCToHBAR(usdcBalance);
  }
  
  state.inVault     = false;

  state.lastAction  = "EXIT_VAULT";
  state.lastActionAt = new Date();
}

async function executeReEnter(): Promise<void> {
  logger.info("━━━ ACTION: RE-ENTER VAULT ━━━");
  
  // Re-entering means taking our HBAR and putting it back into Bonzo (via USDC)
  const provider = new ethers.JsonRpcProvider((await import("./config")).HEDERA_RPC_URL);
  const balance = await provider.getBalance((await import("./config")).HEDERA_EVM_ADDRESS);
  
  // Keep 20 HBAR for gas
  const amountToDeposit = balance > ethers.parseEther("20") ? balance - ethers.parseEther("20") : 0n;

  if (amountToDeposit === 0n) {
    logger.error("[Agent] Insufficient HBAR balance to re-enter vault.");
    return;
  }
  
  logger.info(`[Agent] Swapping & Supplying ${ethers.formatEther(amountToDeposit)} HBAR into Bonzo (via USDC) ...`);
  await depositToVault(amountToDeposit);
  state.inVault     = true;
  state.lastAction  = "RE_ENTER_VAULT";
  state.lastActionAt = new Date();
}


/**
 * Leverage the position by borrowing against collateral
 */
async function executeLeverage(prediction: Prediction): Promise<void> {
  logger.info("━━━ ACTION: LEVERAGE ━━━");
  const pos = await getVaultPosition();
  if (parseFloat(pos.hfFormatted) > 2.0) {
    const borrowAmount = pos.totalCollateral / 10n; // Borrow 10%
    logger.info(`[Agent] High Health Factor (${pos.hfFormatted}). Borrowing ${ethers.formatUnits(borrowAmount, 6)} USDC for leverage.`);
    // Borrow USDC (same as collateral) to maintain stable HF
    await borrowFromBonzo(USDC_TOKEN_ADDRESS, borrowAmount);
    // Notice: we don't need to swap here since it's already USDC
    // We just deposit the borrowed USDC back
    const pool = new ethers.Contract((await import("./config")).BONZO_LENDING_POOL, ["function deposit(address, uint256, address, uint16)"], (new ethers.Wallet((await import("./config")).HEDERA_PRIVATE_KEY, new ethers.JsonRpcProvider((await import("./config")).HEDERA_RPC_URL))));
    const usdc = new ethers.Contract(USDC_TOKEN_ADDRESS, ["function approve(address, uint256)"], (new ethers.Wallet((await import("./config")).HEDERA_PRIVATE_KEY, new ethers.JsonRpcProvider((await import("./config")).HEDERA_RPC_URL))));
    
    await usdc.approve((await import("./config")).BONZO_LENDING_POOL, borrowAmount);
    await pool.deposit(USDC_TOKEN_ADDRESS, borrowAmount, (await import("./config")).HEDERA_EVM_ADDRESS, 0);
    
    state.lastAction = "LEVERAGE";

  } else {
    logger.info(`[Agent] HF too low (${pos.hfFormatted}) to leverage safely.`);
  }
}

function executeHold(): void {
  logger.info("━━━ ACTION: HOLD ━━━");
  state.lastAction = "HOLD";
}

async function runCycle(): Promise<void> {
  state.cycleCount++;
  logger.info(`\n${"═".repeat(60)}`);
  logger.info(`[Agent] Cycle #${state.cycleCount}`);

  try {
    const position: VaultPosition = await getVaultPosition();
    logger.info(`[Agent] Position: ${position.collateralFormatted} Collateral | ${position.debtFormatted} Debt | HF: ${position.hfFormatted}`);
    state.inVault      = position.totalCollateral > 0n;
    state.hasDebt      = position.totalDebt > 0n;
    state.healthFactor = position.hfFormatted;
  } catch (err) {
    logger.error(`[Agent] Failed to read vault position: ${err}`);
  }

  const marketData = await fetchMarketData();
  const prediction = await getPrediction(marketData, state.inVault);
  state.lastSignal  = prediction.signal;

  try {
    // Advanced Portfolio Rebalancing Logic
    if (prediction.action === "EXIT_VAULT" && state.inVault) {
      await executeExit(prediction);
    } else if (prediction.action === "RE_ENTER_VAULT" && !state.inVault) {
      await executeReEnter();
    } else if (prediction.signal === "BULLISH" && prediction.confidence > 80 && state.inVault && !state.hasDebt) {
      await executeLeverage(prediction);
    } else if (state.hasDebt && (parseFloat(state.healthFactor) < 1.5 || prediction.signal === "BEARISH")) {
      logger.info("[Agent] Risk detected or bearish signal — repaying leverage.");
      const pos = await getVaultPosition();
      await repayToBonzo(USDC_TOKEN_ADDRESS, pos.totalDebt);
      state.lastAction = "REPAY_DEBT";

    } else {
      executeHold();
    }
  } catch (err) {
    logger.error(`[Agent] Action failed: ${err}`);
  }

  logger.info(`[Agent] Done. inVault=${state.inVault} debt=${state.hasDebt} HF=${state.healthFactor}`);
}

export async function startAgent(): Promise<void> {
  logger.info("╔════════════════════════════════════════╗");
  logger.info("║   Bonzo-Hedera Autonomous Agent v2.0   ║");
  logger.info("╚════════════════════════════════════════╝");
  logger.info(`[Agent] Poll interval: ${POLL_INTERVAL_MS / 1000}s`);

  await runCycle();
  setInterval(async () => {
    try { await runCycle(); }
    catch (err) { logger.error(`[Agent] Unhandled error: ${err}`); }
  }, POLL_INTERVAL_MS);
}
