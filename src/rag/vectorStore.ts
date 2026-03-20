/**
 * Vector Store for RAG Pipeline
 * Converts tweets to embeddings and stores them for retrieval
 * Uses Google Generative AI embeddings (free tier)
 */

import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { SimpleMemoryVectorStore } from "./memoryVectorStore.js";
import { Document } from "@langchain/core/documents";
import { IngestedTweet } from "../types/index.js";
import * as dotenv from "dotenv";

dotenv.config();

let vectorStore: SimpleMemoryVectorStore | null = null;
let embeddings: GoogleGenerativeAIEmbeddings | null = null;

/**
 * Initialize embeddings model (Google Gemini free tier)
 */
function getEmbeddings(): GoogleGenerativeAIEmbeddings {
  if (!embeddings) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY not set in .env");
    }
    embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      model: "text-embedding-004",
    });
  }
  return embeddings;
}

/**
 * Convert tweets to LangChain documents
 */
function tweetsToDocuments(tweets: IngestedTweet[]): Document[] {
  return tweets.map((tweet) => {
    const metadata = {
      tweetId: tweet.id,
      username: tweet.username,
      time: tweet.time,
      relevanceScore: tweet.relevanceScore,
      keywords: tweet.geopoliticalKeywords.join(", "),
      likes: tweet.likes,
      retweets: tweet.retweets,
    };

    return new Document({
      pageContent: tweet.text,
      metadata,
    });
  });
}

/**
 * Build or rebuild the vector store with new tweets
 */
export async function buildVectorStore(tweets: IngestedTweet[]): Promise<SimpleMemoryVectorStore> {
  try {
    const embeddingsModel = getEmbeddings();
    const documents = tweetsToDocuments(tweets);

    if (documents.length === 0) {
      console.warn("⚠  No tweets to add to vector store");
      vectorStore = new SimpleMemoryVectorStore(embeddingsModel);
      return vectorStore;
    }

    // Create new vector store from documents
    vectorStore = await SimpleMemoryVectorStore.fromDocuments(documents, embeddingsModel);

    console.log(`✓ Vector store built with ${tweets.length} tweets`);
    return vectorStore;
  } catch (error) {
    console.error("✗ Failed to build vector store:", error);
    throw error;
  }
}

/**
 * Get the current vector store (or create empty one)
 */
export async function getVectorStore(): Promise<SimpleMemoryVectorStore> {
  if (!vectorStore) {
    // Create empty vector store
    const embeddingsModel = getEmbeddings();
    vectorStore = new SimpleMemoryVectorStore(embeddingsModel);
  }
  return vectorStore;
}

/**
 * Retrieve relevant tweets from vector store
 */
export async function retrieveRelevantSignals(
  query: string,
  k: number = 5,
): Promise<Array<{ content: string; score: number; metadata: Record<string, unknown> }>> {
  try {
    const store = await getVectorStore();

    // Search with similarity score
    const results = await store.similaritySearchWithScore(query, k);

    return results.map(([doc, score]: [Document, number]) => ({
      content: doc.pageContent,
      score,
      metadata: doc.metadata,
    }));
  } catch (error) {
    console.error("✗ Failed to retrieve signals:", error);
    return [];
  }
}

/**
 * Clear the vector store
 */
export function clearVectorStore(): void {
  vectorStore = null;
  console.log("✓ Vector store cleared");
}

export default {
  buildVectorStore,
  getVectorStore,
  retrieveRelevantSignals,
  clearVectorStore,
};
