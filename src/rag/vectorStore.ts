/**
 * Vector Store for RAG Pipeline
 * Converts tweets to embeddings and stores them for retrieval
 */

import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { IngestedTweet } from "../types/index.js";
import * as dotenv from "dotenv";

dotenv.config();

let vectorStore: MemoryVectorStore | null = null;
let embeddings: OpenAIEmbeddings | null = null;

/**
 * Initialize embeddings model
 */
function getEmbeddings(): OpenAIEmbeddings {
  if (!embeddings) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not set in .env");
    }
    embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: "text-embedding-3-small",
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
export async function buildVectorStore(tweets: IngestedTweet[]): Promise<MemoryVectorStore> {
  try {
    const embeddingsModel = getEmbeddings();
    const documents = tweetsToDocuments(tweets);

    if (documents.length === 0) {
      console.warn("⚠  No tweets to add to vector store");
      vectorStore = new MemoryVectorStore(embeddingsModel);
      return vectorStore;
    }

    // Create new vector store from documents
    vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddingsModel);

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
export async function getVectorStore(): Promise<MemoryVectorStore> {
  if (!vectorStore) {
    // Create empty vector store
    const embeddingsModel = getEmbeddings();
    vectorStore = new MemoryVectorStore(embeddingsModel);
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

    return results.map(([doc, score]) => ({
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
