import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronRight } from "lucide-react";
import MobileFrame from "@/components/ui/mobile-frame";
import { useDashboardBase } from "@/lib/use-dashboard-base";

export default function PaymentSettings() {
    const navigate = useNavigate();
    const base = useDashboardBase();
    const [faceIdEnabled, setFaceIdEnabled] = useState(false);

    // Helper component for individual menu items
    // Modified to accept an optional 'rightElement'
    const MenuItem = ({ label, onClick, rightElement }: any) => (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-3 cursor-pointer active:bg-green-100 transition-colors"
        >
            <div className="flex items-center gap-3">
                <span className="text-gray-500 font-light text-sm">{label}</span>
            </div>
            {/* Render custom element (Switch) if provided, otherwise default to Chevron */}
            {rightElement ? (
                rightElement
            ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
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
                    Payment Settings
                </h1>
            </div>

            {/* --- Scrollable Content --- */}
            <div className="flex-1 overflow-y-auto px-6 pb-24 mt-10">

                {/* Group 1: Profile & Security */}
                <div>
                    <h1 className="font-semibold text-xs pb-2">Payment Pin</h1>
                    <MenuGroup>
                        <MenuItem
                            label="Change Payment Pin"
                            onClick={() => navigate(`${base}/settings/change-pin`)}
                        />
                        <MenuItem
                            label="Forgot Payment Pin"
                            onClick={() =>{}}
                        />
                    </MenuGroup>
                </div>

                {/* Group 2: Account Actions */}
                <div>
                    <h1 className="font-semibold text-xs pb-2">Biometrics</h1>
                    <MenuGroup>
                        <MenuItem
                            label="Pay with Face ID"
                            // Toggle switch when row is clicked
                            onClick={() => setFaceIdEnabled(!faceIdEnabled)}
                            rightElement={
                                <Switch
                                    checked={faceIdEnabled}
                                    onCheckedChange={setFaceIdEnabled}
                                    //Add custom color to match your theme
                                    className="data-[state=checked]:bg-[#01C259]"
                                />
                            }
                        />
                    </MenuGroup>
                </div>

            </div>

        </MobileFrame>
    );
}