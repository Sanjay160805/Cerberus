import { Client, PrivateKey, AccountId } from "@hashgraph/sdk";
import { HederaLangchainToolkit } from "hedera-agent-kit";
import { logger } from "@/lib/logger";

let _client: Client | null = null;
let _toolkit: HederaLangchainToolkit | null = null;

export function getHederaClient(): Client {
  if (_client) return _client;

  const accountIdStr = process.env.HEDERA_ACCOUNT_ID;
  const privateKeyStr = process.env.HEDERA_PRIVATE_KEY;
  const network = (process.env.HEDERA_NETWORK || "testnet") as "mainnet" | "testnet";

  if (!accountIdStr || !privateKeyStr) {
    logger.error("Hedera credentials missing in environment variables.");
    throw new Error("Hedera Agent Kit initialization failed: missing credentials.");
  }

  try {
    const formattedKey = privateKeyStr.replace(/^0x/, "");
    const privateKey = PrivateKey.fromStringECDSA(formattedKey);
    const accountId = AccountId.fromString(accountIdStr);

    _client = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
    _client.setOperator(accountId, privateKey);
    logger.info(`Hedera Client initialized for account ${accountIdStr} on ${network}`);
    return _client;
  } catch (error) {
    logger.error("Failed to initialize Hedera Client:", error);
    throw error;
  }
}

export function getHederaToolkit(): HederaLangchainToolkit {
  if (_toolkit) return _toolkit;
  
  const client = getHederaClient();
  try {
    // @ts-ignore: HederaAgentKit uses an older/newer @hashgraph/sdk internally causing structural mismatch for private properties
    _toolkit = new HederaLangchainToolkit({ client, configuration: {} });
    logger.info("HederaLangchainToolkit initialized.");
    return _toolkit;
  } catch (error) {
    logger.error("Failed to initialize HederaLangchainToolkit:", error);
    throw error;
  }
}
