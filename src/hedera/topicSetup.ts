import "dotenv/config";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { TopicCreateTransaction } from "@hashgraph/sdk";
import { getHederaClient } from "./client";
import { logger } from "@/lib/logger";

export async function createHCSTopic(): Promise<string> {
  try {
    const client = getHederaClient();
    const tx = await new TopicCreateTransaction()
      .setTopicMemo("Cerberus Agent Decision Log")
      .execute(client);
    const receipt = await tx.getReceipt(client);
    const topicId = receipt.topicId?.toString() || "";
    logger.info(`HCS Topic created: ${topicId}`);
    console.log(`\n✅ Add this to your .env.local:\nHCS_TOPIC_ID=${topicId}\n`);
    return topicId;
  } catch (error) {
    logger.error("Failed to create HCS topic", error);
    throw error;
  }
}

if (require.main === module) {
  createHCSTopic().catch(console.error);
}