import axios from 'axios';

const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
}

export interface JupiterSwapInstructions {
  tokenLedgerInstruction: any;
  computeBudgetInstructions: any[];
  setupInstructions: any[];
  swapInstruction: {
    programId: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;
  };
  cleanupInstruction: any;
  addressLookupTableAddresses: string[];
}

export class JupiterService {
  /**
   * Get a quote from Jupiter for a swap
   */
  static async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 50 // 0.5% default slippage
  ): Promise<JupiterQuote> {
    try {
      console.log(`🪐 Getting Jupiter quote: ${inputMint} → ${outputMint}`);
      console.log(`   Amount: ${amount}, Slippage: ${slippageBps} bps`);

      const response = await axios.get(`${JUPITER_API_URL}/quote`, {
        params: {
          inputMint,
          outputMint,
          amount,
          slippageBps,
          onlyDirectRoutes: false,
          asLegacyTransaction: false,
        },
      });

      const quote = response.data;

      console.log(`✅ Quote received:`);
      console.log(`   Input: ${quote.inAmount}`);
      console.log(`   Output: ${quote.outAmount}`);
      console.log(`   Price Impact: ${quote.priceImpactPct}%`);
      console.log(`   Route: ${quote.routePlan.map((r: any) => r.swapInfo.label).join(' → ')}`);

      return quote;
    } catch (error: any) {
      console.error('❌ Error getting Jupiter quote:', error.response?.data || error.message);
      throw new Error(`Failed to get Jupiter quote: ${error.message}`);
    }
  }

  /**
   * Get swap instructions from Jupiter
   */
  static async getSwapInstructions(
    quote: JupiterQuote,
    userPublicKey: string,
    wrapUnwrapSOL: boolean = true,
    useSharedAccounts: boolean = true
  ): Promise<JupiterSwapInstructions> {
    try {
      console.log(`🪐 Getting swap instructions for user: ${userPublicKey}`);

      const response = await axios.post(`${JUPITER_API_URL}/swap-instructions`, {
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: wrapUnwrapSOL,
        useSharedAccounts,
        feeAccount: null, // Optional: add platform fee account
        computeUnitPriceMicroLamports: 'auto',
        prioritizationFeeLamports: 'auto',
      });

      const instructions = response.data;

      console.log(`✅ Swap instructions received:`);
      console.log(`   Setup instructions: ${instructions.setupInstructions?.length || 0}`);
      console.log(`   Swap accounts: ${instructions.swapInstruction.accounts.length}`);
      console.log(`   Cleanup instructions: ${instructions.cleanupInstruction ? 1 : 0}`);

      return instructions;
    } catch (error: any) {
      console.error('❌ Error getting swap instructions:', error.response?.data || error.message);
      throw new Error(`Failed to get swap instructions: ${error.message}`);
    }
  }

  /**
   * Get available DEXes and tokens
   */
  static async getIndexedRouteMap(): Promise<any> {
    try {
      const response = await axios.get(`${JUPITER_API_URL}/indexed-route-map`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error getting route map:', error.message);
      throw new Error(`Failed to get route map: ${error.message}`);
    }
  }

  /**
   * Get token info
   */
  static async getTokenInfo(mint: string): Promise<any> {
    try {
      const response = await axios.get(`https://token.jup.ag/strict`, {
        params: { mint },
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error getting token info:', error.message);
      return null;
    }
  }

  /**
   * Validate a route exists
   */
  static async validateRoute(
    inputMint: string,
    outputMint: string
  ): Promise<boolean> {
    try {
      const quote = await this.getQuote(inputMint, outputMint, 1000000);
      return quote.routePlan.length > 0;
    } catch (error) {
      return false;
    }
  }
}