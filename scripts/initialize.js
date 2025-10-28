const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair, SystemProgram } = anchor.web3;

async function initialize() {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  console.log(" Initializing AtomX Programs...");
  console.log("Provider wallet:", provider.wallet.publicKey.toString());
  console.log("Cluster:", provider.connection.rpcEndpoint);

  try {
    // Load both programs
    const routerProgram = anchor.workspace.SwapRouter;
    const vaultProgram = anchor.workspace.Vault;

    console.log("Router Program ID:", routerProgram.programId.toString());
    console.log("Vault Program ID:", vaultProgram.programId.toString());

    // ========== INITIALIZE ROUTER ==========
    console.log("\n Initializing Swap Router...");

    // Find the router state PDA
    const [routerStatePda] = await PublicKey.findProgramAddress(
      [Buffer.from("router_state")],
      routerProgram.programId
    );

    console.log("Router State PDA:", routerStatePda.toString());

    // Check if router is already initialized
    let routerExists = false;
    try {
      await routerProgram.account.routerState.fetch(routerStatePda);
      routerExists = true;
      console.log("  Router already initialized, skipping...");
    } catch (error) {
      // Router not initialized yet
    }

    if (!routerExists) {
      // Initialize the router with 0.3% fee (30 basis points)
      const feeRate = 30;

      const routerTx = await routerProgram.methods
        .initializeRouter(feeRate)
        .accounts({
          routerState: routerStatePda,
          authority: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(" Router initialized successfully!");
      console.log("Transaction signature:", routerTx);
      console.log("Fee Rate:", feeRate, "basis points");
    }

    // ========== INITIALIZE VAULT ==========
    console.log("\n Initializing Vault...");

    // Find the vault PDA
    const [vaultPda] = await PublicKey.findProgramAddress(
      [Buffer.from("vault")],
      vaultProgram.programId
    );

    console.log("Vault PDA:", vaultPda.toString());

    // Check if vault is already initialized
    let vaultExists = false;
    try {
      await vaultProgram.account.vault.fetch(vaultPda);
      vaultExists = true;
      console.log("  Vault already initialized, skipping...");
    } catch (error) {
      // Vault not initialized yet
    }

    if (!vaultExists) {
      const vaultTx = await vaultProgram.methods
        .initializeVault()
        .accounts({
          vault: vaultPda,
          authority: provider.wallet.publicKey,
          swapRouter: routerProgram.programId,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(" Vault initialized successfully!");
      console.log("Transaction signature:", vaultTx);
    }

    // ========== DISPLAY FINAL STATE ==========
    console.log("\n Final Program State:");
    
    // Fetch router state
    const routerAccount = await routerProgram.account.routerState.fetch(routerStatePda);
    console.log("\n Router State:");
    console.log("  Authority:", routerAccount.authority.toString());
    console.log("  Fee Rate:", routerAccount.feeRateBps, "bps");
    console.log("  Total Swaps:", routerAccount.totalSwaps.toString());
    console.log("  Total Volume:", routerAccount.totalVolume.toString());

    // Fetch vault state
    const vaultAccount = await vaultProgram.account.vault.fetch(vaultPda);
    console.log("\n Vault State:");
    console.log("  Authority:", vaultAccount.authority.toString());
    console.log("  Swap Router:", vaultAccount.swapRouter.toString());
    console.log("  Total Shares:", vaultAccount.totalShares.toString());

    console.log("\n AtomX initialization completed successfully!");
    console.log("\nKey Addresses:");
    console.log("  Router State:", routerStatePda.toString());
    console.log("  Vault:", vaultPda.toString());
    console.log("  Router Program:", routerProgram.programId.toString());
    console.log("  Vault Program:", vaultProgram.programId.toString());

  } catch (error) {
    console.error(" Initialization failed:", error);
    
    // Provide helpful error context
    if (error.message.includes("custom program error: 0x0")) {
      console.error(" Hint: This might be an 'already initialized' error. Check if accounts exist already.");
    } else if (error.message.includes("insufficient funds")) {
      console.error(" Hint: Make sure your wallet has enough SOL for initialization fees.");
    }
    
    throw error;
  }
}

// Run initialization
initialize()
  .then(() => {
    console.log(" All programs initialized successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error(" Initialization failed:", error);
    process.exit(1);
  });