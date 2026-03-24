import { NextResponse } from "next/server";
import { runCycle } from "@/agent/engine";
import { logger } from "@/lib/serverLogger";

export async function POST() {
  try {
    logger.info("[API] Manual agent cycle triggered via POST");
    await runCycle();
    return NextResponse.json({ success: true, message: "Agent cycle completed successfully" });
  } catch (err: any) {
    logger.error(`[API] Agent cycle failed: ${err.message}`);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Agent Engine Active" });
}
