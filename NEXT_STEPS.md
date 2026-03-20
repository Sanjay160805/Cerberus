# SENTINEL — Next Steps & Action Items

## 🎯 What You Need to Do RIGHT NOW

### 1. Install Dependencies (2 min)
```bash
cd c:\Sentinel
npm install
```

**What this does:**
- Removes @langchain/openai
- Installs @langchain/google-genai
- Installs better-sqlite3
- Updates all LangChain packages

---

### 2. Create .env File (5 min)
```bash
# Create c:\Sentinel\.env with YOUR values:

HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=0xYOUR_ECDSA_PRIVATE_KEY
HEDERA_EVM_PRIVATE_KEY=0xSAME_AS_ABOVE
USER_EVM_ADDRESS=0xYOUR_WALLET_ADDRESS
HEDERA_NETWORK=testnet

GOOGLE_API_KEY=YOUR_API_KEY_FROM_aistudio.google.com

BONZO_VAULT_HBAR_USDC=0xVAULT_CONTRACT_ADDRESS_OR_LEAVE_BLANK
SUPRA_ORACLE_ADDRESS=0xSUPRA_ORACLE_ADDRESS_OR_LEAVE_BLANK
SUPRA_RPC_URL=https://testnet.hashio.io/api

THREAT_THRESHOLD=0.65
VOLATILITY_THRESHOLD=0.04
MONITORING_INTERVAL_MS=60000
HCS_TOPIC_ID=
PORT=3000
```

**Where to get values:**
- Hedera account: From Hedera Hashscan
- Google API Key: https://aistudio.google.com (free)
- Vault/Oracle addresses: From your deployment
- Everything else: Defaults work fine

---

### 3. Create SQLite Database (10 min)
```bash
cd c:\Sentinel

# Run the Python scraper
python scraper.py

# This creates crypto_tweets.db with ~20-50 recent tweets
# Table: tweets (id, username, text, time, likes, retweets, replies, is_crypto, scraped_at)
```

**Verify it worked:**
```bash
sqlite3 crypto_tweets.db "SELECT COUNT(*) as count FROM tweets WHERE is_crypto=1;"

# Should print: count
#               15  (or similar non-zero)
```

---

### 4. Test TypeScript Compilation (2 min)
```bash
npm run build

# Should output: Compiled successfully OR create dist/ folder
# Should have ZERO errors
```

---

### 5. Start Development Server (1 min)
```bash
npm run dev
```

**Expected console output:**
```
[... startup messages ...]
✓ Hedera client initialized on testnet
  Account: 0.0.YOUR_ID
✓ Connected to SQLite: C:\Sentinel\crypto_tweets.db
✓ Fetched 12 relevant tweets from database
🛡 SENTINEL running on http://localhost:3000
📡 WebSocket ready
🔄 Monitoring interval: 60s
```

If you don't see these, check:
- Is GOOGLE_API_KEY set? (check .env)
- Did `python scraper.py` run? (check crypto_tweets.db exists)
- Port 3000 free? (`netstat -an | find "3000"`)

---

### 6. Test Dashboard (2 min)
```
Open browser: http://localhost:3000
```

You should see:
- ✅ Red threat assessment panel
- ✅ Volatility gauge chart
- ✅ Vault metrics (TVL, APY, Safety)
- ✅ Decision timeline
- ✅ Chat interface
- ✅ "RUN AGENT CYCLE" button

**Test WebSocket connection:**
- Open browser DevTools (F12)
- Go to Console tab
- Should NOT see any WebSocket errors

---

### 7. Trigger First Agent Cycle (5 min)
```
On dashboard, click: [RUN AGENT CYCLE] button
```

**Watch console output. You should see:**
```
✓ Threat Analysis: LOW (score: 0.15)
✓ Volatility: STABLE (3.00%) | Price: $0.0850
✓ Vault State: $125,000 TVL | $5,250 user balance
✓ HCS Topic created: 0.0.XXXXXXX
```

**If it succeeds:**
- Decision appears in timeline
- WebSocket broadcasts to dashboard
- Metrics update in real-time

**If it fails:**
- Check console for error messages
- See troubleshooting section below

---

## ⚠️ Important Notes

### System Assumes Mock Data If Services Unavailable
- If vault not configured → uses mock TVL ($125,000)
- If Supra oracle not set → uses CoinGecko → uses mock price
- If HCS fails → returns mock sequence number
- Safe defaults everywhere = system keeps running

### Free Tier Limits
- Google Gemini: 60 requests/min
- CoinGecko: 50 requests/min free API
- System respects rate limits automatically

### Production Considerations
- Store real vault addresses before production
- Ensure sufficient wallet balance for transactions
- Test emergency exit thoroughly before critical events
- Monitor HCS for decision audit trail

---

## 🔍 Verification Commands

Run these to verify proper migration:

```bash
# 1. Check no OpenAI references
findstr /R "@langchain.openai" src\*.ts src\*\*.ts
# Should return: (File not found)

# 2. Check Google Gemini is configured
findstr /R "GoogleGenerativeAI" src\rag\*.ts
# Should return paths in vectorStore.ts and ragChain.ts

# 3. Verify SQLite is being used
findstr /R "better-sqlite3" src\rag\*.ts
# Should return paths in twitterIngestor.ts

# 4. TypeScript should compile with no errors
npm run build
# Should complete without errors
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| `npm install fails` | Clear cache: `npm cache clean --force` then retry |
| `GOOGLE_API_KEY error` | Get key from aistudio.google.com, paste exact value |
| `crypto_tweets.db not found` | Run `python scraper.py` in project root |
| `Port 3000 already in use` | Kill process or use different PORT in .env |
| `WebSocket connection refused` | Check firewall allows :3000, try localhost |
| `Hedera authentication failed` | Check HEDERA_PRIVATE_KEY starts with 0x |
| `No tweets found` | Verify crypto_tweets.db has data: `sqlite3 crypto_tweets.db "SELECT COUNT(*) FROM tweets;"` |
| `Agent cycle times out` | May be waiting for Gemini API, try again in 30s |
| `HCS topic creation fails` | Topic may already exist, add to .env: `HCS_TOPIC_ID=0.0.xxx` |

---

## 📊 Expected Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Load dashboard | 1-2s | Initial load |
| WebSocket connect | <1s | Real-time ready |
| Run agent cycle | 5-10s | Depends on API latency |
| Fetch tweets | 2s | SQLite local |
| Analyze threat | 3s | Gemini LLM |
| Get volatility | 2s | CoinGecko free API |
| Execute transaction | 20-60s | On-chain, not shown in cycle |

---

## 📞 Support Resources

- **Documentation:** See SETUP.md, IMPLEMENTATION.md, CHANGES_SUMMARY.md
- **TypeScript Errors:** Run `npm run build` for detailed messages
- **API Issues:** Check .env values match exactly
- **Database Issues:** Use `sqlite3 crypto_tweets.db ".schema"`
- **Network Issues:** Test with `curl https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd`

---

## ✅ Success Criteria

You'll know everything works when:

1. ✅ npm run build completes with 0 errors
2. ✅ npm run dev starts and shows "SENTINEL running on http://localhost:3000"
3. ✅ Dashboard loads at http://localhost:3000
4. ✅ Agent cycle completes (takes ~8-10 seconds)
5. ✅ No errors in browser console (F12)
6. ✅ WebSocket shows connected status
7. ✅ Metrics update in real-time
8. ✅ Decisions appear in timeline
9. ✅ HCS topic is created and logged
10. ✅ Chat interface responds to messages

---

## 🚀 Quick Reference

```bash
# Full startup sequence:
npm install                        # 1. Install deps
python scraper.py                  # 2. Create database
npm run build                       # 3. Compile TypeScript
npm run dev                         # 4. Start server

# Then open:
# http://localhost:3000            # 5. Dashboard

# To stop:
# Ctrl+C in terminal
```

---

**Ready? Start with:** `npm install`

