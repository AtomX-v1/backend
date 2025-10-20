import { Router } from 'express';
import { JupiterService } from '../services/jupiterService';
import { PublicKey } from '@solana/web3.js';

export function createJupiterRoutes(): Router {
  const router = Router();

  /**
   * GET /api/jupiter/quote
   * Get a swap quote from Jupiter
   */
  router.get('/quote', async (req, res) => {
    try {
      const { inputMint, outputMint, amount, slippageBps } = req.query;

      if (!inputMint || !outputMint || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: inputMint, outputMint, amount',
        });
      }

      const quote = await JupiterService.getQuote(
        inputMint as string,
        outputMint as string,
        parseInt(amount as string),
        slippageBps ? parseInt(slippageBps as string) : 50
      );

      res.json({
        success: true,
        quote,
      });
    } catch (error: any) {
      console.error('Error in /quote:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/jupiter/swap-instructions
   * Get swap instructions for a quote
   */
  router.post('/swap-instructions', async (req, res) => {
    try {
      const { quote, userPublicKey } = req.body;

      if (!quote || !userPublicKey) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: quote, userPublicKey',
        });
      }

      // Validate public key
      try {
        new PublicKey(userPublicKey);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid userPublicKey',
        });
      }

      const instructions = await JupiterService.getSwapInstructions(
        quote,
        userPublicKey
      );

      res.json({
        success: true,
        instructions,
      });
    } catch (error: any) {
      console.error('Error in /swap-instructions:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/jupiter/route-map
   * Get available routes
   */
  router.get('/route-map', async (req, res) => {
    try {
      const routeMap = await JupiterService.getIndexedRouteMap();
      res.json({
        success: true,
        routeMap,
      });
    } catch (error: any) {
      console.error('Error in /route-map:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/jupiter/validate-route
   * Check if a route exists between two tokens
   */
  router.get('/validate-route', async (req, res) => {
    try {
      const { inputMint, outputMint } = req.query;

      if (!inputMint || !outputMint) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: inputMint, outputMint',
        });
      }

      const isValid = await JupiterService.validateRoute(
        inputMint as string,
        outputMint as string
      );

      res.json({
        success: true,
        isValid,
      });
    } catch (error: any) {
      console.error('Error in /validate-route:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/jupiter/tokens
   * Get popular tokens
   */
  router.get('/tokens', async (req, res) => {
    try {
      // Popular tokens on Solana
      const popularTokens = [
        {
          symbol: 'SOL',
          name: 'Solana',
          mint: 'So11111111111111111111111111111111111111112',
          decimals: 9,
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          decimals: 6,
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
          decimals: 6,
        },
        {
          symbol: 'BONK',
          name: 'Bonk',
          mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
          decimals: 5,
        },
        {
          symbol: 'RAY',
          name: 'Raydium',
          mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
          decimals: 6,
        },
      ];

      res.json({
        success: true,
        tokens: popularTokens,
      });
    } catch (error: any) {
      console.error('Error in /tokens:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  return router;
}