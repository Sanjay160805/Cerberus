import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel — Intelligent Keeper Agent",
  description: "Autonomous DeFi keeper agent powered by Gemini AI, LangGraph, Hedera, and Bonzo Finance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
