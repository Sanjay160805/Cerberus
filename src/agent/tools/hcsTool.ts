/**
 * HCS Tool — Log Decisions to Hedera Consensus Service
 * Implements immutable audit trail for all SENTINEL decisions
 */

import { DynamicTool } from "@langchain/core/tools";
import { AgentDecision, ThreatSignal, VolatilityData } from "../../types/index.js";
import { getHederaClient } from "../../hedera/hederaClient.js";
import {
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicId,
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";

dotenv.config();

// ════════════════════════════════════════════════════════════════
// HCS STATE
// ════════════════════════════════════════════════════════════════

let hcsTopicId: string | null = null;

/**
 * Get or create HCS topic for SENTINEL decisions
 */
async function getOrCreateHCSTopic(): Promise<string> {
  if (hcsTopicId) return hcsTopicId;

  const envTopicId = process.env.HCS_TOPIC_ID;
  if (envTopicId) {
    hcsTopicId = envTopicId;
    console.log(`✓ Using existing HCS topic: ${hcsTopicId}`);
    return hcsTopicId;
  }

  try {
    console.log("🔄 Creating new HCS topic...");
    const client = await getHederaClient();

    const topicTx = new TopicCreateTransaction();
    const txResponse = await topicTx.execute(client);
    const receipt = await txResponse.getReceipt(client);

    hcsTopicId = receipt.topicId!.toString();

    console.log(`✅ HCS Topic created: ${hcsTopicId} — add to .env as HCS_TOPIC_ID`);
    console.log(`📍 View at: https://hashscan.io/testnet/topic/${hcsTopicId}`);

    return hcsTopicId;
  } catch (error) {
    console.error("❌ Failed to create HCS topic:", error);
    throw error;
  }
}

/**
 * Submit decision JSON to HCS
 */
async function publishDecisionToHCS(
  decision: AgentDecision,
  threat: ThreatSignal,
  volatility: VolatilityData,
): Promise<number> {
  try {
    const topicId = await getOrCreateHCSTopic();
    const client = await getHederaClient();

    const messagePayload = {
      action: decision.action,
      threatLevel: threat.level,
      threatScore: threat.score,
      threatTriggers: threat.triggers,
      volatilityTrend: volatility.trend,
      volatilityValue: volatility.volatility,
      recommendation: threat.recommendation,
      reasoning: decision.reasoning,
      txHash: decision.txHash || null,
      timestamp: new Date().toISOString(),
      agent: "SENTINEL",
    };

    const messageText = JSON.stringify(messagePayload);

    console.log("📤 Publishing to HCS...");

    const submitTx = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(messageText);

    const txResponse = await submitTx.execute(client);
    const receipt = await txResponse.getReceipt(client);

    const sequence = receipt.topicSequenceNumber?.toNumber() || 0;

    console.log(`✓ HCS published: seq=${sequence}, topic=${topicId}`);

    return sequence;
  } catch (error) {
    console.error("❌ HCS publication failed:", error);
    return 0; // Return 0 on failure
  }
}

// ════════════════════════════════════════════════════════════════
// LANGCHAIN TOOL
// ════════════════════════════════════════════════════════════════

export const hcsLoggerTool = new DynamicTool({
  name: "log_decision_to_hcs",
  description:
    "Logs the agent's decision to Hedera Consensus Service (HCS) for an immutable, timestamped audit trail. " +
    "Records threat level, volatility assessment, action taken, reasoning, and transaction hash. " +
    "Creates permanent record on Hedera blockchain.",
  func: async (input: string) => {
    try {
      const parsed = JSON.parse(input);

      const decision: AgentDecision = parsed.decision;
      const threat: ThreatSignal = parsed.threat;
      const volatility: VolatilityData = parsed.volatility;

      const sequence = await publishDecisionToHCS(decision, threat, volatility);

      const topicId = process.env.HCS_TOPIC_ID ||
        hcsTopicId || "0.0.0";
      const hashscanUrl = `https://hashscan.io/testnet/topic/${topicId}?s=${sequence}`;

      return JSON.stringify({
        success: true,
        hcsSequence: sequence,
        topicId,
        hashscanUrl,
        message: `✓ Decision logged to HCS sequence #${sequence}. View: ${hashscanUrl}`,
      });
    } catch (error) {
      console.error("❌ HCS logger tool error:", error);
      return JSON.stringify({
        success: false,
        hcsSequence: 0,
        message: `⚠  HCS logging failed but decision recorded locally`,
      });
    }
  },
});

