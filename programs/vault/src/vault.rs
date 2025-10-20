use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("VauLt1111111111111111111111111111111111111");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.swap_router = ctx.accounts.swap_router.key();
        vault.total_shares = 0;
        vault.bump = ctx.bumps.vault;
        
        msg!(" Vault initialized with swap router: {}", vault.swap_router);
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let user_position = &mut ctx.accounts.user_position;

        // Transfer tokens vers le vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token.to_account_info(),
                    to: ctx.accounts.vault_token.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Calculer shares
        let shares = if vault.total_shares == 0 {
            amount
        } else {
            let vault_balance = ctx.accounts.vault_token.amount;
            amount.checked_mul(vault.total_shares)
                .unwrap()
                .checked_div(vault_balance)
                .unwrap()
        };

        user_position.shares = user_position.shares.checked_add(shares).unwrap();
        user_position.owner = ctx.accounts.user.key();
        vault.total_shares = vault.total_shares.checked_add(shares).unwrap();

        msg!("💰 Deposited {} tokens, received {} shares", amount, shares);
        Ok(())
    }

    // IMPORTANT : Execute arbitrage via le SwapRouter
    pub fn execute_arbitrage_via_router(
        ctx: Context<ExecuteArbitrageViaRouter>,
        swaps: Vec<SwapInstruction>,
        min_profit: u64,
    ) -> Result<()> {
        let vault = &ctx.accounts.vault;
        
        // Vérifie que c'est bien le bon swap router
        require_keys_eq!(
            ctx.accounts.swap_router_program.key(),
            vault.swap_router,
            ErrorCode::InvalidSwapRouter
        );

        let initial_balance = ctx.accounts.vault_token.amount;

        // CPI vers le SwapRouter
        let vault_bump = vault.bump;
        let seeds = &[b"vault".as_ref(), &[vault_bump]];
        let signer_seeds = &[&seeds[..]];

        let cpi_program = ctx.accounts.swap_router_program.to_account_info();
        let cpi_accounts = swap_router::cpi::accounts::ExecuteSwaps {
            token_account: ctx.accounts.vault_token.to_account_info(),
            authority: vault.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            // + tous les comptes des DEX
        };
        
        let cpi_ctx = CpiContext::new_with_signer(
            cpi_program,
            cpi_accounts,
            signer_seeds,
        );

        // Appelle le SwapRouter !
        swap_router::cpi::execute_swaps(cpi_ctx, swaps)?;

        let final_balance = ctx.accounts.vault_token.amount;
        let profit = final_balance.checked_sub(initial_balance).unwrap();

        require!(profit >= min_profit, ErrorCode::InsufficientProfit);

        // 10% fee pour l'executor
        let executor_fee = profit.checked_mul(10).unwrap().checked_div(100).unwrap();
        
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token.to_account_info(),
                    to: ctx.accounts.executor_token.to_account_info(),
                    authority: vault.to_account_info(),
                },
                signer_seeds,
            ),
            executor_fee,
        )?;

        emit!(ArbitrageExecuted {
            executor: ctx.accounts.executor.key(),
            profit,
            executor_fee,
            vault_profit: profit - executor_fee,
        });

        msg!("🎉 Arbitrage executed! Total profit: {}, Executor: {}, Vault: {}", 
             profit, executor_fee, profit - executor_fee);
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let user_position = &mut ctx.accounts.user_position;

        require!(user_position.shares >= shares, ErrorCode::InsufficientShares);

        let vault_balance = ctx.accounts.vault_token.amount;
        let amount = shares
            .checked_mul(vault_balance)
            .unwrap()
            .checked_div(vault.total_shares)
            .unwrap();

        let vault_bump = vault.bump;
        let seeds = &[b"vault".as_ref(), &[vault_bump]];
        let signer_seeds = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token.to_account_info(),
                    to: ctx.accounts.user_token.to_account_info(),
                    authority: vault.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        user_position.shares = user_position.shares.checked_sub(shares).unwrap();
        vault.total_shares = vault.total_shares.checked_sub(shares).unwrap();

        msg!("💸 Withdrawn {} tokens for {} shares", amount, shares);
        Ok(())
    }
}

// ========== ACCOUNTS ==========

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: The swap router program that this vault will use
    pub swap_router: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8,
        seeds = [b"position", user.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub user_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteArbitrageViaRouter<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub vault_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub executor: Signer<'info>,

    #[account(mut)]
    pub executor_token: Account<'info, TokenAccount>,

    /// CHECK: Verified against vault.swap_router
    pub swap_router_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"position", user.key().as_ref()],
        bump,
        has_one = owner
    )]
    pub user_position: Account<'info, UserPosition>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub vault_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,

    /// CHECK: Verified through has_one
    pub owner: UncheckedAccount<'info>,
}

// ========== DATA STRUCTURES ==========

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub swap_router: Pubkey,  // Le programme autorisé à faire les swaps
    pub total_shares: u64,
    pub bump: u8,
}

#[account]
pub struct UserPosition {
    pub owner: Pubkey,
    pub shares: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SwapInstruction {
    pub dex: u8,
    pub pool: Pubkey,
    pub token_in: Pubkey,
    pub token_out: Pubkey,
    pub amount_in: u64,
}

// ========== EVENTS ==========

#[event]
pub struct ArbitrageExecuted {
    pub executor: Pubkey,
    pub profit: u64,
    pub executor_fee: u64,
    pub vault_profit: u64,
}

// ========== ERRORS ==========

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient profit from arbitrage")]
    InsufficientProfit,
    #[msg("Insufficient shares to withdraw")]
    InsufficientShares,
    #[msg("Invalid swap router program")]
    InvalidSwapRouter,
}
