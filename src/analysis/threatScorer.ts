import { geminiModel } from "@/lib/gemini";
import { retrieveGeopoliticalContext, retrieveRegulatoryContext, retrieveMacroContext } from "@/rag/retriever";
import { ThreatAnalysis } from "@/lib/types";
import { logger } from "@/lib/logger";
import { getRecentTweetsAsync } from "@/db/tweets";

/**
 * Score market threats using real Gemini AI analysis with RAG context.
 * NO KEYWORD FALLBACKS OR MOCKS allowed.
 */
export async function scoreThreat(): Promise<ThreatAnalysis> {
  try {
    // try RAG retrieval
    let [geoContext, regContext, macroContext] = await Promise.all([
      retrieveGeopoliticalContext(),
      retrieveRegulatoryContext(),
      retrieveMacroContext(),
    ]);

    // If RAG empty, use latest direct signals from DB
    if (!geoContext && !regContext && !macroContext) {
      logger.info("[ThreatScorer] RAG empty — using direct signals from Scraper API");
      const tweets = await getRecentTweetsAsync(50);
      const tweetText = tweets
        .map((t: any) => `@${t.username}: ${t.text}`)
        .join("\n")
        .slice(0, 4000);
      geoContext = tweetText;
      regContext = "Direct scraper signal feed";
      macroContext = "Direct scraper signal feed";
    }

    if (!geoContext) throw new Error("No signal data available for analysis");

    const prompt = `You are a DeFi risk AI for a keeper agent on Hedera.
Analyze these signals and produce a threat score:

GEOPOLITICAL:
${geoContext}

REGULATORY:
${regContext}

MACRO:
${macroContext}

Respond in this exact JSON format with no other text:
{"score":0.15,"level":"LOW","signals":["signal1"],"sentiment":"BULLISH","summary":"one sentence summary"}`;

    logger.info("🧠 Processing REAL Gemini AI Threat Analysis...");
    const response: any = await geminiModel.invoke(prompt);
    
    const text = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleaned);

    logger.info(`✅ REAL Gemini score: ${result.score} (${result.level}) — ${result.summary}`);

    return {
      score: Math.max(0, Math.min(1, result.score || 0)),
      level: (result.level || "LOW") as any,
      signals: result.signals || [],
      sentiment: (result.sentiment || "NEUTRAL") as any,
      summary: result.summary || "No threats detected",
    };

  } catch (error: any) {
    if (error.status === 429) {
      logger.error("❌ Gemini AI rate limited (REAL ERROR) — no fallback score provided");
    } else {
      logger.error("❌ Threat scoring failed (REAL ERROR):", error?.message || String(error));
    }
    // Re-throw so the agent knows the cycle is invalidated (No data = No Decision)
    throw error;
  }
}