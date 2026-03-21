import { getDb } from "./sqlite";
import { AgentDecision } from "@/lib/types";

export function saveDecision(decision: AgentDecision): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO agent_decisions (cycle, timestamp, action, reasoning, threat_score, volatility, price, executed, tx_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(decision.cycle, decision.timestamp, decision.action, decision.reasoning, decision.threat_score, decision.volatility, decision.price, decision.executed ? 1 : 0, decision.tx_hash || null);
  return result.lastInsertRowid as number;
}

export function getRecentDecisions(limit = 20): AgentDecision[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM agent_decisions ORDER BY timestamp DESC LIMIT ?`).all(limit) as AgentDecision[];
}

export function getLastDecision(): AgentDecision | null {
  const db = getDb();
  return (db.prepare(`SELECT * FROM agent_decisions ORDER BY timestamp DESC LIMIT 1`).get() as AgentDecision) || null;
}

export function updateDecisionExecution(id: number, txHash: string): void {
  const db = getDb();
  db.prepare(`UPDATE agent_decisions SET executed = 1, tx_hash = ? WHERE id = ?`).run(txHash, id);
}
