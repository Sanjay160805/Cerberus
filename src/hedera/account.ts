import { AccountBalanceQuery, AccountId } from "@hashgraph/sdk";
import { getHederaClient } from "./client";
import { logger } from "@/lib/logger";

export async function getAccountBalance(): Promise<{ hbar: string; tokens: Record<string, string> }> {
  try {
    const client = getHederaClient();
    const accountId = process.env.HEDERA_ACCOUNT_ID!;
    const balance = await new AccountBalanceQuery().setAccountId(AccountId.fromString(accountId)).execute(client);
    const tokens: Record<string, string> = {};
    // Convert tokens to record if available
    if (balance.tokens) {
      try {
        const tokensData = JSON.parse(JSON.stringify(balance.tokens));
        Object.assign(tokens, tokensData);
      } catch {
        // Silently fail token parsing
      }
    }
    return { hbar: balance.hbars.toString(), tokens };
  } catch (error) {
    logger.error("Failed to get account balance", error);
    return { hbar: "0", tokens: {} };
  }
}
