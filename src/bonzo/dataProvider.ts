import { ethers } from "ethers";
import { BONZO_DATA_PROVIDER } from "@/lib/constants";
import { getSigner } from "./client";
import { logger } from "@/lib/logger";

const DATA_PROVIDER_ABI = [
  "function getReserveData(address asset) external view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool)",
  "function getUserReserveData(address asset, address user) external view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,uint40)",
  "function getAllReservesTokens() external view returns (tuple(string,address)[])",
  "function getReserveTokensAddresses(address asset) external view returns (address,address,address)",
];

function getDataProvider(): ethers.Contract {
  return new ethers.Contract(BONZO_DATA_PROVIDER, DATA_PROVIDER_ABI, getSigner());
}

export async function getAllReservesTokens(): Promise<{ symbol: string; address: string }[]> {
  try {
    const tokens = await getDataProvider().getAllReservesTokens();
    return tokens.map((t: [string, string]) => ({ symbol: t[0], address: t[1] }));
  } catch (error) {
    logger.error("getAllReservesTokens failed", error);
    return [];
  }
}

/**
 * Get global reserve data (APY, utilization, etc.) for an asset
 * Does NOT require user to have initialized reserves
 */
export async function getReserveData(asset: string): Promise<Record<string, bigint> | null> {
  try {
    const data = await getDataProvider().getReserveData(asset);
    // index 6 is liquidityRate (APY)
    return {
      availableLiquidity: data[0],
      totalStableDebt: data[1],
      totalVariableDebt: data[2],
      liquidityRate: data[6],  // APY for depositors
    };
  } catch (error) {
    logger.error("getReserveData failed", error);
    return null;
  }
}

/**
 * Get user-specific reserve data
 * Requires user to have initialized reserves (made a deposit)
 */
export async function getUserReserveData(asset: string, user?: string): Promise<Record<string, bigint> | null> {
  try {
    const signer = getSigner();
    const data = await getDataProvider().getUserReserveData(asset, user || signer.address);
    return { currentATokenBalance: data[0], currentStableDebt: data[1], currentVariableDebt: data[2], principalStableDebt: data[3], scaledVariableDebt: data[4], stableBorrowRate: data[5], liquidityRate: data[6] };
  } catch (error) {
    logger.error("getUserReserveData failed", error);
    return null;
  }
}

export async function getReserveTokensAddresses(asset: string): Promise<{ aToken: string; stableDebtToken: string; variableDebtToken: string } | null> {
  try {
    const data = await getDataProvider().getReserveTokensAddresses(asset);
    return {
      aToken: data[0],
      stableDebtToken: data[1],
      variableDebtToken: data[2],
    };
  } catch (error) {
    logger.error("getReserveTokensAddresses failed", error);
    return null;
  }
}
