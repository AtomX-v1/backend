import { JupiterService, JupiterQuote } from '../src/services/jupiterService';
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
      
      // Get quote from USDC to target token
      const usdcAmount = usdAmount * 1_000_000; // 6 decimals for USDC
      const quote = await JupiterService.getQuote(
        USDC_MINT,
        tokenMint,
        usdcAmount,
        50 // 0.5% slippage
      );
      
      return parseInt(quote.outAmount);
    } catch (error) {
      console.warn(`  Could not get token amount for ${tokenMint}, using default`);
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

      console.log(` Getting prices for ${tokenA.symbol}/${tokenB.symbol}`);
      console.log(`   Test volume: $${testVolumeUSD} (~${amountA} ${tokenA.symbol}, ~${amountB} ${tokenB.symbol})`);

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
        console.warn(`  Could not get forward quote for ${tokenA.symbol} -> ${tokenB.symbol}`);
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
        console.warn(`  Could not get reverse quote for ${tokenB.symbol} -> ${tokenA.symbol}`);
      }

      return { forward, reverse };
    } catch (error: any) {
      console.error(` Error getting prices for ${tokenA.symbol}/${tokenB.symbol}:`, error.message);
      return { forward: [], reverse: [] };
    }
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