import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GEMINI_EMBEDDING_MODEL } from "@/lib/constants";

export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: GEMINI_EMBEDDING_MODEL,
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
});
