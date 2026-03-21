"use client";
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

interface WalletState {
  connected: boolean;
  accountId: string | null;
  isOwner: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  connected: false,
  accountId: null,
  isOwner: false,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
});

const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_WALLET_ID ?? "";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("sentinel-wallet");
    if (saved) {
      setAccountId(saved);
      setConnected(true);
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      // Check if HashPack extension is installed
      const win = window as any;

      if (!win.hashpack) {
        // HashPack not installed — open install page
        window.open("https://www.hashpack.app/download", "_blank");
        setConnecting(false);
        return;
      }

      // Request account from HashPack directly
      const result = await win.hashpack.requestAccount();

      if (result?.accountId) {
        setAccountId(result.accountId);
        setConnected(true);
        sessionStorage.setItem("sentinel-wallet", result.accountId);
      }
    } catch (err: any) {
      // User rejected or error
      console.warn("HashPack connection failed:", err?.message ?? err);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnected(false);
    setAccountId(null);
    sessionStorage.removeItem("sentinel-wallet");
  }, []);

  const isOwner = connected && !!accountId &&
    OWNER_ID !== "" && accountId === OWNER_ID;

  return (
    <WalletContext.Provider value={{
      connected, accountId, isOwner, connecting, connect, disconnect,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}