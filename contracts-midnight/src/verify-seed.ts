import { WebSocket } from 'ws';
(globalThis as any).WebSocket = WebSocket;
import { Buffer } from 'buffer';
import { HDWallet, Roles, WalletFacade, ShieldedWallet, DustWallet, UnshieldedWallet, createKeystore, PublicKey, NoOpTransactionHistoryStorage } from '@midnightntwrk/wallet-sdk';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { mnemonicToSeedSync } from '@scure/bip39';
import { ShieldedAddress, ShieldedCoinPublicKey, ShieldedEncryptionPublicKey, DustAddress, MidnightBech32m } from '@midnight-ntwrk/wallet-sdk-address-format';
import * as Rx from 'rxjs';

async function main() {
  setNetworkId('preprod');
  const mnemonic = 'soft harvest comfort price cage employ message sand dose pull ketchup trap snap grow pattern remove rack maid minimum thank random world robust odor';
  const seedBuffer = mnemonicToSeedSync(mnemonic, '');

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
      indexerClientConnection: { indexerHttpUrl: 'https://indexer.preprod.midnight.network/api/v3/graphql', indexerWsUrl: 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws' },
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

  const state = await Rx.firstValueFrom(facade.state());
  const cpk = ShieldedCoinPublicKey.fromHexString(state.shielded.coinPublicKey.toHexString());
  const epk = ShieldedEncryptionPublicKey.fromHexString(state.shielded.encryptionPublicKey.toHexString());
  const shieldedAddr = MidnightBech32m.encode(getNetworkId(), new ShieldedAddress(cpk, epk)).toString();
  const unshieldedAddr = unshieldedKeystore.getBech32Address();
  const dustAddr = DustAddress.encodePublicKey(getNetworkId(), state.dust.publicKey);

  console.log('Shielded:   ', shieldedAddr);
  console.log('Unshielded: ', unshieldedAddr);
  console.log('Dust:       ', dustAddr);
  console.log();
  console.log('Expected:    mn_dust_preprod1w0hyvqwzn9fqmhs3w3aysfrwusavtjzfkqtsk58j76f5unz5d4znyzuhcrq');
  console.log('Match:', dustAddr === 'mn_dust_preprod1w0hyvqwzn9fqmhs3w3aysfrwusavtjzfkqtsk58j76f5unz5d4znyzuhcrq');

  await facade.stop();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
