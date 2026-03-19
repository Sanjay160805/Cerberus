/**
 * SENTINEL Type Definitions
 * Complete interface definitions for the geopolitical AI vault keeper agent
 */

// ============ Threat Analysis Interfaces ============

export enum ThreatLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface ThreatSignal {
  score: number;
  level: ThreatLevel;
  triggers: string[];
  recommendation: "HOLD" | "HARVEST" | "WITHDRAW" | "EMERGENCY_EXIT";
  reasoning: string;
  timestamp: Date;
  source: string;
}

// ============ Volatility Analysis Interfaces ============

export enum VolatilityClassification {
  STABLE = "STABLE",
  VOLATILE = "VOLATILE",
  EXTREME = "EXTREME",
}

export interface VolatilityData {
  currentPrice: number;
  priceChangePercent24h: number;
  realizedVolatility: number;
  volatilityClassification: VolatilityClassification;
  dataSource: "supra_oracle" | "coingecko" | "mock";
  timestamp: Date;
  price_feed: {
    hbar: number;
    usdc: number;
    usd_value: number;
  };
}

// ============ Agent Decision Interfaces ============

export interface AgentDecision {
  action: "HOLD" | "HARVEST" | "WITHDRAW" | "EMERGENCY_EXIT";
  threat_level: ThreatLevel;
  volatility_level: VolatilityClassification;
  amount?: number;
  reasoning: string;
  timestamp: Date;
  hcs_sequence_number?: number;
  txHash?: string;
}

// ============ Vault State Interface ============

export interface VaultState {
  assets: number;
  totalSupply: number;
  pricePerShare: number;
  tvl: number;
  lastHarvest?: Date;
  lastUpdate: Date;
}

// ============ RAG Interfaces ============

export interface IngestedTweet {
  id: string;
  username: string;
  text: string;
  time: string;
  likes: number;
  retweets: number;
  replies: number;
  relevanceScore: number;
  geopoliticalKeywords: string[];
  scrapedAt: Date;
}

// ============ Chat Message Interface ============

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  messageId?: string;
}

// ============ LangChain Document Type ============

export interface Document {
  pageContent: string;
  metadata: {
    source?: string;
    tweetId?: string;
    username?: string;
    relevanceScore?: number;
    [key: string]: any;
  };
}

// ============ Cycle Result Interface ============

export interface CycleResult {
  decision: AgentDecision;
  threatSignal: ThreatSignal;
  volatilityData: VolatilityData;
  vaultState: VaultState;
  hcsLogSequenceNumber?: number;
  executedAt: Date;
}

// ============ Agent Tool Input Interfaces ============

export interface AnalyzeSentimentInput {
  recentTweets?: IngestedTweet[];
}

export interface GetVolatilityDataInput {
  includeHistorical?: boolean;
}

export interface GetVaultStateInput {}

export interface HarvestVaultRewardsInput {}

export interface WithdrawFromVaultInput {
  amount: number;
}

export interface EmergencyExitVaultInput {}

export interface LogDecisionToHCSInput {
  decision: AgentDecision;
  threatSignal: ThreatSignal;
  volatilityData: VolatilityData;
}

// ============ WebSocket Message Types ============

export interface WebSocketMessage {
  type: "status" | "threat" | "volatility" | "decision" | "chat" | "error";
  data: any;
  timestamp: Date;
}

// ============ Configuration Interface ============

export interface SentinelConfig {
  hedera: {
    accountId: string;
    privateKey: string;
    network: "testnet" | "mainnet";
    topicId?: string;
  };
  hedera_evm: {
    privateKey: string;
    userAddress: string;
    rpcUrl: string;
  };
  openai: {
    apiKey: string;
  };
  vault: {
    hbarUsdcAddress: string;
    rpcUrl: string;
  };
  supra: {
    oracleAddress: string;
  };
  monitoring: {
    threatThreshold: number;
    volatilityThreshold: number;
    monitoringIntervalMs: number;
  };
  server: {
    port: number;
    nodeEnv: "development" | "production";
  };
}

// ============ Error Handling ============

export class SentinelError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
  ) {
    super(message);
    this.name = "SentinelError";
  }
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
  volatilityLevel: VolatilityClassification;
  reasoning: string;
  txHash?: string;
  timestamp: Date;
  topicId: string;
  messageHash: string;
}
