import axios from 'axios';

// Jupiter API endpoints
const JUPITER_PRICE_API_URL = 'https://lite-api.jup.ag';
const JUPITER_ULTRA_API_URL = 'https://lite-api.jup.ag/ultra/v1';

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

export interface JupiterPriceData {
  [tokenMint: string]: {
    blockId: number | null;
    decimals: number;
    usdPrice: number;
    priceChange24h: number | null;
  };
}

export interface JupiterUltraOrder {
  mode: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  inUsdValue?: number;
  outUsdValue?: number;
  priceImpact?: number;
  swapUsdValue?: number;
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
    bps: number;
  }>;
  feeMint: string;
  feeBps: number;
  signatureFeeLamports: number;
  prioritizationFeeLamports: number;
  rentFeeLamports: number;
  router: string;
  transaction: string | null;
  gasless: boolean;
  requestId: string;
  totalTime: number;
  taker: string | null;
  quoteId?: string;
  maker?: string;
  expireAt?: string;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  errorCode?: number;
  errorMessage?: string;
}

export class JupiterService {
  /**
   * Get token prices from Jupiter Price API
   */
  static async getPrices(tokenMints: string[]): Promise<JupiterPriceData> {
    try {
      console.log(`[PRICE] Fetching prices for ${tokenMints.length} tokens`);
      
      const response = await axios.get(`${JUPITER_PRICE_API_URL}/price/v3`, {
        params: {
          ids: tokenMints.join(',')
        },
        timeout: 10000
      });

      const prices = response.data;
      console.log(`[PRICE] Successfully received ${Object.keys(prices).length} token prices`);
      
      // Log individual prices for debugging
      Object.entries(prices).forEach(([mint, data]: [string, any]) => {
        console.log(`[PRICE] ${mint.slice(0, 8)}... = $${data.usdPrice.toFixed(6)}`);
      });

      return prices;
    } catch (error: any) {
      console.error(`[PRICE] Error fetching prices: ${error.message}`);
      throw new Error(`Failed to get token prices: ${error.message}`);
    }
  }

  /**
   * Get a quote from Jupiter for a swap with retry logic
   */
  static async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 50 // 0.5% default slippage
  ): Promise<JupiterUltraOrder> {
    console.log(`[ROUTE] Getting quote: ${inputMint.slice(0, 8)}... -> ${outputMint.slice(0, 8)}...`);
    console.log(`[ROUTE] Amount: ${amount.toLocaleString()}, Slippage: ${slippageBps} bps`);

    try {
      const response = await axios.get(`${JUPITER_ULTRA_API_URL}/order`, {
        params: {
          inputMint,
          outputMint,
          amount: amount.toString(),
          // Don't include taker for quotes - this makes it a quote-only request
        },
        timeout: 15000, // 15 second timeout
      });

      const order = response.data;

      console.log(`[ROUTE] Quote received successfully`);
      console.log(`[ROUTE] Input: ${parseInt(order.inAmount).toLocaleString()}`);
      console.log(`[ROUTE] Output: ${parseInt(order.outAmount).toLocaleString()}`);
      console.log(`[ROUTE] Price Impact: ${order.priceImpactPct}%`);
      console.log(`[ROUTE] Router: ${order.router}`);
      console.log(`[ROUTE] DEX Path: ${order.routePlan.map((r: any) => r.swapInfo.label).join(' -> ')}`);

      return order;
    } catch (error: any) {
      console.error(`[ROUTE] Quote failed: ${error.message}`);
      throw new Error(`Failed to get Jupiter Ultra order: ${error.message}`);
    }
  }

  /**
   * Get swap instructions from Jupiter
   */
  static async getSwapInstructions(
    order: JupiterUltraOrder,
    userPublicKey: string,
    wrapUnwrapSOL: boolean = true,
    useSharedAccounts: boolean = true
  ): Promise<JupiterSwapInstructions> {
    try {
      console.log(` Getting swap instructions for user: ${userPublicKey}`);

      // For Ultra API, if we have a transaction in the order, we can use it directly
      // Otherwise, we need to make a new order request with the taker specified
      if (order.transaction) {
        // Return the transaction data in the expected format
        return {
          swapInstruction: {
            programId: '', // Will be extracted from the transaction
            accounts: [], // Will be extracted from the transaction
            data: order.transaction
          },
          setupInstructions: [],
          cleanupInstruction: null,
          computeBudgetInstructions: [],
          tokenLedgerInstruction: null,
          addressLookupTableAddresses: []
        };
      }
      
      // If no transaction, make a new order request with taker
      const response = await axios.get(`${JUPITER_ULTRA_API_URL}/order`, {
        params: {
          inputMint: order.inputMint,
          outputMint: order.outputMint,
          amount: order.inAmount,
          taker: userPublicKey
        }
      });

      const orderWithTransaction = response.data;

      console.log(`✅ Swap instructions received:`);
      console.log(`   Transaction available: ${!!orderWithTransaction.transaction}`);

      return {
        swapInstruction: {
          programId: '', // Will be extracted from the transaction
          accounts: [], // Will be extracted from the transaction  
          data: orderWithTransaction.transaction || ''
        },
        setupInstructions: [],
        cleanupInstruction: null,
        computeBudgetInstructions: [],
        tokenLedgerInstruction: null,
        addressLookupTableAddresses: []
      };
    } catch (error: any) {
      console.error(' Error getting swap instructions:', error.response?.data || error.message);
      throw new Error(`Failed to get swap instructions: ${error.message}`);
    }
  }

  /**
   * Get available DEXes and tokens
   */
  static async getIndexedRouteMap(): Promise<any> {
    try {
      const response = await axios.get(`${JUPITER_ULTRA_API_URL}/indexed-route-map`);
      return response.data;
    } catch (error: any) {
      console.error(' Error getting route map:', error.message);
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
      console.error(' Error getting token info:', error.message);
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