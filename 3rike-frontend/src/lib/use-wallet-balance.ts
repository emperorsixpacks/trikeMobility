// Fetches the current user's Midnight wallet status.
// On Midnight, balances are private — we show DB-tracked totals instead.

import { useCallback, useEffect, useState } from "react";
import { ApiError, getMidnightBalance, type MidnightBalance } from "./api";
import { useAuth } from "./auth";

type State = {
  balance: MidnightBalance | null;
  loading: boolean;
  error: ApiError | null;
};

export function useWalletBalance() {
  const { user } = useAuth();

  const [state, setState] = useState<State>({
    balance: null,
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!user) {
      setState({ balance: null, loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getMidnightBalance();
      setState({ balance: data, loading: false, error: null });
    } catch (err) {
      setState({
        balance: null,
        loading: false,
        error: err instanceof ApiError ? err : new ApiError(0, "unknown"),
      });
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    balance: state.balance,
    loading: state.loading,
    error: state.error,
    isLinked: !!user,
    refresh,
  };
}
