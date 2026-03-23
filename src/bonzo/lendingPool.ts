import { ethers } from "ethers";
import { BONZO_LENDING_POOL } from "@/lib/constants";
import { getSigner } from "./client";
import { UserAccountData } from "./types";
import { logger } from "@/lib/logger";

const LENDING_POOL_ABI = [
  "function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external",
  "function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf) external returns (uint256)",
  "function withdraw(address asset, uint256 amount, address to) external returns (uint256)",
  "function getUserAccountData(address user) external view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
  "function getReservesList() external view returns (address[])",
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
  logger.info(`Fetching from Mirror Node: ${url}`);

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

function getLendingPool(): ethers.Contract {
  return new ethers.Contract(BONZO_LENDING_POOL, LENDING_POOL_ABI, getSigner());
}

/**
 * Get user account data from Bonzo Lending Pool
 * NO FALLBACK - throws if operation fails
 */
export async function getUserAccountData(accountId?: string): Promise<UserAccountData> {
  const signer = getSigner();
  const evmAddress = accountId ? await toEvmAddress(accountId) : signer.address;
  logger.info(`Fetching account data for ${evmAddress}`);

  const pool = getLendingPool();
  const data = await pool.getUserAccountData(evmAddress);

  return {
    totalCollateralETH: data[0],
    totalDebtETH: data[1],
    availableBorrowsETH: data[2],
    currentLiquidationThreshold: data[3],
    ltv: data[4],
    healthFactor: data[5],
  };
}

/**
 * Get list of available reserve tokens in Bonzo Lend
 * NO FALLBACK - throws if operation fails
 */
export async function getReservesList(): Promise<string[]> {
  logger.info(`Fetching reserves list from Bonzo LendingPool`);
  return await getLendingPool().getReservesList();
}

/**
 * Supply asset to Bonzo Lend Protocol
 * NO FALLBACK - throws if transaction fails
 */
export async function deposit(asset: string, amount: bigint, accountId?: string): Promise<string> {
  const signer = getSigner();
  const onBehalfOf = accountId ? await toEvmAddress(accountId) : signer.address;
  
  logger.info(`Depositing ${ethers.formatEther(amount)} of ${asset} to Bonzo Lend`);

  const pool = getLendingPool();
  const tx = await pool.deposit(asset, amount, onBehalfOf, 0, { gasLimit: 300000 });
  logger.info(`Deposit tx submitted: ${tx.hash}`);
  
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error(`Deposit transaction ${tx.hash} failed to complete`);
  }
  
  logger.info(`Deposit confirmed: ${tx.hash}`);
  return tx.hash;
}

/**
 * Borrow asset from Bonzo Lend Protocol
 * NO FALLBACK - throws if transaction fails
 * @param asset Token address to borrow
 * @param amount Amount to borrow (in smallest units)
 * @param rateMode 1 = stable rate, 2 = variable rate (recommended: 2)
 * @param accountId Optional Hedera account to borrow on behalf of
 */
export async function borrow(asset: string, amount: bigint, rateMode: number = 2, accountId?: string): Promise<string> {
  if (rateMode !== 1 && rateMode !== 2) {
    throw new Error(`Invalid rate mode: ${rateMode}. Must be 1 (stable) or 2 (variable)`);
  }

  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const signer = getSigner();
      const onBehalfOf = accountId ? await toEvmAddress(accountId) : signer.address;

      logger.info(`[Attempt ${attempt}/${maxRetries}] Borrowing ${ethers.formatEther(amount)} of ${asset}`);

      const pool = getLendingPool();
      const tx = await pool.borrow(asset, amount, rateMode, 0, onBehalfOf, { gasLimit: 350000 });
      const receipt = await tx.wait();
      if (!receipt) throw new Error("Borrow failed");

      logger.info(`Borrow confirmed: ${tx.hash}`);
      return tx.hash;
    } catch (error: any) {
      lastError = error;
      logger.error(`Borrow attempt ${attempt} failed: ${error.message}`);
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Repay borrowed asset to Bonzo Lend Protocol
 * NO FALLBACK - throws if transaction fails
 * @param asset Token address to repay
 * @param amount Amount to repay (in smallest units)
 * @param rateMode 1 = stable debt, 2 = variable debt
 * @param accountId Optional Hedera account to repay on behalf of
 */
export async function repay(asset: string, amount: bigint, rateMode: number = 2, accountId?: string): Promise<string> {
  if (rateMode !== 1 && rateMode !== 2) {
    throw new Error(`Invalid rate mode: ${rateMode}. Must be 1 (stable) or 2 (variable)`);
  }

  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const signer = getSigner();
      const onBehalfOf = accountId ? await toEvmAddress(accountId) : signer.address;

      logger.info(`[Attempt ${attempt}/${maxRetries}] Repaying ${ethers.formatEther(amount)} of ${asset}`);

      const pool = getLendingPool();
      const tx = await pool.repay(asset, amount, rateMode, onBehalfOf, { gasLimit: 350000 });
      const receipt = await tx.wait();
      if (!receipt) throw new Error("Repay failed");

      logger.info(`Repay confirmed: ${tx.hash}`);
      return tx.hash;
    } catch (error: any) {
      lastError = error;
      logger.error(`Repay attempt ${attempt} failed: ${error.message}`);
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Withdraw supplied asset from Bonzo Lend Protocol
 * NO FALLBACK - throws if transaction fails
 */
export async function withdraw(asset: string, amount: bigint, to?: string): Promise<string> {
  const signer = getSigner();
  const recipient = to ? await toEvmAddress(to) : signer.address;

  logger.info(`Withdrawing ${ethers.formatEther(amount)} of ${asset}`);

  const pool = getLendingPool();
  const tx = await pool.withdraw(asset, amount, recipient, { gasLimit: 300000 });
  logger.info(`Withdraw tx submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error(`Withdraw transaction ${tx.hash} failed to complete`);
  }

  logger.info(`Withdraw confirmed: ${tx.hash}`);
  return tx.hash;
}