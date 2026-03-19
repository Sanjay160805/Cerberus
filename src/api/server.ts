/**
 * SENTINEL Express API Server with WebSocket
 * REST endpoints + WebSocket for real-time dashboard updates
 */

import express, { Request, Response } from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import {
  runAutonomousCycle,
  runChatCycle,
  getDashboardStatus,
  getRecentDecisions,
  getLoopingStatus,
} from "../agent/sentinelAgent.js";
import { initializeHederaClient, getOrCreateTopic } from "../hedera/hederaClient.js";
import { warmupPriceHistory } from "../oracle/supraOracle.js";
import { WebSocketMessage } from "../types/index.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "../../frontend")));

// Track connected WebSocket clients
const connectedClients = new Set<any>();

/**
 * Broadcast message to all connected WebSocket clients
 */
function broadcastToClients(message: WebSocketMessage): void {
  const messageStr = JSON.stringify({
    ...message,
    timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : message.timestamp,
  });
  connectedClients.forEach((client) => {
    if (client.readyState === 1) {
      // OPEN
      try {
        client.send(messageStr);
      } catch (error) {
        console.error("Failed to send to client:", error);
      }
    }
  });
}

/**
 * WebSocket connection handler
 */
wss.on("connection", (ws) => {
  console.log("✓ WebSocket client connected");
  connectedClients.add(ws);

  // Send initial status
  getDashboardStatus().then((status) => {
    const message: WebSocketMessage = {
      type: "status",
      data: status,
      timestamp: new Date(),
    };
    ws.send(JSON.stringify(message));
  });

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === "run_cycle") {
        runAutonomousCycle().then((result) => {
          broadcastToClients({
            type: "decision",
            data: result,
            timestamp: new Date(),
          });
        });
      }
    } catch (error) {
      console.error("✗ WebSocket message error:", error);
    }
  });

  ws.on("close", () => {
    console.log("✓ WebSocket client disconnected");
    connectedClients.delete(ws);
  });

  ws.on("error", (error) => {
    console.error("✗ WebSocket error:", error);
    connectedClients.delete(ws);
  });
});

// ════════════════════════════════════════════════════════════════
// REST ENDPOINTS
// ════════════════════════════════════════════════════════════════

/**
 * GET /api/status
 */
app.get("/api/status", async (_req: Request, res: Response) => {
  try {
    const status = await getDashboardStatus();
    res.json(status);
  } catch (error) {
    console.error("✗ /api/status failed:", error);
    res.status(500).json({ error: "Failed to get status" });
  }
});

/**
 * GET /api/threat
 */
app.get("/api/threat", async (_req: Request, res: Response) => {
  try {
    const status = await getDashboardStatus();
    res.json(status.threat || { score: 0, level: "LOW" });
  } catch (error) {
    console.error("✗ /api/threat failed:", error);
    res.status(500).json({ error: "Failed to get threat" });
  }
});

/**
 * GET /api/volatility
 */
app.get("/api/volatility", async (_req: Request, res: Response) => {
  try {
    const status = await getDashboardStatus();
    res.json(
      status.volatility || {
        currentPrice: 0.15,
        realizedVolatility: 0,
        volatilityClassification: "STABLE",
      },
    );
  } catch (error) {
    console.error("✗ /api/volatility failed:", error);
    res.status(500).json({ error: "Failed to get volatility" });
  }
});

/**
 * POST /api/agent/run
 */
app.post("/api/agent/run", async (_req: Request, res: Response) => {
  try {
    if (getLoopingStatus()) {
      return res.status(429).json({ error: "Agent already running" });
    }

    const result = await runAutonomousCycle();

    broadcastToClients({
      type: "decision",
      data: result,
      timestamp: new Date(),
    });

    const status = await getDashboardStatus();
    broadcastToClients({
      type: "status",
      data: status,
      timestamp: new Date(),
    });

    res.json(result);
  } catch (error) {
    console.error("✗ /api/agent/run failed:", error);
    res.status(500).json({
      error: "Failed to run agent",
      details: error instanceof Error ? error.message : "unknown",
    });
  }
});

/**
 * POST /api/agent/chat
 */
app.post("/api/agent/chat", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message required" });
    }

    const response = await runChatCycle(message);
    res.json({ response });
  } catch (error) {
    console.error("✗ /api/agent/chat failed:", error);
    res.status(500).json({
      error: "Failed to process chat",
      details: error instanceof Error ? error.message : "unknown",
    });
  }
});

/**
 * GET /api/decisions
 */
app.get("/api/decisions", async (_req: Request, res: Response) => {
  try {
    const decisions = getRecentDecisions();
    res.json(decisions);
  } catch (error) {
    console.error("✗ /api/decisions failed:", error);
    res.status(500).json({ error: "Failed to get decisions" });
  }
});

/**
 * GET /api/health
 */
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "operational",
    timestamp: new Date().toISOString(),
    connectedClients: connectedClients.size,
  });
});

// ════════════════════════════════════════════════════════════════
// SERVER STARTUP
// ════════════════════════════════════════════════════════════════

const PORT = parseInt(process.env.PORT || "3000", 10);
const MONITORING_INTERVAL = parseInt(process.env.MONITORING_INTERVAL_MS || "60000", 10);

async function startServer() {
  try {
    console.log("🚀 SENTINEL Server Starting...\n");

    // Initialize Hedera client
    console.log("📡 Initializing Hedera network...");
    await initializeHederaClient();
    await getOrCreateTopic();

    // Warm up price history
    console.log("📈 Warming up price history...");
    await warmupPriceHistory(5);

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`\n✓ SENTINEL running on http://localhost:${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
      console.log(`⚙  API: http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}\n`);
    });

    // Start autonomous monitoring loop
    console.log(`⏱  Monitoring every ${MONITORING_INTERVAL}ms...\n`);

    setInterval(async () => {
      try {
        const result = await runAutonomousCycle();

        broadcastToClients({
          type: "decision",
          data: result,
          timestamp: new Date(),
        });

        const status = await getDashboardStatus();
        broadcastToClients({
          type: "status",
          data: status,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("✗ Cycle error:", error);
        broadcastToClients({
          type: "error",
          data: {
            message: error instanceof Error ? error.message : "Unknown error",
          },
          timestamp: new Date(),
        });
      }
    }, MONITORING_INTERVAL);
  } catch (error) {
    console.error("✗ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down SENTINEL...");
  server.close(() => {
    console.log("✓ Server closed");
    process.exit(0);
  });
});

// Start
startServer();

export default server;
