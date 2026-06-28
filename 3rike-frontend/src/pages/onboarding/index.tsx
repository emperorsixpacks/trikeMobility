import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MobileFrame from "@/components/ui/mobile-frame";

const onboardingData = [
    {
        image: "/onboarding1.svg",
        title: "Own a 3rike",
        description: "Get approved under 24hrs and own a bike.",
        color: "bg-[#BBE6C3]",
    },
    {
        image: "/onboarding2.svg",
        title: "Savings",
        description: "Save smarter and reach your financial goals with Target Savings and 3rikky Lock Savings.",
        color: "bg-[#7BCD8A]",
    },
    {
        image: "/onboarding3.svg",
        title: "Loans",
        description: "Grow your credit score and get loans up to GHS 16,000 with easy, flexible repayment.",
        color: "bg-[#BBE6C3]",
    },
    {
        image: "/onboarding4.svg",
        title: "Retail Investment",
        description: "Become a 3rike owner with just GHS 600 and start earning weekly.",
        color: "bg-[#7BCD8A]",
    },
];

export default function Onboarding() {
    const [currentScreen, setCurrentScreen] = useState(-1);
    const navigate = useNavigate();
    const touchStartX = useRef<number | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentScreen(0);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (touchStartX.current === null) return;

        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX.current - touchEndX;

        // swipe threshold
        if (diff > 50 && currentScreen < onboardingData.length - 1) {
            // swipe left → next
            setCurrentScreen((prev) => prev + 1);
        } else if (diff < -50 && currentScreen > 0) {
            // swipe right → previous
            setCurrentScreen((prev) => prev - 1);
        }

        touchStartX.current = null;
    };

    // --- SPLASH SCREEN ---
    if (currentScreen === -1) {
        return (
            <MobileFrame innerClassName="flex items-center justify-center">
                <img src="/logo.svg" alt="empty" className="w-60 h-60" />
            </MobileFrame>
        );
    }

    const screenData = onboardingData[currentScreen];

    return (
        <MobileFrame innerBg="bg-black" innerClassName="flex flex-col overflow-hidden">
            <div
                className="absolute inset-0 flex flex-col"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
            {/* Full Screen Background Wrapper */}
            <div className="absolute inset-0 z-0 w-full h-full bg-black bg-[radial-gradient(circle_at_top_center,var(--tw-gradient-stops))] from-[#01C259]/30 via-black to-black flex items-center justify-center">

                {/* Background Image: Conditionally style based on the current index */}
                <img
                    src={screenData.image}
                    alt={screenData.title}
                    className={
                        currentScreen === 0
                            ? "w-full h-full object-cover" // Spans the entire screen for the first index
                            : "w-60 md:w-full md:h-full object-contain -translate-y-20 md:-translate-y-18" // Constrained and translated for the rest
                    }
                />

                {/* Dark gradient overlay to make bottom text readable */}
                <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-[#01C259]/40 pointer-events-none"></div>
            </div>

            {/* Bottom Content Area */}
            {/* Added max-w-md and mx-auto so the content is responsive and centered beautifully on tablets/desktops */}
            <div className="relative z-10 mt-auto px-6 pb-8 md:pb-12 w-full max-w-md mx-auto flex flex-col justify-end h-full">

                {/* Text Block */}
                <div className="mb-8 text-center md:text-left">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight tracking-tight">
                        {screenData.title}
                    </h1>
                    <p className="text-gray-300 text-sm md:text-base pr-2 md:pr-4">
                        {screenData.description}
                    </p>
                </div>

                {/* Buttons Block */}
                <div className="space-y-4 w-full">
                    <Button
                        onClick={() => navigate("/role-select")}
                        className="w-full h-14 rounded-xl bg-[#01C259] hover:bg-[#01a64c] text-white font-medium text-base shadow-none transition-colors"
                    >
                        Create account
                    </Button>

                    <Button
                        onClick={() => navigate("/login")}
                        className="w-full h-14 rounded-xl bg-[#3F443F] hover:bg-[#323632] text-[#01C259] font-medium text-base shadow-none flex justify-center items-center gap-1 transition-colors"
                    >
                        <span className="text-[#01C259]/80 font-normal">Already have an account?</span>
                        <span className="font-bold">Log in</span>
                    </Button>
                </div>
            </div>
            </div>
        </MobileFrame>
    );
}