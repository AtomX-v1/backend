import { ScannerConfig, ScanResult, ArbitrageOpportunity } from './types';
import { DEFAULT_CONFIG } from './config';
import { PriceService } from './priceService';
import { ArbitrageDetector } from './arbitrageDetector';

export class ArbitrageScanner {
  private config: ScannerConfig;
  private isRunning: boolean = false;
  private scanCount: number = 0;
  private lastOpportunities: ArbitrageOpportunity[] = [];

  constructor(config: Partial<ScannerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    while (this.isRunning) {
      try {
        const scanResult = await this.performScan();
        this.displayScanResults(scanResult);

        if (scanResult.opportunities.length > 0) {
          this.lastOpportunities = scanResult.opportunities;
        }

        this.scanCount++;
      } catch (error: any) {
      }

      if (this.isRunning) {
        await new Promise(resolve => setTimeout(resolve, this.config.scanInterval));
      }
    }
  }

  stop(): void {
    this.isRunning = false;
  }

  async performScan(): Promise<ScanResult> {
    const startTime = Date.now();
    const opportunities: ArbitrageOpportunity[] = [];
    const errors: string[] = [];
    let totalScanned = 0;

    for (const pair of this.config.pairs) {
      try {
        totalScanned++;

        const tokenA = PriceService.getTokenInfo(pair.tokenA);
        const tokenB = PriceService.getTokenInfo(pair.tokenB);

        const { forward, reverse } = await PriceService.getPricesForPair(
          tokenA,
          tokenB,
          this.config.testVolume
        );

        const pairOpportunities = ArbitrageDetector.detectOpportunities(
          tokenA,
          tokenB,
          forward,
          reverse,
          this.config
        );

        opportunities.push(...pairOpportunities);
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        errors.push(`${pair.tokenA}/${pair.tokenB}: ${error.message}`);
      }
    }

    const sortedOpportunities = ArbitrageDetector.sortByProfitability(opportunities);
    const filteredOpportunities = ArbitrageDetector.filterOpportunities(
      sortedOpportunities,
      {
        minConfidence: 'LOW',
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

  private displayScanResults(result: ScanResult): void {
    if (result.opportunities.length === 0) return;
    result.opportunities.forEach((opp, index) => {
      this.displayOpportunity(opp, index + 1);
    });
  }

  private displayOpportunity(opportunity: ArbitrageOpportunity, index: number): void {
  }

  getLastOpportunities(): ArbitrageOpportunity[] {
    return this.lastOpportunities.filter(opp =>
      ArbitrageDetector.isOpportunityFresh(opp, 120000)
    );
  }

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

  updateConfig(newConfig: Partial<ScannerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}