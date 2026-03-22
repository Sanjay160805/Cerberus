import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { logDecisionToHCS } from "@/hedera/hcs";

export const maxDuration = 60;

export async function POST() {
  try {
    const { triggerManualCycle } = await import("@/agent/scheduler");
    const result = await triggerManualCycle();
    if (!result) {
      return NextResponse.json(
        { ok: false, message: "Cycle already running or failed" },
        { status: 409 }
      );
    }

    // Log decision to HCS IMMEDIATELY — must complete before execution
    if (result.decision) {
      await logDecisionToHCS(result.decision);
      logger.info("✓ Decision logged to HCS");
    }

    // Fire-and-forget: execute the keeper action independently
    if (result.decision && result.position) {
      const executePayload = {
        action: result.decision,
        currentDepositHBAR: parseFloat(result.position.deposited),
      };

      // Don't await — let it run in the background
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://sentinel-one-teal.vercel.app";
      fetch(`${appUrl}/api/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(executePayload),
      }).catch((e) =>
        logger.error("Failed to trigger execute endpoint", e?.message ?? e)
      );

      logger.info("Keeper execution triggered asynchronously");
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}