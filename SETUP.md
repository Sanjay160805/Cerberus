# SENTINEL — Setup & Run Guide

## Prerequisites

- Node.js 18+
- Python 3.8+ (for scraper)
- Git
- A `.env` file with all required credentials

## Step 1: Environment Setup

Create `.env` file in project root with:

```bash
# HEDERA
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=0xYOUR_ECDSA_KEY
HEDERA_EVM_PRIVATE_KEY=0xYOUR_ECDSA_KEY
USER_EVM_ADDRESS=0xYOUR_EVM_ADDRESS
HEDERA_NETWORK=testnet

# GOOGLE GEMINI (free tier)
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY_FROM_aistudio.google.com

# BONZO VAULT (Hedera testnet)
BONZO_VAULT_HBAR_USDC=0xVAULT_CONTRACT_ADDRESS
SUPRA_ORACLE_ADDRESS=0xSUPRA_ORACLE_ADDRESS
SUPRA_RPC_URL=https://testnet.hashio.io/api

# MONITORING
THREAT_THRESHOLD=0.65
VOLATILITY_THRESHOLD=0.04
MONITORING_INTERVAL_MS=60000
HCS_TOPIC_ID=    (leave blank, auto-created)
PORT=3000
```

## Step 2: Install Dependencies

```bash
npm install
```

This installs:
- LangChain with Google Gemini support (@langchain/google-genai)
- Hedera SDK, ethers.js, Express, WebSocket
- SQLite support (better-sqlite3)

## Step 3: Run Python Scraper (FIRST TIME ONLY)

```bash
python scraper.py
```

This creates `crypto_tweets.db` with tweet data:
- Table: `tweets` (id, username, text, time, likes, retweets, replies, is_crypto, scraped_at)
- Populates with latest crypto/geopolitical tweets
- Required before running Node server

## Step 4: Start the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Expected Startup Output

```
✓ Hedera client initialized on testnet
  Account: 0.0.YOUR_ACCOUNT_ID
✓ Connected to SQLite: C:\Sentinel\crypto_tweets.db
✓ Connected to SQLite: C:\Sentinel\crypto_tweets.db
✓ Fetched 12 relevant tweets from database
🛡 SENTINEL running on http://localhost:3000
📡 WebSocket ready
🔄 Monitoring interval: 60s (60000ms)
```

## Step 5: Access Dashboard

Open browser: **http://localhost:3000**

Dashboard shows:
- 🔴 **Threat Assessment** (real-time geopolitical threat level)
- 📊 **Volatility Gauge** (HBAR price volatility trend)
- 💰 **Vault Metrics** (TVL, APY, Safety Score)
- 💬 **Chat Interface** to query the agent

## Step 6: Verify HCS Integration

On successful HCS setup, server logs:
```
✅ HCS Topic created: 0.0.XXXXXXX — add to .env as HCS_TOPIC_ID
```

Copy that topic ID to `.env`. View messages on HashScan:
```
https://hashscan.io/testnet/topic/0.0.XXXXXXX
```

---

# Agent Decision Flow

## What Happens When You Click "RUN AGENT CYCLE"

**Duration:** ~5-10 seconds (depends on API latency)

### Step 1: Fetch Geopolitical Signals (2s)
```
twitterIngestor.fetchGeopoliticalTweets()
  ↓
Reads crypto_tweets.db
  ↓
Returns last 20 tweets, scored by relevance (0-1)
  ↓
Keyword matching: war, sanctions, nuclear, crypto, hack, etc.
```

### Step 2: Analyze Threat Level (3s)
```
ragChain.analyzeThreatLevel(tweets)
  ↓
Build vector store (Google Gemini embeddings)
  ↓
Query RAG: "geopolitical crisis, market crash, emergency threat"
  ↓
Retrieve top 5 relevant signals
  ↓
Invoke Gemini-1.5-Flash to evaluate threat
  ↓
Return: ThreatSignal { score: 0-1, level: LOW|MEDIUM|HIGH|CRITICAL, triggers: [...], reasoning: "..." }
```

### Step 3: Get Volatility Data (2s)
```
supraOracle.getVolatilityData()
  ↓
Try Supra Oracle → Fail → Try CoinGecko → Fallback to mock
  ↓
Fetch HBAR price
  ↓
Calculate rolling volatility from last 20 prices
  ↓
Classify: STABLE (<0.02) | VOLATILE (0.02-0.05) | EXTREME (>0.05)
  ↓
Return: VolatilityData { price, volatility, trend, recommendation }
```

### Step 4: Make Decision (1s)
```
Decision Matrix:
┌──────────────┬──────────┬──────────────┬──────────────┐
│ Threat Level │ STABLE   │ VOLATILE     │ EXTREME      │
├──────────────┼──────────┼──────────────┼──────────────┤
│ LOW          │ HOLD     │ HOLD         │ HOLD         │
│ MEDIUM       │ HARVEST  │ HARVEST      │ HARVEST      │
│ HIGH         │ HARVEST  │ WITHDRAW 50% │ WITHDRAW 50% │
│ CRITICAL     │ EMERGENCY EXIT           │ EMERGENCY    │
└──────────────┴──────────┴──────────────┴──────────────┘

Decision Actions:
- HOLD: Monitor, no action
- HARVEST: Claim rewards
- WITHDRAW 50%: Exit half position
- EMERGENCY_EXIT: Withdraw everything
```

### Step 5: Execute On-Chain Action (1-2s)
If action requires transaction:
```
bonzoVault.executeHarvest() / executeWithdraw() / executeEmergencyExit()
  ↓
Connect ethers.js wallet to Hedera EVM (SUPRA_RPC_URL)
  ↓
Send transaction to vault contract
  ↓
Return txHash (real) or MOCK_TX_... (if vault not configured)
```

### Step 6: Log to HCS (1s)
```
hcsTool.logDecisionToHCS(decision)
  ↓
Create HCS topic if not exists
  ↓
Submit JSON message to topic
  ↓
Return sequence number
  ↓
View on: https://hashscan.io/testnet/topic/0.0.XXXXXXX
```

### Step 7: Publish to WebSocket
```
Server broadcasts decision to all connected clients
  ↓
Dashboard updates in real-time
  ↓
Chat interface reflects latest state
```

### Complete Decision Output:
```typescript
AgentDecision {
  action: "HARVEST" | "WITHDRAW" | "EMERGENCY_EXIT" | "HOLD",
  reasoning: "MEDIUM threat + VOLATILE market = harvest rewards",
  threatSignal: ThreatSignal,
  volatilityData: VolatilityData,
  txHash: "0x...",
  hcsSequence: 42,
  timestamp: Date,
  cycleNumber: 123
}
```

---

# CRITICAL Threat Scenario


## What Happens When Threat = CRITICAL

**Scenario:** War declared + Nuclear weapons mentioned + Market crash reported

### Immediate Actions (< 5 seconds)

#### 1. Threat Detection
```
Threat Analysis Result:
- Score: 0.92 (92/100)
- Level: CRITICAL
- Triggers: ["war", "invasion", "nuclear", "crash", "emergency"]
- Source: rag_gemini (LLM-powered analysis)
```

#### 2. Volatility Check
```
Price volatility: 0.08 (EXTREME)
Recommendation: WITHDRAW
Market appears highly unstable
```

#### 3. Decision Matrix Applied
```
CRITICAL + EXTREME = EMERGENCY_EXIT
Action: Withdraw ALL assets immediately
```

#### 4. Vault Emergency Withdraw
```
bonzoVault.executeEmergencyExit()

On-chain actions:
✓ Call vault.emergencyWithdraw()
✓ Withdraw ALL user shares
✓ Convert to stable assets (USDC)
✓ Return txHash to dashboard
```

**Result:** 100% of vault assets exited in < 5 seconds

#### 5. HCS Logging
```
Message to Hedera Consensus Service:
{
  "action": "EMERGENCY_EXIT",
  "threatLevel": "CRITICAL",
  "threats": ["war", "nuclear", "crash"],
  "volatility": "EXTREME",
  "timestamp": "2026-03-20T14:23:45Z",
  "sequenceNumber": 42,
  "txHash": "0x...",
  "message": "CRITICAL geopolitical + market threat detected. 
             Executing full emergency exit from vault."
}

Viewable at: hashscan.io/testnet/topic/0.0.XXXXXXX?s=42
```

#### 6. Frontend Alerts
```css
Dashboard DOM changes:
- Threat banner: RED, flashing
- Threat level: "CRITICAL"
- Threat score: "92%"
- Threat status: "War + Nuclear threat detected"
- Arc visualization: Red color, full 360° fill

Chat message from AI:
"🚨 CRITICAL ALERT: Existential geopolitical threat detected.
Emergency maximum exit protocol activated.
All vault assets withdrawn to safety.
Position closed. Monitoring situation."
```

#### 7. Repeat Automatic Cycle
```
Even after EMERGENCY_EXIT:
- Continue fetching tweets (MONITORING_INTERVAL_MS = 60s)
- Continue analyzing threat level
- If threat level drops to MEDIUM/LOW:
  → Can re-enter vault with HARVEST or DEPOSIT actions
- If threat persists:
  → Stay in HOLD until coast is clear
```

#### 8. Websocket Broadcasting
```
Real-time updates sent to all connected dashboard clients:
{
  type: "decision",
  data: {
    action: "EMERGENCY_EXIT",
    threatLevel: "CRITICAL",
    volatility: "EXTREME",
    txHash: "0x...",
    timestamp: "2026-03-20T14:23:45Z"
  }
}
```

---

## Monitoring & Debugging

### View Real-Time Logs
```bash
npm run dev

# Look for:
# ✓ Threat Analysis: CRITICAL (score: 0.92)
# ✓ Volatility: EXTREME (8.00%) | Price: $0.0850
# ✓ Vault State: $125,000 TVL | $5,250 user balance
```

### Check HCS Messages
```
https://hashscan.io/testnet/topic/YOUR_HCS_TOPIC_ID
```

### Query Vault State
```bash
# Via dashboard: http://localhost:3000/api/status
# Via chat: "What's the vault state?"
# Via code: bonzoVault.getVaultState()
```

### Database Inspection
```bash
# View tweet database
sqlite3 crypto_tweets.db "SELECT * FROM tweets LIMIT 5;"

# Count relevance scores
sqlite3 crypto_tweets.db "
  SELECT text, relevanceScore FROM tweets 
  WHERE relevanceScore > 0 
  ORDER BY relevanceScore DESC LIMIT 10;"
```

### Restart Server
```bash
# Kill current instance
Ctrl+C

# Restart with new .env values
npm run dev
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `No tweets found in database` | Run `python scraper.py` first |
| `GOOGLE_API_KEY not set` | Add key to `.env` from aistudio.google.com |
| `Cannot connect to vault` | Check BONZO_VAULT_HBAR_USDC, SUPRA_RPC_URL |
| `WebSocket connection refused` | Check PORT is free, firewall allows 3000 |
| `HCS topic not created` | First run should create it, check console output |
| `High latency responses` | Gemini API may be rate-limited, retry in 30s |

---

## Production Checklist

- [ ] Real Hedera mainnet account configured
- [ ] GOOGLE_API_KEY from production project
- [ ] Real Bonzo vault address on mainnet
- [ ] Real HCS topic created and monitored
- [ ] Vault has sufficient liquidity
- [ ] WebSocket TLS/SSL configured
- [ ] Rate limiting on API endpoints
- [ ] Error monitoring (Sentry, etc.)
- [ ] Backup database snapshots
- [ ] Emergency pause mechanism tested

