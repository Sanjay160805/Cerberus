import { NextResponse, NextRequest } from "next/server";
import { getVaultPosition } from "@/bonzo/keeper";
import { getHBARUSDPrice, getPriceFeedMeta } from "@/oracle/priceFeeds";

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("accountId") ?? "";
    // Strip everything except digits and dots to remove hidden chars
    const accountId = raw.replace(/[^0-9.]/g, "") || undefined;

    console.log(`GET /api/positions accountId raw="${raw}" clean="${accountId}" rawLen=${raw.length}`);

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
    const { action, amount, accountId: rawAccountId } = await req.json();
    const accountId = typeof rawAccountId === "string"
      ? rawAccountId.replace(/[^0-9.]/g, "") || undefined
      : undefined;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 });
    }

    const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1e18));
    const { BONZO_LENDING_POOL } = await import("@/lib/constants");

    if (action === "deposit") {
      const { depositHBAR } = await import("@/bonzo/wethGateway");
      try {
        const txHash = await depositHBAR(BONZO_LENDING_POOL, amountBigInt, accountId);
        return NextResponse.json({
          ok: true, txHash, action: "deposit", amount, accountId,
          message: `Deposited ${amount} HBAR into Bonzo`,
        });
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message ?? "Deposit failed" }, { status: 400 });
      }
    }

    if (action === "withdraw") {
      const { withdrawHBAR } = await import("@/bonzo/wethGateway");
      try {
        const txHash = await withdrawHBAR(BONZO_LENDING_POOL, amountBigInt, accountId);
        return NextResponse.json({
          ok: true, txHash, action: "withdraw", amount, accountId,
          message: `Withdrew ${amount} HBAR from Bonzo`,
        });
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message ?? "Withdraw failed" }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}