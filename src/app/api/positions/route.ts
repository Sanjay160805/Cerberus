import { NextResponse } from "next/server";
import { getVaultPosition } from "@/bonzo/keeper";
import { getHBARPrice } from "@/oracle/priceFeeds";

export async function GET() {
  try {
    const [position, priceData] = await Promise.all([getVaultPosition(), getHBARPrice()]);
    return NextResponse.json({ ok: true, position, price: priceData });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
