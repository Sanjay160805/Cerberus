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

function getLendingPool(): ethers.Contract {
  return new ethers.Contract(BONZO_LENDING_POOL, LENDING_POOL_ABI, getSigner());
}

export async function getUserAccountData(userAddress?: string): Promise<UserAccountData | null> {
  try {
    const signer = getSigner();
    const user = userAddress || signer.address;
    const pool = getLendingPool();
    const data = await pool.getUserAccountData(user);
    return { totalCollateralETH: data[0], totalDebtETH: data[1], availableBorrowsETH: data[2], currentLiquidationThreshold: data[3], ltv: data[4], healthFactor: data[5] };
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
    const tx = await pool.deposit(asset, amount, signer.address, 0);
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
    const tx = await pool.withdraw(asset, amount, signer.address);
    await tx.wait();
    return tx.hash;
  } catch (error) {
    logger.error("Withdraw failed", error);
    return null;
  }
}
