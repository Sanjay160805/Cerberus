#!/usr/bin/env node
/**
 * LIVE DEMO: Scraper → Agent → Bonzo Vault Token Flow
 * Shows the complete pipeline with mock data
 */

// Simple color utilities (no external deps)
const c = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  orange: "\x1b[33m",
  bgBlue: "\x1b[44m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  white: "\x1b[37m",
  black: "\x1b[30m",
};

console.log("\n" + "=".repeat(80));
console.log(`${c.bgBlue}${c.white} 🛡️  SENTINEL LIVE DEMO: Scraper → Token Flow to Bonzo Vault ${c.reset}`);
console.log("=".repeat(80) + "\n");

// ════════════════════════════════════════════════════════════════
// STEP 1: SCRAPER CAPTURES TWEETS
// ════════════════════════════════════════════════════════════════
console.log(`${c.cyan}█ STEP 1: Scraper Captures Geopolitical Data${c.reset}`);
console.log(`${c.gray}${"─".repeat(80)}${c.reset}`);

const liveData = [
  {
    username: "USTreasury",
    text: "NEW: Enhanced regulatory framework for digital assets. Increases compliance requirements for crypto platforms.",
    time: "2026-03-20 12:30 UTC",
    likes: "2.4K",
    retweets: "5.1K",
    keywords: ["regulation", "crypto", "compliance"],
  },
  {
    username: "Reuters",
    text: "BREAKING: Tensions escalate in Eastern Europe - military deployments reported. Markets react with capital flight.",
    time: "2026-03-20 12:28 UTC",
    likes: "8.9K",
    retweets: "12.3K",
    keywords: ["geopolitics", "war", "sanctions"],
  },
  {
    username: "federalreserve",
    text: "FOMC statement: Maintaining hawkish stance. Interest rates may increase further Q2 2026.",
    time: "2026-03-20 12:25 UTC",
    likes: "1.2K",
    retweets: "3.4K",
    keywords: ["interest rates", "inflation", "monetary policy"],
  },
  {
    username: "whale_alert",
    text: "🐳 Large whale movement: 50M HBAR transferred from Binance to unknown wallet. 🚨",
    time: "2026-03-20 12:20 UTC",
    likes: "4.5K",
    retweets: "8.2K",
    keywords: ["whale", "capital flight", "volatile"],
  },
];

liveData.forEach((tweet, i) => {
  console.log(`\n  Tweet ${i + 1}/4:`);
  console.log(`  ${chalk.yellow("@" + tweet.username)}`);
  console.log(`  ${chalk.gray(tweet.text.substring(0, 70) + "...")}`);
  console.log(
    `  ${chalk.dim(`📅 ${tweet.time} | ❤️  ${tweet.likes} | 🔄 ${tweet.retweets}`)}`
  );
  console.log(`  ${chalk.green("Keywords: " + tweet.keywords.join(", "))}`);
});

console.log(
  `\n${chalk.green("✓")} Scraped 4 market-moving tweets from 50+ geopolitical accounts\n`
);

// ════════════════════════════════════════════════════════════════
// STEP 2: RAG CHAIN ANALYZES DATA
// ════════════════════════════════════════════════════════════════
console.log(chalk.cyan("█ STEP 2: RAG Chain Processes with Gemini-2.0-Flash"));
console.log(chalk.gray("─".repeat(80)));

const threatAnalysis = {
  overall_score: 68,
  trend: "HIGH",
  volatility: "VOLATILE",
  breakdown: {
    regulatory_risk: 35,
    geopolitical_risk: 28,
    monetary_policy: 25,
    on_chain_signals: 32,
  },
  key_signals: [
    "🚨 Regulatory tightening on stablecoins",
    "⚠️  Geopolitical escalation in Eastern Europe",
    "📉 Fed maintaining hawkish stance",
    "🐋 Whale capital outflows detected",
  ],
  confidence: "94%",
};

console.log(`\n  Threat Analysis Results:`);
console.log(
  `  ${chalk.redBright("Overall Score: " + threatAnalysis.overall_score + "/100")}`
);
console.log(`  ${chalk.yellow("Threat Level: " + threatAnalysis.trend)}`);
console.log(`  ${chalk.orange("Volatility: " + threatAnalysis.volatility)}`);
console.log(`  ${chalk.gray("Confidence: " + threatAnalysis.confidence)}`);

console.log(`\n  Risk Breakdown:`);
Object.entries(threatAnalysis.breakdown).forEach(([key, value]) => {
  const bar =
    "█".repeat(Math.floor(value / 5)) +
    "░".repeat(20 - Math.floor(value / 5));
  console.log(`    ${key.padEnd(20)} ${bar} ${value}%`);
});

console.log(`\n  Key Signals:`);
threatAnalysis.key_signals.forEach((signal) => {
  console.log(`    ${signal}`);
});

console.log(
  `\n${chalk.green("✓")} Threat analysis complete - Score: ${threatAnalysis.overall_score}/100\n`
);

// ════════════════════════════════════════════════════════════════
// STEP 3: AGENT DECISION MATRIX
// ════════════════════════════════════════════════════════════════
console.log(chalk.cyan("█ STEP 3: SENTINEL Agent Decision Matrix"));
console.log(chalk.gray("─".repeat(80)));

console.log(`\n  Threat × Volatility Decision Matrix:`);
console.log(`\n  ┌─────────────────────────────────────────────────┐`);
console.log(`  │ Threat: ${threatAnalysis.trend.padEnd(10)} | Volatility: ${threatAnalysis.volatility.padEnd(12)} │`);
console.log(`  └─────────────────────────────────────────────────┘`);

const decision =
  threatAnalysis.overall_score >= 70 && threatAnalysis.volatility === "VOLATILE"
    ? "WITHDRAW_50%"
    : threatAnalysis.overall_score >= 90
      ? "EMERGENCY_EXIT"
      : threatAnalysis.overall_score < 40
        ? "HARVEST"
        : "HOLD";

const decisionColors = {
  HARVEST: chalk.green,
  HOLD: chalk.yellow,
  WITHDRAW_50: chalk.orange,
  WITHDRAW_50_: chalk.orange,
  EMERGENCY_EXIT: chalk.red,
};

const decisionColor =
  decisionColors[decision] || decisionColors[Object.keys(decisionColors)[0]];

console.log(`\n  ${chalk.bold("📊 DECISION MATRIX LOGIC:")}`);
console.log(`  Threat Score: ${threatAnalysis.overall_score}`);
console.log(`  Volatility: ${threatAnalysis.volatility}`);
console.log(`  → Market is HIGH threat + VOLATILE`);

console.log(
  `\n  ${chalk.bgYellow.black(" ACTION: WITHDRAW 50% FROM VAULT ")} \n  ${chalk.dim("Reduce position risk during elevated volatility")}`
);

// ════════════════════════════════════════════════════════════════
// STEP 4: BONZO VAULT EXECUTION
// ════════════════════════════════════════════════════════════════
console.log(
  `\n${chalk.cyan("█ STEP 4: Execute on Bonzo Finance ERC-4626 Vault")}` +
    `\n${chalk.gray("─".repeat(80))}`
);

const vaultState = {
  tvl: "$125,000",
  user_shares: "500",
  share_price: "$250",
  user_position: "$125,000",
  apy: "12.8%",
};

console.log(`\n  ${chalk.bold("Pre-Withdrawal Vault State:")}`);
console.log(
  `    Total Value Locked (TVL):  ${chalk.cyan(vaultState.tvl)}`
);
console.log(
  `    Your Shares:              ${chalk.cyan(vaultState.user_shares)} shares`
);
console.log(
  `    Share Price:              ${chalk.cyan(vaultState.share_price)} USDC`
);
console.log(
  `    Your Position Value:      ${chalk.cyan(vaultState.user_position)}`
);
console.log(`    Current APY:              ${chalk.green(vaultState.apy)}`);

console.log(
  `\n  ${chalk.bold("Executing: WITHDRAW 50%")}
  Function: vault.withdraw(62500, userAddress, userAddress)
  Gas Fee:   0.5 HBAR (~$0.09)
  TX Status: ${chalk.greenBright("✓ CONFIRMED")}`
);

const afterWithdraw = {
  remaining_position: "$62,500",
  withdrawn_amount: "$62,500",
  remaining_shares: "250",
  timestamp: new Date().toISOString(),
};

console.log(`\n  ${chalk.bold("Post-Withdrawal Vault State:")}`);
console.log(
  `    Withdrawn Amount:         ${chalk.yellow(
    afterWithdraw.withdrawn_amount
  )} (50%)`
);
console.log(
  `    Remaining Position:       ${chalk.green(afterWithdraw.remaining_position)}`
);
console.log(
  `    Remaining Shares:         ${chalk.green(afterWithdraw.remaining_shares)} shares`
);

// ════════════════════════════════════════════════════════════════
// STEP 5: AUDIT LOG
// ════════════════════════════════════════════════════════════════
console.log(
  `\n${chalk.cyan("█ STEP 5: Hedera Consensus Service Audit Trail")}` +
    `\n${chalk.gray("─".repeat(80))}`
);

const auditLog = [
  {
    seq: 1,
    action: "THREAT_ANALYSIS",
    score: 68,
    timestamp: "12:30:45 UTC",
  },
  {
    seq: 2,
    action: "DECISION_MADE",
    decision: "WITHDRAW_50%",
    timestamp: "12:30:52 UTC",
  },
  {
    seq: 3,
    action: "WITHDRAWAL_EXECUTED",
    amount: "$62,500",
    txHash: "0x7a9c...d4e2",
    timestamp: "12:31:03 UTC",
  },
  {
    seq: 4,
    action: "AUDIT_LOGGED",
    hcsTopicId: "0.0.123456",
    timestamp: "12:31:05 UTC",
  },
];

console.log(`\n  ${chalk.bold("Transaction Timeline:")}`);
console.log(
  `  ┌─────┬──────────────────────┬──────────────┬─────────────┐`
);
console.log(
  `  │ SEQ │ ACTION               │ DETAILS      │ TIMESTAMP   │`
);
console.log(
  `  ├─────┼──────────────────────┼──────────────┼─────────────┤`
);
auditLog.forEach((log) => {
  console.log(
    `  │ ${String(log.seq).padEnd(3)} │ ${log.action.padEnd(20)} │ ${
      (log.score || log.decision || log.amount || log.hcsTopicId)
        .toString()
        .substring(0, 12)
        .padEnd(12)
    } │ ${log.timestamp.padEnd(11)} │`
  );
});
console.log(
  `  └─────┴──────────────────────┴──────────────┴─────────────┘`
);

console.log(`\n  ${chalk.green("✓")} All transactions logged to Hedera Consensus Service`);
console.log(
  `  ${chalk.dim("Immutable audit trail for regulatory compliance")}\n`
);

// ════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ════════════════════════════════════════════════════════════════
console.log(chalk.bgGreen.black(" LIFECYCLE COMPLETE "));
console.log(`\n${chalk.bold("Summary of Actions:")}`);
console.log(
  `  1. ${chalk.cyan("🐦 Scraper")} → Captured 4 geopolitical tweets from 50+ sources`
);
console.log(
  `  2. ${chalk.cyan("📡 RAG Chain")} → Analyzed with Gemini-2.0-Flash (Score: 68/100)`
);
console.log(
  `  3. ${chalk.cyan("🤖 Agent")} → Applied decision matrix (HIGH + VOLATILE = WITHDRAW)`
);
console.log(
  `  4. ${chalk.cyan("🏦 Vault")} → Executed 50% withdrawal ($62,500 to safety)`
);
console.log(
  `  5. ${chalk.cyan("📜 HCS")} → Logged immutable audit trail for compliance`
);

console.log(`\n${chalk.green("✓")} Risk Reduced | Position Protected | Token Secured\n`);
console.log("=".repeat(80) + "\n");
