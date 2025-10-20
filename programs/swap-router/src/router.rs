use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
};
use anchor_spl::token::Token;
use anchor_lang::system_program::System;

declare_id!("EggEs5AbpAp4rMWc8XmHCr8PwgFSmh7fFSH5Hjay9mgW");

// Jupiter V6 Program ID (Devnet & Mainnet)
pub const JUPITER_V6: Pubkey = pubkey!("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");

/// Swap Router Program
#[program]
pub mod swap_router {
    use super::*;

    /// Initialize the router state
    pub fn initialize_router(
        ctx: Context<InitializeRouter>,
        fee_rate_bps: u16,
    ) -> Result<()> {
        require!(fee_rate_bps <= 1000, ErrorCode::InvalidFeeRate);
        
        let router = &mut ctx.accounts.router_state;
        router.authority = ctx.accounts.authority.key();
        router.fee_rate_bps = fee_rate_bps;
        router.total_swaps = 0;
        router.total_volume = 0;
        router.bump = ctx.bumps.router_state;
        
        msg!(" Router initialized with fee: {} bps", fee_rate_bps);
        Ok(())
    }

    /// Execute a swap via Jupiter aggregator
    /// All accounts and instruction data come from Jupiter API
    pub fn execute_jupiter_swap(
        ctx: Context<ExecuteJupiterSwap>,
        jupiter_instruction_data: Vec<u8>,
    ) -> Result<()> {
        msg!("🪐 Executing Jupiter swap");
        
        // Validate Jupiter program
        require!(
            ctx.accounts.jupiter_program.key() == JUPITER_V6,
            ErrorCode::InvalidJupiterProgram
        );
        
        require!(
            !jupiter_instruction_data.is_empty(),
            ErrorCode::EmptyInstructionData
        );
        
        // Update router stats
        let router = &mut ctx.accounts.router_state;
        router.total_swaps = router.total_swaps.checked_add(1).unwrap();
        
        // Build Jupiter instruction
        // ALL accounts come from remaining_accounts
        let jupiter_ix = Instruction {
            program_id: JUPITER_V6,
            accounts: ctx.remaining_accounts
                .iter()
                .map(|acc| AccountMeta {
                    pubkey: acc.key(),
                    is_signer: acc.is_signer,
                    is_writable: acc.is_writable,
                })
                .collect(),
            data: jupiter_instruction_data,
        };
        
        // Execute Jupiter CPI
        invoke_signed(
            &jupiter_ix,
            ctx.remaining_accounts,
            &[], // No PDA signing needed for basic swaps
        )?;
        
        msg!(" Jupiter swap completed. Total swaps: {}", router.total_swaps);
        Ok(())
    }

    /// Execute swap using vault authority (for vault-owned funds)
    pub fn execute_vault_jupiter_swap(
        ctx: Context<ExecuteVaultJupiterSwap>,
        jupiter_instruction_data: Vec<u8>,
        vault_seeds: Vec<Vec<u8>>,
    ) -> Result<()> {
        msg!("🪐 Executing Jupiter swap with vault authority");
        
        require!(
            ctx.accounts.jupiter_program.key() == JUPITER_V6,
            ErrorCode::InvalidJupiterProgram
        );
        
        // Build Jupiter instruction
        let jupiter_ix = Instruction {
            program_id: JUPITER_V6,
            accounts: ctx.remaining_accounts
                .iter()
                .map(|acc| AccountMeta {
                    pubkey: acc.key(),
                    is_signer: acc.is_signer,
                    is_writable: acc.is_writable,
                })
                .collect(),
            data: jupiter_instruction_data,
        };
        
        // Convert vault_seeds to proper format
        let seed_slices: Vec<&[u8]> = vault_seeds.iter().map(|s| s.as_slice()).collect();
        let signer_seeds = &[seed_slices.as_slice()];
        
        // Execute with vault PDA signing
        invoke_signed(&jupiter_ix, ctx.remaining_accounts, signer_seeds)?;
        
        msg!(" Vault Jupiter swap completed");
        Ok(())
    }

    /// Get router statistics
    pub fn get_stats(ctx: Context<GetStats>) -> Result<RouterStats> {
        let router = &ctx.accounts.router_state;
        
        Ok(RouterStats {
            authority: router.authority,
            fee_rate_bps: router.fee_rate_bps,
            total_swaps: router.total_swaps,
            total_volume: router.total_volume,
        })
    }
}

// ========== ACCOUNT STRUCTURES ==========

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
pub struct ExecuteJupiterSwap<'info> {
    #[account(
        mut,
        seeds = [b"router_state"],
        bump = router_state.bump
    )]
    pub router_state: Account<'info, RouterState>,
    
    /// User executing the swap
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: Jupiter V6 Program - validated in instruction
    #[account(constraint = jupiter_program.key() == JUPITER_V6)]
    pub jupiter_program: AccountInfo<'info>,
    
    // All other accounts (token accounts, mints, programs, etc.)
    // are passed via remaining_accounts
    // Jupiter API tells  you which accounts to include
}

#[derive(Accounts)]
pub struct ExecuteVaultJupiterSwap<'info> {
    #[account(
        mut,
        seeds = [b"router_state"],
        bump = router_state.bump
    )]
    pub router_state: Account<'info, RouterState>,
    
    /// Vault authority (PDA)
    /// CHECK: Validated by vault program
    pub vault_authority: AccountInfo<'info>,
    
    /// CHECK: Jupiter V6 Program
    #[account(constraint = jupiter_program.key() == JUPITER_V6)]
    pub jupiter_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct GetStats<'info> {
    #[account(seeds = [b"router_state"], bump = router_state.bump)]
    pub router_state: Account<'info, RouterState>,
}

// ========== STATE ==========

#[account]
pub struct RouterState {
    pub authority: Pubkey,      // 32
    pub fee_rate_bps: u16,      // 2  (basis points, 100 = 1%)
    pub total_swaps: u64,       // 8
    pub total_volume: u64,      // 8
    pub bump: u8,               // 1
}

impl RouterState {
    pub const INIT_SPACE: usize = 32 + 2 + 8 + 8 + 1;
}

// ========== RETURN TYPES ==========

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RouterStats {
    pub authority: Pubkey,
    pub fee_rate_bps: u16,
    pub total_swaps: u64,
    pub total_volume: u64,
}

// ========== ERRORS ==========

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid Jupiter program provided")]
    InvalidJupiterProgram,
    
    #[msg("Invalid fee rate - must be <= 1000 bps (10%)")]
    InvalidFeeRate,
    
    #[msg("Empty instruction data")]
    EmptyInstructionData,
    
    #[msg("Unauthorized")]
    Unauthorized,
}