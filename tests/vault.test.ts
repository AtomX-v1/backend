import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import { SwapRouter } from "../target/types/swap_router";
import * as dotenv from "dotenv";
dotenv.config();

import { 
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount
} from "@solana/spl-token";
import { assert } from "chai";

describe("Vault Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const vaultProgram = anchor.workspace.Vault as Program<Vault>;
  const swapRouterProgram = anchor.workspace.SwapRouter as Program<SwapRouter>;

  let mint: anchor.web3.PublicKey;
  let vaultTokenAccount: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;
  let vaultPda: anchor.web3.PublicKey;
  let userPositionPda: anchor.web3.PublicKey;

  before(async () => {
    console.log("🔧 Setting up test environment...");

    // Créer un token mint pour les tests
    mint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      6 // 6 decimals
    );
    console.log(" Mint created:", mint.toString());

    // Calculer le vault PDA d'abord
    [vaultPda] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      vaultProgram.programId
    );

    // Create user's token account using the simple createAccount function
    userTokenAccount = await createAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      provider.wallet.publicKey,
      undefined, // Let it generate a new keypair
      undefined, // Default confirmOptions
      TOKEN_PROGRAM_ID
    );
    console.log(" User token account created:", userTokenAccount.toString());
    
    // Create vault's token account (also owned by user for simplicity)
    vaultTokenAccount = await createAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      provider.wallet.publicKey,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log(" Vault token account created:", vaultTokenAccount.toString());

    // Mint 1000 tokens à l'user pour tester
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      userTokenAccount,
      provider.wallet.publicKey,
      1000_000000 // 1000 tokens avec 6 decimals
    );
    console.log(" Minted 1000 tokens to user");

    // Calculer le user position PDA
    [userPositionPda] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("position"), provider.wallet.publicKey.toBuffer()],
      vaultProgram.programId
    );

    console.log(" Setup complete!\n");
  });

  it("Initialize Vault", async () => {
    console.log("\n Test: Initialize Vault");

    const tx = await vaultProgram.methods
      .initializeVault()
      .accounts({
        vault: vaultPda,
        authority: provider.wallet.publicKey,
        swapRouter: swapRouterProgram.programId,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction signature:", tx);

    // Vérifier que le vault est créé
    const vaultAccount = await vaultProgram.account.vault.fetch(vaultPda);
    
    assert.ok(vaultAccount.authority.equals(provider.wallet.publicKey));
    assert.ok(vaultAccount.swapRouter.equals(swapRouterProgram.programId));
    assert.equal(vaultAccount.totalShares.toNumber(), 0);
    
    console.log(" Vault initialized successfully");
    console.log("   Authority:", vaultAccount.authority.toString());
    console.log("   Swap Router:", vaultAccount.swapRouter.toString());
    console.log("   Total Shares:", vaultAccount.totalShares.toNumber());
  });

  it("Deposit into Vault", async () => {
    console.log("\n Test: Deposit into Vault");

    const depositAmount = new anchor.BN(100_000000); // 100 tokens

    // Balance avant
    const userBalanceBefore = await getAccount(provider.connection, userTokenAccount);
    console.log("User balance before:", userBalanceBefore.amount.toString());

    const tx = await vaultProgram.methods
      .deposit(depositAmount)
      .accounts({
        vault: vaultPda,
        userPosition: userPositionPda,
        user: provider.wallet.publicKey,
        userToken: userTokenAccount,
        vaultToken: vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction signature:", tx);

    // Vérifier les balances
    const userBalanceAfter = await getAccount(provider.connection, userTokenAccount);
    const vaultBalance = await getAccount(provider.connection, vaultTokenAccount);
    
    console.log("User balance after:", userBalanceAfter.amount.toString());
    console.log("Vault balance:", vaultBalance.amount.toString());

    assert.equal(
      userBalanceAfter.amount.toString(),
      (BigInt(userBalanceBefore.amount.toString()) - BigInt(depositAmount.toString())).toString()
    );
    assert.equal(vaultBalance.amount.toString(), depositAmount.toString());

    // Vérifier la position de l'user
    const userPosition = await vaultProgram.account.userPosition.fetch(userPositionPda);
    console.log("User shares:", userPosition.shares.toNumber());
    
    assert.equal(userPosition.shares.toNumber(), depositAmount.toNumber());
    assert.ok(userPosition.owner.equals(provider.wallet.publicKey));

    // Vérifier le vault
    const vault = await vaultProgram.account.vault.fetch(vaultPda);
    console.log("Total shares in vault:", vault.totalShares.toNumber());
    
    assert.equal(vault.totalShares.toNumber(), depositAmount.toNumber());

    console.log(" Deposit successful");
  });

  it("Deposit again (should get proportional shares)", async () => {
    console.log("\n Test: Second Deposit");

    const depositAmount = new anchor.BN(50_000000); // 50 tokens

    // État avant
    const vaultBefore = await vaultProgram.account.vault.fetch(vaultPda);
    const userPositionBefore = await vaultProgram.account.userPosition.fetch(userPositionPda);
    
    console.log("Shares before:", userPositionBefore.shares.toNumber());
    console.log("Total shares before:", vaultBefore.totalShares.toNumber());

    const tx = await vaultProgram.methods
      .deposit(depositAmount)
      .accounts({
        vault: vaultPda,
        userPosition: userPositionPda,
        user: provider.wallet.publicKey,
        userToken: userTokenAccount,
        vaultToken: vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction signature:", tx);

    // État après
    const userPositionAfter = await vaultProgram.account.userPosition.fetch(userPositionPda);
    const vaultAfter = await vaultProgram.account.vault.fetch(vaultPda);
    
    console.log("Shares after:", userPositionAfter.shares.toNumber());
    console.log("Total shares after:", vaultAfter.totalShares.toNumber());

    // Les shares augmentent
    assert.ok(userPositionAfter.shares.gt(userPositionBefore.shares));

    console.log(" Second deposit successful");
  });

  it("Withdraw from Vault", async () => {
    console.log("\n Test: Withdraw from Vault");

    const userPosition = await vaultProgram.account.userPosition.fetch(userPositionPda);
    const sharesToWithdraw = userPosition.shares.div(new anchor.BN(2)); // Retire 50%

    console.log("Withdrawing shares:", sharesToWithdraw.toNumber());

    // Balance avant
    const userBalanceBefore = await getAccount(provider.connection, userTokenAccount);
    console.log("User balance before:", userBalanceBefore.amount.toString());

    const tx = await vaultProgram.methods
      .withdraw(sharesToWithdraw)
      .accounts({
        vault: vaultPda,
        userPosition: userPositionPda,
        user: provider.wallet.publicKey,
        vaultToken: vaultTokenAccount,
        userToken: userTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        owner: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Transaction signature:", tx);

    // Balance après
    const userBalanceAfter = await getAccount(provider.connection, userTokenAccount);
    console.log("User balance after:", userBalanceAfter.amount.toString());

    // L'user a reçu des tokens
    assert.ok(BigInt(userBalanceAfter.amount.toString()) > BigInt(userBalanceBefore.amount.toString()));

    // Vérifier la position
    const userPositionAfter = await vaultProgram.account.userPosition.fetch(userPositionPda);
    console.log("Shares remaining:", userPositionAfter.shares.toNumber());
    
    assert.ok(userPositionAfter.shares.lt(userPosition.shares));

    console.log(" Withdrawal successful");
  });

  it("Cannot withdraw more shares than owned", async () => {
    console.log("\n Test: Withdraw too many shares (should fail)");

    const userPosition = await vaultProgram.account.userPosition.fetch(userPositionPda);
    const tooManyShares = userPosition.shares.add(new anchor.BN(1000000));

    try {
      await vaultProgram.methods
        .withdraw(tooManyShares)
        .accounts({
          vault: vaultPda,
          userPosition: userPositionPda,
          user: provider.wallet.publicKey,
          vaultToken: vaultTokenAccount,
          userToken: userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          owner: provider.wallet.publicKey,
        })
        .rpc();

      // Si on arrive ici, le test a échoué
      assert.fail("Should have thrown an error");
    } catch (error: any) {
      console.log(" Correctly failed with error:", error.error.errorMessage);
      assert.include(error.error.errorMessage, "InsufficientShares");
    }
  });
});