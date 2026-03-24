import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { BONZO_LENDING_POOL, SAUCERSWAP_V2_ROUTER, WHBAR_TOKEN_ADDRESS, USDC_TOKEN_ADDRESS } from "@/lib/constants";
import { getProvider } from "@/bonzo/client";

// ABIs
const SAUCERSWAP_ROUTER_ABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
];
const LENDING_POOL_ABI = [
  "function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
];

async function toEvmAddress(accountId: string): Promise<string> {
  if (accountId.startsWith("0x")) return accountId;
  const res = await fetch(`https://mainnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`);
  const data = await res.json() as { evm_address?: string };
  if (!data?.evm_address) throw new Error(`No EVM address for ${accountId}`);
  return data.evm_address;
}

/**
 * POST /api/vault/deposit
 * Step 1: Swap HBAR -> USDC
 * Step 2: Approve USDC
 * Step 3: Deposit USDC
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, accountId, step = 1 } = body;
    const evmAddress = await toEvmAddress(accountId);
    const amountWei = ethers.parseEther(amount || "0");

    if (step === 1) {
      // Step 1: Swap HBAR -> USDC (SaucerSwap V2)
      const iface = new ethers.Interface(SAUCERSWAP_ROUTER_ABI);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const data = iface.encodeFunctionData("swapExactETHForTokens", [
        0, // amountOutMin (0 for testnet simplicity)
        [WHBAR_TOKEN_ADDRESS, USDC_TOKEN_ADDRESS],
        evmAddress,
        deadline,
      ]);

      return NextResponse.json({
        ok: true,
        step: 1,
        nextStep: 2,
        action: "SWAP_HBAR_TO_USDC",
        tx: { to: SAUCERSWAP_V2_ROUTER, data, value: amountWei.toString() },
      });
    }

    if (step === 2) {
      // Step 2: Approve USDC for LendingPool
      // Here we assume the user just finished swapping. 
      // We don't know the exact amount yet, so we approve "infinite" or a large enough amount.
      const iface = new ethers.Interface(ERC20_ABI);
      const data = iface.encodeFunctionData("approve", [
        BONZO_LENDING_POOL,
        ethers.MaxUint256,
      ]);

      return NextResponse.json({
        ok: true,
        step: 2,
        nextStep: 3,
        action: "APPROVE_USDC",
        tx: { to: USDC_TOKEN_ADDRESS, data, value: "0" },
      });
    }

    if (step === 3) {
      // Step 3: Deposit USDC
      // Since we don't know the balance on-chain in this stateless API easily without a provider,
      // we'll use a provider here to fetch the actual USDC balance to avoid reverts.
      const iface = new ethers.Interface(LENDING_POOL_ABI);
      
      const provider = getProvider();
      const usdcContract = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, provider);
      
      let depositAmount: bigint;
      const { usdcAmount } = body;

      if (usdcAmount && usdcAmount !== "MAX") {
        depositAmount = ethers.parseUnits(usdcAmount, 6);
      } else {
        // Fetch actual balance if usdcAmount is "MAX" or not provided
        depositAmount = await usdcContract.balanceOf(evmAddress);
      }

      if (depositAmount === 0n) {
        return NextResponse.json({ ok: false, error: "USDC balance not found. Please wait for the swap to complete." });
      }

      const data = iface.encodeFunctionData("deposit", [
        USDC_TOKEN_ADDRESS,
        depositAmount,
        evmAddress,
        0,
      ]);

      return NextResponse.json({
        ok: true,
        step: 3,
        nextStep: null,
        action: "DEPOSIT_USDC",
        tx: { to: BONZO_LENDING_POOL, data, value: "0" },
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid step" });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}

