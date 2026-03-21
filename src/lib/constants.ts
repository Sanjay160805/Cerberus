export const THREAT_THRESHOLD = parseFloat(process.env.THREAT_THRESHOLD || "0.65");
export const VOLATILITY_THRESHOLD = parseFloat(process.env.VOLATILITY_THRESHOLD || "0.04");
export const MONITORING_INTERVAL_MS = parseInt(process.env.MONITORING_INTERVAL_MS || "60000");

export const BONZO_LENDING_POOL = process.env.BONZO_LENDING_POOL || "0xf67DBe9bD1B331cA379c44b5562EAa1CE831EbC2";
export const BONZO_DATA_PROVIDER = process.env.BONZO_DATA_PROVIDER || "0x121A2AFFA5f595175E60E01EAeF0deC43Cc3b024";
export const BONZO_WETH_GATEWAY = process.env.BONZO_WETH_GATEWAY || "0x16197Ef10F26De77C9873d075f8774BdEc20A75d";
export const BONZO_RPC_URL = process.env.BONZO_RPC_URL || "https://testnet.hashio.io/api";

export const SUPRA_ORACLE_ADDRESS = process.env.SUPRA_ORACLE_ADDRESS || "0x168";
export const HEDERA_NETWORK = process.env.HEDERA_NETWORK || "testnet";
export const HCS_TOPIC_ID = process.env.HCS_TOPIC_ID || "";

export const GEMINI_MODEL = "gemini-2.0-flash-lite";
export const GEMINI_EMBEDDING_MODEL = "embedding-001";

export const DECISION_ACTIONS = {
  HOLD: "HOLD",
  HARVEST: "HARVEST",
  REBALANCE: "REBALANCE",
  PROTECT: "PROTECT",
  TIGHTEN: "TIGHTEN",
  WIDEN: "WIDEN",
} as const;

export const THREAT_LEVELS = {
  LOW: { min: 0, max: 0.3, label: "LOW", color: "green" },
  MEDIUM: { min: 0.3, max: 0.65, label: "MEDIUM", color: "yellow" },
  HIGH: { min: 0.65, max: 0.85, label: "HIGH", color: "orange" },
  CRITICAL: { min: 0.85, max: 1, label: "CRITICAL", color: "red" },
} as const;
