import { NextResponse } from "next/server";
import { stopScheduler, getSchedulerStatus } from "@/agent/scheduler";

export async function POST() {
  try {
    stopScheduler();
    return NextResponse.json({ ok: true, status: getSchedulerStatus() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
