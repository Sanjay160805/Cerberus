"use client";
import { PriceData } from "@/lib/types";

export default function PriceChart({ price }: { price: PriceData | null }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
      <h2 className="text-white font-semibold text-lg mb-4">Price Feed</h2>
      {!price ? <p className="text-gray-500 text-sm">Loading price data...</p> : (
        <div className="space-y-4">
          <div>
            <p className="text-gray-400 text-sm">{price.pair}</p>
            <p className="text-white text-3xl font-bold">${price.price.toFixed(6)}</p>
            <p className="text-gray-500 text-xs mt-1">via Supra Oracle · {new Date(price.timestamp).toLocaleTimeString()}</p>
          </div>
          <div className="pt-4 border-t border-gray-800">
            <p className="text-gray-500 text-xs">Price data powers volatility calculations used by the keeper agent to make rebalancing decisions.</p>
          </div>
        </div>
      )}
    </div>
  );
}
