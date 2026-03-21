import { NextResponse, NextRequest } from "next/server";
import { getVaultPosition } from "@/bonzo/keeper";
import { getHBARUSDPrice, getPriceFeedMeta } from "@/oracle/priceFeeds";

export async function GET(req: NextRequest) {
  try {
    // Read connected wallet from query param e.g. /api/positions?accountId=0.0.12345
    const accountId = req.nextUrl.searchParams.get("accountId") ?? undefined;

    const [position, hbarPrice, priceMeta] = await Promise.all([
      getVaultPosition(accountId),
      getHBARUSDPrice(),
      getPriceFeedMeta(),
    ]);

    return NextResponse.json({
      ok: true,
      position,
      price: {
        value: hbarPrice,
        source: priceMeta?.source ?? "mock",
        timestamp: priceMeta?.timestamp ?? Date.now(),
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, amount, accountId } = await req.json();

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 });
    }

    const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1e18));
    const { BONZO_LENDING_POOL } = await import("@/lib/constants");

    if (action === "deposit") {
      const { depositHBAR } = await import("@/bonzo/wethGateway");
      const txHash = await depositHBAR(BONZO_LENDING_POOL, amountBigInt);
      return NextResponse.json({
        ok: true,
        txHash,
        action: "deposit",
        amount,
        accountId,
        message: txHash
          ? `Deposited ${amount} HBAR into Bonzo`
          : "Deposit attempted — testnet HTS limitation",
      });
    }

    if (action === "withdraw") {
      const { withdrawHBAR } = await import("@/bonzo/wethGateway");
      const txHash = await withdrawHBAR(BONZO_LENDING_POOL, amountBigInt);
      return NextResponse.json({
        ok: true,
        txHash,
        action: "withdraw",
        amount,
        accountId,
        message: txHash
          ? `Withdrew ${amount} HBAR from Bonzo`
          : "Withdraw attempted — testnet HTS limitation",
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}