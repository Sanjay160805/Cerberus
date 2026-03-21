import { ethers } from "ethers";
import { BONZO_LENDING_POOL, BONZO_WETH_GATEWAY } from "@/lib/constants";
import { getSigner } from "./client";
import { logger } from "@/lib/logger";

const WETH_GATEWAY_ABI = [
  "function depositETH(address lendingPool, address onBehalfOf, uint16 referralCode) external payable",
  "function withdrawETH(address lendingPool, uint256 amount, address to) external",
];

// Convert Hedera account ID (0.0.X) to EVM address via mirror node
async function toEvmAddress(accountId: string): Promise<string> {
  if (!accountId || accountId.startsWith("0x")) return accountId;
  try {
    const res = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
    );
    const data = await res.json();
    if (data?.evm_address) {
      const addr = data.evm_address;
      return addr.startsWith("0x") ? addr : "0x" + addr;
    }
  } catch {}
  // Fallback: derive EVM address from numeric account ID
  const num = parseInt(accountId.split(".")[2] ?? "0");
  return "0x" + num.toString(16).padStart(40, "0");
}

function getWETHGateway(): ethers.Contract {
  return new ethers.Contract(BONZO_WETH_GATEWAY, WETH_GATEWAY_ABI, getSigner());
}

export async function depositHBAR(
  lendingPool: string,
  amount: bigint,
  onBehalfOf?: string // Hedera account ID or EVM address
): Promise<string | null> {
  try {
    const signer = getSigner();

    // Resolve onBehalfOf to EVM address (use signer if not provided)
    const recipient = onBehalfOf
      ? await toEvmAddress(onBehalfOf)
      : signer.address;

    logger.info(`Depositing ${ethers.formatEther(amount)} HBAR on behalf of ${recipient}`);

    const gateway = getWETHGateway();

    // Estimate gas first to catch revert early with a clear message
    try {
      await gateway.depositETH.estimateGas(lendingPool, recipient, 0, {
        value: amount,
      });
    } catch (estimateError: any) {
      // aToken not associated — this is the most common Hedera testnet issue
      logger.error(
        "Gas estimate failed — recipient account likely not associated with aWHBAR token on Hedera testnet",
        estimateError
      );
      throw new Error(
        "Deposit failed: your Hedera account must first associate with the aWHBAR token. " +
        "Open HashPack → go to the Bonzo Finance testnet app → make a small deposit there first to auto-associate, then retry here."
      );
    }

    const tx = await gateway.depositETH(lendingPool, recipient, 0, {
      value: amount,
      gasLimit: 300000,
    });
    await tx.wait();
    logger.info(`Deposit successful — tx: ${tx.hash}`);
    return tx.hash;
  } catch (error: any) {
    logger.error("HBAR deposit failed", error);
    throw error; // re-throw so route.ts can return the real message to the UI
  }
}

export async function withdrawHBAR(
  lendingPool: string,
  amount: bigint,
  to?: string // Hedera account ID or EVM address
): Promise<string | null> {
  try {
    const signer = getSigner();
    const recipient = to ? await toEvmAddress(to) : signer.address;

    logger.info(`Withdrawing ${ethers.formatEther(amount)} HBAR to ${recipient}`);

    const tx = await getWETHGateway().withdrawETH(lendingPool, amount, recipient, {
      gasLimit: 300000,
    });
    await tx.wait();
    logger.info(`Withdraw successful — tx: ${tx.hash}`);
    return tx.hash;
  } catch (error: any) {
    logger.error("HBAR withdraw failed", error);
    throw error;
  }
}