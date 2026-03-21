"use client";
import { usePolling } from "./useWebSocket";
import { VaultPosition, PriceData } from "@/lib/types";

interface PositionsData { ok: boolean; position: VaultPosition; price: PriceData; }

export function usePositions() {
  const { data, loading, error } = usePolling<PositionsData>("/api/positions", 15000);
  return { position: data?.position ?? null, price: data?.price ?? null, loading, error };
}
