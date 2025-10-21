use anchor_lang::prelude::*;

#[event]
pub struct ArbitrageExecuted {
    pub executor: Pubkey,
    pub profit: u64,
    pub executor_fee: u64,
    pub vault_profit: u64,
}

#[event]
pub struct Deposited {
    pub user: Pubkey,
    pub amount: u64,
    pub shares: u64,
}

#[event]
pub struct Withdrawn {
    pub user: Pubkey,
    pub amount: u64,
    pub shares: u64,
}
