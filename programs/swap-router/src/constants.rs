use anchor_lang::prelude::*;

/// Maximum fee rate in basis points (10% = 1000 bps)
pub const MAX_FEE_RATE: u16 = 1000;

/// Default fee rate in basis points (0.3% = 30 bps)
pub const DEFAULT_FEE_RATE: u16 = 30;

/// Maximum slippage tolerance in basis points (50% = 5000 bps)
pub const MAX_SLIPPAGE: u16 = 5000;

/// Minimum swap amount (1 lamport)
pub const MIN_SWAP_AMOUNT: u64 = 1;

/// DEX program IDs
pub mod dex_programs {
    use anchor_lang::prelude::*;
    
    /// Raydium Router Program
    pub const RAYDIUM_ROUTER: Pubkey = pubkey!("DRaybByLpbUL57LJARs3j8BitTxVfzBg351EaMr5UTCd");
    
    /// Raydium Stable Router Program
    pub const RAYDIUM_ROUTER_STABLE: Pubkey = pubkey!("DRayDdXc1NZQ9C3hRWmoSf8zK4iapgMnjdNZWrfwsP8m");
    
    /// Orca Whirlpools Program  
    pub const ORCA_WHIRLPOOLS: Pubkey = pubkey!("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc");
    
    /// Meteora Dynamic Liquidity Market Maker
    pub const METEORA_DLMM: Pubkey = pubkey!("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");
    
    /// Meteora Stable AMM Program
    pub const METEORA_STABLE: Pubkey = pubkey!("Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB");
    
    /// Jupiter Aggregator Program
    pub const JUPITER_V6: Pubkey = pubkey!("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");
}