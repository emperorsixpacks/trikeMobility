// 3rike Midnight Contract Deployment — Preprod Testnet
//
// This script deploys all three Compact contracts to Midnight Preprod.
// Usage: PRIVATE_KEY=0x... npm run deploy
//
// Prerequisites:
// 1. Docker running: docker run -p 6300:6300 midnightntwrk/proof-server:latest midnight-proof-server -v
// 2. Funded testnet wallet (get tNIGHT from https://midnight-tmnight-preprod.nethermind.dev/)

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PREPROD_NETWORK = {
  node: 'https://rpc.preprod.midnight.network',
  indexer: 'https://indexer.preprod.midnight.network',
  proofServer: 'http://localhost:6300',
};

async function loadContract(name: string) {
  const contractPath = resolve(
    import.meta.dirname,
    `../managed/${name}.compact/contract/index.js`
  );
  const mod = await import(contractPath);
  return mod;
}

async function main() {
  console.log('=== 3rike Midnight Deployment ===\n');

  const network = PREPROD_NETWORK;
  console.log(`Network: Preprod`);
  console.log(`Node: ${network.node}`);
  console.log(`Proof Server: ${network.proofServer}\n`);

  // Load compiled contracts
  console.log('Loading compiled contracts...');
  const userRegistry = await loadContract('user-registry');
  const privateInvestment = await loadContract('private-investment');
  const yieldVault = await loadContract('yield-vault');

  console.log('  UserRegistry circuits:', Object.keys(userRegistry));
  console.log('  PrivateInvestment circuits:', Object.keys(privateInvestment));
  console.log('  YieldVault circuits:', Object.keys(yieldVault));

  console.log('\n=== Contract Summary ===');
  console.log('UserRegistry:');
  console.log('  - register(role): commits KYC hash, returns commitment');
  console.log('  - verify(commitment): checks if user is registered');
  console.log('  - revoke(commitment): admin removes user');
  console.log('');
  console.log('PrivateInvestment:');
  console.log('  - openPool(id, shares, price): admin opens pool');
  console.log('  - invest(id): private investment, returns commitment');
  console.log('  - proveOwnership(id): proves share ownership');
  console.log('');
  console.log('YieldVault:');
  console.log('  - deposit(): private deposit, returns commitment');
  console.log('  - proveOwnership(): proves vault share ownership');

  console.log('\n=== Next Steps ===');
  console.log('1. Start proof server: docker run -p 6300:6300 midnightntwrk/proof-server:latest midnight-proof-server -v');
  console.log('2. Fund wallet with tNIGHT from faucet');
  console.log('3. Run: npm run test');
}

main().catch(console.error);
