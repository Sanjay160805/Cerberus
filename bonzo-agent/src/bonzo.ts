import { ethers } from "ethers";
import {
  HEDERA_RPC_URL, HEDERA_PRIVATE_KEY, HEDERA_EVM_ADDRESS,
  BONZO_LENDING_POOL, USDC_TOKEN_ADDRESS, VAULT_UNDERLYING_TOKEN,
  SAUCERSWAP_ROUTER_ADDRESS,
} from "./config";

import { logger } from "./logger";

const LENDING_POOL_ABI = [
  "function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external",
  "function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf) external returns (uint256)",
  "function withdraw(address asset, uint256 amount, address to) external returns (uint256)",
  "function getUserAccountData(address user) external view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
];

const SAUCERSWAP_ROUTER_ABI = [
  "function swapExactHBARForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external payable returns (uint256[] memory amounts)",
  "function swapExactTokensForHBAR(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)",
];


const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

function getProvider() {
  return new ethers.JsonRpcProvider(HEDERA_RPC_URL);
}

function getSigner() {
  return new ethers.Wallet(
    HEDERA_PRIVATE_KEY.startsWith("0x") ? HEDERA_PRIVATE_KEY : `0x${HEDERA_PRIVATE_KEY}`,
    getProvider()
  );
}

export interface VaultPosition {
  totalCollateral: bigint;
  totalDebt:       bigint;
  healthFactor:    bigint;
  availableBorrow: bigint;
  collateralFormatted: string;
  debtFormatted:       string;
  hfFormatted:         string;
}

export async function getVaultPosition(): Promise<VaultPosition> {
  const provider = getProvider();
  const pool     = new ethers.Contract(BONZO_LENDING_POOL, LENDING_POOL_ABI, provider);
  const data     = await pool.getUserAccountData(HEDERA_EVM_ADDRESS);

  const hf = data.healthFactor;
  const hfFormatted = hf > 10n**25n ? "∞" : (Number(hf) / 1e18).toFixed(2);

  return {
    totalCollateral: data.totalCollateralETH,
    totalDebt:       data.totalDebtETH,
    healthFactor:    hf,
    availableBorrow: data.availableBorrowsETH,
    collateralFormatted: ethers.formatEther(data.totalCollateralETH),
    debtFormatted:       ethers.formatEther(data.totalDebtETH),
    hfFormatted,
  };
}

export async function getUnderlyingBalance(): Promise<bigint> {
  const token = new ethers.Contract(VAULT_UNDERLYING_TOKEN, ERC20_ABI, getProvider());
  return token.balanceOf(HEDERA_EVM_ADDRESS);
}

export async function depositToVault(amount: bigint): Promise<ethers.TransactionReceipt> {
  const signer  = getSigner();
  
  logger.info(`[Bonzo] Initiating Supply flow for ${ethers.formatEther(amount)} HBAR...`);
  
  // 1. Swap HBAR -> USDC via SaucerSwap V2
  const router = new ethers.Contract(SAUCERSWAP_ROUTER_ADDRESS, SAUCERSWAP_ROUTER_ABI, signer);
  const path = [VAULT_UNDERLYING_TOKEN, USDC_TOKEN_ADDRESS]; // [WHBAR, USDC]
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600); // 10 mins

  logger.info(`[SaucerSwap] Swapping HBAR for USDC (Path: ${path.join(" -> ")}) ...`);
  
  const swapTx = await router.swapExactHBARForTokens(
    0n, // Slip protection omitted for testnet simplicity
    path,
    HEDERA_EVM_ADDRESS,
    deadline,
    { value: amount, gasLimit: 1_000_000 }
  );
  await swapTx.wait();
  
  // 2. Get the received USDC balance
  const usdc = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, signer);
  const usdcBalance: bigint = await usdc.balanceOf(HEDERA_EVM_ADDRESS);
  logger.info(`[SaucerSwap] Received ${ethers.formatUnits(usdcBalance, 6)} USDC.`);

  // 3. Approve LendingPool for USDC
  logger.info(`[Bonzo] Approving LendingPool for ${ethers.formatUnits(usdcBalance, 6)} USDC...`);
  const approveTx = await usdc.approve(BONZO_LENDING_POOL, usdcBalance);
  await approveTx.wait();

  // 4. Supply USDC to Bonzo
  const pool = new ethers.Contract(BONZO_LENDING_POOL, LENDING_POOL_ABI, signer);
  logger.info(`[Bonzo] Supplying USDC to LendingPool...`);
  const tx = await pool.deposit(USDC_TOKEN_ADDRESS, usdcBalance, HEDERA_EVM_ADDRESS, 0, { gasLimit: 1_000_000 });
  return tx.wait();
}


export async function withdrawFromVault(amount: bigint): Promise<ethers.TransactionReceipt> {
  const signer = getSigner();
  const pool   = new ethers.Contract(BONZO_LENDING_POOL, LENDING_POOL_ABI, signer);
  
  logger.info(`[Bonzo] Withdrawing USDC from lending pool...`);
  // Withdraw the asset (USDC) to user address
  const tx = await pool.withdraw(USDC_TOKEN_ADDRESS, amount, HEDERA_EVM_ADDRESS, { gasLimit: 1_000_000 });
  return tx.wait();
}


/**
 * Borrow asset from Bonzo
 * @param asset Token address
 * @param amount Amount in smallest units
 * @param rateMode 1 = stable, 2 = variable
 */
export async function borrowFromBonzo(asset: string, amount: bigint, rateMode: number = 2): Promise<ethers.TransactionReceipt> {
  const signer = getSigner();
  const pool   = new ethers.Contract(BONZO_LENDING_POOL, LENDING_POOL_ABI, signer);
  
  logger.info(`[Bonzo] Borrowing ${amount.toString()} of ${asset} (rateMode: ${rateMode})...`);
  const tx = await pool.borrow(asset, amount, rateMode, 0, HEDERA_EVM_ADDRESS);
  return tx.wait();
}

/**
 * Repay debt to Bonzo
 */
export async function repayToBonzo(asset: string, amount: bigint, rateMode: number = 2): Promise<ethers.TransactionReceipt> {
  const signer = getSigner();
  const pool   = new ethers.Contract(BONZO_LENDING_POOL, LENDING_POOL_ABI, signer);
  const token  = new ethers.Contract(asset, ERC20_ABI, signer);
  
  logger.info(`[Bonzo] Approving ${amount.toString()} for repayment...`);
  const approveTx = await token.approve(BONZO_LENDING_POOL, amount);
  await approveTx.wait();
  
  logger.info(`[Bonzo] Repaying ${amount.toString()} of ${asset}...`);
  const tx = await pool.repay(asset, amount, rateMode, HEDERA_EVM_ADDRESS, { gasLimit: 1_000_000 });
  return tx.wait();
}

/**
 * Swap USDC back to HBAR
 */
export async function swapUSDCToHBAR(amount: bigint): Promise<ethers.TransactionReceipt> {
  const signer = getSigner();
  const router = new ethers.Contract(SAUCERSWAP_ROUTER_ADDRESS, SAUCERSWAP_ROUTER_ABI, signer);
  const usdc   = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, signer);
  
  logger.info(`[SaucerSwap] Approving router for ${ethers.formatUnits(amount, 6)} USDC...`);
  const approveTx = await usdc.approve(SAUCERSWAP_ROUTER_ADDRESS, amount);
  await approveTx.wait();

  const path = [USDC_TOKEN_ADDRESS, VAULT_UNDERLYING_TOKEN]; // [USDC, WHBAR]
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

  logger.info(`[SaucerSwap] Swapping USDC → HBAR ...`);
  const tx = await router.swapExactTokensForHBAR(
    amount,
    0n,
    path,
    HEDERA_EVM_ADDRESS,
    deadline,
    { gasLimit: 1_000_000 }
  );
  return tx.wait();
}


// Keep these for backward compatibility if needed, but they are now wrappers
export async function redeemAllShares(): Promise<ethers.TransactionReceipt> {
  const pos = await getVaultPosition();
  if (pos.totalCollateral === 0n) throw new Error("No collateral to withdraw");
  return withdrawFromVault(pos.totalCollateral);
}

export async function redeemPercent(percent: number): Promise<ethers.TransactionReceipt> {
  const pos = await getVaultPosition();
  const amount = (pos.totalCollateral * BigInt(percent)) / 100n;
  return withdrawFromVault(amount);
}
