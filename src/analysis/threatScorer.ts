import { geminiModel } from "@/lib/gemini";
import { retrieveGeopoliticalContext, retrieveRegulatoryContext, retrieveMacroContext } from "@/rag/retriever";
import { ThreatAnalysis } from "@/lib/types";
import { logger } from "@/lib/logger";

export async function scoreThreat(): Promise<ThreatAnalysis> {
  try {
    const [geoContext, regContext, macroContext] = await Promise.all([
      retrieveGeopoliticalContext(),
      retrieveRegulatoryContext(),
      retrieveMacroContext(),
    ]);
    const prompt = `You are a DeFi risk assessment AI for a crypto keeper agent.
Analyze these real-world signals and produce a threat score for crypto/DeFi markets:
GEOPOLITICAL SIGNALS:
${geoContext}
REGULATORY SIGNALS:
${regContext}
MACRO ECONOMIC SIGNALS:
${macroContext}
Produce a threat score from 0.0 (completely safe) to 1.0 (extreme danger).
Consider: Wars/invasions = high threat. Crypto bans/SEC enforcement = high threat. Rate shocks/bank failures = medium-high. Normal conditions = low.
Respond in this exact JSON format with no other text:
{"score":0.0,"level":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL","signals":["signal1"],"sentiment":"BULLISH"|"BEARISH"|"NEUTRAL","summary":"one sentence"}`;
    const response = await geminiModel.invoke(prompt);
    const text = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const result = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
    return { score: Math.max(0, Math.min(1, result.score || 0)), level: result.level || "LOW", signals: result.signals || [], sentiment: result.sentiment || "NEUTRAL", summary: result.summary || "No significant threats detected" };
  } catch (error) {
    logger.error("Threat scoring failed", error);
    return { score: 0, level: "LOW", signals: [], sentiment: "NEUTRAL", summary: "Threat scoring failed — defaulting to LOW" };
  }
}
