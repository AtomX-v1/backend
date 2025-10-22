# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AtomX is a Solana-based DeFi platform with a comprehensive architecture:
- **Swap Router**: Routes swaps across multiple DEXs (Raydium, Orca, Meteora) using Jupiter integration
- **Vault**: Manages liquidity and integrates with the swap router via CPI for automated arbitrage
- **Arbitrage Scanner**: Real-time opportunity detection system using Jupiter API for cross-DEX price discovery

The project combines Rust-based Solana programs with TypeScript/Node.js services, testing infrastructure, and automated trading tools.

## Architecture

### Core Programs
- `programs/swap-router/`: Multi-DEX swap routing with fee management and slippage protection
- `programs/vault/`: Liquidity management and vault operations with CPI-based arbitrage execution
- `src/`: TypeScript integration layer with Express.js API and Jupiter DEX service
- `scanner/`: Real-time arbitrage opportunity detection and monitoring system

### Key Integration Points
- Router-Vault CPI communication for automated liquidity operations
- Jupiter API integration for routing, price discovery, and opportunity scanning
- Express.js API layer for frontend/client communication
- Real-time arbitrage scanner for opportunity detection and profit analysis

## Development Commands

### Build & Deploy
```bash
# Build all Anchor programs
anchor build

# Deploy to devnet
anchor deploy

# Full setup (installs deps, builds, deploys, initializes)
./scripts/setup.sh

# Deploy and initialize router specifically
node scripts/deploy-router.js
```

### Testing
```bash
# Run all tests
anchor test

# Run specific test files
yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/router.test.ts"
yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/vault-simple.test.ts"
```

### Arbitrage Scanner
```bash
# Run the real-time arbitrage scanner
npm run scanner

# Test scanner module loading
npm run test:scanner
```

### Code Quality
```bash
# Format code
npm run lint:fix

# Check formatting
npm run lint
```

## Project Configuration

### Anchor Configuration
- Uses Anchor 0.32.1 with Yarn package manager
- Programs deployed to both localnet and devnet
- Default cluster: devnet
- Test timeout: 1000000ms for complex DeFi operations

### Network Setup
- Solana devnet cluster by default
- Phantom wallet configuration in `~/.config/solana/phantom-wallet.json`
- Minimum 1 SOL balance required for operations

## Key Files & Patterns

### Program Structure
Each Solana program follows the standard Anchor structure:
- `lib.rs`: Program entry point and module declarations
- `router.rs`/`vault.rs`: Main instruction handlers and business logic
- `errors.rs`: Custom error definitions
- `utils.rs`: Helper functions and calculations

### DEX Integration
The router supports 4 DEX types with specific program IDs:
- Raydium AMM: `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8`
- Orca Whirlpools: `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc`
- Meteora Stable: `Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB`
- Meteora DLMM: `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`

### TypeScript Integration
- Express.js server with CORS support
- Jupiter DEX service integration for routing
- Anchor client setup for program interaction
- Mocha/Chai testing framework with TypeScript support

## Development Workflow

1. **Initial Setup**: Run `./scripts/setup.sh` for complete environment setup
2. **Program Development**: Modify Rust programs in `programs/` directory
3. **Build & Test**: Use `anchor build` and `anchor test` for Rust programs
4. **API Development**: Modify TypeScript services in `src/` directory
5. **Integration Testing**: Test end-to-end flows with the test suite

## Dependencies & Prerequisites

- Rust 1.70+
- Solana CLI 1.18+
- Anchor CLI 0.32+
- Node.js 18+
- Yarn package manager