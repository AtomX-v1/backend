use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient profit from arbitrage")]
    InsufficientProfit,
    #[msg("Insufficient shares to withdraw")]
    InsufficientShares,
    #[msg("Invalid swap router program")]
    InvalidSwapRouter,
    #[msg("Math overflow occurred")]
    MathOverflow,
    #[msg("Invalid vault authority")]
    InvalidAuthority,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Invalid token mint - only SOL/WSOL supported")]
    InvalidTokenMint,
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
    #[msg("Invalid minimum profit requirement")]
    InvalidMinProfit,
}
