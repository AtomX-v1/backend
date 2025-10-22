export interface Token {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface DEXPrice {
  dex: string;
  price: number;
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  route: string[];
  timestamp: number;
}

export interface ArbitrageOpportunity {
  tokenA: Token;
  tokenB: Token;
  buyDEX: {
    name: string;
    price: number;
    outputAmount: string;
    priceImpact: number;
    route: string[];
  };
  sellDEX: {
    name: string;
    price: number;
    outputAmount: string;
    priceImpact: number;
    route: string[];
  };
  profitUSD: number;
  profitPercentage: number;
  volume: number;
  timestamp: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ScannerConfig {
  // Token pairs to monitor
  pairs: Array<{
    tokenA: string;
    tokenB: string;
  }>;
  
  // Minimum profit thresholds
  minProfitUSD: number;
  minProfitPercentage: number;
  
  // Volume settings
  testVolume: number; // Amount to use for price discovery
  
  // Timing
  scanInterval: number; // milliseconds
  
  // DEX preferences
  priorityDEXes: string[];
  
  // Risk management
  maxPriceImpact: number;
  maxSlippage: number;
}

export interface ScanResult {
  timestamp: number;
  opportunities: ArbitrageOpportunity[];
  totalScanned: number;
  scanDuration: number;
  errors: string[];
}