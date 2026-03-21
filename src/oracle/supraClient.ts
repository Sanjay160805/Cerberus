import { ethers } from 'ethers';

// Supra Push Oracle — Hedera Testnet
// Source: https://docs.supra.com/oracles/data-feeds/push-oracle/networks
const SUPRA_PUSH_ADDRESS = process.env.SUPRA_ORACLE_ADDRESS || '0x6Cd59830AAD978446e6cc7f6cc173aF7656Fb917';
const HEDERA_TESTNET_RPC = process.env.BONZO_RPC_URL || 'https://testnet.hashio.io/api';

// HBAR_USDT pair index on Supra (verify at docs.supra.com/oracles/data-feeds/data-feeds-index)
const HBAR_USDT_PAIR_INDEX = 800;

// Supra ISupraSValueFeed interface — Push model ABI
const SUPRA_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: '_pairIndex', type: 'uint256' }],
    name: 'getSvalue',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'round', type: 'uint256' },
          { internalType: 'uint256', name: 'decimals', type: 'uint256' },
          { internalType: 'uint256', name: 'time', type: 'uint256' },
          { internalType: 'uint256', name: 'price', type: 'uint256' },
        ],
        internalType: 'struct ISupraSValueFeed.priceFeed',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

export interface PriceData {
  price: number;
  decimals: number;
  timestamp: number;
  round: number;
  source: 'supra' | 'rest_api' | 'mock';
}

export async function getHBARPrice(): Promise<PriceData> {
  // Try 1: Push oracle via EVM call
  try {
    const provider = new ethers.JsonRpcProvider(HEDERA_TESTNET_RPC);
    const oracle = new ethers.Contract(SUPRA_PUSH_ADDRESS, SUPRA_ABI, provider);
    
    const feed = await oracle.getSvalue(HBAR_USDT_PAIR_INDEX);
    const decimals = Number(feed.decimals);
    const rawPrice = Number(feed.price);
    const price = rawPrice / Math.pow(10, decimals);

    console.log(`[SupraOracle] HBAR price from push oracle: $${price}`);
    return {
      price,
      decimals,
      timestamp: Number(feed.time),
      round: Number(feed.round),
      source: 'supra',
    };
  } catch (err) {
    console.warn('[SupraOracle] Push oracle call failed, trying REST API:', err);
  }

  // Try 2: Supra REST API (no contract needed, pure HTTP)
  try {
    const res = await fetch(
      'https://prod-dora-data.supra.com/oracle/v1/getPairPrice?pairIndex=800',
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      // REST response: { pairIndex, price, decimals, timestamp, round }
      const decimals = data.decimals ?? 8;
      const price = Number(data.price) / Math.pow(10, decimals);
      console.log(`[SupraOracle] HBAR price from REST API: $${price}`);
      return {
        price,
        decimals,
        timestamp: data.timestamp ?? Date.now(),
        round: data.round ?? 0,
        source: 'rest_api',
      };
    }
  } catch (err) {
    console.warn('[SupraOracle] REST API failed, using mock:', err);
  }

  // Try 3: Fallback — CoinGecko free tier (no key needed)
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd'
    );
    if (res.ok) {
      const data = await res.json();
      const price = data['hedera-hashgraph']?.usd ?? 0.085;
      console.log(`[SupraOracle] HBAR price from CoinGecko fallback: $${price}`);
      return { price, decimals: 8, timestamp: Date.now(), round: 0, source: 'mock' };
    }
  } catch {
    // fall through to hardcoded mock
  }

  // Final fallback: hardcoded mock
  console.warn('[SupraOracle] All sources failed, using mock $0.085');
  return { price: 0.085, decimals: 8, timestamp: Date.now(), round: 0, source: 'mock' };
}