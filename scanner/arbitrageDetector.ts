import { ArbitrageOpportunity, DEXPrice, Token, ScannerConfig } from './types';

export class ArbitrageDetector {
  /**
   * Detect arbitrage opportunities from price data
   */
  static detectOpportunities(
    tokenA: Token,
    tokenB: Token,
    forwardPrices: DEXPrice[],
    reversePrices: DEXPrice[],
    config: ScannerConfig
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    // Filter reliable prices only
    const reliableForward = forwardPrices.filter(p => 
      p.priceImpact <= config.maxPriceImpact && p.price > 0
    );
    const reliableReverse = reversePrices.filter(p => 
      p.priceImpact <= config.maxPriceImpact && p.price > 0
    );

    if (reliableForward.length === 0 || reliableReverse.length === 0) {
      return opportunities;
    }

    // Find best buy and sell prices
    const bestBuyPrice = Math.min(...reliableForward.map(p => p.price));
    const bestSellPrice = Math.max(...reliableReverse.map(p => p.price));

    const buyDEX = reliableForward.find(p => p.price === bestBuyPrice);
    const sellDEX = reliableReverse.find(p => p.price === bestSellPrice);

    if (!buyDEX || !sellDEX) {
      return opportunities;
    }

    // Calculate profit
    const profitPercentage = ((bestSellPrice - bestBuyPrice) / bestBuyPrice) * 100;
    const profitUSD = this.calculateProfitUSD(
      bestBuyPrice,
      bestSellPrice,
      config.testVolume,
      tokenA,
      tokenB
    );

    // Check if opportunity meets thresholds
    if (profitUSD >= config.minProfitUSD && profitPercentage >= config.minProfitPercentage) {
      const opportunity: ArbitrageOpportunity = {
        tokenA,
        tokenB,
        buyDEX: {
          name: buyDEX.dex,
          price: buyDEX.price,
          outputAmount: buyDEX.outputAmount,
          priceImpact: buyDEX.priceImpact,
          route: buyDEX.route
        },
        sellDEX: {
          name: sellDEX.dex,
          price: sellDEX.price,
          outputAmount: sellDEX.outputAmount,
          priceImpact: sellDEX.priceImpact,
          route: sellDEX.route
        },
        profitUSD,
        profitPercentage,
        volume: config.testVolume,
        timestamp: Date.now(),
        confidence: this.calculateConfidence(buyDEX, sellDEX, profitPercentage)
      };

      opportunities.push(opportunity);
    }

    return opportunities;
  }

  /**
   * Calculate profit in USD
   */
  private static calculateProfitUSD(
    buyPrice: number,
    sellPrice: number,
    volumeUSD: number,
    _tokenA: Token,
    _tokenB: Token
  ): number {
    // Simple profit calculation based on price difference
    // In real implementation, you'd want to account for:
    // - Gas fees
    // - Platform fees
    // - Slippage
    // - MEV protection costs
    
    const priceDifference = sellPrice - buyPrice;
    const profitRatio = priceDifference / buyPrice;
    
    return volumeUSD * profitRatio;
  }

  /**
   * Calculate confidence level for the opportunity
   */
  private static calculateConfidence(
    buyDEX: DEXPrice,
    sellDEX: DEXPrice,
    profitPercentage: number
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    let score = 0;

    // Higher profit = higher confidence
    if (profitPercentage > 2.0) score += 3;
    else if (profitPercentage > 1.0) score += 2;
    else if (profitPercentage > 0.5) score += 1;

    // Lower price impact = higher confidence
    if (buyDEX.priceImpact < 0.1 && sellDEX.priceImpact < 0.1) score += 2;
    else if (buyDEX.priceImpact < 0.5 && sellDEX.priceImpact < 0.5) score += 1;

    // Well-known DEXes = higher confidence
    const knownDEXes = ['Orca', 'Raydium', 'Jupiter', 'Meteora', 'Serum'];
    if (knownDEXes.includes(buyDEX.dex) && knownDEXes.includes(sellDEX.dex)) {
      score += 1;
    }

    // Direct routes = higher confidence
    if (buyDEX.route.length === 1 && sellDEX.route.length === 1) {
      score += 1;
    }

    if (score >= 5) return 'HIGH';
    if (score >= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Filter opportunities by various criteria
   */
  static filterOpportunities(
    opportunities: ArbitrageOpportunity[],
    filters: {
      minConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
      maxPriceImpact?: number;
      preferredDEXes?: string[];
      minVolume?: number;
    }
  ): ArbitrageOpportunity[] {
    let filtered = [...opportunities];

    // Filter by confidence
    if (filters.minConfidence) {
      const confidenceOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const minLevel = confidenceOrder[filters.minConfidence];
      
      filtered = filtered.filter(opp => 
        confidenceOrder[opp.confidence] >= minLevel
      );
    }

    // Filter by price impact
    if (filters.maxPriceImpact !== undefined) {
      filtered = filtered.filter(opp => 
        opp.buyDEX.priceImpact <= filters.maxPriceImpact! &&
        opp.sellDEX.priceImpact <= filters.maxPriceImpact!
      );
    }

    // Filter by preferred DEXes
    if (filters.preferredDEXes && filters.preferredDEXes.length > 0) {
      filtered = filtered.filter(opp => 
        filters.preferredDEXes!.includes(opp.buyDEX.name) ||
        filters.preferredDEXes!.includes(opp.sellDEX.name)
      );
    }

    // Filter by minimum volume
    if (filters.minVolume !== undefined) {
      filtered = filtered.filter(opp => opp.volume >= filters.minVolume!);
    }

    return filtered;
  }

  /**
   * Sort opportunities by profitability
   */
  static sortByProfitability(opportunities: ArbitrageOpportunity[]): ArbitrageOpportunity[] {
    return opportunities.sort((a, b) => {
      // Primary sort: by USD profit
      if (b.profitUSD !== a.profitUSD) {
        return b.profitUSD - a.profitUSD;
      }
      
      // Secondary sort: by percentage profit
      if (b.profitPercentage !== a.profitPercentage) {
        return b.profitPercentage - a.profitPercentage;
      }
      
      // Tertiary sort: by confidence
      const confidenceOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });
  }

  /**
   * Validate if an opportunity is still actionable
   */
  static isOpportunityFresh(
    opportunity: ArbitrageOpportunity,
    maxAgeMs: number = 60000 // 1 minute default
  ): boolean {
    return (Date.now() - opportunity.timestamp) <= maxAgeMs;
  }
}