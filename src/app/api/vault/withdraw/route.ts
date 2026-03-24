import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { BONZO_LENDING_POOL, SAUCERSWAP_V2_ROUTER, WHBAR_TOKEN_ADDRESS, USDC_TOKEN_ADDRESS } from "@/lib/constants";
import { getProvider } from "@/bonzo/client";

// ABIs
const LENDING_POOL_ABI = [
  "function withdraw(address asset, uint256 amount, address to) external returns (uint256)",
];
const SAUCERSWAP_ROUTER_ABI = [
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
];

async function toEvmAddress(accountId: string): Promise<string> {
  if (accountId.startsWith("0x")) return accountId;
  const res = await fetch(`https://mainnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`);
  const data = await res.json() as { evm_address?: string };
  if (!data?.evm_address) throw new Error(`No EVM address for ${accountId}`);
  return data.evm_address;
}

/**
 * POST /api/vault/withdraw
 * Step 1: Withdraw USDC from Bonzo
 * Step 2: Swap USDC -> HBAR (SaucerSwap V2)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, accountId, step = 1 } = body;
    const evmAddress = await toEvmAddress(accountId);

    if (step === 1) {
      // Step 1: Withdraw USDC from LendingPool
      // Note: 'amount' here is in equivalent HBAR units or we can assume it's USDC.
      // Since the UI says "HBAR", we convert the HBAR amount to USDC equivalent (roughly)
      // or just withdraw exactly what was requested scaling to 6 decimals.
      const amountUsdc = ethers.parseUnits(amount || "0", 6); // Simple assumption: 1:1 for testnet if users think they are same value
      
      const iface = new ethers.Interface(LENDING_POOL_ABI);
      const data = iface.encodeFunctionData("withdraw", [
        USDC_TOKEN_ADDRESS,
        amountUsdc,
        evmAddress,
      ]);

      return NextResponse.json({
        ok: true,
        step: 1,
        nextStep: 2,
        action: "WITHDRAW_USDC",
        tx: { to: BONZO_LENDING_POOL, data, value: "0" },
      });
    }

    if (step === 2) {
      // Step 2: Swap USDC -> HBAR
      const iface = new ethers.Interface(SAUCERSWAP_ROUTER_ABI);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      // We expect 'usdcAmount' from the frontend
      const { usdcAmount } = body;
      let amountIn: bigint;

      if (usdcAmount && usdcAmount !== "MAX") {
        amountIn = ethers.parseUnits(usdcAmount, 6);
      } else {
        // Fetch actual balance if usdcAmount is "MAX" or not provided
        const provider = getProvider();
        const usdcContract = new ethers.Contract(USDC_TOKEN_ADDRESS, ["function balanceOf(address) view returns (uint256)"], provider);
        amountIn = await usdcContract.balanceOf(evmAddress);
      }

      if (!amountIn || amountIn === 0n) {
        return NextResponse.json({ ok: false, error: "USDC balance to swap not found. Please wait for the withdrawal to index." });
      }

      const data = iface.encodeFunctionData("swapExactTokensForETH", [
        amountIn,
        0, // amountOutMin
        [USDC_TOKEN_ADDRESS, WHBAR_TOKEN_ADDRESS],
        evmAddress,
        deadline,
      ]);

      return NextResponse.json({
        ok: true,
        step: 2,
        nextStep: null,
        action: "SWAP_USDC_TO_HBAR",
        tx: { to: SAUCERSWAP_V2_ROUTER, data, value: "0" },
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid step" });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}

