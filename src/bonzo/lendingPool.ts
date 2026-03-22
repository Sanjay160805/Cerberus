import { ethers } from "ethers";
import { BONZO_LENDING_POOL } from "@/lib/constants";
import { getSigner } from "./client";
import { UserAccountData } from "./types";
import { logger } from "@/lib/logger";

const LENDING_POOL_ABI = [
  "function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  "function withdraw(address asset, uint256 amount, address to) external returns (uint256)",
  "function getUserAccountData(address user) external view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
  "function getReservesList() external view returns (address[])",
];

// Convert Hedera account ID (0.0.X) to EVM address via mirror node
async function toEvmAddress(accountId: string): Promise<string> {
  if (!accountId || accountId.startsWith("0x")) return accountId;

  // Extract only digits from each segment explicitly
  const segments = String(accountId).split(".");
  const shard = (segments[0] ?? "0").replace(/\D/g, "") || "0";
  const realm = (segments[1] ?? "0").replace(/\D/g, "") || "0";
  const num   = (segments[2] ?? "0").replace(/\D/g, "") || "0";
  const safeId = `${shard}.${realm}.${num}`;

  logger.info(`toEvmAddress safeId="${safeId}" safeIdLen=${safeId.length}`);

  try {
    const url = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${shard}.${realm}.${num}`;
    logger.info(`Mirror node fetch URL: ${url}`);
    const res = await fetch(url);
    const data = await res.json();
    logger.info(`Mirror node evm_address: "${data?.evm_address}"`);
    if (data?.evm_address) {
      const addr = String(data.evm_address).trim().replace(/"/g, "");
      return addr.startsWith("0x") ? addr : "0x" + addr;
    }
  } catch (e) {
    logger.error(`Mirror node fetch failed`, e);
  }

  // Fallback: derive from numeric account number
  const numInt = parseInt(num);
  return "0x" + numInt.toString(16).padStart(40, "0");
}

function getLendingPool(): ethers.Contract {
  return new ethers.Contract(BONZO_LENDING_POOL, LENDING_POOL_ABI, getSigner());
}

export async function getUserAccountData(
  accountId?: string
): Promise<UserAccountData | null> {
  try {
    const signer = getSigner();
    const evmAddress = accountId ? await toEvmAddress(accountId) : signer.address;
    logger.info(`Calling getUserAccountData with evmAddress="${evmAddress}"`);
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
  } catch (error) {
    logger.error("getUserAccountData failed", error);
    return null;
  }
}

export async function getReservesList(): Promise<string[]> {
  try {
    return await getLendingPool().getReservesList();
  } catch (error) {
    logger.error("getReservesList failed", error);
    return [];
  }
}

export async function deposit(asset: string, amount: bigint): Promise<string | null> {
  try {
    const pool = getLendingPool();
    const signer = getSigner();
    const tx = await pool.deposit(asset, amount, signer.address, 0, { gasLimit: 300000 });
    await tx.wait();
    return tx.hash;
  } catch (error) {
    logger.error("Deposit failed", error);
    return null;
  }
}

export async function withdraw(asset: string, amount: bigint): Promise<string | null> {
  try {
    const pool = getLendingPool();
    const signer = getSigner();
    const tx = await pool.withdraw(asset, amount, signer.address, { gasLimit: 300000 });
    await tx.wait();
    return tx.hash;
  } catch (error) {
    logger.error("Withdraw failed", error);
    return null;
  }
}