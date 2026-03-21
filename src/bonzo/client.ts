import { ethers } from "ethers";
import { BONZO_RPC_URL } from "@/lib/constants";
import { logger } from "@/lib/logger";

let provider: ethers.JsonRpcProvider | null = null;
let signer: ethers.Wallet | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(BONZO_RPC_URL);
    logger.info(`Bonzo provider connected: ${BONZO_RPC_URL}`);
  }
  return provider;
}

export function getSigner(): ethers.Wallet {
  if (!signer) {
    const privateKey = process.env.HEDERA_PRIVATE_KEY;
    if (!privateKey) throw new Error("HEDERA_PRIVATE_KEY not set");
    const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey.slice(-64)}`;
    signer = new ethers.Wallet(formattedKey, getProvider());
    logger.info(`Bonzo signer: ${signer.address}`);
  }
  return signer;
}
