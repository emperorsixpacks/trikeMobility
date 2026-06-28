import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  User,
  Lock,
  Key,
  Mail,
  Snowflake,
  MessageCircle,
  Wallet,
  X,
  Info,
  ChevronRight,
} from "lucide-react";
import { useDashboardBase } from "@/lib/use-dashboard-base";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import MobileFrame from "@/components/ui/mobile-frame";

export default function SettingsHome() {
    const navigate = useNavigate();
    const base = useDashboardBase();
    const { logout, deleteAccount } = useAuth();
    const [confirmSignOut, setConfirmSignOut] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const handleSignOutConfirm = async () => {
        setSigningOut(true);
        try {
            await logout();
        } finally {
            setSigningOut(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleting(true);
        setDeleteError(null);
        try {
            await deleteAccount();
            // deleteAccount() navigates to /login on success.
        } catch (err) {
            setDeleteError(
                err instanceof ApiError && err.code === "timeout"
                    ? "The server is waking up — please try again."
                    : "Couldn't close your account. Please try again.",
            );
            setDeleting(false);
        }
    };

    // Helper component for individual menu items
    const MenuItem = ({ icon: Icon, label, onClick }: any) => (
        <div 
            onClick={onClick} 
            className="flex items-center justify-between p-3 cursor-pointer active:bg-green-100 transition-colors"
        >
            <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-[#01C259]" strokeWidth={2} />
                <span className="text-gray-500 font-light text-sm">{label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
    );

    // Helper for the grouped rounded containers
    const MenuGroup = ({ children }: { children: React.ReactNode }) => (
        <div className="bg-[#E6F6E94D] rounded-xl overflow-hidden mb-8">
            {children}
        </div>
    );

    return (
        <MobileFrame innerClassName="flex flex-col">
            
            {/* --- Header --- */}
            <div className="relative flex items-center justify-center pt-12 pb-6 px-6 bg-white shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="absolute left-6 w-10 h-10 rounded-full bg-[#F3F8F5] hover:bg-green-50 text-[#01C259]"
                >
                    <img src="/rounded-back.svg" alt="Back" className="w-10 h-10" />
                </Button>
                
                <h1 className="font-semibold text-sm text-black">
                    Settings
                </h1>
            </div>

            {/* --- Scrollable Content --- */}
            <div className="flex-1 overflow-y-auto px-6 pb-24 mt-5">
                
                {/* Group 1: Profile & Security */}
                <MenuGroup>
                    <MenuItem
                        icon={User}
                        label="My Profile"
                        onClick={() => navigate(`${base}/settings/profile`)}
                    />
                    <MenuItem
                        icon={Wallet}
                        label="Wallet"
                        onClick={() => navigate(`${base}/wallet`)}
                    />
                    <MenuItem
                        icon={Mail}
                        label="Edit Email"
                        onClick={() => navigate(`${base}/settings/edit-email`)}
                    />
                    <MenuItem
                        icon={Lock}
                        label="Payment Settings"
                        onClick={() => navigate(`${base}/settings/payment`)}
                    />
                    <MenuItem
                        icon={Key}
                        label="Change Password"
                        onClick={() => navigate(`${base}/settings/change-password`)}
                    />
                    <MenuItem
                        icon={Key}
                        label="Active Sessions"
                        onClick={() => navigate(`${base}/settings/sessions`)}
                        showBorder={false}
                    />
                </MenuGroup>

                {/* Group 2: Account Actions */}
                <MenuGroup>
                    <MenuItem 
                        icon={Snowflake} 
                        label="Freeze account" 
                        onClick={() => {}} 
                    />
                    <MenuItem 
                        icon={MessageCircle} 
                        label="SMS Alert Settings" 
                        onClick={() => {}} 
                        showBorder={false}
                    />
                </MenuGroup>

                {/* Group 3: Close Account */}
                <MenuGroup>
                    <MenuItem
                        icon={X}
                        label="Close account"
                        onClick={() => setConfirmDelete(true)}
                        showBorder={false}
                    />
                </MenuGroup>

                {/* Group 4: About */}
                <MenuGroup>
                    <MenuItem 
                        icon={Info} 
                        label="About" 
                        onClick={() => {}} 
                        showBorder={false}
                    />
                </MenuGroup>

            </div>

            {/* --- Footer Button --- */}
            <div className="absolute bottom-15 left-0 right-0 p-6 bg-white/80 backdrop-blur-sm">
                <Button
                    onClick={() => setConfirmSignOut(true)}
                    disabled={signingOut}
                    className="w-full py-6 rounded-xl bg-[#01C259] hover:bg-[#01b050] text-white text-lg font-light shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
                >
                    {signingOut ? "Signing out…" : "Sign Out"}
                </Button>
            </div>

            {/* --- Sign-out confirmation --- */}
            {confirmSignOut && (
                <div className="absolute inset-0 z-50 bg-black/40 flex items-end justify-center animate-in fade-in duration-200">
                    <div className="w-full bg-white rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom duration-300">
                        <div className="mx-auto w-12 h-2 bg-gray-300 rounded-full mb-6" />
                        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                            Sign out?
                        </h3>
                        <p className="text-sm text-[#909090] text-center mb-6">
                            You'll need to sign in again to access your account.
                        </p>

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={signingOut}
                                onClick={() => setConfirmSignOut(false)}
                                className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-700 cursor-pointer"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                disabled={signingOut}
                                onClick={handleSignOutConfirm}
                                className="flex-1 h-12 rounded-xl bg-[#01C259] hover:bg-[#00a049] text-white font-medium cursor-pointer disabled:opacity-60"
                            >
                                {signingOut ? "Signing out…" : "Sign out"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Close-account confirmation --- */}
            {confirmDelete && (
                <div className="absolute inset-0 z-50 bg-black/40 flex items-end justify-center animate-in fade-in duration-200">
                    <div className="w-full bg-white rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom duration-300">
                        <div className="mx-auto w-12 h-2 bg-gray-300 rounded-full mb-6" />
                        <h3 className="text-xl font-bold text-red-500 text-center mb-2">
                            Close your account?
                        </h3>
                        <p className="text-sm text-[#909090] text-center mb-6">
                            This permanently deletes your account, profile, savings,
                            payments, and investments. <span className="font-medium text-gray-700">This can't be undone.</span>
                        </p>

                        {deleteError && (
                            <p className="text-sm text-red-500 text-center mb-4" role="alert">
                                {deleteError}
                            </p>
                        )}

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={deleting}
                                onClick={() => {
                                    setConfirmDelete(false);
                                    setDeleteError(null);
                                }}
                                className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-700 cursor-pointer"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                disabled={deleting}
                                onClick={handleDeleteAccount}
                                className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium cursor-pointer disabled:opacity-60"
                            >
                                {deleting ? "Closing…" : "Yes, close it"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </MobileFrame>
    );
}