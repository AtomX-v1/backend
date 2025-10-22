import { DEXPrice, Token } from './types';

/**
 * Mock service for testing when Jupiter API is not accessible
 */
export class MockPriceService {
  /**
   * Generate mock prices for testing the scanner logic
   */
  static async getMockPricesForPair(
    tokenA: Token,
    tokenB: Token,
    testVolumeUSD: number
  ): Promise<{ forward: DEXPrice[], reverse: DEXPrice[] }> {
    
    console.log(`Using mock prices for ${tokenA.symbol}/${tokenB.symbol} (Demo Mode)`);
    
    // Base price with some randomness
    const basePrice = this.getBasePrice(tokenA.symbol, tokenB.symbol);
    
    // Generate prices for different DEXes with slight variations
    const forward: DEXPrice[] = [
      this.createMockPrice('Orca', basePrice * (0.995 + Math.random() * 0.01), tokenA, tokenB),
      this.createMockPrice('Raydium', basePrice * (0.996 + Math.random() * 0.008), tokenA, tokenB),
      this.createMockPrice('Meteora', basePrice * (0.994 + Math.random() * 0.012), tokenA, tokenB),
    ];
    
    const reverse: DEXPrice[] = [
      this.createMockPrice('Orca', 1 / (basePrice * (1.002 + Math.random() * 0.006)), tokenA, tokenB),
      this.createMockPrice('Raydium', 1 / (basePrice * (1.001 + Math.random() * 0.008)), tokenA, tokenB),
      this.createMockPrice('Serum', 1 / (basePrice * (1.003 + Math.random() * 0.004)), tokenA, tokenB),
    ];
    
    return { forward, reverse };
  }
  
  /**
   * Get realistic base prices for common pairs
   */
  private static getBasePrice(symbolA: string, symbolB: string): number {
    const pair = `${symbolA}/${symbolB}`;
    
    // Realistic base prices (approximate)
    const basePrices: Record<string, number> = {
      'SOL/USDC': 0.000024,    // ~1 SOL = 42 USDC  
      'SOL/USDT': 0.000024,
      'USDC/USDT': 0.9999,     // ~1:1 stablecoin pair
      'mSOL/USDC': 0.000022,   // mSOL slightly less than SOL
      'JTO/USDC': 0.0003,      // Example price
      'BONK/USDC': 0.00000002, // Small cap token
    };
    
    return basePrices[pair] || 0.001; // Default fallback
  }
  
  /**
   * Create a mock price entry
   */
  private static createMockPrice(
    dex: string, 
    price: number, 
    tokenA: Token, 
    tokenB: Token
  ): DEXPrice {
    const inputAmount = 1000000; // 1M base units
    const outputAmount = Math.floor(inputAmount * price);
    
    return {
      dex,
      price,
      inputAmount: inputAmount.toString(),
      outputAmount: outputAmount.toString(),
      priceImpact: Math.random() * 0.5, // 0-0.5% impact
      route: [dex], // Simple single-hop route
      timestamp: Date.now()
    };
  }
  
  /**
   * Generate realistic arbitrage opportunities for demo
   */
  static generateMockOpportunity(tokenA: Token, tokenB: Token): { forward: DEXPrice[], reverse: DEXPrice[] } {
    const basePrice = this.getBasePrice(tokenA.symbol, tokenB.symbol);
    
    // Create a profitable arbitrage scenario
    const forward: DEXPrice[] = [
      this.createMockPrice('Orca', basePrice * 0.998, tokenA, tokenB),     // Lower price = good for buying
      this.createMockPrice('Raydium', basePrice * 1.002, tokenA, tokenB),  // Higher price = good for selling
    ];
    
    const reverse: DEXPrice[] = [
      this.createMockPrice('Orca', 1 / (basePrice * 1.003), tokenA, tokenB),
      this.createMockPrice('Raydium', 1 / (basePrice * 0.997), tokenA, tokenB),
    ];
    
    return { forward, reverse };
  }
}