import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { BONZO_WETH_GATEWAY, BONZO_LENDING_POOL } from "@/lib/constants";

// WETHGateway ABI — only the function we need
const WETH_GATEWAY_ABI = [
  "function depositETH(address lendingPool, address onBehalfOf, uint16 referralCode) external payable",
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
 * POST /api/vault/deposit
 * Body: { amount: string (HBAR, e.g. "10"), accountId: string }
 * Returns unsigned tx { to, data, value } for the browser to sign via HashPack
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

    // Convert HBAR → tinybars → wei (1 HBAR = 1e8 tinybars; Hedera EVM uses 1e18 wei = 1 HBAR)
    const amountWei = ethers.parseEther(amountFloat.toString());

    // Resolve EVM address for the user
    const evmAddress = await toEvmAddress(accountId);

    // Encode depositETH calldata
    const iface = new ethers.Interface(WETH_GATEWAY_ABI);
    const data = iface.encodeFunctionData("depositETH", [
      BONZO_LENDING_POOL,
      evmAddress,
      0,
    ]);

    return NextResponse.json({
      ok: true,
      tx: {
        to: BONZO_WETH_GATEWAY,
        data,
        value: amountWei.toString(), // hex or decimal string — ethers handles both
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
