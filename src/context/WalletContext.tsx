"use client";
import {
  createContext, useContext, useState,
  useCallback, useEffect, ReactNode, useRef
} from "react";
import { HashConnect, HashConnectTypes, MessageTypes } from "@hashgraph/hashconnect";

const APP_METADATA: HashConnectTypes.AppMetadata = {
  name: "Sentinel",
  description: "Intelligent Keeper Agent on Hedera",
  icon: "https://sentinel-one-teal.vercel.app/favicon.ico",
};

interface WalletState {
  connected: boolean;
  accountId: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  connected: false,
  accountId: null,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  
  const hcRef = useRef<HashConnect | null>(null);
  const initDataRef = useRef<HashConnectTypes.InitilizationData | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const initHashConnect = async () => {
      try {
        const hashconnect = new HashConnect();
        hcRef.current = hashconnect;
        
        // Listen to pairing events
        const onPairing = (pairingData: MessageTypes.ApprovePairing) => {
          if (pairingData.accountIds && pairingData.accountIds.length > 0) {
            setAccountId(pairingData.accountIds[0]);
            setConnected(true);
            setConnecting(false);
            sessionStorage.setItem("sentinel-wallet", pairingData.accountIds[0]);
          }
        };
        hashconnect.pairingEvent.on(onPairing);
        (hcRef.current as any)._onPairing = onPairing;

        // Verify if there's corrupted data
        try {
          const storedData = localStorage.getItem("hashconnectData");
          if (storedData && storedData.includes("undefined")) {
            localStorage.removeItem("hashconnectData");
          }
        } catch (e) {}

        const initData = await hashconnect.init(APP_METADATA, "testnet", false);
        if (!isMounted) return;
        initDataRef.current = initData;

        // Restore session if available
        if (initData.savedPairings && initData.savedPairings.length > 0) {
          const savedAccountId = initData.savedPairings[0].accountIds[0];
          setAccountId(savedAccountId);
          setConnected(true);
          sessionStorage.setItem("sentinel-wallet", savedAccountId);
        } else {
          const localSaved = sessionStorage.getItem("sentinel-wallet");
          if (localSaved) {
            setAccountId(localSaved);
            setConnected(true);
          } else {
            // Force hashconnect to clean up if no session exists, mitigating the decryption error
            try {
              (hashconnect as any).clearConnectionsAndData?.();
            } catch (e) {}
          }
        }
      } catch (error) {
        console.error("Failed to initialize HashConnect:", error);
        // Fallback for decryption error: wipe corrupted state
        localStorage.removeItem("hashconnectData");
      }
    };

    initHashConnect();

    return () => {
      isMounted = false;
      if (hcRef.current && (hcRef.current as any)._onPairing) {
        hcRef.current.pairingEvent.off((hcRef.current as any)._onPairing);
      }
    };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      if (hcRef.current) {
        // If initData is missing (due to a previous wipe), re-initialize
        if (!initDataRef.current) {
          initDataRef.current = await hcRef.current.init(APP_METADATA, "testnet", false);
        }
        
        hcRef.current.connectToLocalWallet();
      } else {
        console.error("HashConnect not initialized");
        setConnecting(false);
      }
    } catch (error) {
      console.error("Connection failed:", error);
      // Attempt to clean corrupted data and try again
      localStorage.removeItem("hashconnectData");
      sessionStorage.removeItem("sentinel-wallet");
      setConnecting(false);
    }
    
    setTimeout(() => {
      setConnecting((prev) => {
        if (prev && !connected) {
          console.warn("Connection timeout - HashPack might be blocked or waiting.");
        }
        return false;
      });
    }, 15000); 
  }, [connected]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setAccountId(null);
    sessionStorage.removeItem("sentinel-wallet");
    
    if (hcRef.current) {
      try {
         const hc = hcRef.current as any;
         if (typeof hc.clearConnectionsAndData === 'function') {
            hc.clearConnectionsAndData();
            initDataRef.current = null;
         } else {
            localStorage.removeItem("hashconnectData");
            initDataRef.current = null;
         }
      } catch (e) {
        console.error("Error during HashConnect disconnect", e);
      }
    } else {
      localStorage.removeItem("hashconnectData");
    }
    // Hard reload to completely flush hashconnect state
    window.location.reload();
  }, []);

  return (
    <WalletContext.Provider value={{
      connected, accountId, connecting, connect, disconnect,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}