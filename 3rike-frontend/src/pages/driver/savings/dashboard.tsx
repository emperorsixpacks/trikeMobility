import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, Home } from "lucide-react";
import { useSavings } from "@/lib/use-savings";


export default function SavingsDashboard() {
    const navigate = useNavigate();
    const [changeCurrency, setChangeCurrency] = useState(true);
    const { balance } = useSavings();
    const formattedBalance = Math.round(balance).toLocaleString("en-US");

    const handleTargetSavings = () => {
        navigate('/driver/savings/target')
    };

    const handleDashboard = () => {
        navigate('/driver')
    };
    return (
        <div className="min-h-screen bg-white flex justify-center">
            {/* Mobile Frame Container */}
            <div className="w-full max-w-100 bg-white shadow-2xl overflow-hidden min-h-200 relative pb-10 pt-4">

                <div className="relative flex items-center pt-10 p-6">
                    {/* Back button */}
                    {/* Back button */}
                    <button
                        onClick={() => { navigate(-1); }}
                        className="pt-10 pb-5 absolute left-10 top-1/2 -translate-y-1/2"
                    >
                        <img src="/rounded-back.svg" alt="Back" className="w-10 h-10" />
                    </button>


                    {/* Centered title */}
                    <p className="mx-auto font-medium text-md text-center">
                        My Saving
                    </p>
                </div>

                {/* Main Content Scroll Area */}
                <div className="px-5 space-y-4">

                    {/* 1. GREEN BALANCE CARD */}
                    <div className="relative w-full rounded-3xl p-6 text-white overflow-hidden">
                        {/* Background Gradient & Blobs */}
                        <img
                            src="/earnings-banner.svg"
                            alt="Card Background"
                            className="absolute inset-0 w-full h-full bg-[#00C258] object-cover z-0"
                        />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2 pt-10">
                                <span className="text-green-100 text-sm font-light">Total Savings</span>
                            </div>

                            <div className="flex flex-row justify-between">
                                <h1 className="text-4xl font-bold ">
                                    {changeCurrency ? `$ ${formattedBalance}` : `₵ ${formattedBalance}`}
                                </h1>

                                {/* Custom Toggle Switch */}
                                <div className="flex items-center rounded-full absolute top-5 right-0">
                                    <Switch
                                        checked={changeCurrency}
                                        onCheckedChange={setChangeCurrency}
                                        className="data-[state=checked]:bg-black/25 data-[state=unchecked]:bg-black/25 h-6 w-10 border-5 border-transparent -rotate-90"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative w-full rounded-2xl ml-2 overflow-hidden text-white flex items-center justify-between">
                        <p className="text-md text-gray-400">Savings Plan</p>
                    </div>

                    {/* BOTTOM GRID MENU */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Savings */}
                        <div onClick={handleTargetSavings} className="bg-[#F0EEFA80] border border-dashed border-[#9747FF] rounded-2xl p-4 flex flex-col  gap-2 ">
                            <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center mb-2 backdrop-blur-md">
                                {/* Icon simulating the scooter/delivery icon */}
                                <img
                                    src="/piggy.svg"
                                    alt="piggy"
                                    className="absolute inset-0 w-full h-full  object-cover z-0"
                                />
                            </div>
                            <span className="text-gray-800 text-lg">Target Savings</span>
                            <p className="text-xs text-[#90909099]">Have a target, save funds</p>
                        </div>

                        {/* 3triky lock */}
                        <div className="bg-[#E8F0FF80] border border-dashed border-[#1969FE] rounded-2xl p-4 flex flex-col gap-2 ">
                            <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center mb-2 backdrop-blur-md">
                                {/* Icon simulating the scooter/delivery icon */}
                                <img
                                    src="/lock-blue.svg"
                                    alt="lock"
                                    className="absolute inset-0 w-full h-full  object-cover z-0"
                                />
                            </div>
                            <span className="text-gray-800 text-lg">3triky Lock</span>
                            <p className="text-xs text-[#90909099]">Lock your savings and earn interest</p>
                        </div>
                    </div>
                    <div className="relative w-full mx-auto mt-16 rounded-2xl overflow-hidden flex justify-center">
                        <p className="text-xs text-[#95959533] font-extrabold text-center">
                            Select any Plans
                        </p>
                    </div>

                    {/* BOTTOM NAVIGATION BAR */}
                    <div className="absolute bottom-0 w-full flex items-center justify-between pb-6">
                        {/* Left pill navigation */}
                        <div className="bg-white rounded-full shadow-lg px-1 py-1 flex items-center -space-x-2">
                            <Button
                                onClick={handleDashboard}
                                variant="link"
                                size="icon"
                                className="hover:bg-transparent text-black"
                            >
                                <Home className="w-6 h-6 fill-current" />
                            </Button>

                            <Button
                                variant="link"
                                size="icon"
                                className="hover:bg-transparent text-[#909090]"
                            >
                                <Bell className="w-6 h-6 fill-current" />
                            </Button>

                            <Button
                                variant="link"
                                size="icon"
                                className="hover:bg-transparent text-gray-400"
                            >
                                <img
                                    src="/settings.svg" // ⚠️ Export the green background from your design and put it here
                                    alt="settings"
                                    className=" w-5 h-5"
                                />
                            </Button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}