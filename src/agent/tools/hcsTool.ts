/**
 * Hedera Consensus Service (HCS) Logging Tool for LangChain Agent
 * Logs every agent decision to an immutable audit trail
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { submitTopicMessage, getOrCreateTopic } from "../../hedera/hederaClient.js";

const hcsToolSchema = z.object({
  action: z.enum(["HOLD", "HARVEST", "WITHDRAW", "EMERGENCY_EXIT"]).describe("Action taken by agent"),
  threat_level: z
    .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .describe("Current threat level"),
  volatility_level: z
    .enum(["STABLE", "VOLATILE", "EXTREME"])
    .describe("Current volatility classification"),
  reasoning: z.string().describe("Explanation of the decision"),
  txHash: z.string().optional().describe("Vault transaction hash if action executed"),
});

/**
 * Submit a decision message to HCS
 */
async function submitDecisionToHCS(
  action: string,
  threatLevel: string,
  volatilityLevel: string,
  reasoning: string,
  txHash?: string,
): Promise<{
  sequenceNumber: number;
  timestamp: string;
  topicId: string;
  messageHash: string;
}> {
  try {
    // Create message payload
    const message = {
      action,
      threat_level: threatLevel,
      volatility_level: volatilityLevel,
      reasoning,
      txHash: txHash || null,
      timestamp: new Date().toISOString(),
      agent: "SENTINEL",
      version: "1.0",
    };

    const messageString = JSON.stringify(message);

    // Submit to HCS
    console.log("📤 Submitting decision to HCS...");

    const result = await submitTopicMessage(messageString);
    const topicId = await getOrCreateTopic();

    console.log(`✓ HCS message submitted: seq=${result.sequenceNumber}, topic=${topicId}`);

    return {
      sequenceNumber: result.sequenceNumber,
      timestamp: new Date().toISOString(),
      topicId,
      messageHash: result.messageHash,
    };
  } catch (error) {
    console.error("✗ Failed to submit message to HCS:", error);
    throw error;
  }
}

export const hcsTool = tool(
  async (input) => {
    try {
      const result = await submitDecisionToHCS(
        input.action,
        input.threat_level,
        input.volatility_level,
        input.reasoning,
        input.txHash,
      );

      const hashscanUrl = `https://hashscan.io/testnet/topic/${result.topicId}`;

      return {
        success: true,
        sequenceNumber: result.sequenceNumber,
        topicId: result.topicId,
        timestamp: result.timestamp,
        hashscanUrl,
        message: `✓ Decision logged to HCS. View at ${hashscanUrl}`,
      };
    } catch (error) {
      console.error("✗ HCS logging tool failed:", error);

      // Gracefully handle HCS failures - still record decision locally
      return {
        success: false,
        sequenceNumber: 0,
        topicId: "",
        timestamp: new Date().toISOString(),
        hashscanUrl: "",
        message: `⚠  HCS logging failed: ${error instanceof Error ? error.message : "unknown"}, but decision recorded locally`,
      };
    }
  },
  {
    name: "log_decision_to_hcs",
    description:
      "Logs agent decision to Hedera Consensus Service for immutable audit trail. Creates permanent record of all vault protection actions.",
    schema: hcsToolSchema,
  },
);

export default hcsTool;
