import { AgentStateType } from "./state";
import { ingestTweets } from "@/rag/ingestor";
import { scoreThreat } from "@/analysis/threatScorer";
import { calculateVolatility, recordPrice } from "@/analysis/volatilityCalculator";
import { getHBARUSDPrice } from "@/oracle/priceFeeds";
import { getVaultPosition, determineKeeperAction, executeKeeperAction } from "@/bonzo/keeper";
import { saveDecision } from "@/db/decisions";
import { logDecisionToHCS } from "@/hedera/hcs";
import { logger } from "@/lib/logger";

export async function ingestNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  logger.info(`[Cycle #${state.cycle}] Ingesting tweets...`);
  try {
    const count = await ingestTweets(2);
    logger.info(`[Cycle #${state.cycle}] Ingested ${count} tweets`);
    return {};
  } catch (error) {
    return { error: `Ingest failed: ${error}` };
  }
}

export async function analyzeNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  logger.info(`[Cycle #${state.cycle}] Analyzing threats...`);
  try {
    const [threatAnalysis, hbarPrice] = await Promise.all([scoreThreat(), getHBARUSDPrice()]);
    // Record price for volatility tracking across cycles
    recordPrice(hbarPrice);
    const volatility = calculateVolatility();
    logger.info(`[Cycle #${state.cycle}] Threat: ${threatAnalysis.level} (${threatAnalysis.score.toFixed(2)})`);
    return { threatAnalysis, volatility, price: hbarPrice };
  } catch (error) {
    return { error: `Analysis failed: ${error}` };
  }
}

export async function positionNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  logger.info(`[Cycle #${state.cycle}] Fetching vault position...`);
  try {
    const accountId = process.env.HEDERA_ACCOUNT_ID;
    const vaultPosition = await getVaultPosition(accountId);
    return { vaultPosition };
  } catch (error) {
    logger.warn("Position fetch failed, continuing without it");
    return {};
  }
}

import { agentTools } from "./tools";
import { getHederaToolkit } from "./hederaKit";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export async function decideNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  logger.info(`[Cycle #${state.cycle}] Making decision with LangChain/Gemini...`);
  
  if (!state.threatAnalysis || !state.volatility) {
    return {
      decision: {
        cycle: state.cycle, timestamp: new Date().toISOString(),
        action: "HOLD", reasoning: "Insufficient data",
        threat_score: 0, volatility: 0, price: state.price, executed: false,
      },
    };
  }

  try {
    const hederaToolkit = getHederaToolkit();
    const allTools = [...agentTools, ...hederaToolkit.tools];
    
    // We bind the tools to the LLM so it can call them (executeKeeperActionTool for instance)
    const llm = new ChatGoogleGenerativeAI({
      modelName: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.1,
    }).bindTools(allTools);

    const prompt = `
You are Sentinel, an autonomous AI financial agent managing a Bonzo Finance vault position on Hedera.
Current Market Context:
- Threat Level: ${state.threatAnalysis.level} (Score: ${state.threatAnalysis.score})
- Sentiment: ${state.threatAnalysis.sentiment}
- Volatility: ${state.volatility.level} (Realized: ${state.volatility.realized})
- Current HBAR Price: $${state.price}

Use the 'get_vault_position' tool to check your current deposits and health factor.
Based on the market threat and your position's health factor, decide whether to:
- PROTECT (withdraw all to safety)
- WIDEN (withdraw a portion)
- TIGHTEN (deposit a portion to compound yield)
- BORROW (borrow assets if highly bullish and safe)
- REPAY (repay debt if health factor is low)
- HOLD (do nothing)

Then MUST call the 'execute_keeper_action' tool to actually execute the decision.
Return a brief reasoning of your choice in your final answer.
`;

    const response = await llm.invoke([{ role: "user", content: prompt }]);
    
    // Since we're using bindTools, the LLM will output tool calls in response.tool_calls
    const toolCalls = response.tool_calls || [];
    let executingAction = "HOLD";
    let reasoning = response.content?.toString() || "No explicit reasoning provided.";

    // If it chose to call execute_keeper_action, let's extract that info
    for (const call of toolCalls) {
      if (call.name === "execute_keeper_action") {
        executingAction = call.args.action || "HOLD";
        reasoning = call.args.reason || reasoning;
        
        // Let's actually execute the tool it requested
        const toolToExecute = allTools.find((t: any) => t.name === call.name);
        if (toolToExecute) {
            await (toolToExecute as any).invoke(call.args);
        }
      }
    }

    const decision = {
      cycle: state.cycle,
      timestamp: new Date().toISOString(),
      action: executingAction as any,
      reasoning: reasoning,
      threat_score: state.threatAnalysis.score,
      volatility: state.volatility.realized,
      price: state.price,
      executed: executingAction !== "HOLD",
    };

    logger.info(`[Cycle #${state.cycle}] LLM Decision: ${decision.action}`);
    return { decision };
  } catch (error) {
    logger.error("Error in AI decision node:", error);
    return {
      decision: {
        cycle: state.cycle, timestamp: new Date().toISOString(),
        action: "HOLD", reasoning: "Agent crashed",
        threat_score: 0, volatility: 0, price: state.price, executed: false,
      },
    };
  }
}

export async function executeNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (!state.decision) return {};
  
  logger.info(`[Cycle #${state.cycle}] Logging execution outcome`);
  try {
    const id = saveDecision({
      ...state.decision,
      executed: state.decision.executed,
    });

    const finalDecision = {
      ...state.decision,
      id,
    };

    // Non-blocking — HCS failure won't crash the graph
    logDecisionToHCS(finalDecision).catch(e =>
      logger.warn("HCS logging failed silently", e)
    );

    return { decision: finalDecision };
  } catch (error) {
    logger.error(`[Cycle #${state.cycle}] Formatting execution node failed`, error);
    return {};
  }
}