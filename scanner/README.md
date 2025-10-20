# AtomX Arbitrage Scanner

A real-time arbitrage opportunity scanner for Solana DEXes using Jupiter API for price discovery and routing.

## Features

- 🔍 **Real-time Scanning**: Continuously monitors token pairs for arbitrage opportunities
- 🪐 **Jupiter Integration**: Uses Jupiter API for accurate cross-DEX price discovery
- 📊 **Multi-DEX Support**: Scans across Orca, Raydium, Meteora, Serum, and other major DEXes
- 💰 **Profit Calculation**: Calculates potential profit in USD and percentage
- 🎯 **Confidence Scoring**: Rates opportunities based on price impact, route complexity, and DEX reliability
- ⚙️ **Configurable**: Customizable thresholds, scan intervals, and token pairs
- 📈 **Live Display**: Real-time console output with formatted opportunity details

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Ensure your `.env` file is configured (already done from previous tests):
```env
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=/Users/alex/.config/solana/phantom-wallet.json
```

### 3. Run the Scanner
```bash
# Direct execution
npx ts-node scanner/index.ts

# Or using npm script (add to package.json)
npm run scanner
```

## Configuration

### Default Settings
- **Scan Interval**: 45 seconds
- **Min Profit**: $2 USD (0.3%)
- **Test Volume**: $200 USD equivalent
- **Max Price Impact**: 1.0%
- **Token Pairs**: SOL/USDC, SOL/USDT, USDC/USDT, mSOL/USDC

### Custom Configuration
```typescript
import { ArbitrageScanner } from './scanner';

const scanner = new ArbitrageScanner({
  scanInterval: 30000,     // 30 seconds
  minProfitUSD: 5.0,       // $5 minimum
  minProfitPercentage: 1.0, // 1% minimum
  testVolume: 500,         // $500 test volume
  maxPriceImpact: 0.5,     // 0.5% max impact
  
  pairs: [
    { tokenA: 'SOL_MINT', tokenB: 'USDC_MINT' },
    // Add more pairs...
  ]
});

await scanner.start();
```

## Output Example

```
🔍 Scan #42 - 2:34:56 PM
📊 Scan completed in 2847ms (4 pairs)

🎯 Found 2 arbitrage opportunities:
════════════════════════════════════════════════════════════════════════════════

1. 🟡 SOL/USDC Arbitrage
   💰 Profit: $3.47 (0.87%)
   📉 Buy:  0.000024 on Orca (0.12% impact)
   📈 Sell: 0.000025 on Raydium (0.08% impact)
   🛣️  Buy Route:  Orca
   🛣️  Sell Route: Raydium
   ⏰ Found: 2:34:56 PM

2. 🟢 USDC/USDT Arbitrage
   💰 Profit: $8.23 (4.12%)
   📉 Buy:  0.998456 on Meteora (0.03% impact)
   📈 Sell: 1.002567 on Serum (0.05% impact)
   🛣️  Buy Route:  Meteora
   🛣️  Sell Route: Serum
   ⏰ Found: 2:34:56 PM
```

## Architecture

### Core Components

1. **Scanner** (`scanner.ts`): Main orchestrator that runs scan cycles
2. **PriceService** (`priceService.ts`): Fetches prices via Jupiter API
3. **ArbitrageDetector** (`arbitrageDetector.ts`): Detects and validates opportunities
4. **Configuration** (`config.ts`): Token registry and default settings
5. **Types** (`types.ts`): TypeScript interfaces and types

### Data Flow

```
Scanner → PriceService → Jupiter API → ArbitrageDetector → Console Output
   ↓                        ↓                    ↓
Config ←→ Token Pairs ←→ Price Quotes ←→ Opportunities
```

## Token Support

### Supported Tokens
- **SOL**: Native Solana token
- **USDC**: USD Coin
- **USDT**: Tether USD
- **mSOL**: Marinade Staked SOL
- **JTO**: Jito token
- **BONK**: Bonk memecoin

### Adding New Tokens
1. Add token metadata to `TOKEN_REGISTRY` in `config.ts`
2. Add trading pairs to scanner configuration
3. Ensure sufficient liquidity exists on monitored DEXes

## Integration for Frontend

### REST API Integration
```typescript
// Get current opportunities
const opportunities = scanner.getLastOpportunities();

// Get scanner stats
const stats = scanner.getStats();
```

### WebSocket Integration (Future)
```typescript
// Real-time opportunity updates
scanner.on('opportunity', (opportunity) => {
  // Send to frontend via WebSocket
  websocket.send(JSON.stringify({
    type: 'arbitrage_opportunity',
    data: opportunity
  }));
});
```

## Risk Considerations

⚠️ **Important**: This scanner is for informational purposes only. Actual arbitrage execution involves:

- **Gas Fees**: Solana transaction costs
- **MEV Protection**: Front-running risks
- **Slippage**: Price movement during execution
- **Liquidity**: Available volume at quoted prices
- **Timing**: Opportunity window duration
- **Capital**: Required funds for profitable execution

## Development

### File Structure
```
scanner/
├── index.ts              # Main entry point and CLI
├── scanner.ts            # Core scanning logic
├── priceService.ts       # Jupiter API integration
├── arbitrageDetector.ts  # Opportunity detection
├── config.ts             # Configuration and token registry
├── types.ts              # TypeScript definitions
└── README.md             # This file
```

### Adding Features

1. **New DEX Support**: Extend Jupiter integration
2. **Risk Scoring**: Enhanced confidence calculation
3. **Historical Data**: Track opportunity patterns
4. **Alerts**: Discord/Telegram notifications
5. **Backtesting**: Historical opportunity analysis

### Testing
```bash
# Test individual components
npx ts-node -e "
import { PriceService } from './scanner/priceService';
// Test price fetching...
"
```

## Commands Summary

```bash
# Run scanner
npx ts-node scanner/index.ts

# Stop scanner
Ctrl+C (SIGINT)

# Configuration
Edit scanner/config.ts

# Add to package.json scripts
"scanner": "ts-node scanner/index.ts"
```