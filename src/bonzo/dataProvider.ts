import { ethers } from "ethers";
import { BONZO_DATA_PROVIDER } from "@/lib/constants";
import { getSigner } from "./client";
import { logger } from "@/lib/logger";

const DATA_PROVIDER_ABI = [
  "function getUserReserveData(address asset, address user) external view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,uint40)",
  "function getAllReservesTokens() external view returns (tuple(string,address)[])",
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
