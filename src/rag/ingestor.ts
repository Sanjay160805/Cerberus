import { Document } from "@langchain/core/documents";
import { getCryptoTweets, getAllCryptoTweets } from "@/db/tweets";
import { Tweet } from "@/lib/types";
import { logger } from "@/lib/logger";

let cachedDocs: Document[] = [];

export async function ingestTweets(hoursBack = 2): Promise<number> {
  try {
    let tweets = getCryptoTweets(100, hoursBack);

    if (tweets.length === 0) {
      logger.warn("No recent tweets found, trying all crypto tweets");
      tweets = getAllCryptoTweets(100);
    }

    if (tweets.length === 0) {
      logger.warn("No tweets found to ingest");
      return 0;
    }

    cachedDocs = tweets.map((tweet: Tweet) =>
      new Document({
        pageContent: `@${tweet.username}: ${tweet.text}`,
        metadata: {
          username: tweet.username,
          time: tweet.time,
          likes: tweet.likes,
          retweets: tweet.retweets,
          scraped_at: tweet.scraped_at,
          is_crypto: tweet.is_crypto,
        },
      })
    );

    try {
      const { resetVectorStore, addDocuments } = await import("./vectorStore");
      resetVectorStore();
      await addDocuments(cachedDocs);
      logger.info(`Ingested ${cachedDocs.length} tweets into vector store`);
    } catch (error) {
      logger.warn("Vector store embedding failed, using keyword fallback");
    }

    return cachedDocs.length;
  } catch (error) {
    logger.error("Tweet ingestion failed", error);
    return 0;
  }
}

export function getCachedDocs(): Document[] {
  return cachedDocs;
}

export async function ingestRawTexts(texts: string[]): Promise<void> {
  const docs = texts.map((text, i) =>
    new Document({
      pageContent: text,
      metadata: { index: i, timestamp: new Date().toISOString() },
    })
  );
  cachedDocs = [...cachedDocs, ...docs];
}