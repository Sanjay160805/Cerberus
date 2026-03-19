/**
 * Vault State & Action Tools for LangChain Agent
 * Provides vault state queries and execute harvest/withdraw/emergency exit
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  getVaultState,
  executeHarvest,
  executeWithdraw,
  executeEmergencyExit,
} from "../../vault/bonzoVault.js";

// Vault State Query Tool
const vaultStateSchema = z.object({});

export const vaultStateTool = tool(
  async () => {
    try {
      const state = await getVaultState();

      return {
        assets: state.assets,
        totalSupply: state.totalSupply,
        pricePerShare: state.pricePerShare,
        tvl: state.tvl,
        lastUpdate: state.lastUpdate,
      };
    } catch (error) {
      console.error("✗ Vault state tool failed:", error);
      return {
        assets: 0,
        totalSupply: 0,
        pricePerShare: 1.0,
        tvl: 0,
        lastUpdate: new Date(),
      };
    }
  },
  {
    name: "get_vault_state",
    description:
      "Retrieves current Bonzo vault state including total assets, total supply, price per share, and TVL.",
    schema: vaultStateSchema,
  },
);

// Harvest Rewards Tool
const harvestSchema = z.object({});

export const harvestTool = tool(
  async () => {
    try {
      const result = await executeHarvest();

      return {
        success: result.success,
        txHash: result.txHash,
        message: result.success
          ? "✓ Harvest completed successfully"
          : "✗ Harvest failed",
      };
    } catch (error) {
      console.error("✗ Harvest tool failed:", error);
      return {
        success: false,
        txHash: "ERROR",
        message: `✗ Harvest failed: ${error instanceof Error ? error.message : "unknown"}`,
      };
    }
  },
  {
    name: "harvest_vault_rewards",
    description:
      "Calls vault.harvest() to collect and compound rewards. Returns transaction hash and success status.",
    schema: harvestSchema,
  },
);

// Withdraw Tool
const withdrawSchema = z.object({
  amount: z.number().positive().describe("Amount of HBAR to withdraw"),
});

export const withdrawTool = tool(
  async (input) => {
    try {
      const result = await executeWithdraw(input.amount);

      return {
        success: result.success,
        txHash: result.txHash,
        amountWithdrawn: result.amountWithdrawn || 0,
        message: result.success
          ? `✓ Withdrew ${input.amount} HBAR successfully`
          : "✗ Withdrawal failed",
      };
    } catch (error) {
      console.error("✗ Withdraw tool failed:", error);
      return {
        success: false,
        txHash: "ERROR",
        amountWithdrawn: 0,
        message: `✗ Withdrawal failed: ${error instanceof Error ? error.message : "unknown"}`,
      };
    }
  },
  {
    name: "withdraw_from_vault",
    description:
      "Withdraws a specified amount of HBAR from vault. Use when threat is HIGH to reduce exposure.",
    schema: withdrawSchema,
  },
);

// Emergency Exit Tool
const emergencyExitSchema = z.object({});

export const emergencyExitTool = tool(
  async () => {
    try {
      const result = await executeEmergencyExit();

      return {
        success: result.success,
        txHash: result.txHash,
        totalAssetsExited: result.totalAssetsExited || 0,
        message: result.success
          ? "🚨 EMERGENCY EXIT: All funds withdrawn successfully"
          : "✗ Emergency exit failed",
      };
    } catch (error) {
      console.error("✗ Emergency exit tool failed:", error);
      return {
        success: false,
        txHash: "ERROR",
        totalAssetsExited: 0,
        message: `✗ Emergency exit failed: ${error instanceof Error ? error.message : "unknown"}`,
      };
    }
  },
  {
    name: "emergency_exit_vault",
    description:
      "Executes immediate full exit from vault. Called only when CRITICAL threat is detected. All funds are withdrawn.",
    schema: emergencyExitSchema,
  },
);

export default {
  vaultStateTool,
  harvestTool,
  withdrawTool,
  emergencyExitTool,
};
