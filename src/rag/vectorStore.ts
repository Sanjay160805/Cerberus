import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { embeddings } from "./embeddings";
import { logger } from "@/lib/logger";

let vectorStore: MemoryVectorStore | null = null;

export async function getVectorStore(): Promise<MemoryVectorStore> {
  if (!vectorStore) {
    vectorStore = new MemoryVectorStore(embeddings);
    logger.info("Vector store initialized");
  }
  return vectorStore;
}

export async function addDocuments(docs: Document[]): Promise<void> {
  try {
    const store = await getVectorStore();
    await store.addDocuments(docs);
  } catch (error) {
    logger.warn("addDocuments failed — Gemini embeddings quota likely exceeded, keyword fallback will be used");
  }
}

export async function similaritySearch(
  query: string,
  k = 5
): Promise<Document[]> {
  try {
    const store = await getVectorStore();
    return await store.similaritySearch(query, k);
  } catch (error) {
    logger.warn("Similarity search failed — returning empty, keyword fallback will handle retrieval");
    return [];
  }
}

export function resetVectorStore(): void {
  vectorStore = null;
  logger.info("Vector store reset");
}