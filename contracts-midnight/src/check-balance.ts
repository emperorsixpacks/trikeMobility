import { WebSocket } from 'ws';
(globalThis as any).WebSocket = WebSocket;
import { Buffer } from 'buffer';
import * as Rx from 'rxjs';
import { HDWallet, Roles, WalletFacade, ShieldedWallet, DustWallet, UnshieldedWallet, createKeystore, PublicKey, NoOpTransactionHistoryStorage } from '@midnightntwrk/wallet-sdk';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

setNetworkId('preprod');
const seedHex = readFileSync(resolve(import.meta.dirname, '../.env.preprod'), 'utf8').match(/MIDNIGHT_PREPROD_SEED=([a-f0-9]+)/i)?.[1];
if (!seedHex) { console.log('No seed'); process.exit(1); }

const seedBuffer = Buffer.from(seedHex, 'hex');
const hd = HDWallet.fromSeed(seedBuffer);
if (hd.type !== 'seedOk') { console.log('HD failed'); process.exit(1); }

const keys = hd.hdWallet.selectAccount(0).selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust]).deriveKeysAt(0);
if (keys.type !== 'keysDerived') { console.log('Keys failed'); process.exit(1); }
hd.hdWallet.clear();

const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys.keys[Roles.Zswap]);
const dustSecretKey = ledger.DustSecretKey.fromSeed(keys.keys[Roles.Dust]);
const unshieldedKeystore = createKeystore(keys.keys[Roles.NightExternal], getNetworkId());

const facade = await WalletFacade.init({
  configuration: {
    networkId: getNetworkId(),
    indexerClientConnection: {
      indexerHttpUrl: 'https://indexer.preprod.midnight.network/api/v4/graphql',
      indexerWsUrl: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    },
    provingServerUrl: new URL('http://localhost:6300'),
    relayURL: new URL('wss://rpc.preprod.midnight.network'),
    txHistoryStorage: new NoOpTransactionHistoryStorage(),
    costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
  },
  shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
  unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
  dust: (cfg) => DustWallet(cfg).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
});
await facade.start(shieldedSecretKeys, dustSecretKey);

console.log('Syncing (max 10 min)...');
let lastSI = 0n;
let stable = 0;
await new Promise<void>((res) => {
  const sub = facade.state().pipe(Rx.throttleTime(10_000)).subscribe({
    next: (state) => {
      const si = state.shielded.progress.appliedIndex ?? 0n;
      const di = state.dust.progress.appliedIndex ?? 0n;
      process.stdout.write(`  S:${si} D:${di}\n`);
      if (si === lastSI && si > 0n) stable++; else stable = 0;
      lastSI = si;
      if (stable >= 2) { sub.unsubscribe(); res(); }
    },
  });
  setTimeout(() => { sub.unsubscribe(); res(); }, 600_000);
});

const state = await Rx.firstValueFrom(facade.state());
const nightBal = Object.values(state.shielded.balances).reduce((a, b) => a + b, 0n);
const dustBal = state.dust.balance(new Date());

console.log('\n=== BALANCES ===');
console.log('tNIGHT (shielded):', nightBal.toString());
console.log('tDUST:', dustBal.toString());
console.log('All tokens:', JSON.stringify(Object.fromEntries(Object.entries(state.shielded.balances).map(([k, v]) => [k, v.toString()]))));
if (dustBal === 0n) console.log('\nNot ready yet. Keep generating tDUST.');
else console.log('\nREADY to deploy!');

await facade.stop();
process.exit(0);
