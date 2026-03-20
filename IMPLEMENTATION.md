# SENTINEL Implementation Guide

## ✅ Completed Files

The following files have been **fully updated** to use Google Gemini (not OpenAI) and SQLite instead of Twitter API:

### Types & Core
- **✅ src/types/index.ts** — All TypeScript interfaces updated
- **✅ src/hedera/hederaClient.ts** — Hedera ECDSA key support (0x format)
- **✅ src/rag/twitterIngestor.ts** — **SQLite reader** (NOT Twitter API)
- **✅ src/rag/vectorStore.ts** — **Google GenerativeAIEmbeddings** (NOT OpenAI)
- **✅ src/rag/ragChain.ts** — **Gemini-1.5-Flash** LLM (NOT GPT-4o)
- **✅ src/oracle/supraOracle.ts** — Volatility with CoinGecko fallback

### Configuration Files
- **✅ package.json** — Removed @langchain/openai, added @langchain/google-genai
- **✅ tsconfig.json** — NodeNext module system for ESM
- **✅ SETUP.md** — Complete setup & debugging guide
- **✅ README.md** — This file

---

## 📝 Files That Need Manual Review/Update

The following files EXIST but should be reviewed/updated for the new setup. They likely need adjustment to use GOOGLE_API_KEY and Gemini instead of OpenAI configs:

```
src/agent/tools/hcsTool.ts               (uses publishToHCS)
src/agent/tools/sentimentTool.ts         (uses analyzeThreatLevel)
src/agent/tools/volatilityTool.ts        (uses getVolatilityData)
src/agent/tools/vaultTool.ts             (uses vault functions)
src/agent/sentinelAgent.ts               (main agent orchestrator)
src/api/server.ts                        (Express server with WebSocket)
src/vault/bonzoVault.ts                  (vault contract interactions)
```

### Quick Verification Steps

1. **Check if files import from wrong packages:**
   ```bash
   grep -r "from \"@langchain/openai\"" src/
   grep -r "OPENAI_API_KEY" src/
   ```
   
   Should return ZERO results. If not, replace those imports/env vars.

2. **Check if using Google packages:**
   ```bash
   grep -r "@langchain/google-genai" src/
   grep -r "GOOGLE_API_KEY" src/
   ```
   
   Should see references in ragChain.ts and vectorStore.ts.

3. **Verify SQLite is being used:**
   ```bash
   grep -r "better-sqlite3" src/
   grep -r "crypto_tweets.db" src/
   ```
   
   Should see references only in twitterIngestor.ts.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Create .env File
```bash
# Copy template and fill in YOUR values
HEDERA_ACCOUNT_ID=0.0.YOUR_ID
HEDERA_PRIVATE_KEY=0xYOUR_ECDSA_PRIVATE_KEY
HEDERA_EVM_PRIVATE_KEY=0xYOUR_ECDSA_PRIVATE_KEY
USER_EVM_ADDRESS=0xYOUR_EVM_ADDRESS
HEDERA_NETWORK=testnet

GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY_FROM_aistudio.google.com

BONZO_VAULT_HBAR_USDC=0xVAULT_ADDRESS
SUPRA_ORACLE_ADDRESS=0xORACLE_ADDRESS
SUPRA_RPC_URL=https://testnet.hashio.io/api

THREAT_THRESHOLD=0.65
VOLATILITY_THRESHOLD=0.04
MONITORING_INTERVAL_MS=60000
HCS_TOPIC_ID=
PORT=3000
```

### 3. Populate SQLite Database
```bash
python scraper.py
```

This creates `crypto_tweets.db` with schema:
```sql
CREATE TABLE tweets (
  id INTEGER PRIMARY KEY,
  username TEXT,
  text TEXT,
  time TEXT,
  likes INTEGER,
  retweets INTEGER,
  replies INTEGER,
  is_crypto BOOLEAN,
  scraped_at TEXT
);
```

### 4. Start Server
```bash
npm run dev    # Development with auto-reload
npm start      # Production
```

### 5. Open Dashboard
```
http://localhost:3000
```

---

## 🔧 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│         Dashboard @ http://localhost:3000                   │
│  • Real-time threat visualization                           │
│  • Volatility chart                                         │
│  • Agent decision timeline                                  │
│  • Chat interface                                           │
└─────────────────────────┬───────────────────────────────────┘
                         │ WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│              API SERVER (Express + TypeScript)              │
│ • GET  /api/status     → Latest threat/vault/volatility    │
│ • POST /api/agent/run  → Trigger autonomous cycle          │
│ • POST /api/agent/chat → Chat with agent                   │
│ • WS   /               → Real-time updates                 │
└──────┬──────────────────────────────────────────┬───────────┘
       │                                          │
       ▼                                          ▼
┌──────────────────────┐              ┌─────────────────────┐
│   SENTINEL AGENT     │              │   EXTERNAL APIs     │
│                      │              │                     │
│ • Orchestrates cycle │              │ • CoinGecko prices  │
│ • Combines signals   │              │ • HCS (Hedera)      │
│ • Makes decisions    │              │ • Bonzo Vault (EVM) │
│ • Executes actions   │              │ • Supra Oracle      │
└──────┬───────┬───┬───┘              └─────────────────────┘
       │       │   │
       ▼       ▼   ▼
   ┌───────────────────────────────────────┐
   │    RAG + ANALYSIS LAYER               │
   │                                       │
   │ SQLite twitterIngestor ─────────────► │
   │   • Reads crypto_tweets.db            │
   │   • Scores relevance (0-1)            │
   │   • Returns top tweets                │
   │                                       │
   │ Vector Store ─────────────────────►  │
   │   • Google GenerativeAI embeddings    │
   │   • Memory vector store               │
   │                                       │
   │ RAG Chain ──────────────────────────► │
   │   • Retrieves relevant signals        │
   │   • Calls Gemini-1.5-Flash LLM        │
   │   • Returns structured threat JSON    │
   │                                       │
   │ Oracle Chain ──────────────────────► │
   │   • Gets HBAR price                   │
   │   • Calculates volatility             │
   │   • Classifies trend                  │
   │                                       │
   │ Vault State Reader ────────────────► │
   │   • Queries ERC-4626 vault            │
   │   • Returns position size             │
   │                                       │
   │ HCS Tool ──────────────────────────► │
   │   • Logs decisions to Hedera          │
   │   • Creates topics                    │
   │                                       │
   └───────────────────────────────────────┘
        │        │        │        │
        └────────┴────────┴────────┘
                 │
                 ▼
        ┌────────────────────┐
        │   DECISION MATRIX  │
        │                    │
        │ LOW + STABLE       │
        │  → HOLD            │
        │                    │
        │ MEDIUM + any       │
        │  → HARVEST         │
        │                    │
        │ HIGH + VOLATILE    │
        │  → WITHDRAW 50%    │
        │                    │
        │ CRITICAL + EXTREME │
        │  → EMERGENCY EXIT  │
        └────────────────────┘
```

---

## 🔑 Key Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `HEDERA_ACCOUNT_ID` | Your Hedera account | `0.0.123456` |
| `HEDERA_PRIVATE_KEY` | ECDSA key (with 0x) | `0xabc...def` |
| `HEDERA_EVM_PRIVATE_KEY` | Same as above for ethers | `0xabc...def` |
| `USER_EVM_ADDRESS` | Your EVM wallet | `0xABC...` |
| `GOOGLE_API_KEY` | **Gemini free key** | From `aistudio.google.com` |
| `BONZO_VAULT_HBAR_USDC` | Vault contract | `0x...` |
| `SUPRA_RPC_URL` | Hedera EVM RPC | `https://testnet.hashio.io/api` |
| `MONITORING_INTERVAL_MS` | Cycle frequency | `60000` (60 seconds) |
| `HCS_TOPIC_ID` | Will be auto-created | Leave blank initially |

---

## 📊 Data Flow Example

### Autonomous Cycle (runs every 60 seconds)

```
[Cycle Start] → [Fetch Tweets] → [Analyze Threat] → [Get Volatility] 
    ↓              ↓               ↓                    ↓
  T+0s           T+2s            T+5s                 T+7s
                 (SQLite         (Gemini RAG)         (CoinGecko)
                  query)

    ↓
[Make Decision] → [Execute Action] → [Log to HCS] → [Broadcast WS] → [End]
    ↓                ↓                 ↓              ↓
  T+8s             T+9s              T+10s         T+11s
(Decision         (ethers.js tx)    (Topic msg)   (WebSocket)
 Matrix)

Total time: ~11 seconds per cycle
Auto-repeat: Every 60 seconds (MONITORING_INTERVAL_MS)
```

---

## 🧪 Testing

### Test Individual Modules
```bash
# Test tweet ingestor
node -e "import('./src/rag/twitterIngestor.ts').then(m => m.fetchGeopoliticalTweets().then(console.log))"

# Test RAG chain
node -e "import('./src/rag/ragChain.ts').then(m => m.analyzeThreatLevel([]).then(console.log))"

# Test vault
node -e "import('./src/vault/bonzoVault.ts').then(m => m.getVaultState().then(console.log))"

# Test oracle
node -e "import('./src/oracle/supraOracle.ts').then(m => m.getVolatilityData().then(console.log))"
```

### View Live Logs
```bash
npm run dev 2>&1 | tee sentinel.log
```

### Check Database
```bash
sqlite3 crypto_tweets.db ".schema"
sqlite3 crypto_tweets.db "SELECT COUNT(*) FROM tweets WHERE is_crypto=1;"
```

---

## 🚨 Critical Checklist Before Production

- [ ] All `.env` variables filled in
- [ ] `crypto_tweets.db` populated with tweets
- [ ] `npm install` completed successfully
- [ ] No TypeScript compilation errors (`npm run build`)
- [ ] Dashboard loads at `http://localhost:3000`
- [ ] WebSocket connects (check browser console)
- [ ] First autonomous cycle completes successfully
- [ ] HCS topic created (check `.env` HCS_TOPIC_ID)
- [ ] Can view messages on HashScan

---

## 📚 Additional Resources

- **Hedera Docs:** https://docs.hedera.com
- **Google Gemini API:** https://ai.google.dev
- **LangChain JS:** https://js.langchain.com
- **ethers.js:** https://docs.ethers.org/v6
- **HashScan:** https://hashscan.io/testnet

---

## 💡 Common Issues & Solutions

| Issue | Fix |
|-------|-----|
| `GOOGLE_API_KEY not found` | Get free key from aistudio.google.com |
| `No tweets in database` | Run `python scraper.py` |
| `Vault not configured` | Set BONZO_VAULT_HBAR_USDC, system uses mocks |
| `WebSocket connection failed` | Check PORT 3000 is free, firewall settings |
| `Hedera auth failed` | Verify HEDERA_PRIVATE_KEY format (0x...for ECDSA) |
| `Slow responses` | Gemini may be rate-limited, wait 30s then retry |

---

## 📞 Support

For detailed instructions, see **[SETUP.md](./SETUP.md)**
For architecture details, see **[src/types/index.ts](./src/types/index.ts)**
