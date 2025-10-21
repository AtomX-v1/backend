import { JupiterService, JupiterQuote } from './src/services/jupiterService';
import { DEXPrice, Token } from './types';
import { TOKEN_REGISTRY } from './config';

export class PriceService {
  /**
   * Convert USD amount to token amount based on current price
   */
  private static async getTokenAmountForUSD(
    tokenMint: string, 
    usdAmount: number
  ): Promise<number> {
    try {
      // Use USDC as reference for USD value
      const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      
      if (tokenMint === USDC_MINT) {
        return usdAmount * 1_000_000; // 6 decimals
      }
      
      // Get token price using Jupiter Price API
      const priceData = await JupiterService.getPrices([tokenMint]);
      const tokenPrice = priceData[tokenMint];
      
      if (tokenPrice && tokenPrice.usdPrice > 0) {
        const tokenAmount = usdAmount / tokenPrice.usdPrice;
        return Math.floor(tokenAmount * Math.pow(10, tokenPrice.decimals));
      }
      
      throw new Error(`No price data for ${tokenMint}`);
    } catch (error) {
      console.warn(`[PRICE] Could not get token amount for ${tokenMint.slice(0, 8)}..., using default`);
      // Fallback: assume token is worth $1 and use appropriate decimals
      const tokenInfo = TOKEN_REGISTRY[tokenMint];
      const decimals = tokenInfo?.decimals || 9;
      return usdAmount * Math.pow(10, decimals);
    }
  }

  /**
   * Get prices for a token pair on different DEXes via Jupiter routing
   */
  static async getPricesForPair(
    tokenA: Token,
    tokenB: Token,
    testVolumeUSD: number
  ): Promise<{ forward: DEXPrice[], reverse: DEXPrice[] }> {
    try {
      // Calculate token amounts for the test volume
      const amountA = await this.getTokenAmountForUSD(tokenA.mint, testVolumeUSD);
      const amountB = await this.getTokenAmountForUSD(tokenB.mint, testVolumeUSD);

      console.log(`\n[SCAN] =================================`);
      console.log(`[SCAN] Scanning ${tokenA.symbol}/${tokenB.symbol} pair`);
      console.log(`[SCAN] Test volume: $${testVolumeUSD}`);
      console.log(`[SCAN] Token amounts: ${amountA.toLocaleString()} ${tokenA.symbol}, ${amountB.toLocaleString()} ${tokenB.symbol}`);

      const forward: DEXPrice[] = [];
      const reverse: DEXPrice[] = [];

      // Get forward direction: A -> B
      try {
        const forwardQuote = await JupiterService.getQuote(
          tokenA.mint,
          tokenB.mint,
          amountA,
          50
        );
        
        const forwardPrice = this.calculatePrice(
          amountA,
          parseInt(forwardQuote.outAmount),
          tokenA.decimals,
          tokenB.decimals
        );

        forward.push({
          dex: this.extractDEXFromRoute(forwardQuote.routePlan),
          price: forwardPrice,
          inputAmount: forwardQuote.inAmount,
          outputAmount: forwardQuote.outAmount,
          priceImpact: parseFloat(forwardQuote.priceImpactPct),
          route: forwardQuote.routePlan.map(r => r.swapInfo.label),
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn(`[SCAN] Could not get forward quote for ${tokenA.symbol} -> ${tokenB.symbol}`);
      }

      // Get reverse direction: B -> A
      try {
        const reverseQuote = await JupiterService.getQuote(
          tokenB.mint,
          tokenA.mint,
          amountB,
          50
        );
        
        const reversePrice = this.calculatePrice(
          amountB,
          parseInt(reverseQuote.outAmount),
          tokenB.decimals,
          tokenA.decimals
        );

        reverse.push({
          dex: this.extractDEXFromRoute(reverseQuote.routePlan),
          price: 1 / reversePrice, // Invert to get A/B price
          inputAmount: reverseQuote.inAmount,
          outputAmount: reverseQuote.outAmount,
          priceImpact: parseFloat(reverseQuote.priceImpactPct),
          route: reverseQuote.routePlan.map(r => r.swapInfo.label),
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn(`[SCAN] Could not get reverse quote for ${tokenB.symbol} -> ${tokenA.symbol}`);
      }

      // Log price summary
      this.logPriceSummary(tokenA, tokenB, forward, reverse, testVolumeUSD);
      
      return { forward, reverse };
    } catch (error: any) {
      console.error(`[SCAN] Error getting prices for ${tokenA.symbol}/${tokenB.symbol}:`, error.message);
      return { forward: [], reverse: [] };
    }
  }

  /**
   * Log price summary for a trading pair
   */
  private static logPriceSummary(
    tokenA: Token,
    tokenB: Token,
    forward: DEXPrice[],
    reverse: DEXPrice[],
    testVolumeUSD: number
  ): void {
    console.log(`[SCAN] ----- PRICE SUMMARY -----`);
    
    if (forward.length > 0) {
      const forwardPrice = forward[0];
      console.log(`[SCAN] ${tokenA.symbol} -> ${tokenB.symbol}:`);
      console.log(`[SCAN]   Price: ${forwardPrice.price.toFixed(8)} ${tokenB.symbol} per ${tokenA.symbol}`);
      console.log(`[SCAN]   Impact: ${forwardPrice.priceImpact.toFixed(4)}%`);
      console.log(`[SCAN]   DEX: ${forwardPrice.dex}`);
      console.log(`[SCAN]   Route: ${forwardPrice.route.join(' -> ')}`);
    } else {
      console.log(`[SCAN] ${tokenA.symbol} -> ${tokenB.symbol}: NO ROUTE FOUND`);
    }
    
    if (reverse.length > 0) {
      const reversePrice = reverse[0];
      console.log(`[SCAN] ${tokenB.symbol} -> ${tokenA.symbol}:`);
      console.log(`[SCAN]   Price: ${reversePrice.price.toFixed(8)} ${tokenA.symbol} per ${tokenB.symbol}`);
      console.log(`[SCAN]   Impact: ${reversePrice.priceImpact.toFixed(4)}%`);
      console.log(`[SCAN]   DEX: ${reversePrice.dex}`);
      console.log(`[SCAN]   Route: ${reversePrice.route.join(' -> ')}`);
    } else {
      console.log(`[SCAN] ${tokenB.symbol} -> ${tokenA.symbol}: NO ROUTE FOUND`);
    }
    
    // Calculate potential arbitrage
    if (forward.length > 0 && reverse.length > 0) {
      const forwardRate = forward[0].price;
      const reverseRate = 1 / reverse[0].price;
      const priceDiff = Math.abs(forwardRate - reverseRate);
      const avgPrice = (forwardRate + reverseRate) / 2;
      const spreadPercent = (priceDiff / avgPrice) * 100;
      
      console.log(`[SCAN] ARBITRAGE OPPORTUNITY:`);
      console.log(`[SCAN]   Price Spread: ${spreadPercent.toFixed(4)}%`);
      console.log(`[SCAN]   Forward Rate: ${forwardRate.toFixed(8)}`);
      console.log(`[SCAN]   Reverse Rate: ${reverseRate.toFixed(8)}`);
      
      if (spreadPercent > 0.1) {
        console.log(`[SCAN]   *** PROFITABLE OPPORTUNITY DETECTED ***`);
      }
    }
    
    console.log(`[SCAN] =================================\n`);
  }

  /**
   * Calculate price from quote amounts
   */
  private static calculatePrice(
    inputAmount: number,
    outputAmount: number,
    inputDecimals: number,
    outputDecimals: number
  ): number {
    const inputDecimalAdjusted = inputAmount / Math.pow(10, inputDecimals);
    const outputDecimalAdjusted = outputAmount / Math.pow(10, outputDecimals);
    
    return outputDecimalAdjusted / inputDecimalAdjusted;
  }

  /**
   * Extract primary DEX from route plan
   */
  private static extractDEXFromRoute(routePlan: any[]): string {
    if (routePlan.length === 0) return 'Unknown';
    
    // For multi-hop routes, use the first DEX or concatenate
    if (routePlan.length === 1) {
      return routePlan[0].swapInfo.label;
    }
    
    // For complex routes, show primary DEX
    const dexes = routePlan.map(r => r.swapInfo.label);
    const uniqueDexes = [...new Set(dexes)];
    
    if (uniqueDexes.length === 1) {
      return uniqueDexes[0];
    }
    
    return `${uniqueDexes[0]}+${uniqueDexes.length - 1}more`;
  }

  /**
   * Get token metadata
   */
  static getTokenInfo(mint: string): Token {
    const tokenInfo = TOKEN_REGISTRY[mint];
    
    if (tokenInfo) {
      return {
        mint,
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        decimals: tokenInfo.decimals,
        logoURI: tokenInfo.logoURI
      };
    }
    
    // Fallback for unknown tokens
    return {
      mint,
      symbol: `TOKEN_${mint.slice(0, 4)}`,
      name: `Unknown Token ${mint.slice(0, 8)}...`,
      decimals: 9
    };
  }

  /**
   * Validate if a price quote is reliable
   */
  static isPriceReliable(price: DEXPrice, maxPriceImpact: number): boolean {
    return price.priceImpact <= maxPriceImpact && price.price > 0;
  }
}