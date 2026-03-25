import { createLogger, format, transports } from "winston";

const { combine, timestamp, colorize, printf } = format;

const lineFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp}  [${level}]  ${message}`;
});

const isBrowser = typeof window !== "undefined";
const isVercel = process.env.VERCEL === "1" || !!process.env.NEXT_PUBLIC_VERCEL_URL;

export const logger = createLogger({
  level: "info",
  format: combine(
    colorize({ all: true }), 
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), 
    lineFormat
  ),
  transports: (isBrowser || isVercel)
    ? [new transports.Console()]
    : [
        new transports.Console(),
        new transports.File({
          filename: "agent.log",
          format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), lineFormat),
        }),
      ],
});
