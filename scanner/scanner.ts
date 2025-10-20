import { ScannerConfig, ScanResult, ArbitrageOpportunity } from './types';
import { DEFAULT_CONFIG } from './config';
import { PriceService } from './priceService';
import { ArbitrageDetector } from './arbitrageDetector';
import { MockPriceService } from './mockService';

export class ArbitrageScanner {
  private config: ScannerConfig;
  private isRunning: boolean = false;
  private scanCount: number = 0;
  private lastOpportunities: ArbitrageOpportunity[] = [];
  private demoMode: boolean = false;
  private consecutiveFailures: number = 0;

  constructor(config: Partial<ScannerConfig> = {}, demoMode: boolean = false) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.demoMode = demoMode;
  }

  /**
   * Start continuous scanning
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(' Scanner is already running');
      return;
    }

    this.isRunning = true;
    console.log(' Starting AtomX Arbitrage Scanner...');
    if (this.demoMode) {
      console.log(' DEMO MODE: Using mock data (Jupiter API not accessible)');
    }
    console.log(` Monitoring ${this.config.pairs.length} pairs`);
    console.log(` Scan interval: ${this.config.scanInterval / 1000}s`);
    console.log(` Min profit: $${this.config.minProfitUSD} (${this.config.minProfitPercentage}%)`);
    console.log(` Test volume: $${this.config.testVolume}`);
    console.log('─'.repeat(80));

    while (this.isRunning) {
      try {
        const scanResult = await this.performScan();
        this.displayScanResults(scanResult);
        
        if (scanResult.opportunities.length > 0) {
          this.lastOpportunities = scanResult.opportunities;
        }
        
        this.scanCount++;
      } catch (error: any) {
          console.error(' Error during scan:', error.message);
      }

      // Wait for next scan
      if (this.isRunning) {
        await new Promise(resolve => setTimeout(resolve, this.config.scanInterval));
      }
    }
  }

  /**
   * Stop scanning
   */
  stop(): void {
    this.isRunning = false;
    console.log(' Scanner stopped');
  }

  /**
   * Perform a single scan cycle
   */
  async performScan(): Promise<ScanResult> {
    const startTime = Date.now();
    const opportunities: ArbitrageOpportunity[] = [];
    const errors: string[] = [];
    let totalScanned = 0;

    console.log(`\n Scan #${this.scanCount + 1} - ${new Date().toLocaleTimeString()}`);

    for (const pair of this.config.pairs) {
      try {
        totalScanned++;
        
        const tokenA = PriceService.getTokenInfo(pair.tokenA);
        const tokenB = PriceService.getTokenInfo(pair.tokenB);

        console.log(`   Scanning ${tokenA.symbol}/${tokenB.symbol}...`);

        // Get prices - use mock service if in demo mode or after consecutive failures
        let forward, reverse;
        
        if (this.demoMode || this.consecutiveFailures >= 3) {
          if (this.consecutiveFailures >= 3 && !this.demoMode) {
            console.log(' Switching to demo mode due to consecutive API failures');
            this.demoMode = true;
          }
          
          // Use mock service
          ({ forward, reverse } = await MockPriceService.getMockPricesForPair(
            tokenA,
            tokenB,
            this.config.testVolume
          ));
          
          // Occasionally generate interesting opportunities for demo
          if (Math.random() < 0.3) { // 30% chance
            ({ forward, reverse } = MockPriceService.generateMockOpportunity(tokenA, tokenB));
          }
        } else {
          // Try real Jupiter API
          try {
            ({ forward, reverse } = await PriceService.getPricesForPair(
              tokenA,
              tokenB,
              this.config.testVolume
            ));
            
            // Reset failure counter on success
            this.consecutiveFailures = 0;
          } catch (error) {
            this.consecutiveFailures++;
            console.warn(` API failure ${this.consecutiveFailures}/3, will switch to demo mode if continues`);
            
            // Use mock as fallback
            ({ forward, reverse } = await MockPriceService.getMockPricesForPair(
              tokenA,
              tokenB,
              this.config.testVolume
            ));
          }
        }

        // Detect arbitrage opportunities
        const pairOpportunities = ArbitrageDetector.detectOpportunities(
          tokenA,
          tokenB,
          forward,
          reverse,
          this.config
        );

        opportunities.push(...pairOpportunities);

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        errors.push(`${pair.tokenA}/${pair.tokenB}: ${error.message}`);
        console.error(`    Error scanning pair: ${error.message}`);
      }
    }

    // Sort opportunities by profitability
    const sortedOpportunities = ArbitrageDetector.sortByProfitability(opportunities);

    // Filter by configuration
    const filteredOpportunities = ArbitrageDetector.filterOpportunities(
      sortedOpportunities,
      {
        minConfidence: 'LOW', // Include all for display, but mark confidence
        maxPriceImpact: this.config.maxPriceImpact,
        preferredDEXes: this.config.priorityDEXes
      }
    );

    const scanDuration = Date.now() - startTime;

    return {
      timestamp: Date.now(),
      opportunities: filteredOpportunities,
      totalScanned,
      scanDuration,
      errors
    };
  }

  /**
   * Display scan results
   */
  private displayScanResults(result: ScanResult): void {
    const { opportunities, totalScanned, scanDuration, errors } = result;

    console.log(` Scan completed in ${scanDuration}ms (${totalScanned} pairs)`);

    if (errors.length > 0) {
      console.log(` ${errors.length} errors occurred`);
    }

    if (opportunities.length === 0) {
      console.log('No profitable arbitrage opportunities found');
      return;
    }

    console.log(`\n Found ${opportunities.length} arbitrage opportunities:`);
    console.log('═'.repeat(80));

    opportunities.forEach((opp, index) => {
      this.displayOpportunity(opp, index + 1);
    });

    console.log('═'.repeat(80));
  }

  /**
   * Display a single opportunity
   */
  private displayOpportunity(opportunity: ArbitrageOpportunity, index: number): void {
    const { tokenA, tokenB, buyDEX, sellDEX, profitUSD, profitPercentage, confidence } = opportunity;

    const confidenceEmoji = {
      HIGH: 'HIGH',
      MEDIUM: 'MEDIUM',
      LOW: 'LOW'
    }[confidence];

    console.log(`\n${index}. ${confidenceEmoji} ${tokenA.symbol}/${tokenB.symbol} Arbitrage`);
    console.log(`    Profit: $${profitUSD.toFixed(2)} (${profitPercentage.toFixed(2)}%)`);
    console.log(`    Buy:  ${buyDEX.price.toFixed(6)} on ${buyDEX.name} (${buyDEX.priceImpact.toFixed(2)}% impact)`);
    console.log(`    Sell: ${sellDEX.price.toFixed(6)} on ${sellDEX.name} (${sellDEX.priceImpact.toFixed(2)}% impact)`);
    console.log(`    Buy Route:  ${buyDEX.route.join(' → ')}`);
    console.log(`    Sell Route: ${sellDEX.route.join(' → ')}`);
    console.log(`    Found: ${new Date(opportunity.timestamp).toLocaleTimeString()}`);
  }

  /**
   * Get current opportunities
   */
  getLastOpportunities(): ArbitrageOpportunity[] {
    return this.lastOpportunities.filter(opp => 
      ArbitrageDetector.isOpportunityFresh(opp, 120000) // 2 minutes
    );
  }

  /**
   * Get scanner statistics
   */
  getStats(): any {
    return {
      scanCount: this.scanCount,
      isRunning: this.isRunning,
      lastScanTime: this.lastOpportunities.length > 0 ? 
        Math.max(...this.lastOpportunities.map(o => o.timestamp)) : null,
      totalOpportunities: this.lastOpportunities.length,
      config: this.config
    };
  }

  /**
   * Update scanner configuration
   */
  updateConfig(newConfig: Partial<ScannerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(' Scanner configuration updated');
  }
}