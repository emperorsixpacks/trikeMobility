// 3rike Midnight Contract Deployment — Preprod Testnet
//
// Usage:
//   npx tsx src/deploy.ts              # Deploy contracts (requires funded wallet)
//   npx tsx src/deploy.ts --fund       # Show funding addresses, then deploy

import { WebSocket } from 'ws';
(globalThis as any).WebSocket = WebSocket;

import { Buffer } from 'buffer';
import * as Rx from 'rxjs';
import {
  HDWallet, Roles, WalletFacade, ShieldedWallet, DustWallet, UnshieldedWallet,
  createKeystore, PublicKey, NoOpTransactionHistoryStorage,
} from '@midnightntwrk/wallet-sdk';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { mnemonicToSeedSync, generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PREPROD = {
  networkId: 'preprod' as const,
  indexerHttpUrl: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWsUrl: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  proofServer: 'http://localhost:6300',
  explorer: 'https://preprod.midnightexplorer.com',
};

const CONTRACTS_DIR = resolve(import.meta.dirname, '../managed');
const PRIVATE_STATE_DIR = resolve(import.meta.dirname, '../.private-state');

function loadCompiledContract(name: string) {
  const zkConfigPath = resolve(CONTRACTS_DIR, `${name}.compact`);
  const zeros = new Uint8Array(32); // placeholder witness data

  // Witness providers — each contract needs specific witness functions
  const witnessMap: Record<string, Record<string, () => Uint8Array>> = {
    'user-registry': {
      kycCommitmentData: () => zeros,
      adminSecretKey: () => zeros,
    },
    'private-investment': {
      adminSecretKey: () => zeros,
      shareCommitmentData: () => zeros,
    },
    'yield-vault': {
      adminSecretKey: () => zeros,
      depositCommitmentData: () => zeros,
    },
  };

  return import(resolve(CONTRACTS_DIR, `${name}.compact/contract/index.js`)).then((mod) =>
    CompiledContract.make(name, mod.Contract).pipe(
      CompiledContract.withWitnesses(witnessMap[name]),
      CompiledContract.withCompiledFileAssets(zkConfigPath),
    ),
  );
}

async function main() {
  const fundMode = process.argv.includes('--fund');

  console.log('=== 3rike Midnight Deployment ===\n');
  setNetworkId(PREPROD.networkId);

  // ─── 1. Wallet seed ──────────────────────────────────────────────
  const envFile = resolve(import.meta.dirname, '../.env.preprod');
  let mnemonic: string | undefined;
  let rawSeedHex: string | undefined;

  // Check for raw seed first (for funded wallets)
  if (existsSync(envFile)) {
    const envContent = readFileSync(envFile, 'utf8');
    const seedMatch = envContent.match(/MIDNIGHT_PREPROD_SEED=([a-f0-9]+)/i);
    const mnemonicMatch = envContent.match(/MIDNIGHT_PREPROD_MNEMONIC=(.+)/);
    if (seedMatch) {
      rawSeedHex = seedMatch[1];
    } else if (mnemonicMatch) {
      mnemonic = mnemonicMatch[1].trim();
    }
  }

  let seedBuffer: Uint8Array;
  if (rawSeedHex) {
    seedBuffer = Buffer.from(rawSeedHex, 'hex');
    console.log('Using raw seed from .env.preprod');
  } else {
    if (!mnemonic) mnemonic = generateMnemonic(wordlist, 256);
    writeFileSync(envFile, `MIDNIGHT_PREPROD_MNEMONIC=${mnemonic}\n`);
    const rawSeed = mnemonicToSeedSync(mnemonic);
    seedBuffer = Buffer.from(rawSeed);
    console.log(`Mnemonic: ${mnemonic}`);
  }

  // ─── 2. Derive keys ──────────────────────────────────────────────
  const hdResult = HDWallet.fromSeed(seedBuffer);
  if (hdResult.type !== 'seedOk') throw new Error('HD init failed');

  const keys = hdResult.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (keys.type !== 'keysDerived') throw new Error('Key derivation failed');
  hdResult.hdWallet.clear();
  const keyData = keys.keys;

  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keyData[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keyData[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keyData[Roles.NightExternal], getNetworkId());

  console.log(`Coin public key: ${shieldedSecretKeys.coinPublicKey}\n`);

  // ─── 3. Build wallet ─────────────────────────────────────────────
  console.log('Building wallet...');

  const walletConfig = {
    networkId: getNetworkId(),
    indexerClientConnection: {
      indexerHttpUrl: PREPROD.indexerHttpUrl,
      indexerWsUrl: PREPROD.indexerWsUrl,
    },
    provingServerUrl: new URL(PREPROD.proofServer),
    relayURL: new URL(PREPROD.node.replace(/^http/, 'ws')),
    txHistoryStorage: new NoOpTransactionHistoryStorage(),
    costParameters: {
      additionalFeeOverhead: 300_000_000_000_000n,
      feeBlocksMargin: 5,
    },
    batchUpdates: { size: 5000, timeout: 1, spacing: 4 },
  };

  const facade = await WalletFacade.init({
    configuration: walletConfig,
    shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (cfg) =>
      DustWallet(cfg).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
  });
  await facade.start(shieldedSecretKeys, dustSecretKey);

  // Display addresses
  const initState = await Rx.firstValueFrom(facade.state());
  const { ShieldedAddress, ShieldedCoinPublicKey, ShieldedEncryptionPublicKey, DustAddress, MidnightBech32m } = await import('@midnight-ntwrk/wallet-sdk-address-format');
  const cpk = ShieldedCoinPublicKey.fromHexString(initState.shielded.coinPublicKey.toHexString());
  const epk = ShieldedEncryptionPublicKey.fromHexString(initState.shielded.encryptionPublicKey.toHexString());
  const shieldedAddr = MidnightBech32m.encode(getNetworkId(), new ShieldedAddress(cpk, epk)).toString();
  const unshieldedAddr = unshieldedKeystore.getBech32Address();
  const dustAddr = DustAddress.encodePublicKey(getNetworkId(), initState.dust.publicKey);

  console.log('\nWallet Addresses:');
  console.log(`  Shielded:    ${shieldedAddr}`);
  console.log(`  Unshielded:  ${unshieldedAddr}`);
  console.log(`  Dust:        ${dustAddr}\n`);

  if (fundMode) {
    console.log('\n--- FUND MODE ---');
    console.log('Send tNIGHT to the shielded address above.');
    console.log('Fund via Midnight faucet or transfer from another wallet.');
    console.log('Then re-run without --fund to deploy.\n');
    await facade.stop();
    return;
  }

  // ─── 4. Sync wallet ──────────────────────────────────────────────
  console.log('Syncing wallet (first run may take 5-10 min)...');
  const syncStart = Date.now();
  let emissionCount = 0;
  let lastAppliedIndex = 0n;

  // Listen for unhandled errors from the facade
  facade.state().pipe(Rx.throttleTime(30_000)).subscribe({
    error: (err: any) => {
      if (err?._tag === 'Wallet.Sync') {
        const cause = err?.cause;
        console.log('  UNSHIELDED SYNC ERROR:', JSON.stringify(cause, null, 2)?.slice(0, 500) ?? err);
      }
    },
  });

  try {
    await new Promise<void>((res, rej) => {
      let lastDustIndex = 0n;
      let dustStableCount = 0;
      const DUST_STABLE_REQUIRED = 3;

      const sub = facade.state().pipe(Rx.throttleTime(10_000)).subscribe({
        next: (state) => {
          emissionCount++;
          const elapsed = ((Date.now() - syncStart) / 1000).toFixed(0);
          const sp = state.shielded.progress;
          const dp = state.dust.progress;
          const up = state.unshielded.progress as any;
          const si = sp.appliedIndex ?? 0n;
          const di = dp.appliedIndex ?? 0n;
          const dustBal = state.dust.balance(new Date());
          console.log(`  [${elapsed}s] #${emissionCount} S:${si} D:${di} DUST:${dustBal.toString()} U:${up?.appliedIndex ?? 'err'}`);

          // Wait for dust wallet to stabilize
          if (di === lastDustIndex && di > 0n) {
            dustStableCount++;
          } else {
            dustStableCount = 0;
          }
          lastDustIndex = di;

          if (dustStableCount >= DUST_STABLE_REQUIRED) {
            console.log('Dust wallet synced (index stable).');
            sub.unsubscribe(); res();
          }
        },
        error: (err) => { sub.unsubscribe(); rej(err); },
      });
      setTimeout(() => {
        sub.unsubscribe();
        console.log('Sync timeout — proceeding with current state.');
        res();
      }, 900_000);
    });
  } catch (err: any) {
    console.log(`Sync error: ${err.message}`);
    console.log('Proceeding with partial sync...\n');
  }

  console.log(`Sync phase done in ${((Date.now() - syncStart) / 1000).toFixed(1)}s!\n`);

  const state = await Rx.firstValueFrom(facade.state());
  const shieldedBalances = state.shielded.balances;
  const nightBalance = Object.values(shieldedBalances).reduce((a, b) => a + b, 0n);
  const dustBalance = state.dust.balance(new Date());
  const unshieldedBalances = (state.unshielded as any).balances ?? {};
  const dustCoins = (state.dust as any).availableCoins ?? [];
  console.log(`Shielded balances: ${JSON.stringify(Object.fromEntries(Object.entries(shieldedBalances).map(([k, v]) => [k, v.toString()])))}`);
  console.log(`Unshielded balances: ${JSON.stringify(Object.fromEntries(Object.entries(unshieldedBalances).map(([k, v]) => [k, String(v)])))}`);
  console.log(`tNIGHT (shielded total): ${nightBalance}`);
  console.log(`tDUST (balance):  ${dustBalance}`);
  console.log(`DUST coins count: ${dustCoins.length}`);
  if (dustCoins.length > 0) console.log(`DUST coins: ${JSON.stringify(dustCoins.map((c: any) => ({ id: c.coinId?.slice(0, 20), value: String(c.value) })))}`);
  console.log('');

  // ─── 4b. Skip DUST registration — SDK can't see unshielded UTXOs ──
  console.log('DUST registration skipped (SDK unshielded sync bug). Proceeding to deploy...\n');

  // ─── 5. Set up providers ─────────────────────────────────────────
  const publicDataProvider = indexerPublicDataProvider(PREPROD.indexerHttpUrl, PREPROD.indexerWsUrl);

  if (!existsSync(PRIVATE_STATE_DIR)) mkdirSync(PRIVATE_STATE_DIR, { recursive: true });

  const privateStateProvider = levelPrivateStateProvider({
    privateStoragePasswordProvider: () => '3rike-Midnight-Deploy-2024!!',
    accountId: '3rike-deploy',
    midnightDbName: '3rike-private-state',
    privateStateStoreName: 'private-states',
    signingKeyStoreName: 'signing-keys',
  });

  const walletProvider = {
    balanceTx: async (tx: any, ttl?: Date) => {
      const recipe = await facade.balanceUnboundTransaction(
        tx, { shieldedSecretKeys, dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 3600_000) },
      );
      const signed = await facade.signRecipe(recipe, (data: Uint8Array) =>
        (facade as any).signWithSecretKeys(data, shieldedSecretKeys, dustSecretKey),
      );
      return facade.finalizeRecipe(signed);
    },
    getCoinPublicKey: () => shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => shieldedSecretKeys.encryptionPublicKey,
  };
  const midnightProvider = {
    submitTx: (tx: any) => facade.submissionService.submitTransaction(tx),
  };

  // ─── 6. Deploy contracts ─────────────────────────────────────────
  const contractNames = ['user-registry', 'private-investment', 'yield-vault'];
  const addresses: Record<string, string> = {};

  for (const name of contractNames) {
    console.log(`Deploying ${name}...`);
    try {
      const compiledContract = await loadCompiledContract(name);
      const zkConfigProvider = new NodeZkConfigProvider(resolve(CONTRACTS_DIR, `${name}.compact`));
      const proofProvider = httpClientProofProvider(PREPROD.proofServer, zkConfigProvider);

      const adminSk = Buffer.alloc(32);
      Buffer.from(seedBuffer).copy(adminSk);

      const deployed = await deployContract(
        { publicDataProvider, privateStateProvider, proofProvider, zkConfigProvider, walletProvider, midnightProvider },
        { compiledContract, privateStateId: `3rike-${name}`, args: [new Uint8Array(adminSk)] },
      );
      addresses[name] = deployed.address;
      console.log(`  OK: ${deployed.address}`);
    } catch (err: any) {
      console.error(`  FAIL: ${err.message}`);
      console.error(`  Full error:`, JSON.stringify(err, Object.getOwnPropertyNames(err), 2)?.slice(0, 2000));
    }
  }

  // ─── 7. Save ─────────────────────────────────────────────────────
  const savePath = resolve(import.meta.dirname, '../deployed-addresses.json');
  const existing = existsSync(savePath) ? JSON.parse(readFileSync(savePath, 'utf8')) : {};
  const merged = { ...existing, midnight: addresses };
  writeFileSync(savePath, JSON.stringify(merged, null, 2));
  console.log(`\nAddresses: ${JSON.stringify(addresses, null, 2)}`);
  await facade.stop();
  console.log('\n=== Done ===');
}

main().catch((err) => { console.error('Failed:', err); process.exit(1); });
