use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("8EqQZDrpuXAtWLpbv6q8PfCLF7hAJqvAKfgLs3Yoihy2");

// DEX program IDs
pub mod dex_programs {
    use anchor_lang::prelude::*;
    
    // Raydium Router Program
    pub const RAYDIUM_ROUTER: Pubkey = pubkey!("DRaybByLpbUL57LJARs3j8BitTxVfzBg351EaMr5UTCd");
    
    // Raydium Stable Router Program  
    pub const RAYDIUM_ROUTER_STABLE: Pubkey = pubkey!("DRayDdXc1NZQ9C3hRWmoSf8zK4iapgMnjdNZWrfwsP8m");
    
    // Orca Whirlpools Program
    pub const ORCA_WHIRLPOOLS: Pubkey = pubkey!("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc");
    
    // Meteora Dynamic Liquidity Market Maker (DLMM) Program
    pub const METEORA_DLMM: Pubkey = pubkey!("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");
    
    // Meteora Stable AMM Program
    pub const METEORA_STABLE: Pubkey = pubkey!("Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB");
}

// Constants
pub const MAX_FEE_RATE: u16 = 1000; // 10% max fee
pub const DEFAULT_FEE_RATE: u16 = 30; // 0.3% default fee
pub const MIN_SWAP_AMOUNT: u64 = 1;

#[program]
pub mod swap_router {
    use super::*;

    pub fn initialize_router(
        ctx: Context<InitializeRouter>,
        fee_rate: u16,
    ) -> Result<()> {
        require!(fee_rate <= MAX_FEE_RATE, SwapRouterError::InvalidFeeRate);
        
        let router_state = &mut ctx.accounts.router_state;
        router_state.authority = ctx.accounts.authority.key();
        router_state.fee_rate = fee_rate;
        router_state.total_volume = 0;
        router_state.bump = ctx.bumps.router_state;
        
        msg!("Router initialized with fee rate: {} bps", fee_rate);
        Ok(())
    }

    pub fn execute_swaps(
        ctx: Context<ExecuteSwaps>,
        swaps: Vec<SwapInstruction>,
    ) -> Result<()> {
        msg!("Starting swap execution with {} swaps", swaps.len());
        
        let fee_rate = ctx.accounts.router_state.fee_rate;
        let mut total_volume = ctx.accounts.router_state.total_volume;
        
        for (i, swap) in swaps.iter().enumerate() {
            let result = match swap.dex_type {
                DexType::Orca => execute_orca_swap(&ctx, swap, fee_rate),
                DexType::RaydiumRouter => execute_raydium_router_swap(&ctx, swap, fee_rate),
                DexType::RaydiumStable => execute_raydium_stable_swap(&ctx, swap, fee_rate),
                DexType::MeteoraStable => execute_meteora_stable_swap(&ctx, swap, fee_rate),
                DexType::MeteoraVault => execute_meteora_vault_swap(&ctx, swap, fee_rate),
            };
            
            match result {
                Ok(volume) => {
                    total_volume = total_volume.checked_add(volume).unwrap();
                    msg!("Swap {} completed with volume: {}", i + 1, volume);
                },
                Err(e) => {
                    msg!("Swap {} failed: {:?}", i + 1, e);
                    return Err(e);
                }
            }
        }

        ctx.accounts.router_state.total_volume = total_volume;
        msg!("All swaps executed successfully. Total volume: {}", total_volume);
        Ok(())
    }
    
    pub fn get_best_route(
        _ctx: Context<GetBestRoute>,
        _token_in: Pubkey,
        _token_out: Pubkey,
        amount_in: u64,
    ) -> Result<RouteInfo> {
        // Mock route optimization logic
        Ok(RouteInfo {
            estimated_amount_out: amount_in.checked_mul(98).unwrap().checked_div(100).unwrap(), // 2% slippage
            price_impact: 200, // 2% price impact
            recommended_dex: DexType::RaydiumRouter,
            route_steps: vec![],
        })
    }
}

// ========== SWAP IMPLEMENTATIONS ==========

fn execute_orca_swap(
    ctx: &Context<ExecuteSwaps>,
    swap: &SwapInstruction,
    fee_rate: u16,
) -> Result<u64> {
    msg!("Executing Orca Whirlpool swap: {} -> {}", swap.token_in, swap.token_out);
    
    // Validate DEX program
    require!(
        ctx.accounts.dex_program.key() == dex_programs::ORCA_WHIRLPOOLS,
        SwapRouterError::InvalidDexProgram
    );
    
    require!(swap.amount_in >= MIN_SWAP_AMOUNT, SwapRouterError::InvalidSwapAmount);
    
    // Calculate fees
    let fee_amount = calculate_fee(swap.amount_in, fee_rate)?;
    let net_amount = swap.amount_in.checked_sub(fee_amount).unwrap();
    
    // Mock Orca CPI - In real implementation, this would call Orca's swap instruction
    perform_mock_swap(ctx, swap, net_amount)?;
    
    msg!("Orca swap executed. Fee: {}, Net amount: {}", fee_amount, net_amount);
    Ok(net_amount)
}

fn execute_raydium_router_swap(
    ctx: &Context<ExecuteSwaps>,
    swap: &SwapInstruction,
    fee_rate: u16,
) -> Result<u64> {
    msg!("Executing Raydium Router swap: {} -> {}", swap.token_in, swap.token_out);
    
    require!(
        ctx.accounts.dex_program.key() == dex_programs::RAYDIUM_ROUTER,
        SwapRouterError::InvalidDexProgram
    );
    
    require!(swap.amount_in >= MIN_SWAP_AMOUNT, SwapRouterError::InvalidSwapAmount);
    
    let fee_amount = calculate_fee(swap.amount_in, fee_rate)?;
    let net_amount = swap.amount_in.checked_sub(fee_amount).unwrap();
    
    // Mock Raydium Router CPI
    perform_mock_swap(ctx, swap, net_amount)?;
    
    msg!("Raydium Router swap executed. Fee: {}, Net amount: {}", fee_amount, net_amount);
    Ok(net_amount)
}

fn execute_raydium_stable_swap(
    ctx: &Context<ExecuteSwaps>,
    swap: &SwapInstruction,
    fee_rate: u16,
) -> Result<u64> {
    msg!("Executing Raydium Stable Router swap: {} -> {}", swap.token_in, swap.token_out);
    
    require!(
        ctx.accounts.dex_program.key() == dex_programs::RAYDIUM_ROUTER_STABLE,
        SwapRouterError::InvalidDexProgram
    );
    
    require!(swap.amount_in >= MIN_SWAP_AMOUNT, SwapRouterError::InvalidSwapAmount);
    
    let fee_amount = calculate_fee(swap.amount_in, fee_rate)?;
    let net_amount = swap.amount_in.checked_sub(fee_amount).unwrap();
    
    // Mock Raydium Stable Router CPI
    perform_mock_swap(ctx, swap, net_amount)?;
    
    msg!("Raydium Stable Router swap executed. Fee: {}, Net amount: {}", fee_amount, net_amount);
    Ok(net_amount)
}

fn execute_meteora_stable_swap(
    ctx: &Context<ExecuteSwaps>,
    swap: &SwapInstruction,
    fee_rate: u16,
) -> Result<u64> {
    msg!("Executing Meteora Stable swap: {} -> {}", swap.token_in, swap.token_out);
    
    require!(
        ctx.accounts.dex_program.key() == dex_programs::METEORA_STABLE,
        SwapRouterError::InvalidDexProgram
    );
    
    require!(swap.amount_in >= MIN_SWAP_AMOUNT, SwapRouterError::InvalidSwapAmount);
    
    let fee_amount = calculate_fee(swap.amount_in, fee_rate)?;
    let net_amount = swap.amount_in.checked_sub(fee_amount).unwrap();
    
    // Mock Meteora Stable CPI
    perform_mock_swap(ctx, swap, net_amount)?;
    
    msg!("Meteora Stable swap executed. Fee: {}, Net amount: {}", fee_amount, net_amount);
    Ok(net_amount)
}

fn execute_meteora_vault_swap(
    ctx: &Context<ExecuteSwaps>,
    swap: &SwapInstruction,
    fee_rate: u16,
) -> Result<u64> {
    msg!("Executing Meteora DLMM swap: {} -> {}", swap.token_in, swap.token_out);
    
    require!(
        ctx.accounts.dex_program.key() == dex_programs::METEORA_DLMM,
        SwapRouterError::InvalidDexProgram
    );
    
    require!(swap.amount_in >= MIN_SWAP_AMOUNT, SwapRouterError::InvalidSwapAmount);
    
    let fee_amount = calculate_fee(swap.amount_in, fee_rate)?;
    let net_amount = swap.amount_in.checked_sub(fee_amount).unwrap();
    
    // Mock Meteora DLMM CPI
    perform_mock_swap(ctx, swap, net_amount)?;
    
    msg!("Meteora DLMM swap executed. Fee: {}, Net amount: {}", fee_amount, net_amount);
    Ok(net_amount)
}

// Mock swap function for testing - simulates token transfer
fn perform_mock_swap(
    ctx: &Context<ExecuteSwaps>,
    swap: &SwapInstruction,
    amount: u64,
) -> Result<()> {
    // Validate minimum output amount
    let estimated_output = amount.checked_mul(98).unwrap().checked_div(100).unwrap(); // 2% slippage
    require!(
        estimated_output >= swap.minimum_amount_out,
        SwapRouterError::SlippageExceeded
    );
    
    // Mock: Transfer tokens from user to pool (simulate input)
    let transfer_in_accounts = Transfer {
        from: ctx.accounts.user_token_in.to_account_info(),
        to: ctx.accounts.pool_token_in.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    
    let transfer_in_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_in_accounts,
    );
    
    token::transfer(transfer_in_ctx, amount)?;
    
    // Mock: Transfer tokens from pool to user (simulate output)
    let transfer_out_accounts = Transfer {
        from: ctx.accounts.pool_token_out.to_account_info(),
        to: ctx.accounts.user_token_out.to_account_info(),
        authority: ctx.accounts.pool_authority.to_account_info(),
    };
    
    let pool_key = ctx.accounts.pool_account.key();
    let seeds = &[
        b"pool_authority",
        pool_key.as_ref(),
        &[ctx.accounts.router_state.bump],
    ];
    let signer = &[&seeds[..]];
    
    let transfer_out_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_out_accounts,
        signer,
    );
    
    token::transfer(transfer_out_ctx, estimated_output)?;
    
    msg!("Mock swap completed: {} tokens in, {} tokens out", amount, estimated_output);
    Ok(())
}

// Helper functions
fn calculate_fee(amount: u64, fee_rate: u16) -> Result<u64> {
    amount
        .checked_mul(fee_rate as u64)
        .and_then(|result| result.checked_div(10000))
        .ok_or(SwapRouterError::MathOverflow.into())
}

// ========== ACCOUNTS ==========

#[derive(Accounts)]
pub struct InitializeRouter<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + RouterState::INIT_SPACE,
        seeds = [b"router_state"],
        bump
    )]
    pub router_state: Account<'info, RouterState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteSwaps<'info> {
    #[account(
        mut,
        seeds = [b"router_state"],
        bump = router_state.bump
    )]
    pub router_state: Account<'info, RouterState>,
    
    #[account(mut)]
    pub user_token_in: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_out: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub pool_token_in: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub pool_token_out: Account<'info, TokenAccount>,
    
    /// CHECK: Pool account for the DEX
    #[account(mut)]
    pub pool_account: AccountInfo<'info>,
    
    /// CHECK: Pool authority (PDA)
    pub pool_authority: AccountInfo<'info>,
    
    /// CHECK: DEX program (Raydium, Orca, or Meteora)
    pub dex_program: AccountInfo<'info>,
    
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    
    pub associated_token_program: Program<'info, AssociatedToken>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetBestRoute<'info> {
    #[account(
        seeds = [b"router_state"],
        bump = router_state.bump
    )]
    pub router_state: Account<'info, RouterState>,
    
    pub token_in_mint: Account<'info, Mint>,
    
    pub token_out_mint: Account<'info, Mint>,
}

// ========== DATA STRUCTURES ==========

#[account]
pub struct RouterState {
    pub authority: Pubkey,
    pub fee_rate: u16,        // Fee in basis points (100 = 1%)
    pub total_volume: u64,    // Total volume processed
    pub bump: u8,
}

impl RouterState {
    pub const INIT_SPACE: usize = 32 + 2 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SwapInstruction {
    pub dex_type: DexType,
    pub pool_address: Pubkey,
    pub token_in: Pubkey,
    pub token_out: Pubkey,
    pub amount_in: u64,
    pub minimum_amount_out: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum DexType {
    Orca = 0,
    RaydiumRouter = 1,
    RaydiumStable = 2,
    MeteoraStable = 3,
    MeteoraVault = 4,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RouteInfo {
    pub estimated_amount_out: u64,
    pub price_impact: u16,      // In basis points
    pub recommended_dex: DexType,
    pub route_steps: Vec<SwapStep>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SwapStep {
    pub dex_type: DexType,
    pub pool_address: Pubkey,
    pub token_in: Pubkey,
    pub token_out: Pubkey,
    pub estimated_amount_in: u64,
    pub estimated_amount_out: u64,
}

// ========== ERRORS ==========

#[error_code]
pub enum SwapRouterError {
    #[msg("Invalid DEX program provided")]
    InvalidDexProgram = 6000,
    
    #[msg("Invalid fee rate - must be <= 1000 basis points")]
    InvalidFeeRate,
    
    #[msg("Invalid swap amount - must be > 0")]
    InvalidSwapAmount,
    
    #[msg("Math overflow occurred")]
    MathOverflow,
    
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    
    #[msg("Insufficient pool liquidity")]
    InsufficientLiquidity,
    
    #[msg("Invalid token pair")]
    InvalidTokenPair,
    
    #[msg("Unauthorized access")]
    Unauthorized,
}