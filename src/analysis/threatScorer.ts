import { geminiModel } from "@/lib/gemini";
import { retrieveGeopoliticalContext, retrieveRegulatoryContext, retrieveMacroContext } from "@/rag/retriever";
import { ThreatAnalysis } from "@/lib/types";
import { logger } from "@/lib/logger";
import { getRecentTweets } from "@/db/tweets";

// Retry configuration for Gemini rate limiting
const MAX_RETRIES = 1;
const INITIAL_BACKOFF_MS = 1000;

async function callGeminiWithRetry(prompt: string, retryCount = 0): Promise<any> {
  try {
    const response = await geminiModel.invoke(prompt);
    return response;
  } catch (error: any) {
    // On free tier, 429 happens immediately - fail fast instead of retrying
    if (error.status === 429) {
      logger.warn("Gemini rate limited (free tier quota) — skipping to keyword fallback");
      throw error;
    }
    throw error;
  }
}

export async function scoreThreat(): Promise<ThreatAnalysis> {
  try {
    // Try RAG retrieval first
    let geoContext = "";
    let regContext = "";
    let macroContext = "";

    try {
      [geoContext, regContext, macroContext] = await Promise.all([
        retrieveGeopoliticalContext(),
        retrieveRegulatoryContext(),
        retrieveMacroContext(),
      ]);
      logger.info(`RAG retrieval: geo=${geoContext.length}chars, reg=${regContext.length}chars, macro=${macroContext.length}chars`);
    } catch (ragError) {
      logger.warn("RAG retrieval failed, using direct tweets", ragError);
    }

    // If RAG returns empty, fall back to direct tweet text
    if (!geoContext && !regContext && !macroContext) {
      logger.info("RAG empty — using direct tweet text for Gemini");
      const tweets = getRecentTweets(50);
      const tweetText = tweets
        .map((t: any) => `@${t.username}: ${t.text}`)
        .join("\n")
        .slice(0, 4000);

      geoContext = tweetText;
      regContext = "See tweets above for regulatory signals";
      macroContext = "See tweets above for macro signals";
    }

    const prompt = `You are a DeFi risk assessment AI for a crypto keeper agent on Hedera blockchain.
Analyze these real-world signals and produce a threat score for crypto/DeFi markets:

GEOPOLITICAL SIGNALS:
${geoContext}

REGULATORY SIGNALS:
${regContext}

MACRO ECONOMIC SIGNALS:
${macroContext}

Produce a threat score from 0.0 (completely safe) to 1.0 (extreme danger).
Consider: Wars/invasions = high threat. Crypto bans/SEC enforcement = high threat. Rate shocks/bank failures = medium-high. Normal bullish conditions = low.

Respond in this exact JSON format with no other text:
{"score":0.15,"level":"LOW","signals":["signal1","signal2"],"sentiment":"BULLISH","summary":"one sentence summary"}`;

    logger.info("🧠 Calling Gemini with RAG context...");
    const response = await callGeminiWithRetry(prompt);
    const text = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleaned);

    logger.info(`✅ Gemini threat score: ${result.score} (${result.level}) — ${result.summary}`);

    const sentiment = (result.sentiment || "NEUTRAL") as "BULLISH" | "BEARISH" | "NEUTRAL";
    const level = (result.level || "LOW") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

    return {
      score: Math.max(0, Math.min(1, result.score || 0)),
      level,
      signals: result.signals || [],
      sentiment,
      summary: result.summary || "No significant threats detected",
    };

  } catch (error: any) {
    // Log concisely — Gemini rate limiting is expected, fallback handles it
    if (error.status === 429) {
      logger.warn("Gemini permanently rate limited (429) after retries — using keyword analysis fallback");
    } else {
      logger.error("Threat scoring failed", error?.message || String(error));
    }

    // Enhanced keyword fallback when Gemini fails
    try {
      const tweets = getRecentTweets(100);
      const text = tweets.map((t: any) => t.text?.toLowerCase() || "").join(" ");

      // Threat keywords with weights
      const criticalThreats = ["war", "invasion", "collapse", "liquidation", "hack", "exploit", "breach", "arrested", "ban"].filter(k => text.includes(k));
      const highThreats = ["crash", "sec enforcement", "regulation", "sanctions", "failed", "dumping", "insolvent"].filter(k => text.includes(k));
      const mediumThreats = ["decline", "concerns", "risk", "caution", "bearish", "downturn"].filter(k => text.includes(k));
      const bullish = ["bull", "ath", "pump", "moon", "adoption", "etf", "approved", "optimistic", "rally", "partnership", "surge", "gains"].filter(k => text.includes(k));
      const bearish = ["bear", "crash", "dump", "liquidation", "cascade", "unwind", "outflows"].filter(k => text.includes(k));

      // Calculate weighted threat score
      let score = 0;
      score += criticalThreats.length * 0.25;
      score += highThreats.length * 0.15;
      score += mediumThreats.length * 0.08;
      score = Math.min(1, score);

      // Determine level
      let level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
      if (score > 0.85) level = "CRITICAL";
      else if (score > 0.6) level = "HIGH";
      else if (score > 0.3) level = "MEDIUM";

      // Determine sentiment
      const sentiment = bullish.length > bearish.length ? "BULLISH" : bearish.length > bullish.length ? "BEARISH" : "NEUTRAL";

      const allSignals = [...criticalThreats, ...highThreats, ...mediumThreats];

      logger.info(`⚠️  Fallback: score=${score.toFixed(2)}, level=${level}, sentiment=${sentiment}, signals=${allSignals.length}`);

      const threatAnalysis: ThreatAnalysis = {
        score,
        level,
        signals: allSignals,
        sentiment,
        summary: `Keyword analysis: ${allSignals.length} threat signals, ${bullish.length} bullish signals`,
      };
      
      return threatAnalysis;
    } catch (fallbackError) {
      logger.error("Keyword fallback error", fallbackError);
      const defaultThreat: ThreatAnalysis = {
        score: 0,
        level: "LOW",
        signals: [],
        sentiment: "NEUTRAL",
        summary: "Threat scoring failed — defaulting to LOW",
      };
      return defaultThreat;
    }
  }
}