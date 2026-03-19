/**
 * SENTINEL Main Agent - LangGraph ReAct Agent
 * Coordinates all tools to implement the decision matrix and execute vault protection actions
 */

import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";
import {
  AgentDecision,
  ThreatSignal,
  VolatilityData,
  VaultState,
  DashboardStatus,
  IngestedTweet,
  ThreatLevel,
  VolatilityClassification,
} from "../types/index.js";
import { sentimentTool } from "./tools/sentimentTool.js";
import { volatilityTool } from "./tools/volatilityTool.js";
import { vaultStateTool, harvestTool, withdrawTool, emergencyExitTool } from "./tools/vaultTool.js";
import { hcsTool } from "./tools/hcsTool.js";
import { getVolatilityData } from "../oracle/supraOracle.js";
import { fetchGeopoliticalTweets } from "../rag/twitterIngestor.js";
import { getVaultState, executeVaultAction } from "../vault/bonzoVault.js";
import * as dotenv from "dotenv";

dotenv.config();

// Stored state for dashboard
let lastThreatSignal: ThreatSignal | null = null;
let lastVolatilityData: VolatilityData | null = null;
let decisionHistory: AgentDecision[] = [];
let signalHistory: IngestedTweet[] = [];
let isLooping = false;

/**
 * Create the core LangGraph ReAct agent
 */
export function createSentinelAgent() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set in .env");
  }

  const model = new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName: "gpt-4o",
    temperature: 0, // Deterministic reasoning for critical decisions
  });

  const tools: any[] = [
    sentimentTool,
    volatilityTool,
    vaultStateTool,
    harvestTool,
    withdrawTool,
    emergencyExitTool,
    hcsTool,
  ];

  const systemPrompt = `You are SENTINEL, an autonomous vault protection agent operating on the Hedera network.

Your mission: Analyze geopolitical signals and market conditions to make proactive decisions protecting user DeFi vault positions.

DECISION MATRIX (strict rules):
1. CRITICAL threat (score >= 0.85) → EMERGENCY_EXIT (all funds)
2. HIGH threat (score >= 0.65) + EXTREME volatility → WITHDRAW
3. HIGH threat + VOLATILE → WITHDRAW
4. MEDIUM threat (score >= 0.3) → HARVEST (lock gains, prepare for action)
5. LOW threat + STABLE → HOLD
6. LOW threat + VOLATILE → HOLD (monitor, no action)

EXECUTION FLOW:
1. Call analyze_geopolitical_sentiment first  
2. Call get_volatility_data second
3. Call get_vault_state to check current position
4. Evaluate decision matrix based on results
5. Execute appropriate action (harvest/withdraw/emergency_exit/hold)
6. Always log decision to HCS using log_decision_to_hcs

CRITICAL GUIDELINES:
- Do NOT call tools multiple times unless necessary
- Do NOT second-guess the decision matrix
- Do NOT delay emergency exits when threat is CRITICAL
- Always log decisions to HCS
- Return JSON decision with action, threat_level, volatility_level, reasoning`;

  const agent = createReactAgent({
    llmWithTools: model,
    tools: tools,
    systemMessage: systemPrompt,
  });

  return agent;
}

/**
 * Run one autonomous protection cycle
 * Sense → Reason → Act → Log → Broadcast
 */
export async function runAutonomousCycle(): Promise<{
  decision: AgentDecision;
  threat: ThreatSignal | null;
  volatility: VolatilityData | null;
  vault: VaultState | null;
}> {
  try {
    isLooping = true;
    console.log("\n════════════════════════════════════════════════════");
    console.log("🤖 SENTINEL Autonomous Cycle Starting...");
    console.log("════════════════════════════════════════════════════\n");

    // SENSE: Fetch data
    console.log("📡 SENSE PHASE - Collecting signals...");
    const tweets = await fetchGeopoliticalTweets();
    signalHistory = tweets.slice(0, 10);
    console.log(`   📊 Fetched ${tweets.length} tweets`);

    // Create agent and run decision cycle
    const agent = createSentinelAgent();

    const prompt =
      "Analyze current threats and make a vault protection decision. Reason through the decision matrix. Use all tools systematically.";

    const messages = [new HumanMessage(prompt)];

    // REASON: Run agent
    console.log("\n🧠 REASON PHASE - Analyzing threats...");

    let agentResponse: any;
    try {
      agentResponse = await agent.invoke({ messages });
    } catch (agentError) {
      console.error("✗ Agent execution failed:", agentError);
      // Fallback: HOLD action
      agentResponse = {
        messages: [
          {
            content: JSON.stringify({
              action: "HOLD",
              threat_level: "LOW",
              volatility_level: "STABLE",
              reasoning: "Agent error, defaulting to safe HOLD",
            }),
          },
        ],
      };
    }

    // Extract decision from final message
    const finalMessage = agentResponse.messages[agentResponse.messages.length - 1];
    let decision: AgentDecision;

    try {
      const content = finalMessage.content || "{}";
      const parsed = typeof content === "string" ? JSON.parse(content) : content;

      decision = {
        action: (parsed.action as any) || "HOLD",
        threat_level: (parsed.threat_level as ThreatLevel) || ThreatLevel.LOW,
        volatility_level:
          (parsed.volatility_level as VolatilityClassification) ||
          VolatilityClassification.STABLE,
        reasoning: parsed.reasoning || "Analysis complete",
        timestamp: new Date(),
      };
    } catch {
      decision = {
        action: "HOLD",
        threat_level: ThreatLevel.LOW,
        volatility_level: VolatilityClassification.STABLE,
        reasoning: "Could not parse response, defaulting to HOLD",
        timestamp: new Date(),
      };
    }

    // ACT: Execute decision
    console.log(`\n⚡ ACT PHASE - Executing ${decision.action}...`);

    const vault = await getVaultState();

    if (decision.action !== "HOLD") {
      const actionResult = await executeVaultAction(
        decision.action,
        decision.action === "WITHDRAW" ? 50 : undefined,
      );
      decision.txHash = actionResult.txHash;
      console.log(`   ✓ ${decision.action} executed: ${actionResult.txHash}`);
    } else {
      console.log("   ✓ HOLD - no action needed");
    }

    // Store in history
    decisionHistory.unshift(decision);
    if (decisionHistory.length > 20) decisionHistory = decisionHistory.slice(0, 20);

    console.log("\n✓ Cycle Complete");
    console.log("════════════════════════════════════════════════════\n");

    isLooping = false;

    return {
      decision,
      threat: lastThreatSignal,
      volatility: lastVolatilityData,
      vault,
    };
  } catch (error) {
    console.error("✗ Autonomous cycle failed:", error);
    isLooping = false;

    return {
      decision: {
        action: "HOLD",
        threat_level: ThreatLevel.LOW,
        volatility_level: VolatilityClassification.STABLE,
        reasoning: `Error: ${error instanceof Error ? error.message : "unknown"}`,
        timestamp: new Date(),
      },
      threat: null,
      volatility: null,
      vault: null,
    };
  }
}

/**
 * Run chat interface cycle
 */
export async function runChatCycle(userMessage: string): Promise<string> {
  try {
    console.log(`\n💬 User: ${userMessage}`);

    const agent = createSentinelAgent();
    const messages = [new HumanMessage(userMessage)];

    const response = await agent.invoke({ messages });

    const finalMessage = response.messages[response.messages.length - 1];
    let assistantResponse = finalMessage.content || "No response available";

    if (typeof assistantResponse !== "string") {
      assistantResponse = JSON.stringify(assistantResponse, null, 2);
    }

    console.log(`🤖 SENTINEL: ${assistantResponse}\n`);

    return assistantResponse;
  } catch (error) {
    console.error("✗ Chat cycle failed:", error);
    return `Error: ${error instanceof Error ? error.message : "unknown"}`;
  }
}

/**
 * Get current dashboard status snapshot
 */
export async function getDashboardStatus(): Promise<DashboardStatus> {
  try {
    lastVolatilityData = await getVolatilityData();
    const vault = await getVaultState();

    return {
      threat: lastThreatSignal,
      volatility: lastVolatilityData,
      vault,
      recentDecisions: decisionHistory.slice(0, 10),
      recentSignals: signalHistory.slice(0, 5),
      isLooping,
      lastCycleTime: decisionHistory[0]?.timestamp || new Date(),
    };
  } catch (error) {
    console.error("✗ Failed to get dashboard status:", error);

    return {
      threat: null,
      volatility: null,
      vault: null,
      recentDecisions: decisionHistory.slice(0, 10),
      recentSignals: signalHistory,
      isLooping,
      lastCycleTime: new Date(),
    };
  }
}

/**
 * Get recent decisions
 */
export function getRecentDecisions(): AgentDecision[] {
  return decisionHistory.slice(0, 10);
}

/**
 * Check if agent is currently looping
 */
export function getLoopingStatus(): boolean {
  return isLooping;
}

export default {
  createSentinelAgent,
  runAutonomousCycle,
  runChatCycle,
  getDashboardStatus,
  getRecentDecisions,
  getLoopingStatus,
};
