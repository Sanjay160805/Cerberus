import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { logDecisionToHCS } from "@/hedera/hcs";

export const maxDuration = 60;

export async function POST() {
  try {
    const { runAgentCycle } = await import("@/agent/index");
    
    // Apply 35-second timeout to Gemini analysis (with graceful fallback)
    logger.info("⏱️ Starting analysis with 35s timeout");
    let result: { decision: any; position: any } | null = null;
    try {
      result = await Promise.race([
        runAgentCycle(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Analysis timeout after 35s')), 35000)
        )
      ]) as { decision: any; position: any };
    } catch (timeoutError) {
      logger.warn("⏰ Analysis timeout - using fallback decision");
      // Fallback: HOLD decision when analysis times out
      result = {
        decision: {
          action: "HOLD",
          type: "HOLD",
          reason: "Analysis timeout - defaulting to HOLD",
          threat_score: 0.5,
          volatility: { realized: 0, isHigh: false, level: "LOW" },
          price: 0,
          cycle: 0,
          timestamp: new Date().toISOString(),
        },
        position: {
          asset: "HBAR",
          deposited: "0.0000",
          borrowed: "0.0000",
          healthFactor: "∞",
          apy: "94.15%",
          rewards: "0.0000",
        },
      };
    }
    
    if (!result) {
      return NextResponse.json(
        { ok: false, message: "No decision produced" },
        { status: 400 }
      );
    }

    // Log decision to HCS IMMEDIATELY after determining action
    if (result.decision) {
      try {
        logger.info("📢 Submitting decision to HCS...");
        await logDecisionToHCS(result.decision);
        logger.info("✓ Decision logged to HCS");
      } catch (hcsError) {
        logger.error("HCS logging failed, but continuing", hcsError);
      }
    }

    // Fire-and-forget: execute the keeper action independently
    if (result.decision && result.position) {
      const executePayload = {
        action: result.decision,
        currentDepositHBAR: parseFloat(result.position.deposited),
      };

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://sentinel-one-teal.vercel.app";
      fetch(`${appUrl}/api/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(executePayload),
      }).catch((e) =>
        logger.error("Failed to trigger execute endpoint", e?.message ?? e)
      );

      logger.info("🚀 Keeper execution triggered asynchronously");
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    logger.error("❌ Cycle failed", error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}