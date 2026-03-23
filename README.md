# Cerberus: Intelligent Keeper Agent on Hedera

Cerberus is a real-time, AI-driven automation agent built on the Hedera network. It monitors social sentiment (via Twitter) and market conditions to actively manage a decentralized finance (DeFi) position on Bonzo Finance. The entire application features a **Premium Retro Neobrutalist UI**, specifically designed to stand out with striking colors, sharp shadows, and arcade-style visual feedback.

> **Hackathon Edition**: This version utilizes a completely custom Neobrutalist design system to deliver a truly engaging, interactive, and visually striking experience. Wallet connect is fully functional natively with the HashPack browser extension.

## Features

- **Genuine HashPack Integration**: Native Hedera wallet connectivity using the official `@hashgraph/hashconnect` library to pair with the HashPack browser extension. No more manual Account ID entry!
- **Retro Neobrutalism UI**: A stark, highly stylized dashboard featuring vibrant colors (mint, purple, yellow), deep shadows, thick borders, and a subtle CRT noise overlay.
- **AI-Powered Decisions**: Integrates with Google Gemini to analyze market sentiment and output structured JSON decisions (HARVEST, PROTECT, TIGHTEN, WIDEN, HOLD).
- **On-Chain Audit Trail**: Every AI decision is permanently logged to the Hedera Consensus Service (HCS), ensuring an immutable and transparent history of all agent actions.
- **DeFi Integration**: Manages positions on Bonzo Finance via Supra Oracle price feeds.
- **Real-Time Dashboard**: Includes an Arcade-style Threat Meter, terminal-inspired Position Cards, a blocky Price Chart, and a stark Timeline for decisions.

## Architecture

1. **Frontend**: Next.js (React) + Vanilla CSS (`globals.css` with 100% custom Neobrutalist styling).
2. **Backend**: Next.js API Routes.
3. **Database**: SQLite (via `better-sqlite3`) for caching tweets, prices, and agent state.
4. **AI Engine**: `@google/genai` (Gemini 2.5 Flash).
5. **Blockchain Operations**: `@hashgraph/sdk` for HCS logging and `@hashgraph/hashconnect` for dApp connectivity.

## Setup Instructions

### 1. Prerequisites
- Node.js 18+
- A Hedera Testnet Account (accountId and privateKey)
- A Google Gemini API Key
- HashPack Wallet (Browser Extension) installed for testing frontend connectivity.

### 2. Installation
```bash
git clone <repository_url>
cd cerberus
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
# Hedera Testnet Credentials (for the Agent backend)
HEDERA_ACCOUNT_ID=0.0.xxxxx
HEDERA_PRIVATE_KEY=302e020100300506032b657004220420...

# Gemini API Key (for the AI decision engine)
GEMINI_API_KEY=AIzaSy...

# HCS Topic ID (Optional: The agent will create one if not provided)
NEXT_PUBLIC_HCS_TOPIC_ID=0.0.xxxxx
```

### 4. Running Locally
```bash
npm run dev
```
Navigate to `http://localhost:3000`.

## Using the Dashboard

1. **Connect Wallet**: Click the "Connect HashPack" button. Your HashPack browser extension will prompt you to pair. Once paired, Cerberus securely reads your `accountId` dynamically.
2. **Start Agent**: Click "Start Agent" to begin the background polling process.
3. **Run Cycle**: Click "Run Cycle" to force the agent to fetch tweets, query prices, and make an immediate AI decision.
4. **View Decisions**: AI decisions will populate the timeline and are simultaneously logged to Hedera HCS.

## Hackathon Highlights

- **Aesthetic Edge**: Cerberus abandons generic UI libraries for a fully custom, high-contrast, edge-to-edge Neobrutalism experience.
- **Full Transparency**: Users aren't forced to trust the AI; every decision factor is surfaced on the UI, and the final action is cryptographically sealed on Hedera.
- **Real, Not Mocked**: The wallet integration is a genuine connection via HashConnect, providing the actual Web3 user experience.

---
Built with 💜 for the Hedera Ecosystem.