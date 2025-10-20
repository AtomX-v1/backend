const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair, SystemProgram } = anchor.web3;

async function deployRouter() {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  console.log("Deploying Swap Router...");
  console.log("Provider wallet:", provider.wallet.publicKey.toString());

  try {
    // Load the program
    const program = anchor.workspace.SwapRouter;
    console.log("Program ID:", program.programId.toString());

    // Find the router state PDA
    const [routerStatePda] = await PublicKey.findProgramAddress(
      [Buffer.from("router_state")],
      program.programId
    );

    console.log("Router State PDA:", routerStatePda.toString());

    // Initialize the router with 0.3% fee (30 basis points)
    const feeRate = 30;

    const tx = await program.methods
      .initializeRouter(feeRate)
      .accounts({
        routerState: routerStatePda,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Router initialized successfully!");
    console.log("Transaction signature:", tx);
    console.log("Router State:", routerStatePda.toString());
    console.log("Fee Rate:", feeRate, "basis points");

    // Fetch and display the router state
    const routerAccount = await program.account.routerState.fetch(routerStatePda);
    console.log("Router Account Data:");
    console.log("- Authority:", routerAccount.authority.toString());
    console.log("- Fee Rate:", routerAccount.feeRate, "bps");
    console.log("- Total Volume:", routerAccount.totalVolume.toString());

  } catch (error) {
    console.error("Deployment failed:", error);
    throw error;
  }
}

// Run deployment
deployRouter()
  .then(() => {
    console.log("✅ Router deployment completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Router deployment failed:", error);
    process.exit(1);
  });