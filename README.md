# AtomX Backend

Solana arbitrage protocol with Cross Program Invocation swap routing + vault system.

## Architecture

### Program Structure

```
AtomX-backend/
├── programs/
│   ├── swap-router/    # Jupiter V6 aggregator routing with CPI
│   └── vault/          # Liquidity vault with autonomous arbitrage
├── scanner/            # Real-time arbitrage opportunity detection
│   └── api/           # Express.js WebSocket server
└── tests/             # Anchor test suite
```

### Core Programs

#### 1. Swap Router (`AgcU7r6U5uPEfFccmhYdMLcjckADdfoJ8QcHCgkG74Zg`)

Cross-program invocation wrapper for Jupiter V6 aggregator enabling programmatic swap execution from vaults.

**Key Instructions:**
- `initialize_router`: Deploys router PDA with configurable fee structure (max 10% / 1000 bps)
- `execute_jupiter_swap`: Standard user swap via Jupiter with router fee collection
- `execute_vault_jupiter_swap`: Vault-authorized swaps using PDA signing for arbitrage execution

**Technical Implementation:**
```rust
pub fn execute_vault_jupiter_swap(
    ctx: Context<ExecuteVaultJupiterSwap>,
    jupiter_instruction_data: Vec<u8>,
    vault_seeds: Vec<Vec<u8>>,
) -> Result<()>
```

- Dynamic remaining accounts: All Jupiter swap accounts passed through CPI boundary
- PDA signing: Vault seeds enable programmatic authority transfer
- Zero-copy instruction forwarding: Raw Jupiter instruction data passed without modification

#### 2. Vault (`2ea7vwH3ziuFKC2DBwp81MjQpkTTbf4nhNefedcKREDy`)

Autonomous liquidity management with profit arbitrage execution.

**Key Instructions:**
- `initialize_vault`: Deploy vault PDA linked to swap router
- `deposit`: Proportional share-based deposits with overflow protection
- `withdraw`: Burn shares for proportional vault holdings
- `execute_arbitrage`: Atomic arbitrage with minimum profit enforcement and executor incentives

**Arbitrage Mechanics:**
```rust
pub fn execute_arbitrage<'info>(
    ctx: Context<'_, '_, '_, 'info, ExecuteArbitrage<'info>>,
    jupiter_instruction_data: Vec<u8>,
    min_profit: u64,
) -> Result<()>
```

- Pre-swap balance snapshot: `initial_balance = vault_token.amount`
- CPI to swap router: `execute_vault_jupiter_swap()` with vault PDA signer
- Post-swap validation: `require!(final_balance > initial_balance + min_profit)`
- Executor incentive: 10% of profit distributed to transaction initiator
- Atomic reversion: Transaction fails if profit < min_profit

### Scanner API

Live arbitrage detection engine deployed on Heroku.

**Deployment:**
- Production: `https://atomx-scanner-a6f0bb793aa4.herokuapp.com`
- Stack: Node.js 18.x, TypeScript, Express.js, ws (WebSocket)

**Architecture:**
```
scanner/api/
├── server.ts              # Express + WebSocket server
├── scanner.ts             # Core scanning loop
├── arbitrageDetector.ts   # Opportunity validation
├── priceService.ts        # Jupiter Price API integration
├── logStreamer.ts         # Console → WebSocket streaming
└── src/services/
    └── jupiterService.ts  # Jupiter Ultra API client
```

**Scanning Flow:**
1. Price fetch: Jupiter Price API v3 for token valuations
2. Quote generation: Jupiter Ultra API orderbook queries (forward + reverse)
3. Profit calculation: Spread analysis with fee deduction
4. Opportunity filtering: Minimum profit threshold + price impact validation
5. WebSocket broadcast: Live opportunity streaming to frontend

**Rate Limiting:**
- 500ms delay between quote requests
- 300ms delay between price requests
- 2000ms delay between token pair scans
- 60s scan interval (3 pairs: SOL/USDC, SOL/USDT, USDC/USDT)

**API Endpoints:**
```
POST   /api/scanner/start              # Initialize scanner loop
POST   /api/scanner/stop               # Terminate scanner
GET    /api/scanner/status             # Scanner state + metrics
GET    /api/scanner/opportunities      # Current arbitrage opportunities
POST   /api/scanner/scan               # Manual single scan
GET    /api/scanner/logs/status        # Log streaming state
WS     /ws/scanner                     # Real-time log + opportunity stream
```

### Development

#### Prerequisites
```bash
rustc 1.70+
solana-cli 1.18+
anchor-cli 0.32.1
node 18.x
yarn
```

#### Build Programs
```bash
anchor build
```

Program artifacts written to `target/deploy/`:
- `swap_router.so` - Router bytecode
- `vault.so` - Vault bytecode

#### Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet
```

Updates program IDs in `Anchor.toml` `[programs.devnet]` section.

#### Run Tests
```bash
anchor test
```

Test suite (`tests/` directory):
- `router.test.ts`: Swap router initialization + Jupiter integration
- `vault.test.ts`: Full arbitrage flow with profit validation
- `vault-simple.test.ts`: Basic vault operations

Timeout: 1000000ms (configured for devnet RPC latency)

#### Local Scanner Development
```bash
cd scanner
npm install
npm run dev
```

Server starts on `PORT=3002` with WebSocket on `/ws/scanner`.

#### Deploy Scanner to Heroku
```bash
cd AtomX-backend
git subtree push --prefix scanner heroku main
```

Procfile: `web: cd api && node -r ts-node/register server.ts`

### Program Interactions

#### Vault → Router → Jupiter CPI Chain

```
User Transaction
    ↓
Vault::execute_arbitrage()
    ↓ CPI
SwapRouter::execute_vault_jupiter_swap()
    ↓ invoke_signed()
Jupiter V6 Swap Instruction
    ↓
Token Program (SPL)
```

**PDA Signing Flow:**
1. Vault constructs seeds: `["vault", vault_bump]`
2. Router receives seeds via `vault_seeds` parameter
3. Router calls `invoke_signed()` with seed slices
4. Solana runtime validates PDA derivation
5. Jupiter receives transaction signed by vault PDA

#### Token Flow for Arbitrage

```
Vault WSOL ATA (initial)
    ↓ Jupiter Swap #1
Vault TokenX ATA (intermediate)
    ↓ Jupiter Swap #2
Vault WSOL ATA (final > initial)
    ↓ Transfer (10% of profit)
Executor WSOL ATA
```

All swaps atomic within single transaction. Reversion if `final_balance <= initial_balance + min_profit`.

### Configuration

#### Network: Devnet
- RPC: `https://api.devnet.solana.com`
- Cluster: `devnet` (Anchor.toml)
- Commitment: `confirmed`

#### Program IDs
- Swap Router: `AgcU7r6U5uPEfFccmhYdMLcjckADdfoJ8QcHCgkG74Zg`
- Vault: `2ea7vwH3ziuFKC2DBwp81MjQpkTTbf4nhNefedcKREDy`
- Jupiter V6: `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`

#### Scanner Config (`scanner/api/config.ts`)
```typescript
export const DEFAULT_CONFIG: ScannerConfig = {
  pairs: [
    { tokenA: 'So111...', tokenB: 'EPjFW...' },  // SOL/USDC
    { tokenA: 'So111...', tokenB: 'Es9vM...' },  // SOL/USDT
    { tokenA: 'EPjFW...', tokenB: 'Es9vM...' },  // USDC/USDT
  ],
  minProfitUSD: 5.0,
  minProfitPercentage: 0.5,
  testVolume: 100,
  scanInterval: 60000,
  maxPriceImpact: 1.0,
  maxSlippage: 0.5,
}
```

### API Integration

#### Jupiter Ultra API

**Quote Endpoint:**
```typescript
GET https://lite-api.jup.ag/ultra/v1/order
  ?inputMint=So11111...
  &outputMint=EPjFWdd...
  &amount=549434589
```

Returns optimal route across all Solana DEXs (Orca, Raydium, Meteora, etc).

**Price Endpoint:**
```typescript
GET https://lite-api.jup.ag/price/v3
  ?ids=So11111...,EPjFWdd...
```

Returns USD prices with 24h change data.

### Dependencies

#### Rust Programs
```toml
anchor-lang = "0.32.1"
anchor-spl = "0.32.1"
solana-program = "1.18"
```

#### Scanner
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "ws": "^8.14.2",
    "@solana/web3.js": "^1.98.4",
    "@solana/spl-token": "^0.4.14",
    "@coral-xyz/anchor": "^0.32.1",
    "axios": "^1.12.2",
    "ts-node": "^10.9.1",
    "typescript": "^5.1.6"
  }
}
```

### Data

#### Scanner Logs
```bash
heroku logs --tail --app atomx-scanner
```

Log categories:
- `[PRICE]`: Token price fetching
- `[ROUTE]`: Jupiter quote generation
- `[SCAN]`: Opportunity detection
- `[WS]`: WebSocket client connections

#### Program Logs
```bash
solana logs --url devnet AgcU7r6U5uPEfFccmhYdMLcjckADdfoJ8QcHCgkG74Zg
solana logs --url devnet 2ea7vwH3ziuFKC2DBwp81MjQpkTTbf4nhNefedcKREDy
```

### Performance

#### Scanner Metrics
- Scan latency: ~8-12s per full scan (3 pairs × 2 directions × 2 API calls)
- WebSocket clients: 100+ concurrent connections supported
- API throughput: Rate limited by Jupiter API (429 handling with exponential backoff)

#### On-Chain Performance
- Router gas: ~10k-50k compute units (depends on Jupiter route complexity)
- Vault arbitrage: ~100k-200k compute units (includes CPI overhead)
- Confirmation: 400-800ms (devnet, varies by congestion)

### Roadmap 

- Multi-hop arbitrage: Extended route validation (A→B→C→A)
- Flash loan integration: Leveraged arbitrage without capital lockup
- MEV protection: Bundle submission via Jito
- Analytics dashboard: Historical opportunity tracking
- Mainnet deployment: Production-ready risk management
