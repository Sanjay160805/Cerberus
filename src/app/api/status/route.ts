import { NextResponse } from "next/server";
import { getSchedulerStatus } from "@/agent/scheduler";
import { getLastDecision } from "@/db/decisions";
import { getTweetCount } from "@/db/tweets";

export async function GET() {
  try {
    const status = getSchedulerStatus();
    const lastDecision = getLastDecision();
    const tweetCount = getTweetCount();
    return NextResponse.json({ ok: true, agent: { running: status.running, interval: status.interval, lastDecision, tweetCount }, timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
