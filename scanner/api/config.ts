import { ScannerConfig } from './types';

export const PROGRAM_IDS = {
  VAULT: 'EggEs5AbpAp4rMWc8XmHCr8PwgFSmh7fFSH5Hjay9mgW',
  SWAP_ROUTER: 'EggEs5AbpAp4rMWc8XmHCr8PwgFSmh7fFSH5Hjay9mgW',
  JUPITER_V6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
};

export const FEES = {
  SOLANA_TX_FEE: 0.000005,
  PLATFORM_FEE_BPS: 10,
  EXECUTOR_FEE_BPS: 1000,
  JUPITER_FEE_BPS: 4,
};

export const DEFAULT_CONFIG: ScannerConfig = {
  pairs: [
    // Major stablecoin pairs
    { tokenA: 'So11111111111111111111111111111111111111112', tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // SOL/USDC
    { tokenA: 'So11111111111111111111111111111111111111112', tokenB: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' }, // SOL/USDT
    { tokenA: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', tokenB: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' }, // USDC/USDT
    
    // DeFi tokens vs USDC
    { tokenA: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // mSOL/USDC
    { tokenA: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // JTO/USDC
    { tokenA: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // JUP/USDC
    { tokenA: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // RAY/USDC
    { tokenA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // ORCA/USDC
    
    // Meme tokens
    { tokenA: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // BONK/USDC
    
    // Cross-token arbitrage opportunities
    { tokenA: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', tokenB: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' }, // JUP/RAY
    { tokenA: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', tokenB: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE' }, // JUP/ORCA
    { tokenA: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', tokenB: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE' }, // RAY/ORCA
  ],

  minProfitUSD: 5.0,
  minProfitPercentage: 0.5,
  testVolume: 100,
  scanInterval: 30000,

  priorityDEXes: [
    'Orca',
    'Raydium',
    'Jupiter',
    'Meteora',
    'Lifinity',
    'Serum',
    'Saber'
  ],

  maxPriceImpact: 1.0,
  maxSlippage: 0.5,
};

// Token metadata for common tokens
export const TOKEN_REGISTRY: Record<string, any> = {
  'So11111111111111111111111111111111111111112': {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
  },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
  },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png'
  },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': {
    symbol: 'mSOL',
    name: 'Marinade Staked SOL',
    decimals: 9,
  },
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': {
    symbol: 'JTO',
    name: 'Jito',
    decimals: 9,
  },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': {
    symbol: 'BONK',
    name: 'Bonk',
    decimals: 5,
  },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': {
    symbol: 'JUP',
    name: 'Jupiter',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN/logo.png'
  },
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': {
    symbol: 'RAY',
    name: 'Raydium',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png'
  },
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': {
    symbol: 'ORCA',
    name: 'Orca',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png'
  }
};