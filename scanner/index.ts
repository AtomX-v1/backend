#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
dotenv.config();

import { ArbitrageScanner } from './scanner';
import { ScannerConfig } from './types';

// CLI interface for the scanner
async function main() {
  console.log(' AtomX Arbitrage Scanner');
  console.log('━'.repeat(50));
  
  // Check for demo mode flag
  const demoMode = process.argv.includes('--demo') || process.argv.includes('-d');
  
  if (demoMode) {
    console.log('Starting in DEMO MODE (using mock data)');
  } else {
    console.log(' Starting in LIVE MODE (using Jupiter API)');
    console.log(' Use --demo flag to run with mock data if API is unavailable');
  }

  // Custom configuration (can be modified)
  const customConfig: Partial<ScannerConfig> = {
    // Scan every 45 seconds instead of default 30
    scanInterval: 45000,
    
    // Lower minimum profit for testing
    minProfitUSD: 2.0,
    minProfitPercentage: 0.3,
    
    // Increase test volume for better price discovery
    testVolume: 200,
    
    // Focus on major pairs for better liquidity
    pairs: [
      // High volume pairs
      { tokenA: 'So11111111111111111111111111111111111111112', tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // SOL/USDC
      { tokenA: 'So11111111111111111111111111111111111111112', tokenB: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' }, // SOL/USDT
      { tokenA: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', tokenB: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' }, // USDC/USDT
      
      // Additional popular pairs
      { tokenA: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // mSOL/USDC
    ]
  };

  const scanner = new ArbitrageScanner(customConfig, demoMode);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n Received SIGINT, shutting down gracefully...');
    scanner.stop();
    
    // Show final stats
    const stats = scanner.getStats();
    console.log('\n Final Statistics:');
    console.log(`   Total scans: ${stats.scanCount}`);
    console.log(`   Last opportunities: ${stats.totalOpportunities}`);
    
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n Received SIGTERM, shutting down gracefully...');
    scanner.stop();
    process.exit(0);
  });

  // Start scanning
  try {
    await scanner.start();
  } catch (error: any) {
    console.error(' Scanner crashed:', error.message);
    process.exit(1);
  }
}

// Export for programmatic use
export { ArbitrageScanner } from './scanner';
export { ArbitrageDetector } from './arbitrageDetector';
export { PriceService } from './priceService';
export * from './types';
export * from './config';

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(' Fatal error:', error);
    process.exit(1);
  });
}