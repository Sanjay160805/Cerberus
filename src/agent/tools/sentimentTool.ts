/**
 * Sentiment Analysis Tool for LangChain Agent
 * Wraps the RAG pipeline threat analysis
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { fetchGeopoliticalTweets } from "../../rag/twitterIngestor.js";
import { analyzeThreatLevel, quickThreatCheck } from "../../rag/ragChain.js";

const sentimentToolSchema = z.object({});

export const sentimentTool = tool(
  async () => {
    try {
      // Fetch recent tweets
      const tweets = await fetchGeopoliticalTweets();

      if (tweets.length === 0) {
        return {
          score: 0.0,
          level: "LOW",
          triggers: [],
          recommendation: "HOLD",
          reasoning: "No geopolitical signals detected",
        };
      }

      // Analyze threat level using RAG pipeline
      let threatSignal;
      try {
        threatSignal = await analyzeThreatLevel(tweets);
      } catch (ragError) {
        console.warn("⚠  RAG analysis failed, using quick threat check");
        threatSignal = await quickThreatCheck(tweets);
      }

      return {
        score: threatSignal.score,
        level: threatSignal.level,
        triggers: threatSignal.triggers,
        recommendation: threatSignal.recommendation,
        reasoning: threatSignal.reasoning,
      };
    } catch (error) {
      console.error("✗ Sentiment analysis tool failed:", error);
      return {
        score: 0.0,
        level: "LOW",
        triggers: ["tool_error"],
        recommendation: "HOLD",
        reasoning: "Sentiment analysis temporarily unavailable",
      };
    }
  },
  {
    name: "analyze_geopolitical_sentiment",
    description:
      "Analyzes geopolitical signals from tweets and market alerts to determine threat level. Returns threat score (0.0-1.0), threat level (LOW/MEDIUM/HIGH/CRITICAL), identified triggers, and recommendation.",
    schema: sentimentToolSchema,
  },
);

export default sentimentTool;
