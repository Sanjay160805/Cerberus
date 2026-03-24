"use client";
import { useState, useCallback } from "react";
import { useWallet } from "@/context/WalletContext";
import { ethers } from "ethers";

interface TxState {
  loading: boolean;
  txHash: string | null;
  error: string | null;
  step: number;
  totalSteps: number;
}

const ERC20_ABI = ["function balanceOf(address account) external view returns (uint256)"];
const USDC_TOKEN_ADDRESS = "0x0000000000000000000000000000000000001549";

export function useBonzoTx(accountId: string | null) {
  const { executeContractCall } = useWallet();
  const [state, setState] = useState<TxState>({
    loading: false,
    txHash: null,
    error: null,
    step: 0,
    totalSteps: 0,
  });

  const reset = () => setState({ loading: false, txHash: null, error: null, step: 0, totalSteps: 0 });

  const deposit = useCallback(
    async (amountHbar: string): Promise<string | null> => {
      if (!accountId) {
        setState((s) => ({ ...s, error: "Wallet not connected" }));
        return null;
      }

      setState({ loading: true, txHash: null, error: null, step: 1, totalSteps: 3 });

      try {
        // STEP 1: Swap HBAR to USDC
        const res1 = await fetch("/api/vault/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountHbar, accountId, step: 1 }),
        });
        const json1 = await res1.json();
        if (!json1.ok) throw new Error(json1.error || "Swap failed");

        await executeContractCall(json1.tx.to, json1.tx.data, amountHbar);
        
        // Wait a bit for the swap to index (Hedera is fast but let's be safe)
        await new Promise(r => setTimeout(r, 3000));

        // STEP 2: Approve USDC
        setState(s => ({ ...s, step: 2 }));
        const res2 = await fetch("/api/vault/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId, step: 2 }),
        });
        const json2 = await res2.json();
        if (!json2.ok) throw new Error(json2.error || "Approve failed");

        await executeContractCall(json2.tx.to, json2.tx.data, "0");
        await new Promise(r => setTimeout(r, 2000));

        // STEP 3: Deposit USDC
        setState(s => ({ ...s, step: 3 }));
        
        const res3 = await fetch("/api/vault/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            accountId, 
            step: 3, 
            usdcAmount: "MAX"
          }),
        });
        const json3 = await res3.json();
        if (!json3.ok) throw new Error(json3.error || "Deposit failed");

        const txId = await executeContractCall(json3.tx.to, json3.tx.data, "0");

        setState({ loading: false, txHash: txId, error: null, step: 3, totalSteps: 3 });
        return txId;
      } catch (err: any) {
        setState({ loading: false, txHash: null, error: err.message || String(err), step: 0, totalSteps: 0 });
        return null;
      }
    },
    [accountId, executeContractCall]
  );

  const withdraw = useCallback(
    async (amountHbar: string): Promise<string | null> => {
      if (!accountId) {
        setState((s) => ({ ...s, error: "Wallet not connected" }));
        return null;
      }

      setState({ loading: true, txHash: null, error: null, step: 1, totalSteps: 2 });

      try {
        // STEP 1: Withdraw USDC from Bonzo
        const res1 = await fetch("/api/vault/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountHbar, accountId, step: 1 }),
        });
        const json1 = await res1.json();
        if (!json1.ok) throw new Error(json1.error || "Withdraw failed");

        await executeContractCall(json1.tx.to, json1.tx.data, "0");
        
        // Wait for indexing
        await new Promise(r => setTimeout(r, 3000));

        // STEP 2: Swap USDC back to HBAR
        setState(s => ({ ...s, step: 2 }));
        const res2 = await fetch("/api/vault/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            accountId, 
            step: 2,
            usdcAmount: "MAX"
          }),
        });
        const json2 = await res2.json();
        if (!json2.ok) throw new Error(json2.error || "Swap back failed");

        const txId = await executeContractCall(json2.tx.to, json2.tx.data, "0");

        setState({ loading: false, txHash: txId, error: null, step: 2, totalSteps: 2 });
        return txId;
      } catch (err: any) {
        setState({ loading: false, txHash: null, error: err.message || String(err), step: 0, totalSteps: 0 });
        return null;
      }
    },
    [accountId, executeContractCall]
  );


  return { ...state, deposit, withdraw, reset };
}

