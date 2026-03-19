/**
 * Hedera SDK Client
 * Initializes Hedera network connection and topic management
 */

import {
  Client,
  AccountId,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  Status,
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";

dotenv.config();

let client: Client | null = null;
let topicId: string | null = null;

/**
 * Initialize Hedera client
 */
export async function initializeHederaClient(): Promise<Client> {
  if (client) return client;

  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || "testnet";

  if (!accountId || !privateKey) {
    throw new Error("Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY");
  }

  const parsedAccountId = AccountId.fromString(accountId);
  const parsedPrivateKey = PrivateKey.fromStringED25519(privateKey);

  if (network === "mainnet") {
    client = Client.forMainnet();
  } else {
    client = Client.forTestnet();
  }

  client.setOperator(parsedAccountId, parsedPrivateKey);

  console.log(`✓ Hedera client initialized on ${network}`);
  return client;
}

/**
 * Get or create HCS topic
 */
export async function getOrCreateTopic(): Promise<string> {
  if (topicId) return topicId;

  const envTopicId = process.env.HCS_TOPIC_ID;
  if (envTopicId) {
    topicId = envTopicId;
    console.log(`✓ Using existing HCS topic: ${topicId}`);
    return topicId;
  }

  const hederaClient = await initializeHederaClient();

  console.log("Creating new HCS topic...");
  const topicCreateTx = new TopicCreateTransaction();
  const txResponse = await topicCreateTx.execute(hederaClient);
  const receipt = await txResponse.getReceipt(hederaClient);

  topicId = receipt.topicId!.toString();
  console.log(`✓ Created HCS topic: ${topicId}`);
  console.log(`  Add HCS_TOPIC_ID=${topicId} to your .env file`);

  return topicId;
}

/**
 * Get Hedera client instance
 */
export async function getHederaClient(): Promise<Client> {
  if (!client) {
    await initializeHederaClient();
  }
  return client!;
}

/**
 * Submit a message to HCS topic
 */
export async function submitTopicMessage(
  message: string,
): Promise<{ sequenceNumber: number; messageHash: string }> {
  const hederaClient = await getHederaClient();
  const topic = await getOrCreateTopic();

  const submitTx = new TopicMessageSubmitTransaction()
    .setTopicId(topic)
    .setMessage(message);

  const txResponse = await submitTx.execute(hederaClient);
  const receipt = await txResponse.getReceipt(hederaClient);

  if (receipt.status !== Status.Success) {
    throw new Error(`HCS message submission failed: ${receipt.status}`);
  }

  return {
    sequenceNumber: receipt.topicSequenceNumber?.toNumber() || 0,
    messageHash: txResponse.transactionHash.toString(),
  };
}

/**
 * Get current HCS topic
 */
export async function getCurrentTopic(): Promise<string> {
  return getOrCreateTopic();
}
