import "./App.css";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import Layout from "@/components/ui/layout";
import { CreateAccountForm, ForgotPasswordEmailForm, ForgotPasswordPhoneForm, Landing, LoginForm, NoMatch, Onboarding, DriverDashboard, VerifyAccountForm, VerificationSuccess, VerificationFailed, VerificationFailedForm, LoanDashboard, LoanRequestSuccess, LoanNotification, SavingsOnboarding, SavingsDashboard, Loan, Savings, Verification, SavingsTargetDashboard, SavingsTargetForm, SavingsSummary, SavingsNotification, SavingsTargetSuccess, AiDashboard, DriverNotification, Withdraw, SetPinWithdraw, WithdrawBankDetails, WithdrawSendMoney, Settings, SettingsHome, SettingsProfile, PaymentSettings, ChangePaymentPin, WithdrawCryptoAsset, Investment, InvestmentHome, Own3rike, Own3rikeDetails, Welcome3riker, ThreeDetails, InvestmentPortfolio, ActiveLoan, EditEmail, ChangePassword, Sessions, Wallet, Waitlist } from "./pages";
import SelectCryptoAsset from "./pages/driver/withdraw/crypto/select-crypto";
import InvestorDashboard from "./pages/investor/dashboard";
import RoleSelect from "./pages/auth/role-select";
import { AuthProvider } from "@/lib/auth";
import RequireAuth from "@/lib/require-auth";
import RequireRole from "@/lib/require-role";
import ErrorBoundary from "@/components/ui/error-boundary";


function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <AuthProvider>
      <div style={{ fontFamily: "Geist" }}>
        <Routes>

          {/* auth */}
          <Route path="/create-account-rider" element={<CreateAccountForm />} />
          <Route path="/create-account" element={<CreateAccountForm />} />
          <Route path="/role-select" element={<RoleSelect />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/forgot-password-phone" element={<ForgotPasswordPhoneForm />} />
          <Route path="/forgot-password-email" element={<ForgotPasswordEmailForm />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/waitlist" element={<Waitlist />} />

          {/* Shared layout (Navbar + Footer are inside Layout) */}
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
          </Route>

          {/* Driver — protected. RequireAuth resolves /auth/me on boot and
              bounces unauthenticated users to /login. */}
          <Route element={<RequireAuth />}>
          <Route element={<RequireRole roles={["driver"]} />}>
          <Route path="/driver">
            <Route index element={<DriverDashboard />} />
            <Route path="3rikeAi" element={<AiDashboard />} />
            <Route path="notification" element={<DriverNotification />} />
            {/* Verification routes */}
            <Route path="verification" element={<Verification />}>
              <Route index element={<VerifyAccountForm />} />
              <Route path="success" element={<VerificationSuccess />} />
              <Route path="failed" element={<VerificationFailed />} />
              <Route path="retry" element={<VerificationFailedForm />} />
            </Route>

            {/* Loan routes */}
            <Route path="loan" element={<Loan />}>
              <Route index element={<LoanDashboard />} />
              <Route path="submitted" element={<LoanRequestSuccess />} />
              <Route path="notification" element={<LoanNotification />} />
              <Route path="active/:id" element={<ActiveLoan />} />
            </Route>

            {/* Withdraw routes */}
            <Route path="withdraw" element={<Withdraw />}>
              <Route index element={<SetPinWithdraw />} />
              <Route path="bank-details" element={<WithdrawBankDetails />} />
              <Route path="send-money" element={<WithdrawSendMoney />} />
              <Route path="crypto" element={<SelectCryptoAsset />} />
            <Route path="crypto-withdraw" element={<WithdrawCryptoAsset />} />
            </Route>

            {/* Savings route */}
            <Route path="savings" element={<Savings />}>
              <Route index element={<SavingsOnboarding />} />
              <Route path="dashboard" element={<SavingsDashboard />} />
              <Route path="target" element={<SavingsTargetDashboard />} />
              <Route path="create-target" element={<SavingsTargetForm />} />
              <Route path="summary" element={<SavingsSummary />} />
              <Route path="notification" element={<SavingsNotification />} />
              <Route path="success" element={<SavingsTargetSuccess />} />
            </Route>

            {/* Investment route */}
            <Route path="investment" element={<Investment />}>
              <Route index element={<InvestmentHome />} />
              <Route path="portfolio" element={<InvestmentPortfolio />} />
            </Route>

            {/* Own a 3rike (post-approval ownership flow) */}
            <Route path="own-3rike" element={<Own3rike />}>
              <Route index element={<Own3rikeDetails />} />
              <Route path="welcome" element={<Welcome3riker />} />
            </Route>

            {/* 3rike Details (post-purchase ownership progress) */}
            <Route path="3rike-details" element={<ThreeDetails />} />

            {/* Canton wallet (link + live balance) */}
            <Route path="wallet" element={<Wallet />} />

            {/* Settings route */}
            <Route path="settings" element={<Settings />}>
              <Route index element={<SettingsHome />} />
              <Route path="profile" element={<SettingsProfile />} />
              <Route path="payment" element={<PaymentSettings />} />
              <Route path="change-pin" element={<ChangePaymentPin />} />
              <Route path="edit-email" element={<EditEmail />} />
              <Route path="change-password" element={<ChangePassword />} />
              <Route path="sessions" element={<Sessions />} />
            </Route>

            <Route path="*" element={<NoMatch />} />
          </Route>
          </Route>
          </Route>

          {/* Investor — protected. Role-guarded to investor only. */}
          <Route element={<RequireAuth />}>
          <Route element={<RequireRole roles={["investor"]} />}>
          <Route path="/investor">
            <Route index element={<InvestorDashboard />} />
            <Route path="investment" element={<Investment />}>
              <Route index element={<InvestmentHome />} />
              <Route path="portfolio" element={<InvestmentPortfolio />} />
            </Route>
            <Route path="wallet" element={<Wallet />} />
            <Route path="settings" element={<Settings />}>
              <Route index element={<SettingsHome />} />
              <Route path="profile" element={<SettingsProfile />} />
              <Route path="payment" element={<PaymentSettings />} />
              <Route path="change-pin" element={<ChangePaymentPin />} />
              <Route path="edit-email" element={<EditEmail />} />
              <Route path="change-password" element={<ChangePassword />} />
              <Route path="sessions" element={<Sessions />} />
            </Route>
            <Route path="*" element={<NoMatch />} />
          </Route>
          </Route>
          </Route>



          {/* Using path="*"" means "match anything", so this route
          acts like a catch-all for URLs that we don't have explicit
          routes for. */}
          <Route path="*" element={<NoMatch />} />

        </Routes>
      </div>
      </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
