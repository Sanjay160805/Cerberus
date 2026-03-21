type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

function log(level: LogLevel, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const prefix = { INFO: "ℹ️ ", WARN: "⚠️ ", ERROR: "❌", DEBUG: "🔍" }[level];
  console.log(`[${timestamp}] ${prefix} [${level}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

export const logger = {
  info: (message: string, data?: unknown) => log("INFO", message, data),
  warn: (message: string, data?: unknown) => log("WARN", message, data),
  error: (message: string, data?: unknown) => log("ERROR", message, data),
  debug: (message: string, data?: unknown) => log("DEBUG", message, data),
};
