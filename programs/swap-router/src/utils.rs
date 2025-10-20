use anchor_lang::prelude::*;
use crate::errors::ErrorCode;

/// Calculate fee amount based on input amount and fee rate
pub fn calculate_fee(amount: u64, fee_rate: u16) -> Result<u64> {
    amount
        .checked_mul(fee_rate as u64)
        .and_then(|result| result.checked_div(10000))
        .ok_or(ErrorCode::MathOverflow.into())
}

/// Calculate net amount after fee deduction
pub fn calculate_net_amount(amount: u64, fee_rate: u16) -> Result<u64> {
    let fee_amount = calculate_fee(amount, fee_rate)?;
    amount
        .checked_sub(fee_amount)
        .ok_or(ErrorCode::MathOverflow.into())
}

/// Validate slippage tolerance
pub fn validate_slippage(
    expected_amount: u64,
    actual_amount: u64,
    slippage_tolerance: u16,
) -> Result<()> {
    let min_amount = expected_amount
        .checked_mul((10000_u64).checked_sub(slippage_tolerance as u64).unwrap())
        .and_then(|result| result.checked_div(10000))
        .ok_or(ErrorCode::MathOverflow)?;

    require!(
        actual_amount >= min_amount,
        ErrorCode::SlippageExceeded
    );

    Ok(())
}

/// Calculate price impact
pub fn calculate_price_impact(
    amount_in: u64,
    amount_out: u64,
    pool_balance_in: u64,
    pool_balance_out: u64,
) -> Result<u16> {
    // Simplified price impact calculation
    // Price impact = (amount_in / pool_balance_in) * 10000 (in basis points)
    
    if pool_balance_in == 0 {
        return Ok(0);
    }
    
    let impact = amount_in
        .checked_mul(10000)
        .and_then(|result| result.checked_div(pool_balance_in))
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Cap at 100% (10000 basis points)
    Ok(std::cmp::min(impact as u16, 10000))
}

/// Validate DEX program
pub fn validate_dex_program(program_id: &Pubkey, expected_program: &Pubkey) -> Result<()> {
    require!(
        program_id == expected_program,
        ErrorCode::InvalidDexProgram
    );
    Ok(())
}