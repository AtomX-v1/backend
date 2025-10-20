import { ScannerConfig } from './types';

export const DEFAULT_CONFIG: ScannerConfig = {
  // Popular trading pairs for arbitrage
  pairs: [
    // SOL pairs
    { tokenA: 'So11111111111111111111111111111111111111112', tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // SOL/USDC
    { tokenA: 'So11111111111111111111111111111111111111112', tokenB: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' }, // SOL/USDT
    
    // USDC pairs  
    { tokenA: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', tokenB: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' }, // USDC/USDT
    
    // Popular altcoins vs stables
    { tokenA: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // mSOL/USDC
    { tokenA: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // JTO/USDC
    { tokenA: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // BONK/USDC
  ],
  
  // Profit thresholds
  minProfitUSD: 5.0,        // Minimum $5 profit
  minProfitPercentage: 0.5, // Minimum 0.5% profit
  
  // Test with $100 equivalent for price discovery
  testVolume: 100,
  
  // Scan every 30 seconds
  scanInterval: 30000,
  
  // Prioritize liquid DEXes
  priorityDEXes: [
    'Orca',
    'Raydium',
    'Jupiter',
    'Meteora',
    'Lifinity',
    'Serum',
    'Saber'
  ],
  
  // Risk management
  maxPriceImpact: 1.0,  // Max 1% price impact
  maxSlippage: 0.5,     // Max 0.5% slippage
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
  }
};