const { ethers } = require("ethers");
const { BONZO_LENDING_POOL, USDC_TOKEN_ADDRESS, BONZO_RPC_URL } = require("./src/lib/constants");

const LENDING_POOL_ABI = [
  "function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 variableBorrowIndex, uint128 currentLiquidityRate, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint8 id))"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(BONZO_RPC_URL);
  const pool = new ethers.Contract(BONZO_LENDING_POOL, LENDING_POOL_ABI, provider);
  
  console.log("Querying reserve data for USDC:", USDC_TOKEN_ADDRESS);
  const data = await pool.getReserveData(USDC_TOKEN_ADDRESS);
  console.log("aUSDC Address:", data.aTokenAddress);
}

main().catch(console.error);
