use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid DEX program provided")]
    InvalidDexProgram = 6000,
    
    #[msg("Swap failed during execution")]
    SwapFailed,
    
    #[msg("Insufficient output amount")]
    InsufficientOutputAmount,
    
    #[msg("Pool not found")]
    PoolNotFound,
    
    #[msg("Invalid token pair")]
    InvalidTokenPair,
    
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("Invalid fee rate - must be <= 1000 basis points")]
    InvalidFeeRate,
    
    #[msg("Math overflow occurred")]
    MathOverflow,
    
    #[msg("Invalid swap amount - must be > 0")]
    InvalidSwapAmount,
    
    #[msg("Pool reserves too low")]
    InsufficientLiquidity,
    
    #[msg("Invalid route - no path found")]
    InvalidRoute,
    
    #[msg("Router not initialized")]
    RouterNotInitialized,
    
    #[msg("Pool mismatch")]
    PoolMismatch,
    
    #[msg("Token mint mismatch")]
    TokenMintMismatch,
}