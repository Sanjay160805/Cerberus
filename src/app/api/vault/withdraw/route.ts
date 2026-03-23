import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { BONZO_WETH_GATEWAY, BONZO_LENDING_POOL } from "@/lib/constants";

// WETHGateway ABI — only the function we need
const WETH_GATEWAY_ABI = [
  "function withdrawETH(address lendingPool, uint256 amount, address to) external",
];

/**
 * Resolve Hedera account ID (0.0.X) → EVM address via Mirror Node
 */
async function toEvmAddress(accountId: string): Promise<string> {
  if (accountId.startsWith("0x")) return accountId;
  const segments = accountId.split(".");
  if (segments.length !== 3) throw new Error(`Invalid Hedera account: ${accountId}`);
  const res = await fetch(
    `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
  );
  if (!res.ok) throw new Error(`Mirror Node error ${res.status} for ${accountId}`);
  const data = await res.json() as { evm_address?: string };
  if (!data.evm_address) throw new Error(`No EVM address for ${accountId}`);
  return data.evm_address;
}

/**
 * POST /api/vault/withdraw
 * Body: { amount: string (HBAR, e.g. "5" or "max"), accountId: string }
 * Returns unsigned tx { to, data, value: "0" } for the browser to sign via HashPack
 */
export async function POST(req: NextRequest) {
  try {
    const { amount, accountId } = await req.json();

    if (!amount || !accountId) {
      return NextResponse.json(
        { ok: false, error: "amount and accountId are required" },
        { status: 400 }
      );
    }

    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      return NextResponse.json(
        { ok: false, error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    // Convert HBAR → wei
    const amountWei = ethers.parseEther(amountFloat.toString());

    // Resolve EVM address — tokens go back to the user's own wallet
    const evmAddress = await toEvmAddress(accountId);

    // Encode withdrawETH calldata
    const iface = new ethers.Interface(WETH_GATEWAY_ABI);
    const data = iface.encodeFunctionData("withdrawETH", [
      BONZO_LENDING_POOL,
      amountWei,
      evmAddress,
    ]);

    return NextResponse.json({
      ok: true,
      tx: {
        to: BONZO_WETH_GATEWAY,
        data,
        value: "0",
      },
      evmAddress,
      amountHbar: amountFloat,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
