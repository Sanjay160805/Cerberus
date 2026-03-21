import { runAgentCycle } from "./index";
import { MONITORING_INTERVAL_MS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { CycleResult } from "@/lib/types";

let schedulerRunning = false;
let intervalHandle: NodeJS.Timeout | null = null;
let lastResult: CycleResult | null = null;
let isRunning = false;

export function getSchedulerStatus() {
  return { running: schedulerRunning, interval: MONITORING_INTERVAL_MS, lastResult };
}

export function getLastResult(): CycleResult | null { return lastResult; }

export async function triggerManualCycle(): Promise<CycleResult | null> {
  if (isRunning) { logger.warn("Cycle already running"); return null; }
  isRunning = true;
  try {
    const result = await runAgentCycle();
    lastResult = result;
    return result;
  } finally {
    isRunning = false;
  }
}

export function startScheduler() {
  if (schedulerRunning) { logger.warn("Scheduler already running"); return; }
  schedulerRunning = true;
  logger.info(`🕐 Scheduler started — interval: ${MONITORING_INTERVAL_MS / 1000}s`);
  triggerManualCycle().catch((e) => logger.error("Initial cycle failed", e));
  intervalHandle = setInterval(async () => {
    if (!isRunning) {
      isRunning = true;
      try { lastResult = await runAgentCycle(); }
      catch (error) { logger.error("Scheduled cycle failed", error); }
      finally { isRunning = false; }
    }
  }, MONITORING_INTERVAL_MS);
}

export function stopScheduler() {
  if (intervalHandle) { clearInterval(intervalHandle); intervalHandle = null; }
  schedulerRunning = false;
  logger.info("Scheduler stopped");
}
