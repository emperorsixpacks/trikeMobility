// Local-storage-backed API client for the 3rike frontend prototype.
// All backend calls have been replaced with localStorage reads/writes so the
// app works entirely in the browser for demo purposes.
//
// The public API surface (types, function signatures, error shapes) is kept
// unchanged so existing UI code continues to compile and behave the same way.

import { clearSession, getToken, setSession } from "./session";

// Keep the legacy VITE_API_URL reference so callers don't break, but it is
// unused in prototype mode.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
void API_URL;

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

// Kept for compatibility; AuthProvider still listens to it.
export const UNAUTHORIZED_EVENT = "3rike:unauthorized";

function safeParse<T>(text: string | null, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function storageKey(suffix: string): string {
  return `3rike.demo.${suffix}`;
}

function getStorage<T>(key: string, fallback: T): T {
  return safeParse<T>(localStorage.getItem(storageKey(key)), fallback);
}

function setStorage<T>(key: string, value: T): void {
  localStorage.setItem(storageKey(key), JSON.stringify(value));
}

function removeStorage(key: string): void {
  localStorage.removeItem(storageKey(key));
}

function generateId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function generateToken(): string {
  return `demo-token-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Seed initial demo data once.
function seedDemoData(): void {
  if (getStorage("seeded", false)) return;

  setStorage("tricycles", [
    {
      id: 1,
      vehicleId: "3RIKE-001",
      image: "/tricycle-1.png",
      location: "Lagos, Nigeria",
      description: "High-yield urban tricycle operating in busy Lagos corridors.",
      projectedApr: 18.5,
      weeklyRepayment: 45,
      pricePerShare: "50",
      totalShares: 100,
      sharesSold: 34,
      sharesAvailable: 66,
      fundedPct: 34,
      active: true,
    },
    {
      id: 2,
      vehicleId: "3RIKE-002",
      image: "/tricycle-2.png",
      location: "Abuja, Nigeria",
      description: "Reliable suburban route with consistent weekly returns.",
      projectedApr: 15.2,
      weeklyRepayment: 38,
      pricePerShare: "50",
      totalShares: 100,
      sharesSold: 12,
      sharesAvailable: 88,
      fundedPct: 12,
      active: true,
    },
    {
      id: 3,
      vehicleId: "3RIKE-003",
      image: "/tricycle-3.png",
      location: "Port Harcourt, Nigeria",
      description: "Newly deployed tricycle with strong projected growth.",
      projectedApr: 20.1,
      weeklyRepayment: 50,
      pricePerShare: "50",
      totalShares: 100,
      sharesSold: 58,
      sharesAvailable: 42,
      fundedPct: 58,
      active: true,
    },
  ]);

  setStorage("midnightBalance", {
    address: "addr1q9demo...3rike",
    lovelace: 0,
    ada: "0",
    adaPriceUsd: 0,
    adaBalanceUsd: "0",
    totalInvestedUsdc: "0",
    investmentCount: 0,
    network: "Midnight Testnet",
    explorer: "https://explorer.midnight.network",
  });

  setStorage("seeded", true);
}

seedDemoData();

// =============================================================================
// Types
// =============================================================================

export type Role = "driver" | "investor" | "admin";

export type User = {
  id: number;
  email: string;
  role: Role;
  fullName?: string;
  phone?: string;
  country?: string;
  address?: string;
  hasPin?: boolean;
  walletAddress?: string;
  canton_party_id?: string;
  created_at?: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type ChainConfig = {
  cardano: {
    network: string;
    policyId: string;
    contractAddress: string;
    tokenName: string;
    assetId: string;
  };
  midnight: {
    network: string;
    userRegistryAddress: string | null;
    investmentAddress: string | null;
    vaultAddress: string | null;
  };
};

export type MidnightBalance = {
  address: string;
  lovelace: number;
  ada: string;
  adaPriceUsd: number;
  adaBalanceUsd: string;
  totalInvestedUsdc: string;
  investmentCount: number;
  network: string;
  explorer: string;
};

export type Bank = { name: string; code: string };

export type WalletBalance = {
  round: number;
  effective_unlocked_qty: string;
  effective_locked_qty: string;
  total_holding_fees: string;
};

export type Driver = {
  id: number;
  user_id: number;
  full_name: string;
  phone: string;
  country: string;
  credit_score: number;
  weeks_remaining: number;
  created_at: string;
};

export type Investor = {
  id: number;
  user_id: number;
  full_name: string;
  wallet_address: string;
  created_at: string;
};

export type Tricycle = {
  id: number;
  vehicleId: string;
  image: string;
  location: string;
  description: string;
  projectedApr: number;
  weeklyRepayment: number;
  pricePerShare: string;
  totalShares: number;
  sharesSold: number;
  sharesAvailable: number;
  fundedPct: number;
  active: boolean;
};

export type InvestResult = {
  commitment: string;
  txHash?: string;
  shares: number;
  message: string;
};

export type Holding = {
  id: number;
  vehicleId: string;
  image: string;
  shares: number;
  valueUsdc: string;
  pendingYield: string;
  projectedApr: number;
};

export type Portfolio = {
  holdings: Holding[];
  totals: {
    investedValueUsdc: string;
    pendingYieldUsdc: string;
    tricycles: number;
  };
};

export type ClaimResult = {
  message: string;
};

export type InvestmentActivity = {
  id: number;
  tricycleId: number;
  vehicleId: string;
  action: "invest" | "claim";
  shares: string | null;
  amountUsdc: string;
  txHash: string;
  createdAt: string;
};

export type Savings = {
  id: number;
  driver_id: number;
  balance_usdc: number;
  created_at: string;
};

export type PaymentStatus = "pending" | "confirmed" | "failed";

export type Payment = {
  id: number;
  driver_id: number;
  tricycle_id: number;
  amount_local: number;
  amount_usdc: number;
  currency: string;
  status: PaymentStatus;
  week_number: number;
  created_at: string;
};

export type LoanStatus = "active" | "repaid" | "defaulted";

export type Loan = {
  id: number;
  driver_id: number;
  principal_usdc: number;
  remaining_usdc: number;
  weekly_repayment: number;
  status: LoanStatus;
  created_at: string;
};

export type WaitlistEntry = {
  id: number;
  email: string;
  phone?: string;
  referral_code: string;
  referred_by?: string;
  position: number;
  created_at: string;
};

export type JoinResponse = {
  entry: WaitlistEntry;
  totalCount: number;
};

export type StatsResponse = {
  totalCount: number;
};

export type GetByCodeResponse = {
  entry: WaitlistEntry;
  totalCount: number;
  referralCount: number;
};

export type ProviderAccount = {
  institution: string;
  accountIdentifier: string;
  accountName: string;
  amountToTransfer: string;
  currency: string;
  validUntil: string;
};

export type Session = {
  id: string;
  user_id: number;
  role: Role;
  created_at: string;
  expires_at: string;
};

// =============================================================================
// Auth
// =============================================================================

export function register(payload: {
  email: string;
  password: string;
  role: Role;
  fullName?: string;
  phone?: string;
  pin?: string;
}): Promise<AuthResponse> {
  const users = getStorage<User[]>("users", []);
  if (users.some((u) => u.email === payload.email)) {
    return Promise.reject(new ApiError(409, "user_exists", "An account with this email already exists."));
  }

  const user: User = {
    id: generateId(),
    email: payload.email,
    role: payload.role,
    fullName: payload.fullName,
    phone: payload.phone,
    created_at: new Date().toISOString(),
    hasPin: !!payload.pin,
    walletAddress: `addr1q9demo${Math.random().toString(36).slice(2, 10)}3rike`,
  };

  users.push(user);
  setStorage("users", users);
  setStorage("passwords", { ...getStorage<Record<string, string>>("passwords", {}), [payload.email]: payload.password });
  if (payload.pin) setStorage("pin", payload.pin);

  const token = generateToken();
  setSession({ token });
  setStorage("currentUser", user);

  return Promise.resolve({ token, user });
}

export function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  const users = getStorage<User[]>("users", []);
  let user = users.find((u) => u.email === payload.email);
  const passwords = getStorage<Record<string, string>>("passwords", {});

  if (!user) {
    // For prototype demos, create a driver user automatically on first login.
    user = {
      id: generateId(),
      email: payload.email,
      role: "driver",
      created_at: new Date().toISOString(),
      hasPin: false,
      walletAddress: `addr1q9demo${Math.random().toString(36).slice(2, 10)}3rike`,
    };
    users.push(user);
    setStorage("users", users);
    passwords[payload.email] = payload.password;
    setStorage("passwords", passwords);
  } else if (passwords[payload.email] !== payload.password) {
    return Promise.reject(new ApiError(401, "wrong_password", "Incorrect email or password."));
  }

  const token = generateToken();
  setSession({ token });
  setStorage("currentUser", user);

  return Promise.resolve({ token, user });
}

export function me(): Promise<User> {
  const token = getToken();
  if (!token) return Promise.reject(new ApiError(401, "unauthorized", "Session expired."));
  const user = getStorage<User | null>("currentUser", null);
  if (!user) return Promise.reject(new ApiError(401, "unauthorized", "Session expired."));
  return Promise.resolve(user);
}

export function logout(): Promise<void> {
  clearSession();
  removeStorage("currentUser");
  return Promise.resolve();
}

export function updateProfile(payload: {
  email?: string;
  fullName?: string;
  phone?: string;
  country?: string;
  address?: string;
}): Promise<User> {
  const user = getStorage<User | null>("currentUser", null);
  if (!user) return Promise.reject(new ApiError(401, "unauthorized", "Not authenticated."));

  if (payload.email !== undefined) user.email = payload.email;
  if (payload.fullName !== undefined) user.fullName = payload.fullName;
  if (payload.phone !== undefined) user.phone = payload.phone;
  if (payload.country !== undefined) user.country = payload.country;
  if (payload.address !== undefined) user.address = payload.address;

  setStorage("currentUser", user);
  updateUserInList(user);
  return Promise.resolve(user);
}

export function changePassword(payload: { old_password: string; new_password: string }): Promise<{ message: string }> {
  const user = getStorage<User | null>("currentUser", null);
  if (!user) return Promise.reject(new ApiError(401, "unauthorized", "Not authenticated."));

  const passwords = getStorage<Record<string, string>>("passwords", {});
  if (passwords[user.email] !== payload.old_password) {
    return Promise.reject(new ApiError(401, "wrong_password", "Current password is incorrect."));
  }
  passwords[user.email] = payload.new_password;
  setStorage("passwords", passwords);
  return Promise.resolve({ message: "Password updated successfully." });
}

export function changePin(payload: { old_pin?: string; new_pin: string }): Promise<{ message: string }> {
  const user = getStorage<User | null>("currentUser", null);
  if (!user) return Promise.reject(new ApiError(401, "unauthorized", "Not authenticated."));

  const storedPin = getStorage<string | null>("pin", null);
  if (storedPin && storedPin !== payload.old_pin) {
    return Promise.reject(new ApiError(401, "wrong_pin", "Current PIN is incorrect."));
  }
  setStorage("pin", payload.new_pin);
  user.hasPin = true;
  setStorage("currentUser", user);
  updateUserInList(user);
  return Promise.resolve({ message: "PIN updated successfully." });
}

export function verifyPin(pin: string): Promise<{ ok: boolean }> {
  const storedPin = getStorage<string | null>("pin", null);
  if (!storedPin || storedPin !== pin) {
    return Promise.reject(new ApiError(401, "wrong_pin", "Incorrect PIN."));
  }
  return Promise.resolve({ ok: true });
}

export function deleteAccount(): Promise<void> {
  const user = getStorage<User | null>("currentUser", null);
  if (user) {
    const users = getStorage<User[]>("users", []).filter((u) => u.email !== user.email);
    setStorage("users", users);
  }
  clearSession();
  removeStorage("currentUser");
  return Promise.resolve();
}

export function listSessions(): Promise<Session[]> {
  const user = getStorage<User | null>("currentUser", null);
  if (!user) return Promise.resolve([]);
  const sessions = getStorage<Session[]>("sessions", []);
  if (sessions.length === 0) {
    sessions.push({
      id: "demo-session-1",
      user_id: user.id,
      role: user.role,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    setStorage("sessions", sessions);
  }
  return Promise.resolve(sessions);
}

export function revokeSession(sessionId: string): Promise<void> {
  const sessions = getStorage<Session[]>("sessions", []).filter((s) => s.id !== sessionId);
  setStorage("sessions", sessions);
  return Promise.resolve();
}

function updateUserInList(updated: User): void {
  const users = getStorage<User[]>("users", []);
  const idx = users.findIndex((u) => u.id === updated.id);
  if (idx >= 0) {
    users[idx] = updated;
    setStorage("users", users);
  }
}

// =============================================================================
// Midnight wallet
// =============================================================================

export function getMidnightBalance(): Promise<MidnightBalance> {
  return Promise.resolve(getStorage<MidnightBalance>("midnightBalance", {
    address: "addr1q9demo...3rike",
    lovelace: 0,
    ada: "0",
    adaPriceUsd: 0,
    adaBalanceUsd: "0",
    totalInvestedUsdc: "0",
    investmentCount: 0,
    network: "Midnight Testnet",
    explorer: "https://explorer.midnight.network",
  }));
}

export function cryptoDeposit(amountUsdc: string): Promise<{ message: string; amountUsdc: string }> {
  const balance = getStorage<MidnightBalance>("midnightBalance", {
    address: "addr1q9demo...3rike",
    lovelace: 0,
    ada: "0",
    adaPriceUsd: 0,
    adaBalanceUsd: "0",
    totalInvestedUsdc: "0",
    investmentCount: 0,
    network: "Midnight Testnet",
    explorer: "https://explorer.midnight.network",
  });
  balance.totalInvestedUsdc = (Number(balance.totalInvestedUsdc) + Number(amountUsdc)).toFixed(2);
  setStorage("midnightBalance", balance);
  return Promise.resolve({ message: "Demo deposit credited.", amountUsdc });
}

export function withdrawCrypto(payload: { to: string; amountUsdc: string; pin: string }): Promise<{ message: string; amountUsdc: string }> {
  const storedPin = getStorage<string | null>("pin", null);
  if (storedPin && storedPin !== payload.pin) {
    return Promise.reject(new ApiError(401, "wrong_pin", "Incorrect PIN."));
  }
  const balance = getStorage<MidnightBalance>("midnightBalance", {
    address: "addr1q9demo...3rike",
    lovelace: 0,
    ada: "0",
    adaPriceUsd: 0,
    adaBalanceUsd: "0",
    totalInvestedUsdc: "0",
    investmentCount: 0,
    network: "Midnight Testnet",
    explorer: "https://explorer.midnight.network",
  });
  const current = Number(balance.totalInvestedUsdc);
  if (current < Number(payload.amountUsdc)) {
    return Promise.reject(new ApiError(422, "insufficient_funds", "Insufficient balance."));
  }
  balance.totalInvestedUsdc = (current - Number(payload.amountUsdc)).toFixed(2);
  setStorage("midnightBalance", balance);
  return Promise.resolve({ message: "Demo withdrawal processed.", amountUsdc: payload.amountUsdc });
}

// =============================================================================
// Bank withdrawals / deposits
// =============================================================================

export function getBanks(): Promise<{ banks: Bank[] }> {
  return Promise.resolve({
    banks: [
      { name: "Access Bank", code: "044" },
      { name: "GTBank", code: "058" },
      { name: "First Bank of Nigeria", code: "011" },
      { name: "Zenith Bank", code: "057" },
      { name: "UBA", code: "033" },
    ],
  });
}

export function resolveBankAccount(institution: string, accountIdentifier: string): Promise<{ accountName: string | null }> {
  return Promise.resolve({ accountName: `Demo User - ${accountIdentifier} (${institution})` });
}

export function bankWithdrawQuote(amountUsdc: string): Promise<{ rate: string | null; ngn: string | null }> {
  const ngn = (Number(amountUsdc) * 1500).toFixed(2);
  return Promise.resolve({ rate: "1500", ngn });
}

export function usdToNgnRate(): Promise<{ rate: string | null; ngnPerUsdc: number | null }> {
  return Promise.resolve({ rate: "1500", ngnPerUsdc: 1500 });
}

export function withdrawToBank(payload: {
  amountUsdc: string;
  institution: string;
  accountIdentifier: string;
  accountName: string;
  pin: string;
}): Promise<{ orderId: string; status: string; ngn: string }> {
  const storedPin = getStorage<string | null>("pin", null);
  if (storedPin && storedPin !== payload.pin) {
    return Promise.reject(new ApiError(401, "wrong_pin", "Incorrect PIN."));
  }
  const withdrawals = getStorage<unknown[]>("bankWithdrawals", []);
  const orderId = `BO-${Date.now()}`;
  withdrawals.push({ ...payload, orderId, status: "pending", createdAt: new Date().toISOString() });
  setStorage("bankWithdrawals", withdrawals);
  return Promise.resolve({ orderId, status: "pending", ngn: (Number(payload.amountUsdc) * 1500).toFixed(2) });
}

export function bankDepositQuote(amountNgn: string): Promise<{ rate: string | null; usdc: string | null }> {
  const usdc = (Number(amountNgn) / 1500).toFixed(2);
  return Promise.resolve({ rate: "1500", usdc });
}

export function createBankDeposit(payload: {
  amountNgn: string;
  institution: string;
  accountIdentifier: string;
  accountName: string;
}): Promise<{ orderId: string; amountUsdc: string; rate: string; providerAccount: ProviderAccount }> {
  const deposits = getStorage<unknown[]>("bankDeposits", []);
  const orderId = `BD-${Date.now()}`;
  const amountUsdc = (Number(payload.amountNgn) / 1500).toFixed(2);
  const providerAccount: ProviderAccount = {
    institution: payload.institution,
    accountIdentifier: payload.accountIdentifier,
    accountName: payload.accountName,
    amountToTransfer: payload.amountNgn,
    currency: "NGN",
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
  deposits.push({ ...payload, orderId, amountUsdc, status: "pending", createdAt: new Date().toISOString() });
  setStorage("bankDeposits", deposits);
  return Promise.resolve({ orderId, amountUsdc, rate: "1500", providerAccount });
}

export function checkBankDeposit(orderId: string): Promise<{ status: string; creditedUsdc?: string }> {
  const deposits = getStorage<Array<{ orderId: string; status: string; amountUsdc: string }>>("bankDeposits", []);
  const deposit = deposits.find((d) => d.orderId === orderId);
  return Promise.resolve({ status: deposit?.status ?? "pending", creditedUsdc: deposit?.amountUsdc });
}

// =============================================================================
// Canton wallet
// =============================================================================

export function linkWallet(payload: { canton_party_id: string }): Promise<User> {
  const user = getStorage<User | null>("currentUser", null);
  if (!user) return Promise.reject(new ApiError(401, "unauthorized", "Not authenticated."));
  user.canton_party_id = payload.canton_party_id;
  setStorage("currentUser", user);
  updateUserInList(user);
  return Promise.resolve(user);
}

export function getWalletBalance(): Promise<WalletBalance> {
  return Promise.resolve({
    round: 1,
    effective_unlocked_qty: "1000.00",
    effective_locked_qty: "0.00",
    total_holding_fees: "0.00",
  });
}

// =============================================================================
// Drivers / Investors
// =============================================================================

export function createDriver(payload: { full_name: string; phone: string; country: string }): Promise<Driver> {
  const user = getStorage<User | null>("currentUser", null);
  if (!user) return Promise.reject(new ApiError(401, "unauthorized", "Not authenticated."));
  const drivers = getStorage<Driver[]>("drivers", []);
  const driver: Driver = {
    id: generateId(),
    user_id: user.id,
    full_name: payload.full_name,
    phone: payload.phone,
    country: payload.country,
    credit_score: 0,
    weeks_remaining: 0,
    created_at: new Date().toISOString(),
  };
  drivers.push(driver);
  setStorage("drivers", drivers);
  return Promise.resolve(driver);
}

export function getDriver(id: number): Promise<Driver> {
  const driver = getStorage<Driver[]>("drivers", []).find((d) => d.id === id);
  if (!driver) return Promise.reject(new ApiError(404, "not_found", "Driver not found."));
  return Promise.resolve(driver);
}

export function listDrivers(): Promise<Driver[]> {
  return Promise.resolve(getStorage<Driver[]>("drivers", []));
}

export function createInvestor(payload: { full_name: string; wallet_address: string }): Promise<Investor> {
  const user = getStorage<User | null>("currentUser", null);
  if (!user) return Promise.reject(new ApiError(401, "unauthorized", "Not authenticated."));
  const investors = getStorage<Investor[]>("investors", []);
  const investor: Investor = {
    id: generateId(),
    user_id: user.id,
    full_name: payload.full_name,
    wallet_address: payload.wallet_address,
    created_at: new Date().toISOString(),
  };
  investors.push(investor);
  setStorage("investors", investors);
  return Promise.resolve(investor);
}

export function getInvestor(id: number): Promise<Investor> {
  const investor = getStorage<Investor[]>("investors", []).find((i) => i.id === id);
  if (!investor) return Promise.reject(new ApiError(404, "not_found", "Investor not found."));
  return Promise.resolve(investor);
}

// =============================================================================
// Investment
// =============================================================================

export function listTricycles(): Promise<Tricycle[]> {
  return Promise.resolve(getStorage<Tricycle[]>("tricycles", []));
}

export function getTricycle(id: number): Promise<Tricycle> {
  const tricycle = getStorage<Tricycle[]>("tricycles", []).find((t) => t.id === id);
  if (!tricycle) return Promise.reject(new ApiError(404, "not_found", "Tricycle not found."));
  return Promise.resolve(tricycle);
}

export function invest(payload: { tricycleId: number; shares: number }): Promise<InvestResult> {
  const user = getStorage<User | null>("currentUser", null);
  if (!user) return Promise.reject(new ApiError(401, "unauthorized", "Not authenticated."));

  const tricycles = getStorage<Tricycle[]>("tricycles", []);
  const idx = tricycles.findIndex((t) => t.id === payload.tricycleId);
  if (idx < 0) return Promise.reject(new ApiError(404, "not_found", "Tricycle not found."));
  if (tricycles[idx].sharesAvailable < payload.shares) {
    return Promise.reject(new ApiError(422, "insufficient_shares", "Not enough shares available."));
  }

  tricycles[idx].sharesSold += payload.shares;
  tricycles[idx].sharesAvailable -= payload.shares;
  tricycles[idx].fundedPct = Math.round((tricycles[idx].sharesSold / tricycles[idx].totalShares) * 100);
  setStorage("tricycles", tricycles);

  const portfolio = getStorage<Portfolio>("portfolio", { holdings: [], totals: { investedValueUsdc: "0", pendingYieldUsdc: "0", tricycles: 0 } });
  const existing = portfolio.holdings.find((h) => h.id === payload.tricycleId);
  const tricycle = tricycles[idx];
  const valueUsdc = (payload.shares * Number(tricycle.pricePerShare)).toFixed(2);
  if (existing) {
    existing.shares += payload.shares;
    existing.valueUsdc = (Number(existing.valueUsdc) + Number(valueUsdc)).toFixed(2);
  } else {
    portfolio.holdings.push({
      id: tricycle.id,
      vehicleId: tricycle.vehicleId,
      image: tricycle.image,
      shares: payload.shares,
      valueUsdc,
      pendingYield: "0",
      projectedApr: tricycle.projectedApr,
    });
  }
  portfolio.totals.investedValueUsdc = (Number(portfolio.totals.investedValueUsdc) + Number(valueUsdc)).toFixed(2);
  portfolio.totals.tricycles = portfolio.holdings.length;
  setStorage("portfolio", portfolio);

  const activity = getStorage<InvestmentActivity[]>("activity", []);
  activity.unshift({
    id: generateId(),
    tricycleId: tricycle.id,
    vehicleId: tricycle.vehicleId,
    action: "invest",
    shares: String(payload.shares),
    amountUsdc: valueUsdc,
    txHash: "0x" + Math.random().toString(16).slice(2, 34),
    createdAt: new Date().toISOString(),
  });
  setStorage("activity", activity);

  return Promise.resolve({
    commitment: valueUsdc,
    shares: payload.shares,
    message: "Demo investment recorded.",
  });
}

export function getPortfolio(): Promise<Portfolio> {
  return Promise.resolve(
    getStorage<Portfolio>("portfolio", {
      holdings: [],
      totals: { investedValueUsdc: "0", pendingYieldUsdc: "0", tricycles: 0 },
    }),
  );
}

export function claimYield(tricycleId: number): Promise<ClaimResult> {
  const portfolio = getStorage<Portfolio>("portfolio", { holdings: [], totals: { investedValueUsdc: "0", pendingYieldUsdc: "0", tricycles: 0 } });
  const holding = portfolio.holdings.find((h) => h.id === tricycleId);
  if (!holding) return Promise.reject(new ApiError(404, "not_found", "Holding not found."));

  portfolio.totals.pendingYieldUsdc = (Number(portfolio.totals.pendingYieldUsdc) - Number(holding.pendingYield)).toFixed(2);
  const amount = holding.pendingYield;
  holding.pendingYield = "0";
  setStorage("portfolio", portfolio);

  const activity = getStorage<InvestmentActivity[]>("activity", []);
  activity.unshift({
    id: generateId(),
    tricycleId: holding.id,
    vehicleId: holding.vehicleId,
    action: "claim",
    shares: null,
    amountUsdc: amount,
    txHash: "0x" + Math.random().toString(16).slice(2, 34),
    createdAt: new Date().toISOString(),
  });
  setStorage("activity", activity);

  return Promise.resolve({ message: "Yield claimed." });
}

export function listInvestmentActivity(): Promise<InvestmentActivity[]> {
  return Promise.resolve(getStorage<InvestmentActivity[]>("activity", []));
}

// =============================================================================
// Savings
// =============================================================================

export function getSavingsBalance(driverId: number): Promise<Savings> {
  const savings = getStorage<Savings | null>("savings", null);
  if (!savings || savings.driver_id !== driverId) {
    return Promise.reject(new ApiError(404, "not_found", "Savings not found."));
  }
  return Promise.resolve(savings);
}

export function deposit(payload: { driver_id: number; amount_usdc: number }): Promise<Savings> {
  let savings = getStorage<Savings | null>("savings", null);
  if (!savings || savings.driver_id !== payload.driver_id) {
    savings = {
      id: generateId(),
      driver_id: payload.driver_id,
      balance_usdc: 0,
      created_at: new Date().toISOString(),
    };
  }
  savings.balance_usdc += payload.amount_usdc;
  setStorage("savings", savings);
  return Promise.resolve(savings);
}

// =============================================================================
// Payments
// =============================================================================

export function recordPayment(payload: {
  driver_id: number;
  tricycle_id: number;
  amount_local: number;
  amount_usdc: number;
  currency: string;
  week_number: number;
}): Promise<Payment> {
  const payments = getStorage<Payment[]>("payments", []);
  const payment: Payment = {
    id: generateId(),
    ...payload,
    status: "pending",
    created_at: new Date().toISOString(),
  };
  payments.push(payment);
  setStorage("payments", payments);
  return Promise.resolve(payment);
}

export function listPayments(driverId: number): Promise<Payment[]> {
  return Promise.resolve(getStorage<Payment[]>("payments", []).filter((p) => p.driver_id === driverId));
}

// =============================================================================
// Loans
// =============================================================================

export function applyForLoan(payload: {
  driver_id: number;
  principal_usdc: number;
  weekly_repayment: number;
}): Promise<Loan> {
  const loans = getStorage<Loan[]>("loans", []);
  const loan: Loan = {
    id: generateId(),
    driver_id: payload.driver_id,
    principal_usdc: payload.principal_usdc,
    remaining_usdc: payload.principal_usdc,
    weekly_repayment: payload.weekly_repayment,
    status: "active",
    created_at: new Date().toISOString(),
  };
  loans.push(loan);
  setStorage("loans", loans);
  return Promise.resolve(loan);
}

export function getLoan(id: number): Promise<Loan> {
  const loan = getStorage<Loan[]>("loans", []).find((l) => l.id === id);
  if (!loan) return Promise.reject(new ApiError(404, "not_found", "Loan not found."));
  return Promise.resolve(loan);
}

export function repayLoan(id: number, amountUSDC: number): Promise<Loan> {
  const loans = getStorage<Loan[]>("loans", []);
  const loan = loans.find((l) => l.id === id);
  if (!loan) return Promise.reject(new ApiError(404, "not_found", "Loan not found."));
  loan.remaining_usdc = Math.max(0, loan.remaining_usdc - amountUSDC);
  if (loan.remaining_usdc === 0) loan.status = "repaid";
  setStorage("loans", loans);
  return Promise.resolve(loan);
}

// =============================================================================
// Waitlist
// =============================================================================

export function joinWaitlist(payload: {
  email: string;
  phone?: string;
  referredBy?: string;
}): Promise<JoinResponse> {
  const entries = getStorage<WaitlistEntry[]>("waitlist", []);
  const entry: WaitlistEntry = {
    id: generateId(),
    email: payload.email,
    phone: payload.phone,
    referral_code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    referred_by: payload.referredBy,
    position: entries.length + 1,
    created_at: new Date().toISOString(),
  };
  entries.push(entry);
  setStorage("waitlist", entries);
  setStorage("waitlistStats", { totalCount: entries.length });
  return Promise.resolve({ entry, totalCount: entries.length });
}

export function getWaitlistStats(): Promise<StatsResponse> {
  const entries = getStorage<WaitlistEntry[]>("waitlist", []);
  return Promise.resolve({ totalCount: entries.length });
}

export function getWaitlistEntry(code: string): Promise<GetByCodeResponse> {
  const entry = getStorage<WaitlistEntry[]>("waitlist", []).find((e) => e.referral_code === code);
  if (!entry) return Promise.reject(new ApiError(404, "not_found", "Waitlist entry not found."));
  const referrals = getStorage<WaitlistEntry[]>("waitlist", []).filter((e) => e.referred_by === code).length;
  return Promise.resolve({ entry, totalCount: getStorage<WaitlistEntry[]>("waitlist", []).length, referralCount: referrals });
}

// =============================================================================
// Chain config
// =============================================================================

export function getChainConfig(): Promise<ChainConfig> {
  return Promise.resolve({
    cardano: {
      network: "testnet",
      policyId: "demo-policy-id",
      contractAddress: "addr1q9demo...contract",
      tokenName: "3RIKE",
      assetId: "demo-asset-id",
    },
    midnight: {
      network: "testnet",
      userRegistryAddress: null,
      investmentAddress: null,
      vaultAddress: null,
    },
  });
}
