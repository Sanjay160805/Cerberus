# SENTINEL — Geopolitical-Aware Intelligent Vault Keeper

Track: **AI & Agents (Main Track) + Bonzo Finance Bounty**  
Chain: **Hedera Hashgraph (Testnet → Mainnet)**  
Stack: **Node.js / TypeScript / LangChain / LangGraph / Hedera SDK / Ethers.js**

## Overview

SENTINEL is an autonomous AI keeper agent that protects user funds in Bonzo Finance vaults on Hedera by reading real-world signals (geopolitical news, war, sanctions, market panic tweets) and taking proactive protective actions BEFORE prices collapse.

**Core Idea in One Sentence:**  
*"If Twitter is talking about war, SENTINEL withdraws your vault position before the market reacts — all logged immutably on Hedera."*

## The Problem

DeFi vaults today are **reactive**:
- They harvest rewards on a fixed timer, regardless of market conditions
- They cannot read Twitter, news feeds, or geopolitical signals
- When war breaks out, sanctions hit, or markets panic, user funds stay fully exposed
- No one was building this on Hedera until now

## How It Works

### STEP 1: SENSE (every 60 seconds)
- Fetch recent tweets matching geopolitical keywords (war, invasion, sanctions, nuclear, crash, etc.)
- Fetch HBAR/USDC price from SupraOracles (fallback: CoinGecko)
- Read current Bonzo Vault state via ERC-4626 contract

### STEP 2: REASON (LangGraph ReAct Agent with GPT-4o)
- **RAG Pipeline:**
  - Convert tweets into vector embeddings (OpenAI Embeddings)
  - Store in MemoryVectorStore (LangChain)
  - Retrieve top 5 most relevant signals
  - Feed to GPT-4o with structured threat analysis prompt
  - Output: threat score (0.0–1.0), level, triggers, recommendation
- **Volatility Calculation:**
  - Compute realized volatility from price history
  - Classify: STABLE / VOLATILE / EXTREME
- **Decision Matrix:**
  - Threat LOW + Volatility STABLE → **HOLD**
  - Threat LOW + Volatility VOLATILE → **HOLD** (monitor)
  - Threat MEDIUM + any → **HARVEST** (lock in gains)
  - Threat HIGH + Volatility VOLATILE → **WITHDRAW 50%**
  - Threat HIGH + Volatility EXTREME → **WITHDRAW ALL**
  - Threat CRITICAL → **EMERGENCY EXIT**

### STEP 3: ACT (Bonzo Vault contract calls via ethers.js)
- `vault.harvest()` — collect and compound rewards
- `vault.withdraw()` — partial or full withdrawal
- `vault.emergencyWithdraw()` — full exit

### STEP 4: LOG (Hedera Consensus Service)
- Every decision is submitted to an HCS topic
- Permanently ordered, publicly verifiable, tamper-proof
- Message: {action, reasoning, threatScore, volatility, txHash, timestamp}
- View at: `https://hashscan.io/testnet/topic/{topicId}`

### STEP 5: BROADCAST (WebSocket)
- All connected frontend clients receive real-time updates
- Dashboard updates: threat ring, signal feed, decision log, HCS audit trail

## Project Structure

```
sentinel/
├── src/
│   ├── types/          # TypeScript interfaces
│   ├── hedera/         # Hedera SDK client setup
│   ├── rag/            # Twitter ingestion, vector store, RAG chain
│   ├── oracle/         # SupraOracles + volatility calculation
│   ├── vault/          # ERC-4626 Bonzo vault contract calls
│   ├── agent/          # LangGraph agent + tools
│   │   └── tools/      # Sentiment, volatility, vault, HCS tools
│   └── api/            # Express server + WebSocket
├── frontend/           # Single-file HTML dashboard
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- Hedera testnet account (get HBAR from faucet)
- OpenAI API key (GPT-4o)
- Twitter/X Bearer Token (optional, mock data if missing)

### Installation

```bash
# Clone the repo
cd sentinel

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Fill in your .env with:
# - HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY (from portal.hedera.com)
# - HEDERA_EVM_PRIVATE_KEY (from account export)
# - OPENAI_API_KEY
# - TWITTER_BEARER_TOKEN (optional)
# - BONZO_VAULT_HBAR_USDC, USER_EVM_ADDRESS (from Bonzo docs)
```

### Running

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start

# Just run the agent once
npm run agent
```

Server runs on `http://localhost:3000`
Frontend: Open browser to `http://localhost:3000`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Vault + threat + volatility snapshot |
| POST | `/api/agent/run` | Trigger one agent cycle immediately |
| POST | `/api/agent/chat` | { message } → agent response |
| GET | `/api/threat` | Threat analysis only |
| GET | `/api/volatility` | Volatility data only |
| WS | `/` | WebSocket for real-time updates |

## WebSocket Events

```json
{
  "type": "status_update",
  "data": {
    "threat": {...},
    "volatility": {...},
    "vault": {...},
    "timestamp": "2026-03-19T10:30:00Z"
  }
}
```

```json
{
  "type": "decision",
  "data": {
    "action": "HARVEST",
    "threatScore": 0.45,
    "hcsSequenceNumber": 42,
    "txHash": "0x...",
    "timestamp": "2026-03-19T10:30:00Z"
  }
}
```

## Hedera Services Used

1. **Hedera Consensus Service (HCS)**
   - Creates audit log topic on startup
   - Every agent decision → TopicMessageSubmitTransaction
   - Public, tamper-proof decision audit trail

2. **Hedera EVM (Smart Contracts)**
   - ethers.JsonRpcProvider → https://testnet.hashio.io/api
   - Calls Bonzo Vault ERC-4626 functions

3. **Hedera Token Service (HTS)**
   - Bonzo Vault share tokens are HTS tokens

4. **SupraOracles (Ecosystem)**
   - On-chain price feed for HBAR/USDC

## Key Features

✅ **Autonomous 24/7 Monitoring**  
✅ **Geopolitical Signal Integration**  
✅ **LangGraph ReAct Agent**  
✅ **RAG Pipeline with Vector Search**  
✅ **Immutable HCS Audit Trail**  
✅ **Real-Time WebSocket Dashboard**  
✅ **Intent-Based Chat Interface**  
✅ **ERC-4626 Vault Integration**  
✅ **SupraOracles Price Feed**  
✅ **Emergency Exit Capability**  

## Demo (2 Minutes)

1. Open dashboard at `http://localhost:3000`
2. See green LOW threat banner with stable market tweets
3. Click "RUN AGENT CYCLE"
4. Toggle mock tweets to show CRITICAL threat (war/sanctions)
5. Watch banner turn red, EMERGENCY_EXIT fires
6. Check HCS audit trail at hashscan.io with message link
7. Chat interface shows the reasoning

## Environment Variables

See [.env.example](.env.example) for all required values.

**Key Variables:**
- `HEDERA_ACCOUNT_ID` — Your Hedera account (0.0.XXXXX)
- `HEDERA_PRIVATE_KEY` — Hedera account private key
- `HEDERA_EVM_PRIVATE_KEY` — EVM format for ethers.js
- `OPENAI_API_KEY` — GPT-4o access
- `BONZO_VAULT_HBAR_USDC` — Bonzo vault contract address
- `HCS_TOPIC_ID` — Will be created on first run if not set
- `MONITORING_INTERVAL_MS` — Agent cycle frequency (default 60000ms)
- `THREAT_THRESHOLD` — Threshold for action (default 0.65)

## Testing

Each module can be tested in isolation:

```bash
# Test HCS integration
npx ts-node --esm src/hedera/hederaClient.ts

# Test RAG pipeline
npx ts-node --esm src/agent/tools/sentimentTool.ts

# Test vault integration
npx ts-node --esm src/vault/bonzoVault.ts

# Run full agent cycle
npm run agent
```

## Architecture Decisions

- **LangGraph**: Provides ReAct loop + visibility into agent steps
- **MemoryVectorStore**: Lightweight, in-process RAG (MongoDB vector store can replace for production)
- **HCS for Audit Log**: Transparent decision history, no central authority needed
- **Mock Fallbacks**: Every external dependency has a mock implementation (Twitter, CoinGecko, SupraOracles)
- **WebSocket**: Real-time frontend updates without polling
- **Single-Page Frontend**: No build step needed, server static HTML with WebSocket

## Known Limitations & Future Work

- Twitter API rate limits (solved with queue + backoff, or cache)
- GPT-4o costs scale with usage (consider GPT-4 turbo for production)
- MemoryVectorStore loses data on restart (add persistent DB)
- Vault functions use mock txHash if contract call fails (real integration needed on testnet)
- No slippage protection on swaps yet
- No multi-vault support yet (add portfolio logic)

## Bonzo Finance Bounty Alignment

This project satisfies all three Bonzo bounty examples:

| Example | Status |
|---------|--------|
| **Volatility-Aware Rebalancer** | ✅ SupraOracles → realized volatility → widen/withdraw |
| **Sentiment-Based Harvester** | ✅ RAG → sentiment spike → immediate harvest |
| **Intent-Based UI** | ✅ Chat interface → vault operations |

Uses all 7 ERC-4626 functions: `totalAssets()`, `balanceOf()`, `convertToAssets()`, `deposit()`, `withdraw()`, `harvest()`, `emergencyWithdraw()`

## License

MIT

## Support

For issues or questions:
1. Check `.env` is properly filled
2. Verify Hedera testnet account has HBAR
3. Verify OpenAI API key is valid
4. Check server logs for error details
5. Open an issue with logs attached
