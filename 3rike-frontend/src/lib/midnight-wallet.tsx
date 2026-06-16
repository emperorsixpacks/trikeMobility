// Midnight wallet provider — connects to the Midnight network
// and provides wallet state to the app.
//
// On Midnight, the "wallet" is managed by the backend (embedded seed).
// The frontend doesn't need to connect to MetaMask or similar — the
// backend handles all ZK proof generation via the proof server.

import { createContext, useContext, type ReactNode } from "react";
import { useAuth } from "./auth";

type MidnightWalletContextValue = {
  /** The user's Midnight address (derived from their encrypted seed). */
  address: string | null;
  /** Whether we're connected to Midnight network. */
  isConnected: boolean;
  /** Whether a ZK proof is being generated. */
  isProving: boolean;
};

const MidnightWalletContext = createContext<MidnightWalletContextValue>({
  address: null,
  isConnected: false,
  isProving: false,
});

export function MidnightWalletProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const value: MidnightWalletContextValue = {
    address: user?.walletAddress ?? null,
    isConnected: !!user?.walletAddress,
    isProving: false,
  };

  return (
    <MidnightWalletContext.Provider value={value}>
      {children}
    </MidnightWalletContext.Provider>
  );
}

export function useMidnightWallet() {
  return useContext(MidnightWalletContext);
}
