/**
 * RAG Chain with GPT-4o Threat Analysis
 * Combines signal retrieval with GPT-4o reasoning to output structured threat assessment
 */

import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { ThreatSignal, ThreatLevel } from "../types/index.js";
import { buildVectorStore, retrieveRelevantSignals } from "./vectorStore.js";
import { IngestedTweet } from "../types/index.js";
import * as dotenv from "dotenv";

dotenv.config();

const THREAT_ANALYSIS_PROMPT = `You are SENTINEL, an AI vault protection agent analyzing geopolitical and market signals for emergency threat assessment.

Given the following signals, output a threat analysis in strict JSON format (no markdown, no code blocks).

SIGNALS:
{signals}

ANALYSIS REQUIREMENTS:
1. Score: 0.0-1.0 where 0 = no threat, 1.0 = complete market collapse imminent
2. Level: 
   - "LOW" (0.0-0.3): Normal market conditions
   - "MEDIUM" (0.3-0.6): Elevated concern
   - "HIGH" (0.6-0.85): Significant risk
   - "CRITICAL" (0.85-1.0): Existential threat
3. Triggers: List specific threat factors identified in signals
4. Recommendation: Action to protect vault (HOLD|HARVEST|WITHDRAW|EMERGENCY_EXIT)
5. Reasoning: 2-3 sentences explaining the assessment

OUTPUT FORMAT (valid JSON only):
{{
  "score": 0.XX,
  "level": "LOW|MEDIUM|HIGH|CRITICAL",
  "triggers": ["trigger1", "trigger2"],
  "recommendation": "HOLD|HARVEST|WITHDRAW|EMERGENCY_EXIT",
  "reasoning": "explanation"
}}`;

let model: ChatOpenAI | null = null;

/**
 * Initialize GPT-4o chat model
 */
function getChatModel(): ChatOpenAI {
  if (!model) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not set in .env");
    }
    model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: "gpt-4o",
      temperature: 0, // Deterministic for critical decisions
      timeout: 10000,
    });
  }
  return model;
}

/**
 * Format retrieved signals into readable text
 */
function formatSignalsForPrompt(
  signals: Array<{ content: string; score: number }>,
): string {
  if (signals.length === 0) {
    return "No significant geopolitical signals detected. Market appears stable.";
  }

  return signals
    .map((sig, idx) => `${idx + 1}. [Relevance: ${(sig.score * 100).toFixed(0)}%] ${sig.content}`)
    .join("\n");
}

/**
 * Parse JSON response from GPT-4o
 */
function parseThreatResponse(response: string): any {
  // Extract JSON from response (might be wrapped in markdown)
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Could not parse JSON from response: ${response}`);
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Run the full RAG chain for threat analysis
 */
export async function analyzeThreatLevel(
  tweets: IngestedTweet[],
): Promise<ThreatSignal> {
  try {
    // Build vector store with tweets
    await buildVectorStore(tweets);

    // Retrieve top relevant signals
    const query =
      "geopolitical conflict war sanctions nuclear crisis market crash emergency threat";
    const relevantSignals = await retrieveRelevantSignals(query, 5);

    // Format signals for prompt
    const formattedSignals = formatSignalsForPrompt(relevantSignals);

    // Create and format prompt
    const promptTemplate = PromptTemplate.fromTemplate(THREAT_ANALYSIS_PROMPT);
    const prompt = await promptTemplate.format({
      signals: formattedSignals,
    });

    // Get model response
    const chatModel = getChatModel();
    const response = await chatModel.invoke(prompt);
    const content = response.content;

    if (typeof content !== "string") {
      throw new Error("Unexpected response type from GPT-4o");
    }

    // Parse response
    const parsed = parseThreatResponse(content);

    const threatSignal: ThreatSignal = {
      score: parseFloat(parsed.score) || 0,
      level: (parsed.level as ThreatLevel) || ThreatLevel.LOW,
      triggers: Array.isArray(parsed.triggers) ? parsed.triggers : [],
      recommendation: parsed.recommendation || "HOLD",
      reasoning: parsed.reasoning || "",
      timestamp: new Date(),
      source: "rag_gpt4o",
    };

    console.log(
      `✓ Threat Analysis: ${threatSignal.level} (score: ${threatSignal.score.toFixed(2)})`,
    );

    return threatSignal;
  } catch (error) {
    console.error("✗ Failed to analyze threat level:", error);

    // Return safe default on error
    return {
      score: 0,
      level: ThreatLevel.LOW,
      triggers: ["analysis_failure"],
      recommendation: "HOLD",
      reasoning: "Analysis temporarily unavailable, treating as low threat",
      timestamp: new Date(),
      source: "fallback",
    };
  }
}

/**
 * Quick threat level check using keyword matching
 * Fallback for when RAG is unavailable
 */
export async function quickThreatCheck(tweets: IngestedTweet[]): Promise<ThreatSignal> {
  // Count threat keywords
  const criticalKeywords = ["war", "invasion", "nuclear", "sanction"];
  const highKeywords = ["crisis", "crash", "collapse", "emergency"];
  const mediumKeywords = ["hack", "breach", "volatile", "unstable"];

  let score = 0;
  let level: ThreatLevel = ThreatLevel.LOW;
  const triggers: Set<string> = new Set();

  for (const tweet of tweets) {
    const text = tweet.text.toLowerCase();

    for (const kw of criticalKeywords) {
      if (text.includes(kw)) {
        score = Math.max(score, 0.9);
        level = ThreatLevel.CRITICAL;
        triggers.add(kw);
      }
    }

    for (const kw of highKeywords) {
      if (text.includes(kw)) {
        score = Math.max(score, 0.7);
        if (level !== ThreatLevel.CRITICAL) level = ThreatLevel.HIGH;
        triggers.add(kw);
      }
    }

    for (const kw of mediumKeywords) {
      if (text.includes(kw)) {
        score = Math.max(score, 0.5);
        if (level === ThreatLevel.LOW) level = ThreatLevel.MEDIUM;
        triggers.add(kw);
      }
    }
  }

  return {
    score,
    level,
    triggers: Array.from(triggers),
    recommendation: "HOLD",
    reasoning: `Keyword matching detected ${level} threat level based on ${tweets.length} signals`,
    timestamp: new Date(),
    source: "keyword_matching",
  };
}

export default {
  analyzeThreatLevel,
  quickThreatCheck,
};
