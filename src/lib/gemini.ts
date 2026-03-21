import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GEMINI_MODEL, GEMINI_EMBEDDING_MODEL } from "./constants";

export const geminiModel = new ChatGoogleGenerativeAI({
  model: GEMINI_MODEL,
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
  temperature: 0.1,
  maxOutputTokens: 2048,
});

export const geminiEmbeddings = new GoogleGenerativeAIEmbeddings({
  model: GEMINI_EMBEDDING_MODEL,
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
});
