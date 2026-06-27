// 3rike Midnight Contract Deployment — Preprod Testnet
//
// Usage: npx tsx src/deploy.ts
// Prerequisites: proof server running on localhost:6300

import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PREPROD = {
  node: 'https://rpc.preprod.midnight.network',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  proofServer: 'http://localhost:6300',
  explorer: 'https://preprod.midnightexplorer.com',
};

function loadContract(name: string) {
  const p = resolve(import.meta.dirname, `../managed/${name}.compact/contract/index.js`);
  return import(p);
}

async function main() {
  console.log('=== 3rike Midnight Deployment ===\n');

  // Set network
  setNetworkId('preprod');

  // 1. Create wallet
  console.log('Creating wallet...');
  const facade = new WalletFacade();
  await facade.start();

  const walletEntry = facade.createWalletEntry();
  const mnemonic = walletEntry.mnemonic;
  const unshieldedAddress = walletEntry.unshieldedAddress;

  console.log('\n========================================');
  console.log('  WALLET CREATED — SAVE THIS SECURELY');
  console.log('========================================');
  console.log(`  Mnemonic: ${mnemonic}`);
  console.log(`  Unshielded address: ${unshieldedAddress}`);
  console.log('========================================\n');

  // Save to .env
  writeFileSync(
    resolve(import.meta.dirname, '../.env.preprod'),
    `MIDNIGHT_PREPROD_MNEMONIC=${mnemonic}\n`,
  );
  console.log('Saved mnemonic to .env.preprod\n');

  // 2. Set up providers
  console.log('Connecting to proof server...');
  const proofProvider = httpClientProofProvider({ url: PREPROD.proofServer });
  const publicDataProvider = indexerPublicDataProvider({
    indexerUrl: PREPROD.indexer,
    nodeUrl: PREPROD.node,
  });
  const privateStateProvider = levelPrivateStateProvider({
    storageDirectory: resolve(import.meta.dirname, '../.private-state'),
  });
  const zkConfigProvider = new NodeZkConfigProvider(PREPROD.proofServer);

  // 3. Create DustWallet and sync
  console.log('Setting up DustWallet...');
  const dustWallet = new DustWallet(facade, walletEntry);
  await dustWallet.start();
  await dustWallet.sync({
    publicDataProvider,
    syncTimeoutMs: 600_000,
  });

  const balance = dustWallet.balance();
  console.log(`Wallet balance: tNIGHT=${balance?.night ?? 0}, tDUST=${balance?.dust ?? 0}`);

  // 4. Deploy contracts
  const contracts = ['user-registry', 'private-investment', 'yield-vault'];
  const addresses: Record<string, string> = {};

  for (const name of contracts) {
    console.log(`\nDeploying ${name}...`);
    const contractModule = await loadContract(name);

    const providers = {
      publicDataProvider,
      privateStateProvider,
      proofProvider,
      zkConfigProvider,
    };

    const deployed = await deployContract(providers, {
      compiledContract: contractModule.Contract,
      privateStateId: `3rike-${name}`,
    });

    addresses[name] = deployed.address;
    console.log(`  Deployed at: ${deployed.address}`);
    console.log(`  Explorer: ${PREPROD.explorer}/contract/${deployed.address}`);
  }

  // 5. Save addresses
  const addressesPath = resolve(import.meta.dirname, '../deployed-addresses.json');
  writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log(`\nContract addresses saved to deployed-addresses.json`);
  console.log(JSON.stringify(addresses, null, 2));

  console.log('\n=== Deployment Complete ===');
  console.log(`Fund wallet: https://midnight-tmnight-preprod.nethermind.dev/`);
  console.log(`Address: ${unshieldedAddress}`);

  await dustWallet.stop();
  await facade.stop();
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
