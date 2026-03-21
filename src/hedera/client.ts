import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";
import { logger } from "@/lib/logger";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

let hederaClient: Client | null = null;

export function getHederaClient(): Client {
  if (hederaClient) return hederaClient;

  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || "testnet";

  if (!accountId || !privateKey) {
    throw new Error("HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set");
  }

  try {
    hederaClient = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();

    // Use ECDSA for 0x prefixed keys, ED25519 for 302e prefixed keys
    const key = privateKey.startsWith("0x")
      ? PrivateKey.fromStringECDSA(privateKey)
      : PrivateKey.fromStringED25519(privateKey);

    hederaClient.setOperator(AccountId.fromString(accountId), key);

    logger.info(`Hedera client initialized on ${network}`);
    return hederaClient;
  } catch (error) {
    logger.error("Failed to initialize Hedera client", error);
    throw error;
  }
}