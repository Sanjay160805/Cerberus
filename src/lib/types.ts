export interface Tweet {
  id: number;
  username: string;
  text: string;
  time: string;
  likes: string;
  retweets: string;
  replies: string;
  is_crypto: boolean;
  scraped_at: string;
}

export interface AgentDecision {
  id?: number;
  cycle: number;
  timestamp: string;
  action: "HOLD" | "HARVEST" | "REBALANCE" | "PROTECT" | "TIGHTEN" | "WIDEN";
  reasoning: string;
  threat_score: number;
  volatility: number;
  price: number;
  executed: boolean;
  tx_hash?: string;
}

export interface ThreatAnalysis {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  signals: string[];
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  summary: string;
}

export interface PriceData {
  pair: string;
  price: number;
  timestamp: number;
  change24h?: number;
}

export interface VaultPosition {
  asset: string;
  deposited: string;
  borrowed: string;
  healthFactor: string;
  apy: string;
  rewards: string;
}

export interface AgentState {
  cycle: number;
  running: boolean;
  lastDecision: AgentDecision | null;
  threatScore: number;
  volatility: number;
  price: number;
  error: string | null;
}

export interface CycleResult {
  decision: AgentDecision;
  threatAnalysis: ThreatAnalysis;
  priceData: PriceData;
  position: VaultPosition | null;
}
