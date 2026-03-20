/**
 * Hedera SDK Client
 * Initializes and manages Hedera network connection
 */

import {
  Client,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";

dotenv.config();

let hederaClient: Client | null = null;

/**
 * Get or initialize Hedera client
 * Handles ECDSA private keys that start with 0x
 */
export async function getHederaClient(): Promise<Client> {
  if (hederaClient) return hederaClient;

  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || "testnet";

  if (!accountId || !privateKey) {
    throw new Error("Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY in .env");
  }

  try {
    const parsedAccountId = AccountId.fromString(accountId);
    
    // Handle ECDSA keys that start with 0x
    let parsedPrivateKey: PrivateKey;
    if (privateKey.startsWith("0x")) {
      parsedPrivateKey = PrivateKey.fromStringECDSA(privateKey);
      console.log("✓ Loaded ECDSA private key");
    } else {
      parsedPrivateKey = PrivateKey.fromString(privateKey);
      console.log("✓ Loaded ED25519 private key");
    }

    // Connect to appropriate network
    if (network === "mainnet") {
      hederaClient = Client.forMainnet();
    } else {
      hederaClient = Client.forTestnet();
    }

    hederaClient.setOperator(parsedAccountId, parsedPrivateKey);
    console.log(`✓ Hedera client initialized on ${network}`);
    console.log(`  Account: ${accountId}`);

    return hederaClient;
  } catch (error) {
    console.error("❌ Failed to initialize Hedera client:", error);
    throw error;
  }
}

