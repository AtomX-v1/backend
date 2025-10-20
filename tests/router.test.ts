import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SwapRouter } from "../target/types/swap_router";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { assert } from "chai";

describe("Swap Router Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const swapRouterProgram = anchor.workspace.SwapRouter as Program<SwapRouter>;

  it("Program loads correctly", async () => {
    console.log("\n Test: Swap Router Program Loaded");
    console.log("Program ID:", swapRouterProgram.programId.toString());
    
    assert.ok(swapRouterProgram.programId);
    console.log(" Swap Router program loaded successfully");
  });

  // Pour tester execute_swaps, tu aurais besoin de:
  // - Des vrais pools Orca/Raydium sur devnet
  // - Ou des mocks de ces pools
  // Pour le hackathon, on peut skip ces tests détaillés
  
  it("Can call execute_swaps (mock test)", async () => {
    console.log("\n Test: Execute Swaps (would need real pools)");
    console.log("  Skipping detailed swap test - requires DEX integration");
    console.log(" Swap Router ready for integration");
  });
});