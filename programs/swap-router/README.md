# AtomX Swap Router

A comprehensive Solana program for routing swaps across multiple DEXs including Raydium, Orca, and Meteora.

## Features

- **Multi-DEX Integration**: Supports Raydium AMM, Orca Whirlpools, Meteora Stable, and Meteora DLMM
- **Route Optimization**: Finds the best swap routes across different DEXs
- **Fee Management**: Configurable fee structure with basis points precision
- **Slippage Protection**: Built-in slippage tolerance and validation
- **Volume Tracking**: Tracks total volume processed through the router
- **CPI Integration**: Designed to work with vault programs via Cross-Program Invocation

## Program Structure

```
swap-router/
├── src/
│   ├── lib.rs              # Program entry point
│   ├── router.rs           # Main router logic and instructions
│   ├── constants.rs        # DEX program IDs and constants
│   ├── utils.rs            # Helper functions and calculations
│   └── errors.rs           # Custom error definitions
├── Cargo.toml              # Dependencies and build configuration
└── Xargo.toml              # Solana program build configuration
```

## Supported DEXs

### Raydium
- **Program ID**: `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8`
- **Type**: Automated Market Maker (AMM)
- **Features**: High liquidity, low slippage for major pairs

### Orca Whirlpools
- **Program ID**: `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc`
- **Type**: Concentrated Liquidity DEX
- **Features**: Capital efficient, customizable fee tiers

### Meteora Stable
- **Program ID**: `Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB`
- **Type**: Stable asset AMM
- **Features**: Low slippage for stable pairs (USDC/USDT)

### Meteora DLMM
- **Program ID**: `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`
- **Type**: Dynamic Liquidity Market Maker
- **Features**: Zero slippage, dynamic fee adjustment

## Instructions

### 1. Initialize Router
```rust
pub fn initialize_router(
    ctx: Context<InitializeRouter>,
    fee_rate: u16, // basis points (100 = 1%)
) -> Result<()>
```

Initializes the router state with a configurable fee rate.

### 2. Execute Swaps
```rust
pub fn execute_swaps(
    ctx: Context<ExecuteSwaps>,
    swaps: Vec<SwapInstruction>,
) -> Result<()>
```

Executes a series of swaps across different DEXs.

### 3. Get Best Route
```rust
pub fn get_best_route(
    ctx: Context<GetBestRoute>,
    token_in: Pubkey,
    token_out: Pubkey,
    amount_in: u64,
) -> Result<RouteInfo>
```

Returns the optimal route for a given token pair and amount.

## Data Structures

### RouterState
```rust
pub struct RouterState {
    pub authority: Pubkey,    // Router authority
    pub fee_rate: u16,        // Fee in basis points
    pub total_volume: u64,    // Total processed volume
    pub bump: u8,             // PDA bump seed
}
```

### SwapInstruction
```rust
pub struct SwapInstruction {
    pub dex_type: DexType,           // Which DEX to use
    pub pool_address: Pubkey,        // Pool account address
    pub token_in: Pubkey,            // Input token mint
    pub token_out: Pubkey,           // Output token mint
    pub amount_in: u64,              // Input amount
    pub minimum_amount_out: u64,     // Minimum output (slippage protection)
}
```

### DexType
```rust
pub enum DexType {
    Orca,           // Orca Whirlpools
    Raydium,        // Raydium AMM
    MeteoraStable,  // Meteora Stable AMM
    MeteoraVault,   // Meteora DLMM
}
```

## Usage Examples

### TypeScript Integration
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SwapRouter } from "./types/swap_router";

// Initialize the program
const program = anchor.workspace.SwapRouter as Program<SwapRouter>;

// Initialize router
const [routerStatePda] = await PublicKey.findProgramAddress(
  [Buffer.from("router_state")],
  program.programId
);

await program.methods
  .initializeRouter(30) // 0.3% fee
  .accounts({
    routerState: routerStatePda,
    authority: authority,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Execute swap
const swapInstruction = {
  dexType: { raydium: {} },
  poolAddress: poolPublicKey,
  tokenIn: tokenAMint,
  tokenOut: tokenBMint,
  amountIn: new BN(1000000), // 1 token (6 decimals)
  minimumAmountOut: new BN(950000), // 5% slippage tolerance
};

await program.methods
  .executeSwaps([swapInstruction])
  .accounts({
    routerState: routerStatePda,
    userTokenIn: userTokenAccountA,
    userTokenOut: userTokenAccountB,
    poolTokenIn: poolTokenAccountA,
    poolTokenOut: poolTokenAccountB,
    poolAccount: poolAddress,
    dexProgram: raydiumProgramId,
    authority: authority,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Building and Testing

### Prerequisites
- Rust 1.70+
- Solana CLI 1.18+
- Anchor CLI 0.32+
- Node.js 18+

### Build
```bash
anchor build
```

### Test
```bash
anchor test
```

### Deploy
```bash
# Run setup script
./scripts/setup.sh

# Or manually deploy
anchor deploy --provider.cluster devnet
```

## Security Considerations

1. **Fee Validation**: Maximum fee rate is limited to 10% (1000 basis points)
2. **Slippage Protection**: All swaps include minimum output amount validation
3. **Program Verification**: DEX program IDs are validated before CPI calls
4. **Math Safety**: All calculations use checked arithmetic to prevent overflows
5. **Access Control**: Router state modifications require proper authority

## Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 6000 | InvalidDexProgram | Provided DEX program ID doesn't match expected |
| 6001 | SwapFailed | Swap execution failed |
| 6002 | InsufficientOutputAmount | Output amount below minimum threshold |
| 6003 | PoolNotFound | Specified pool doesn't exist |
| 6004 | InvalidTokenPair | Token pair not supported |
| 6005 | SlippageExceeded | Swap exceeded slippage tolerance |
| 6006 | Unauthorized | Caller lacks required authority |
| 6007 | InvalidFeeRate | Fee rate exceeds maximum allowed |
| 6008 | MathOverflow | Arithmetic operation overflowed |

## Integration with Vault Program

The swap router is designed to work seamlessly with vault programs through CPI:

```rust
// In vault program
use swap_router::cpi::accounts::ExecuteSwaps;
use swap_router::cpi::execute_swaps;

let cpi_accounts = ExecuteSwaps {
    router_state: ctx.accounts.router_state.to_account_info(),
    user_token_in: ctx.accounts.user_token_in.to_account_info(),
    // ... other accounts
};

let cpi_program = ctx.accounts.swap_router_program.to_account_info();
let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

execute_swaps(cpi_ctx, swap_instructions)?;
```

## License

MIT License - see LICENSE file for details.