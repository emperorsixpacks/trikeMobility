import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowDown, Bell, Home, Send, TrendingUp, User } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function BottomNav() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const base = user?.role === "investor" ? "/investor" : "/driver";

  const handle3rikeAi = () => navigate(`${base}/3rikeAi`);
  const handleNotification = () => navigate(`${base}/notification`);
  const handleSettings = () => navigate(`${base}/settings`);
  const handleHome = () => navigate(base);

  return (
    <>
      {/* BOTTOM NAVIGATION BAR */}
      <div className="absolute bottom-4 left-0 right-0 w-full flex items-center justify-between px-6">
        {/* Left pill navigation */}
        <div className="bg-white rounded-full shadow-lg px-1 py-1 flex items-center -space-x-2">
          <Button
            variant="link"
            size="icon"
            onClick={handleHome}
            className="hover:bg-transparent text-black"
          >
            <Home className="w-6 h-6 fill-current" />
          </Button>

          <Button
            onClick={handleNotification}
            variant="link"
            size="icon"
            className="hover:bg-transparent text-[#909090]"
          >
            <Bell className="w-6 h-6 fill-current" />
          </Button>

          <Button
            variant="link"
            onClick={handleSettings}
            size="icon"
            className="hover:bg-transparent text-gray-400"
          >
            <img src="/settings.svg" alt="settings" className=" w-5 h-5" />
          </Button>
        </div>

        {/* Right floating action button (TRIGGER) */}
        <Button
          variant="link"
          size="icon"
          onClick={() => setIsMenuOpen(true)}
          className="hover:bg-transparent w-full h-full text-gray-400"
        >
          <img src="/add.svg" alt="add" className="ml-25 w-15 h-15" />
        </Button>
      </div>

      {/* --- OVERLAY MODAL --- */}
      {isMenuOpen && (
        <div className="absolute inset-0 z-50 bg-[#F3F5F9]/95 backdrop-blur-sm flex flex-col justify-end items-end p-2 animate-in fade-in duration-200">
          {/* Menu Items Container */}
          <div className="flex flex-col gap-6 mb-10 mr-20 items-start">
            {/* Option 1: Pay 3rike Ai (driver only) */}
            {user?.role !== "investor" && (
              <div
                onClick={handle3rikeAi}
                className="flex items-center gap-4 cursor-pointer group"
              >
                <User className="w-6 h-6 text-[#00C259]" fill="#00C259" />
                <span className="text-lg font-light text-black group-hover:text-gray-700">
                  Pay 3rike Ai
                </span>
              </div>
            )}

            {/* Option 2: Send */}
            <div className="flex items-center gap-4 cursor-pointer group">
              <Send className="w-6 h-6 text-[#9747FF]" fill="#9747FF" />
              <span className="text-lg font-light text-black group-hover:text-gray-700">
                Send
              </span>
            </div>

            {/* Option 3: Recieve */}
            <div className="flex items-center gap-4 cursor-pointer group">
              <ArrowDown className="w-6 h-6 text-[#FF9900]" strokeWidth={3} />
              <span className="text-lg font-light text-black group-hover:text-gray-700">
                Recieve
              </span>
            </div>

            {/* Investor: Browse Marketplace */}
            {user?.role === "investor" && (
              <div
                onClick={() => { navigate(`${base}/investment`); setIsMenuOpen(false); }}
                className="flex items-center gap-4 cursor-pointer group"
              >
                <TrendingUp className="w-6 h-6 text-[#01C259]" />
                <span className="text-lg font-light text-black group-hover:text-gray-700">
                  Browse Marketplace
                </span>
              </div>
            )}
          </div>

          {/* Close Button */}
          <Button
            onClick={() => setIsMenuOpen(false)}
            className="w-25 h-25 pb-6 bg-transparent rounded-full flex items-end justify-end transition-transform hover:scale-105"
          >
            <img
              src="/subtract.svg"
              alt="subtract"
              className="w-15 h-15 -mr-2"
            />
          </Button>
        </div>
      )}
    </>
  );
}
