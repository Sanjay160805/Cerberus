import { geminiModel } from "@/lib/gemini";
import { retrieveCryptoSentiment } from "@/rag/retriever";
import { logger } from "@/lib/logger";

export type Sentiment = "BULLISH" | "BEARISH" | "NEUTRAL";

export interface SentimentResult {
  sentiment: Sentiment;
  confidence: number;
  summary: string;
  keySignals: string[];
}

export async function analyzeSentiment(): Promise<SentimentResult> {
  try {
    const context = await retrieveCryptoSentiment();
    const prompt = `You are a crypto market sentiment analyzer.
Analyze these recent tweets and social signals:
${context}
Respond in this exact JSON format with no other text:
{"sentiment":"BULLISH"|"BEARISH"|"NEUTRAL","confidence":0.0,"summary":"one sentence","keySignals":["signal1"]}`;
    const response = await geminiModel.invoke(prompt);
    const text = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const result = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
    return { sentiment: result.sentiment || "NEUTRAL", confidence: result.confidence || 0.5, summary: result.summary || "Insufficient data", keySignals: result.keySignals || [] };
  } catch (error) {
    logger.error("Sentiment analysis failed", error);
    return { sentiment: "NEUTRAL", confidence: 0, summary: "Analysis failed", keySignals: [] };
  }
}
