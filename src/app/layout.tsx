import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from 'next/font/google';
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
  weight: ['400', '500', '600', '700'],
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '700'],
});
import { WalletProvider } from "@/context/WalletContext";

export const metadata: Metadata = {
  title: "Sentinel — Intelligent Keeper Agent",
  description: "Autonomous DeFi keeper agent on Hedera + Bonzo Finance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body className="antialiased">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}