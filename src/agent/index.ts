import { buildAgentGraph } from "./graph";
import { AgentStateType } from "./state";
import { CycleResult } from "@/lib/types";
import { logger } from "@/lib/logger";

let cycleCount = 0;

export async function runAgentCycle(): Promise<CycleResult | null> {
  cycleCount++;
  const cycle = cycleCount;
  logger.info(`⚡ [Cycle #${cycle}] Starting autonomous cycle...`);
  try {
    const app = buildAgentGraph();
    const finalState = await app.invoke({
      cycle,
      messages: [],
      threatAnalysis: null,
      volatility: null,
      price: 0,
      vaultPosition: null,
      decision: null,
      error: null,
    } as any);
    if (!finalState.decision) { logger.warn(`[Cycle #${cycle}] No decision produced`); return null; }
    logger.info(`✓ [Cycle #${cycle}] Decision: ${finalState.decision.action}`);
    return {
      decision: finalState.decision,
      threatAnalysis: finalState.threatAnalysis || { score: 0, level: "LOW", signals: [], sentiment: "NEUTRAL", summary: "No analysis" },
      priceData: { pair: "HBAR/USDC", price: finalState.price || 0, timestamp: Date.now() },
      position: finalState.vaultPosition || null,
    };
  } catch (error) {
    logger.error(`❌ [Cycle #${cycle}] Autonomous cycle failed`, error);
    return null;
  }
}

export function getCycleCount(): number { return cycleCount; }
