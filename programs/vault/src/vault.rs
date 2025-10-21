use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::*;
use crate::events::*;
use crate::errors::ErrorCode;
declare_id!("EggEs5AbpAp4rMWc8XmHCr8PwgFSmh7fFSH5Hjay9mgW");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.swap_router = ctx.accounts.swap_router.key();
        vault.total_shares = 0;
        vault.bump = ctx.bumps.vault;
        
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let user_position = &mut ctx.accounts.user_position;

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

        let shares = if vault.total_shares == 0 {
            amount
        } else {
            let vault_balance = ctx.accounts.vault_token.amount;
            amount.checked_mul(vault.total_shares)
                .ok_or(ErrorCode::MathOverflow)?
                .checked_div(vault_balance)
                .ok_or(ErrorCode::MathOverflow)?
        };

        user_position.shares = user_position.shares.checked_add(shares)
            .ok_or(ErrorCode::MathOverflow)?;
        user_position.owner = ctx.accounts.user.key();
        vault.total_shares = vault.total_shares.checked_add(shares)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(Deposited {
            user: ctx.accounts.user.key(),
            amount,
            shares,
        });

        Ok(())
    }

    pub fn execute_arbitrage<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteArbitrage<'info>>,
        jupiter_instruction_data: Vec<u8>,
        min_profit: u64,
    ) -> Result<()> {
        let vault = &ctx.accounts.vault;

        let initial_balance = ctx.accounts.vault_token.amount;

        let vault_bump = vault.bump;
        let vault_seeds_data = vec![b"vault".to_vec(), vec![vault_bump]];
        let seeds_slice: Vec<&[u8]> = vault_seeds_data.iter().map(|s| s.as_slice()).collect();
        let signer_seeds = &[seeds_slice.as_slice()];

        let cpi_program = ctx.accounts.swap_router_program.to_account_info();
        let cpi_accounts = swap_router::cpi::accounts::ExecuteVaultJupiterSwap {
            router_state: ctx.accounts.router_state.to_account_info(),
            vault_authority: vault.to_account_info(),
            jupiter_program: ctx.accounts.jupiter_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(
            cpi_program,
            cpi_accounts,
            signer_seeds,
        ).with_remaining_accounts(ctx.remaining_accounts.to_vec());

        swap_router::cpi::execute_vault_jupiter_swap(
            cpi_ctx,
            jupiter_instruction_data,
            vault_seeds_data.clone(),
        )?;

        ctx.accounts.vault_token.reload()?;
        let final_balance = ctx.accounts.vault_token.amount;

        let profit = final_balance.checked_sub(initial_balance)
            .ok_or(ErrorCode::InsufficientProfit)?;

        require!(profit >= min_profit, ErrorCode::InsufficientProfit);

        let executor_fee = profit.checked_mul(10)
            .and_then(|v| v.checked_div(100))
            .ok_or(ErrorCode::MathOverflow)?;

        let seeds_ref: Vec<&[u8]> = vault_seeds_data.iter().map(|s| s.as_slice()).collect();
        let signer = &[seeds_ref.as_slice()];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token.to_account_info(),
                    to: ctx.accounts.executor_token.to_account_info(),
                    authority: vault.to_account_info(),
                },
                signer,
            ),
            executor_fee,
        )?;

        emit!(ArbitrageExecuted {
            executor: ctx.accounts.executor.key(),
            profit,
            executor_fee,
            vault_profit: profit - executor_fee,
        });

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let user_position = &mut ctx.accounts.user_position;

        require!(user_position.shares >= shares, ErrorCode::InsufficientShares);

        let vault_balance = ctx.accounts.vault_token.amount;
        let amount = shares
            .checked_mul(vault_balance)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(vault.total_shares)
            .ok_or(ErrorCode::MathOverflow)?;

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

        user_position.shares = user_position.shares.checked_sub(shares)
            .ok_or(ErrorCode::MathOverflow)?;
        vault.total_shares = vault.total_shares.checked_sub(shares)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(Withdrawn {
            user: ctx.accounts.user.key(),
            amount,
            shares,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = Vault::LEN,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: The swap router program that this vault will use (verified through has_one)
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
        space = UserPosition::LEN,
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
pub struct ExecuteArbitrage<'info> {
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

    /// CHECK: Router state PDA from swap router program
    #[account(mut)]
    pub router_state: UncheckedAccount<'info>,

    /// CHECK: Jupiter V6 program ID
    pub jupiter_program: UncheckedAccount<'info>,

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
