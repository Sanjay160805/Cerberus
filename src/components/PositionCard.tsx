"use client";
import { VaultPosition } from "@/lib/types";

function Row({ label, value, highlight, green }: { label: string; value: string; highlight?: boolean; green?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className={`font-medium ${highlight ? "text-red-400" : green ? "text-green-400" : "text-white"}`}>{value}</span>
    </div>
  );
}

export default function PositionCard({ position, loading }: { position: VaultPosition | null; loading?: boolean }) {
  if (loading) return <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 animate-pulse"><div className="h-4 bg-gray-700 rounded w-1/3 mb-4" /><div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-3 bg-gray-800 rounded w-full" />)}</div></div>;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
      <h2 className="text-white font-semibold text-lg mb-4">Bonzo Vault Position</h2>
      {!position ? <p className="text-gray-500 text-sm">No position data available</p> : (
        <div className="space-y-3">
          <Row label="Asset" value={position.asset} />
          <Row label="Deposited" value={`${position.deposited} HBAR`} />
          <Row label="Borrowed" value={`${position.borrowed} HBAR`} />
          <Row label="Health Factor" value={position.healthFactor} highlight={position.healthFactor !== "∞" && parseFloat(position.healthFactor) < 1.5} />
          <Row label="APY" value={position.apy} green />
          <Row label="Pending Rewards" value={position.rewards} />
        </div>
      )}
    </div>
  );
}
