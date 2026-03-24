import * as dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    // For local development, we might not have all envs set yet in some contexts
    console.warn(`[Config] Missing required environment variable: ${key}`);
    return "";
  }
  return value.trim();
}

function optional(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

// ── HEDERA ──────────────────────────────────────────────────────────────────
export const HEDERA_ACCOUNT_ID         = required("HEDERA_ACCOUNT_ID");
export const HEDERA_PRIVATE_KEY        = required("HEDERA_PRIVATE_KEY");
export const HEDERA_EVM_ADDRESS        = required("HEDERA_EVM_ADDRESS");
export const HEDERA_NETWORK            = optional("HEDERA_NETWORK", "mainnet") as "mainnet" | "testnet";
export const HEDERA_RPC_URL            = HEDERA_NETWORK === "mainnet"
                                           ? "https://mainnet.hashio.io/api"
                                           : "https://testnet.hashio.io/api";

// ── AI ──────────────────────────────────────────────────────────────────────
export const GEMINI_API_KEY            = required("GEMINI_API_KEY");
export const GEMINI_MODEL              = optional("GEMINI_MODEL", "gemini-2.0-flash-lite");

// ── BONZO VAULT (Mainnet Defaults) ─────────────────────────────────────────
export const BONZO_VAULT_ADDRESS       = optional("BONZO_VAULT_ADDRESS", "0x236897c518996163E7b313aD21D1C9fCC7BA1afc");
export const VAULT_UNDERLYING_TOKEN    = optional("VAULT_UNDERLYING_TOKEN", "0x0000000000000000000000000000000000163bc4"); // WHBAR

// ── TOKEN ADDRESSES (Hedera EVM Mainnet) ──────────────────────────────────
export const USDC_TOKEN_ADDRESS        = "0x000000000000000000000000000000000006f89a";
export const HBARX_TOKEN_ADDRESS       = "0x0000000000000000000000000000000000220ced";

// ── SAUCERSWAP ─────────────────────────────────────────────────────────────
export const SAUCERSWAP_ROUTER_ADDRESS = "0x000000000000000000000000000000000011833f";

// ── AGENT BEHAVIOUR ────────────────────────────────────────────────────────
export const POLL_INTERVAL_MS          = parseInt(optional("POLL_INTERVAL_MS", "300000"));
export const BEARISH_THRESHOLD         = parseFloat(optional("BEARISH_THRESHOLD_PERCENT", "-5"));
export const BULLISH_THRESHOLD         = parseFloat(optional("BULLISH_THRESHOLD_PERCENT", "5"));
export const MAX_SLIPPAGE_BPS          = parseInt(optional("MAX_SLIPPAGE_BPS", "50"));

// ── COINGECKO ──────────────────────────────────────────────────────────────
export const COINGECKO_API_KEY         = optional("COINGECKO_API_KEY", "");
export const COINGECKO_TOKEN_ID        = optional("COINGECKO_TOKEN_ID", "hedera-hashgraph");
export const PRICE_HISTORY_DAYS        = parseInt(optional("PRICE_HISTORY_DAYS", "7"));
