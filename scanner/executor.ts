import { ArbitrageOpportunity } from './types';
import { PROGRAM_IDS, FEES } from './config';
import { JupiterService } from '../src/services/jupiterService';
import { Connection, PublicKey, Transaction, VersionedTransaction, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { BN } from '@coral-xyz/anchor';

export class ArbitrageExecutor {
  private connection: Connection;
  private wallet: any;
  private vaultProgram: anchor.Program;
  private vaultProgramId: PublicKey;
  private routerProgramId: PublicKey;

  constructor(
    connection: Connection,
    wallet: any,
    vaultProgram: anchor.Program
  ) {
    this.connection = connection;
    this.wallet = wallet;
    this.vaultProgram = vaultProgram;
    this.vaultProgramId = new PublicKey(PROGRAM_IDS.VAULT);
    this.routerProgramId = new PublicKey(PROGRAM_IDS.SWAP_ROUTER);
  }

  async buildArbitrageTransaction(
    opportunity: ArbitrageOpportunity
  ): Promise<VersionedTransaction> {
    const { tokenA, tokenB, volume } = opportunity;
    const tokenADecimals = tokenA.decimals;
    const amountIn = Math.floor(volume * Math.pow(10, tokenADecimals));

    const quoteResponse = await JupiterService.getQuote(
      tokenA.mint,
      tokenB.mint,
      amountIn,
      50
    );

    const swapResponse = await JupiterService.getSwapTransaction(
      quoteResponse,
      this.wallet.publicKey.toString(),
      {
        dynamicComputeUnitLimit: true,
        priorityLevelWithMaxLamports: {
          maxLamports: 10000000,
          priorityLevel: 'high'
        }
      }
    );

    const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    return transaction;
  }

  async buildVaultArbitrageInstruction(
    opportunity: ArbitrageOpportunity,
    minProfitUSD: number
  ): Promise<TransactionInstruction> {
    const { tokenA, tokenB, volume } = opportunity;
    const tokenADecimals = tokenA.decimals;
    const amountIn = Math.floor(volume * Math.pow(10, tokenADecimals));

    const quoteResponse = await JupiterService.getQuote(
      tokenA.mint,
      tokenB.mint,
      amountIn,
      50
    );

    const swapResponse = await JupiterService.getSwapTransaction(
      quoteResponse,
      this.wallet.publicKey.toString(),
      {}
    );

    const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
    const jupiterTx = VersionedTransaction.deserialize(swapTransactionBuf);
    const jupiterInstructionData = jupiterTx.message.compiledInstructions[0].data;

    const vaultPDA = PublicKey.findProgramAddressSync(
      [Buffer.from('vault')],
      this.vaultProgramId
    )[0];

    const routerStatePDA = PublicKey.findProgramAddressSync(
      [Buffer.from('router_state')],
      this.routerProgramId
    )[0];

    const minProfitLamports = new BN(Math.floor(minProfitUSD * 1_000_000));

    const vaultTokenAccount = new PublicKey(tokenA.mint);
    const executorTokenAccount = new PublicKey(tokenA.mint);

    const remainingAccounts = jupiterTx.message.getAccountKeys().staticAccountKeys.map(key => ({
      pubkey: key,
      isSigner: false,
      isWritable: true
    }));

    const instruction = await this.vaultProgram.methods
      .executeArbitrage(Buffer.from(jupiterInstructionData), minProfitLamports)
      .accounts({
        vault: vaultPDA,
        vaultToken: vaultTokenAccount,
        executor: this.wallet.publicKey,
        executorToken: executorTokenAccount,
        swapRouterProgram: this.routerProgramId,
        routerState: routerStatePDA,
        jupiterProgram: new PublicKey(PROGRAM_IDS.JUPITER_V6),
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return instruction;
  }

  async executeArbitrage(
    opportunity: ArbitrageOpportunity,
    minProfitUSD: number
  ): Promise<string> {
    const transaction = new Transaction();

    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 1_400_000
      })
    );

    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 50_000
      })
    );

    const arbitrageInstruction = await this.buildVaultArbitrageInstruction(
      opportunity,
      minProfitUSD
    );

    transaction.add(arbitrageInstruction);

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.wallet.publicKey;

    const signedTx = await this.wallet.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });

    await this.connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }

  async shouldExecute(opportunity: ArbitrageOpportunity): Promise<boolean> {
    if (opportunity.profitUSD < 5) return false;
    if (opportunity.confidence === 'LOW') return false;

    const age = Date.now() - opportunity.timestamp;
    if (age > 60000) return false;

    return true;
  }

  async autoExecute(opportunities: ArbitrageOpportunity[]): Promise<void> {
    for (const opportunity of opportunities) {
      const shouldExecute = await this.shouldExecute(opportunity);

      if (shouldExecute) {
        try {
          const signature = await this.executeArbitrage(
            opportunity,
            opportunity.profitUSD * 0.9
          );
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error: any) {
        }
      }
    }
  }
}
