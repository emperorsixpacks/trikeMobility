import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  kycCommitmentData(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  adminSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  register(context: __compactRuntime.CircuitContext<PS>, role_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  verify(context: __compactRuntime.CircuitContext<PS>,
         userCommitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  revoke(context: __compactRuntime.CircuitContext<PS>,
         userCommitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  register(context: __compactRuntime.CircuitContext<PS>, role_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  verify(context: __compactRuntime.CircuitContext<PS>,
         userCommitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  revoke(context: __compactRuntime.CircuitContext<PS>,
         userCommitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  register(context: __compactRuntime.CircuitContext<PS>, role_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  verify(context: __compactRuntime.CircuitContext<PS>,
         userCommitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  revoke(context: __compactRuntime.CircuitContext<PS>,
         userCommitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  profiles: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): { role: bigint };
    [Symbol.iterator](): Iterator<[Uint8Array, { role: bigint }]>
  };
  readonly totalVerified: bigint;
  readonly adminKey: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               adminSk_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
