/**
 * SENTINEL Type Definitions
 * Core interfaces for the geopolitical-aware vault keeper
 */

// ════════════════════════════════════════════════════════════════
// THREAT ASSESSMENT
// ════════════════════════════════════════════════════════════════

export enum ThreatLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface ThreatSignal {
  score: number; // 0.0 to 1.0
  level: ThreatLevel;
  triggers: string[]; // Keywords or patterns detected
  recommendation: string; // Action to take
  reasoning: string; // Explanation of threat assessment
  timestamp: Date;
  source: string; // "twitter" | "hcs" | "manual"
}

// ════════════════════════════════════════════════════════════════
// VOLATILITY DATA
// ════════════════════════════════════════════════════════════════

export enum VolatilityTrend {
  STABLE = "STABLE",
  VOLATILE = "VOLATILE",
  EXTREME = "EXTREME",
}

export interface VolatilityData {
  price: number; // Current price in USD
  previousPrice: number; // Previous price sample
  volatility: number; // Realized volatility (0.0 to 1.0)
  trend: VolatilityTrend;
  recommendation: string; // Action based on volatility
  timestamp: Date;
  priceChangePercent24h?: number;
  currentPrice?: number;
  realizedVolatility?: number;
}

// ════════════════════════════════════════════════════════════════
// VAULT STATE
// ════════════════════════════════════════════════════════════════

export interface VaultState {
  totalAssets: number; // Total vault TVL in USD
  sharePrice: number; // Price per share
  userBalance: number; // User's balance in USD
  userShares: number; // User's share count
  paused: boolean; // Is vault paused?
  vaultAddress: string; // Contract address
  tvl?: number; // Alias for totalAssets
}

// ════════════════════════════════════════════════════════════════
// AGENT DECISION
// ════════════════════════════════════════════════════════════════

export enum AgentAction {
  HOLD = "HOLD",
  HARVEST = "HARVEST",
  WITHDRAW = "WITHDRAW",
  EMERGENCY_EXIT = "EMERGENCY_EXIT",
}

export interface AgentDecision {
  action: AgentAction;
  threat: ThreatLevel; // Simplified threat level
  volatility: VolatilityTrend; // Simplified volatility trend
  reasoning: string;
  timestamp: Date;
  cycleTime?: number; // Milliseconds taken for cycle
  txHash?: string; // Transaction hash if on-chain action taken
  hcsSequence?: number; // HCS message sequence if logged
}

// ════════════════════════════════════════════════════════════════
// INGESTED TWEET
// ════════════════════════════════════════════════════════════════

export interface IngestedTweet {
  id: string | number;
  username: string;
  text: string;
  time: string | Date;
  likes: number;
  retweets: number;
  replies: number;
  relevanceScore: number; // 0.0 to 1.0
  geopoliticalKeywords: string[]; // Keywords matched
  scrapedAt: Date;
  is_crypto?: boolean; // From SQLite
}

// ════════════════════════════════════════════════════════════════
// CHAT MESSAGE
// ════════════════════════════════════════════════════════════════

export enum ChatRole {
  USER = "user",
  AGENT = "agent",
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: Date;
}

// ════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ════════════════════════════════════════════════════════════════

export interface StatusResponse {
  threat: ThreatSignal | null;
  volatility: VolatilityData | null;
  vault: VaultState | null;
  hbarPrice?: number;
  timestamp: Date;
  cycleCount: number;
}

export interface ChatResponse {
  response: string;
  timestamp: Date;
}

// ============ Dashboard Status ============

export interface DashboardStatus {
  threat: ThreatSignal | null;
  volatility: VolatilityData | null;
  vault: VaultState | null;
  recentDecisions: AgentDecision[];
  recentSignals: IngestedTweet[];
  isLooping: boolean;
  lastCycleTime: Date;
}

// ============ HCS Audit Entry ============

export interface HCSAuditEntry {
  sequenceNumber: number;
  action: string;
  threatLevel: ThreatLevel;
  volatilityLevel: VolatilityTrend;
  reasoning: string;
  txHash?: string;
  timestamp: Date;
  topicId: string;
  messageHash: string;
}

// ════════════════════════════════════════════════════════════════
// WEBSOCKET MESSAGES
// ════════════════════════════════════════════════════════════════

export interface WebSocketMessage {
  type: "decision" | "status" | "error";
  data: any;
  timestamp: Date;
}
