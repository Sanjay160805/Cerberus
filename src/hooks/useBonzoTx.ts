"use client";
import { useState, useCallback } from "react";
import { useWallet } from "@/context/WalletContext";

interface TxState {
  loading: boolean;
  txHash: string | null;
  error: string | null;
}

/**
 * useBonzoTx
 *
 * Provides deposit() and withdraw() functions that:
 *  1. Call the Sentinel API to get unsigned calldata
 *  2. Pass it to WalletContext.executeContractCall()
 *  3. Return the Transaction ID / Hash on success
 *
 * This bypasses window.ethereum to avoid MetaMask interference.
 */
export function useBonzoTx(accountId: string | null) {
  const { executeContractCall } = useWallet();
  const [state, setState] = useState<TxState>({
    loading: false,
    txHash: null,
    error: null,
  });

  const reset = () => setState({ loading: false, txHash: null, error: null });

  const sendTx = useCallback(
    async (
      endpoint: "/api/vault/deposit" | "/api/vault/withdraw",
      amountHbar: string
    ): Promise<string | null> => {
      if (!accountId) {
        setState((s: TxState) => ({ ...s, error: "Wallet not connected" }));
        return null;
      }

      setState({ loading: true, txHash: null, error: null });

      try {
        // 1. Get unsigned tx (calldata) from our API
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountHbar, accountId }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? "API error");

        const unsignedTx = json.tx as {
          to: string;
          data: string;
          value: string;
        };

        // 2. Execute via WalletContext (Hedera SDK + HWC Signer)
        // This will trigger the HashPack popup directly
        const txId = await executeContractCall(
          unsignedTx.to,
          unsignedTx.data,
          endpoint === "/api/vault/deposit" ? amountHbar : "0"
        );

        setState({ loading: false, txHash: txId, error: null });
        return txId;
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        setState({ loading: false, txHash: null, error: msg });
        return null;
      }
    },
    [accountId, executeContractCall]
  );

  const deposit = useCallback(
    (amountHbar: string) => sendTx("/api/vault/deposit", amountHbar),
    [sendTx]
  );

  const withdraw = useCallback(
    (amountHbar: string) => sendTx("/api/vault/withdraw", amountHbar),
    [sendTx]
  );

  return { ...state, deposit, withdraw, reset };
}
