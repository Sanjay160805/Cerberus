import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { getHBARUSDPrice } from "@/oracle/priceFeeds";
import { scoreThreat } from "@/analysis/threatScorer";
import { getVaultPosition, executeKeeperAction } from "@/bonzo/keeper";
import { calculateVolatility } from "@/analysis/volatilityCalculator";

// Read-only tools for the AI to understand the current state
export const oraclePriceTool = tool(
  async () => JSON.stringify(await getHBARUSDPrice()),
  { name: "get_oracle_price", description: "Get current HBAR/USDC price from Supra Oracle", schema: z.object({}) }
);

export const threatAnalysisTool = tool(
  async () => JSON.stringify(await scoreThreat()),
  { name: "analyze_threat", description: "Analyze current geopolitical and market threat level from recent tweets", schema: z.object({}) }
);

export const vaultPositionTool = tool(
  async () => JSON.stringify(await getVaultPosition()),
  { name: "get_vault_position", description: "Get current Bonzo vault position including deposits, borrows and health factor", schema: z.object({}) }
);

export const volatilityTool = tool(
  async () => JSON.stringify(calculateVolatility()),
  { name: "get_volatility", description: "Get recent HBAR price volatility metrics", schema: z.object({}) }
);

// Write tools for the AI to execute actions
export const executeKeeperActionTool = tool(
  async ({ action, reason, amountNative }) => {
    try {
      const txHash = await executeKeeperAction({ type: action as any, reason }, Number(amountNative));
      return `Action ${action} executed successfully. TX Hash: ${txHash}`;
    } catch (e: any) {
      return `Failed to execute ${action}: ${e.message}`;
    }
  },
  { 
    name: "execute_keeper_action", 
    description: "Execute a portfolio action on Bonzo Finance (TIGHTEN/deposit, WIDEN/withdraw, PROTECT/withdraw all, BORROW, REPAY).", 
    schema: z.object({
      action: z.enum(["TIGHTEN", "WIDEN", "PROTECT", "BORROW", "REPAY", "HOLD"]),
      reason: z.string().describe("Explanation for why this action was chosen"),
      amountNative: z.number().describe("The amount in native HBAR/tokens to apply the action on (e.g., 10 for 10 HBAR)")
    }) 
  }
);

export const agentTools = [oraclePriceTool, threatAnalysisTool, vaultPositionTool, volatilityTool, executeKeeperActionTool];
