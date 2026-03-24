export const THREAT_THRESHOLD = parseFloat(process.env.THREAT_THRESHOLD || "0.65");
export const VOLATILITY_THRESHOLD = parseFloat(process.env.VOLATILITY_THRESHOLD || "0.04");
export const MONITORING_INTERVAL_MS = parseInt(process.env.MONITORING_INTERVAL_MS || "60000");

export const BONZO_LENDING_POOL = process.env.BONZO_LENDING_POOL || "0x236897c518996163E7b313aD21D1C9fCC7BA1afc";
export const BONZO_DATA_PROVIDER = process.env.BONZO_DATA_PROVIDER || "0x78feDC4D7010E409A0c0c7aF964cc517D3dCde18";
export const BONZO_WETH_GATEWAY = process.env.BONZO_WETH_GATEWAY || "0x9a601543e9264255BebB20Cef0E7924e97127105";
export const BONZO_RPC_URL = process.env.BONZO_RPC_URL || "https://mainnet.hashio.io/api";

// HTS Assets (Mainnet)
export const USDC_TOKEN_ADDRESS = "0x000000000000000000000000000000000006f89a"; // 0.0.456858
export const SAUCERSWAP_V2_ROUTER = "0x000000000000000000000000000000000011833f"; // 0.0.1147455
export const WHBAR_TOKEN_ADDRESS = "0x0000000000000000000000000000000000163bc4"; // 0.0.1456996


export const SUPRA_ORACLE_ADDRESS = process.env.SUPRA_ORACLE_ADDRESS || "0x168";
export const HEDERA_NETWORK = process.env.HEDERA_NETWORK || "mainnet";
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
