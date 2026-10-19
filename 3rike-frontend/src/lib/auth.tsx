// AuthProvider holds the resolved User + role-specific profile (Driver or
// Investor) in memory. On boot, if a session token exists, it loads the cached
// user from localStorage and then — if a cached profile id exists — fetches
// the profile too. Listens for global 401s (from api.ts) and clears state.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ApiError,
  UNAUTHORIZED_EVENT,
  createDriver as apiCreateDriver,
  createInvestor as apiCreateInvestor,
  deleteAccount as apiDeleteAccount,
  getDriver as apiGetDriver,
  getInvestor as apiGetInvestor,
  linkWallet as apiLinkWallet,
  listDrivers as apiListDrivers,
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
  register as apiRegister,
  updateProfile as apiUpdateProfile,
  type Driver,
  type Investor,
  type Role,
  type User,
} from "./api";
import {
  clearDriverId,
  clearInvestorId,
  clearSession,
  getCantonPartyId,
  getDriverId,
  getInvestorId,
  getSession,
  setCantonPartyId,
  setDriverId,
  setInvestorId,
  setSession,
} from "./session";

type AuthState =
  | { status: "loading"; user: null; driver: null; investor: null }
  | { status: "authenticated"; user: User; driver: Driver | null; investor: Investor | null }
  | { status: "anonymous"; user: null; driver: null; investor: null };

type AuthContextValue = {
  state: AuthState;
  user: User | null;
  driver: Driver | null;
  investor: Investor | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True when authed but no role-specific profile yet (KYC pending). */
  needsOnboarding: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (
    email: string,
    password: string,
    role: Role,
    profile?: { fullName?: string; phone?: string; pin?: string },
  ) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<User | null>;
  createDriverProfile: (payload: {
    full_name: string;
    phone: string;
    country: string;
  }) => Promise<Driver>;
  createInvestorProfile: (payload: {
    full_name: string;
    wallet_address: string;
  }) => Promise<Investor>;
  updateEmail: (email: string) => Promise<User>;
  updateProfile: (payload: {
    email?: string;
    fullName?: string;
    phone?: string;
    country?: string;
    address?: string;
  }) => Promise<User>;
  deleteAccount: () => Promise<void>;
  linkWallet: (cantonPartyId: string) => Promise<User>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const initialAnon: AuthState = { status: "anonymous", user: null, driver: null, investor: null };
const initialLoading: AuthState = { status: "loading", user: null, driver: null, investor: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>(() =>
    getSession() ? initialLoading : initialAnon,
  );

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // Resolve the cached profile (driver or investor) for the given user. We
  // tolerate failures here — if the cached id is stale we drop it but keep
  // the user logged in (they just need to re-onboard). All reads come from
  // localStorage in prototype mode.
  const loadProfile = useCallback(
    async (user: User): Promise<{ driver: Driver | null; investor: Investor | null }> => {
      if (user.role === "driver") {
        const id = getDriverId();
        if (id) {
          try {
            const driver = await apiGetDriver(id);
            return { driver, investor: null };
          } catch {
            clearDriverId();
            // fall through to discovery below
          }
        }
        // No cached id (or stale one): discover by listing and filtering by
        // user_id. Reads are localStorage-only in prototype mode. Failures
        // here are non-fatal: user stays logged in but in the "needs
        // onboarding" branch.
        try {
          const all = await apiListDrivers();
          const mine = all.find((d) => d.user_id === user.id);
          if (mine) {
            setDriverId(mine.id);
            return { driver: mine, investor: null };
          }
        } catch {
          // ignore — pre-onboarding state
        }
        return { driver: null, investor: null };
      }
      if (user.role === "investor") {
        const id = getInvestorId();
        if (!id) return { driver: null, investor: null };
        try {
          const investor = await apiGetInvestor(id);
          return { driver: null, investor };
        } catch {
          clearInvestorId();
          return { driver: null, investor: null };
        }
      }
      return { driver: null, investor: null };
    },
    [],
  );

  const refresh = useCallback(async (): Promise<User | null> => {
    if (!getSession()) {
      setState(initialAnon);
      return null;
    }
    try {
      const user = await apiMe();
      // canton_party_id is also mirrored to localStorage on the last
      // linkWallet call, so restore it if the user object is missing it.
      if (!user.canton_party_id) {
        const cached = getCantonPartyId();
        if (cached) user.canton_party_id = cached;
      }
      const { driver, investor } = await loadProfile(user);
      setState({ status: "authenticated", user, driver, investor });
      return user;
    } catch (err) {
      clearSession();
      setState(initialAnon);
      if (err instanceof ApiError && err.status === 401) {
        // already cleared by api.ts; flow stays consistent.
      }
      return null;
    }
  }, [loadProfile]);

  // Boot once on mount.
  useEffect(() => {
    if (state.status === "loading") {
      void refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global 401 listener.
  useEffect(() => {
    const handler = () => {
      setState(initialAnon);
      navigateRef.current("/login", { replace: true });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token, user } = await apiLogin({ email, password });
      setSession({ token });
      const { driver, investor } = await loadProfile(user);
      setState({ status: "authenticated", user, driver, investor });
      return user;
    },
    [loadProfile],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      role: Role,
      profile?: { fullName?: string; phone?: string; pin?: string },
    ) => {
      // EVM backend returns a token + user (with embedded wallet) on register.
      const { token, user } = await apiRegister({
        email,
        password,
        role,
        fullName: profile?.fullName,
        phone: profile?.phone,
        pin: profile?.pin,
      });
      setSession({ token });
      // Newly-registered users have no profile yet (needs onboarding).
      setState({ status: "authenticated", user, driver: null, investor: null });
      return user;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // best-effort
    }
    clearSession();
    setState(initialAnon);
    navigate("/login", { replace: true });
  }, [navigate]);

  const createDriverProfile = useCallback(
    async (payload: { full_name: string; phone: string; country: string }) => {
      const driver = await apiCreateDriver(payload);
      setDriverId(driver.id);
      setState((prev) =>
        prev.status === "authenticated"
          ? { ...prev, driver }
          : prev,
      );
      return driver;
    },
    [],
  );

  const createInvestorProfile = useCallback(
    async (payload: { full_name: string; wallet_address: string }) => {
      const investor = await apiCreateInvestor(payload);
      setInvestorId(investor.id);
      setState((prev) =>
        prev.status === "authenticated"
          ? { ...prev, investor }
          : prev,
      );
      return investor;
    },
    [],
  );

  const updateEmail = useCallback(async (email: string) => {
    const updated = await apiUpdateProfile({ email });
    setState((prev) =>
      prev.status === "authenticated" ? { ...prev, user: updated } : prev,
    );
    return updated;
  }, []);

  const updateProfile = useCallback(
    async (payload: {
      email?: string;
      fullName?: string;
      phone?: string;
      country?: string;
      address?: string;
    }) => {
      const updated = await apiUpdateProfile(payload);
      setState((prev) =>
        prev.status === "authenticated" ? { ...prev, user: updated } : prev,
      );
      return updated;
    },
    [],
  );

  const deleteAccount = useCallback(async () => {
    await apiDeleteAccount();
    clearSession();
    setState(initialAnon);
    navigate("/login", { replace: true });
  }, [navigate]);

  const linkWallet = useCallback(async (cantonPartyId: string) => {
    const updated = await apiLinkWallet({ canton_party_id: cantonPartyId });
    if (updated.canton_party_id) {
      // Mirror to localStorage so refresh() can restore it (workaround for
      // /auth/me not yet returning the field).
      setCantonPartyId(updated.canton_party_id);
    }
    setState((prev) =>
      prev.status === "authenticated" ? { ...prev, user: updated } : prev,
    );
    return updated;
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const isAuthed = state.status === "authenticated";
    const hasProfile = isAuthed && (state.driver !== null || state.investor !== null);
    return {
      state,
      user: state.user,
      driver: state.driver,
      investor: state.investor,
      isAuthenticated: isAuthed,
      isLoading: state.status === "loading",
      needsOnboarding: isAuthed && !hasProfile,
      login,
      register,
      logout,
      refresh,
      createDriverProfile,
      createInvestorProfile,
      updateEmail,
      updateProfile,
      deleteAccount,
      linkWallet,
    };
  }, [
    state,
    login,
    register,
    logout,
    refresh,
    createDriverProfile,
    createInvestorProfile,
    updateEmail,
    updateProfile,
    deleteAccount,
    linkWallet,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
