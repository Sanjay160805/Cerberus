import { ethers } from "ethers";
import { BONZO_WETH_GATEWAY } from "@/lib/constants";
import { getSigner } from "./client";
import { logger } from "@/lib/logger";

const WETH_GATEWAY_ABI = [
  "function depositETH(address lendingPool, address onBehalfOf, uint16 referralCode) external payable",
  "function withdrawETH(address lendingPool, uint256 amount, address to) external",
];

function getWETHGateway(): ethers.Contract {
  return new ethers.Contract(BONZO_WETH_GATEWAY, WETH_GATEWAY_ABI, getSigner());
}

export async function depositHBAR(lendingPool: string, amount: bigint): Promise<string | null> {
  try {
    const signer = getSigner();
    const tx = await getWETHGateway().depositETH(lendingPool, signer.address, 0, { value: amount });
    await tx.wait();
    return tx.hash;
  } catch (error) {
    logger.error("HBAR deposit failed", error);
    return null;
  }
}

export async function withdrawHBAR(lendingPool: string, amount: bigint): Promise<string | null> {
  try {
    const signer = getSigner();
    const tx = await getWETHGateway().withdrawETH(lendingPool, amount, signer.address);
    await tx.wait();
    return tx.hash;
  } catch (error) {
    logger.error("HBAR withdraw failed", error);
    return null;
  }
}
