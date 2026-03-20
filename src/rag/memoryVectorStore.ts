/**
 * Simple in-memory vector store implementation for LangChain v1
 * Compatible with the removed MemoryVectorStore from older versions
 */

import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";

interface DocumentVector {
  document: Document;
  embedding: number[];
}

export class SimpleMemoryVectorStore {
  private documentVectors: DocumentVector[] = [];

  embeddingsModel: EmbeddingsInterface;

  constructor(embeddingsModel: EmbeddingsInterface) {
    this.embeddingsModel = embeddingsModel;
  }

  static async fromDocuments(
    docs: Document[],
    embeddingsModel: EmbeddingsInterface,
  ): Promise<SimpleMemoryVectorStore> {
    const store = new SimpleMemoryVectorStore(embeddingsModel);
    await store.addDocuments(docs);
    return store;
  }

  async addDocuments(docs: Document[]): Promise<string[]> {
    const vectors = await this.embeddingsModel.embedDocuments(
      docs.map((doc) => doc.pageContent),
    );

    docs.forEach((doc, i) => {
      this.documentVectors.push({
        document: doc,
        embedding: vectors[i] || [],
      });
    });

    return docs.map((_, i) => String(this.documentVectors.length - docs.length + i));
  }

  async similaritySearchWithScore(
    query: string,
    k: number = 4,
  ): Promise<Array<[Document, number]>> {
    const queryVector = await this.embeddingsModel.embedQuery(query);

    // Calculate cosine similarity for each document
    const scores = this.documentVectors.map((dv) =>
      this.cosineSimilarity(queryVector, dv.embedding),
    );

    // Sort by score and take top k
    const topIndices = scores
      .map((score, i) => ({ score, index: i }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((item) => item.index);

    return topIndices
      .map((i) => {
        const dv = this.documentVectors[i];
        if (!dv) return null;
        return [dv.document, scores[i] ?? 0] as [Document, number];
      })
      .filter((item): item is [Document, number] => item !== null);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] ?? 0;
      const bVal = b[i] ?? 0;
      dotProduct += aVal * bVal;
      magnitudeA += aVal * aVal;
      magnitudeB += bVal * bVal;
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }
}

