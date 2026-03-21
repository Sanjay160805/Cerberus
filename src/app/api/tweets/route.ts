import { NextRequest, NextResponse } from "next/server";
import { getRecentTweets, getAllCryptoTweets } from "@/db/tweets";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const tweets = getAllCryptoTweets(limit);
    return NextResponse.json({ ok: true, tweets, count: tweets.length });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}