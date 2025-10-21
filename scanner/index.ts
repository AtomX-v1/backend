import { Connection, Keypair } from '@solana/web3.js';
import { AnchorProvider, Wallet, Program } from '@coral-xyz/anchor';
import { ArbitrageScanner } from './scanner';
import { ArbitrageExecutor } from './executor';
import { PROGRAM_IDS } from './config';
import VaultIDL from '../target/idl/vault.json';

const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com';
const AUTO_EXECUTE = process.env.AUTO_EXECUTE === 'true';

async function main() {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  let wallet: Wallet;
  if (process.env.PRIVATE_KEY) {
    const keypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(process.env.PRIVATE_KEY))
    );
    wallet = new Wallet(keypair);
  } else {
    wallet = new Wallet(Keypair.generate());
  }

  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed'
  });

  const vaultProgram = new Program(VaultIDL as any, provider);

  const scanner = new ArbitrageScanner({
    scanInterval: 30000,
    minProfitUSD: 5,
    minProfitPercentage: 0.5
  });

  const executor = new ArbitrageExecutor(connection, wallet, vaultProgram);

  scanner.start();

  if (AUTO_EXECUTE) {
    setInterval(async () => {
      const opportunities = scanner.getLastOpportunities();
      if (opportunities.length > 0) {
        await executor.autoExecute(opportunities);
      }
    }, 60000);
  }

  process.on('SIGINT', () => {
    scanner.stop();
    process.exit(0);
  });
}

export { ArbitrageScanner } from './scanner';
export { ArbitrageDetector } from './arbitrageDetector';
export { PriceService } from './priceService';
export { ArbitrageExecutor } from './executor';
export * from './types';
export * from './config';

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
