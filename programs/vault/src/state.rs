use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub swap_router: Pubkey,
    pub total_shares: u64,
    pub bump: u8,
}

#[account]
pub struct UserPosition {
    pub owner: Pubkey,
    pub shares: u64,
}

impl Vault {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1;
}

impl UserPosition {
    pub const LEN: usize = 8 + 32 + 8;
}
