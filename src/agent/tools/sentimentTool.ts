/**
 * Sentiment Analysis Tool — Geopolitical Threat Assessment
 * Fetches tweets and analyzes threat level using RAG + Gemini
 */

import { DynamicTool } from "@langchain/core/tools";
import { fetchGeopoliticalTweets } from "../../rag/twitterIngestor.js";
import { analyzeThreatLevel, quickThreatCheck } from "../../rag/ragChain.js";
import { ThreatSignal, ThreatLevel } from "../../types/index.js";

/**
 * Analyze geopolitical sentiment from tweets
 */
async function analyzeSentiment(): Promise<ThreatSignal> {
  try {
    console.log("🔍 Fetching geopolitical tweets...");

    // Fetch recent tweets from SQLite
    const tweets = await fetchGeopoliticalTweets();

    if (tweets.length === 0) {
      console.log("⚠ No tweets found, returning low threat baseline");
      return {
        score: 0.0,
        level: ThreatLevel.LOW,
        triggers: [],
        recommendation: "No threats detected",
        reasoning: "No geopolitical signals in database",
        timestamp: new Date(),
        source: "baseline",
      };
    }

    console.log(`✓ Fetched ${tweets.length} tweets for analysis`);

    // Try RAG analysis first (Gemini)
    let threatSignal: ThreatSignal;
    try {
      console.log("🧠 Running RAG analysis with Gemini...");
      threatSignal = await analyzeThreatLevel(tweets);
    } catch (ragError) {
      console.warn("⚠ RAG analysis failed, using keyword fallback");
      threatSignal = await quickThreatCheck(tweets);
    }

    console.log(
      `✓ Threat Analysis Complete: ${threatSignal.level} (${(threatSignal.score * 100).toFixed(0)}%)`,
    );

    return threatSignal;
  } catch (error) {
    console.error("❌ Sentiment analysis failed:", error);

    // Return safe default
    return {
      score: 0,
      level: ThreatLevel.LOW,
      triggers: ["analysis_error"],
      recommendation: "HOLD",
      reasoning: "Sentiment analysis temporarily unavailable",
      timestamp: new Date(),
      source: "fallback",
    };
  }
}

// ════════════════════════════════════════════════════════════════
// LANGCHAIN TOOL
// ════════════════════════════════════════════════════════════════

export const sentimentTool = new DynamicTool({
  name: "analyze_geopolitical_sentiment",
  description:
    "Analyzes geopolitical signals from cryptocurrency tweets and market data. " +
    "Uses RAG pipeline with Google Gemini to assess threat level. " +
    "Returns threat score (0.0-1.0), threat level (LOW/MEDIUM/HIGH/CRITICAL), " +
    "identified triggers/keywords, and defensive recommendation.",
  func: async () => {
    const threatSignal = await analyzeSentiment();

    return JSON.stringify({
      score: threatSignal.score,
      level: threatSignal.level,
      triggers: threatSignal.triggers,
      recommendation: threatSignal.recommendation,
      reasoning: threatSignal.reasoning,
      timestamp: threatSignal.timestamp,
    });
  },
});
