export interface ReserveData {
  availableLiquidity: bigint;
  totalStableDebt: bigint;
  totalVariableDebt: bigint;
  liquidityRate: bigint;
  variableBorrowRate: bigint;
  stableBorrowRate: bigint;
  utilizationRate: bigint;
}

export interface UserAccountData {
  totalCollateralETH: bigint;
  totalDebtETH: bigint;
  availableBorrowsETH: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
}

export interface KeeperAction {
  type: "HARVEST" | "REBALANCE" | "PROTECT" | "TIGHTEN" | "WIDEN" | "HOLD" | "BORROW" | "REPAY";
  reason: string;
  params?: Record<string, unknown>;
}
