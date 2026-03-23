import { ethers } from "ethers";
import { BONZO_LENDING_POOL, BONZO_WETH_GATEWAY } from "@/lib/constants";
import { getSigner } from "./client";
import { logger } from "@/lib/logger";

const WETH_GATEWAY_ABI = [
  "function depositETH(address lendingPool, address onBehalfOf, uint16 referralCode) external payable",
  "function withdrawETH(address lendingPool, uint256 amount, address to) external",
];

/**
 * Convert Hedera account ID (0.0.X) to EVM address via Hedera Mirror Node
 * NO FALLBACK - throws error if conversion fails
 */
async function toEvmAddress(accountId: string): Promise<string> {
  if (!accountId) {
    throw new Error("Account ID is required");
  }
  if (accountId.startsWith("0x")) {
    return accountId; // Already EVM format
  }

  // Parse account ID format: shard.realm.num
  const segments = String(accountId).split(".");
  if (segments.length !== 3) {
    throw new Error(`Invalid Hedera account format: ${accountId}. Expected format: shard.realm.num`);
  }

  const shard = segments[0];
  const realm = segments[1];
  const num = segments[2];

  // Validate numeric values
  if (!/^\d+$/.test(shard) || !/^\d+$/.test(realm) || !/^\d+$/.test(num)) {
    throw new Error(`Invalid account ID components: shard=${shard}, realm=${realm}, num=${num}`);
  }

  logger.info(`Converting Hedera account ${accountId} to EVM address`);

  const url = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${shard}.${realm}.${num}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`Mirror Node error (${res.status}): Failed to resolve account ${accountId}`);
  }

  const data = await res.json() as { evm_address?: string };
  if (!data?.evm_address) {
    throw new Error(`Mirror Node returned no EVM address for account ${accountId}`);
  }

  const addr = String(data.evm_address).trim().replace(/"/g, "");
  if (!addr.startsWith("0x")) {
    throw new Error(`Invalid EVM address from Mirror Node: ${addr}`);
  }

  logger.info(`Successfully converted ${accountId} to ${addr}`);
  return addr;
}

function getWETHGateway(): ethers.Contract {
  return new ethers.Contract(BONZO_WETH_GATEWAY, WETH_GATEWAY_ABI, getSigner());
}

export async function depositHBAR(
  lendingPool: string,
  amount: bigint,
  onBehalfOf?: string
): Promise<string> {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const signer = getSigner();
      const recipient = onBehalfOf ? await toEvmAddress(onBehalfOf) : signer.address;

      logger.info(`[Attempt ${attempt}/${maxRetries}] Depositing ${ethers.formatEther(amount)} HBAR to Bonzo Lend (recipient: ${recipient})`);

      const gateway = getWETHGateway();

      // Execute deposit
      const tx = await gateway.depositETH(lendingPool, recipient, 0, {
        value: amount,
        gasLimit: 350000,
      });
      logger.info(`HBAR deposit tx submitted: ${tx.hash}`);

      const receipt = await tx.wait();
      if (!receipt) throw new Error("HBAR deposit failed to complete");

      logger.info(`HBAR deposit confirmed: ${tx.hash}`);
      return tx.hash;
    } catch (error: any) {
      lastError = error;
      logger.error(`Deposit attempt ${attempt} failed: ${error.message}`);
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Withdraw HBAR from Bonzo Lend via WETH Gateway
 * NO FALLBACK - throws if transaction fails
 * @param lendingPool Address of lending pool contract
 * @param amount Amount of HBAR to withdraw (in wei)
 * @param to Optional Hedera account to withdraw to
 */
export async function withdrawHBAR(
  lendingPool: string,
  amount: bigint,
  to?: string
): Promise<string> {
  const signer = getSigner();
  const recipient = to ? await toEvmAddress(to) : signer.address;

  logger.info(`Withdrawing ${ethers.formatEther(amount)} HBAR from Bonzo Lend (recipient: ${recipient})`);

  const tx = await getWETHGateway().withdrawETH(lendingPool, amount, recipient, {
    gasLimit: 300000,
  });
  logger.info(`HBAR withdraw tx submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error(`HBAR withdraw transaction ${tx.hash} failed to complete`);
  }

  logger.info(`HBAR withdraw confirmed: ${tx.hash}`);
  return tx.hash;
}