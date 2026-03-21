export interface OraclePriceFeed {
  pair: string;
  price: number;
  decimals: number;
  timestamp: number;
  round: number;
}

export interface PriceHistory {
  pair: string;
  prices: { price: number; timestamp: number }[];
}
