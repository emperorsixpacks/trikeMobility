import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MobileFrame from "@/components/ui/mobile-frame";
import { Car, TrendingUp } from "lucide-react";

export default function RoleSelect() {
  const navigate = useNavigate();

  return (
    <MobileFrame innerClassName="flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">How would you like to use 3rike?</h1>
          <p className="text-sm text-gray-500">Choose your path — you can always add the other role later.</p>
        </div>

        <Button
          onClick={() => navigate("/create-account?role=driver")}
          variant="outline"
          className="w-full h-20 rounded-2xl border-2 border-gray-200 hover:border-[#01C259] hover:bg-[#E9F8EE] flex items-center gap-4 px-6 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-[#E9F8EE] flex items-center justify-center">
            <Car className="w-6 h-6 text-[#01C259]" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">I want to drive</p>
            <p className="text-xs text-gray-500">Own and operate a tricycle</p>
          </div>
        </Button>

        <Button
          onClick={() => navigate("/create-account?role=investor")}
          variant="outline"
          className="w-full h-20 rounded-2xl border-2 border-gray-200 hover:border-[#9747FF] hover:bg-[#F3EEFF] flex items-center gap-4 px-6 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-[#F3EEFF] flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-[#9747FF]" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">I want to invest</p>
            <p className="text-xs text-gray-500">Fund tricycles and earn yield</p>
          </div>
        </Button>

        <div className="text-center pt-4">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Already have an account? <span className="font-semibold text-[#01C259]">Log in</span>
          </button>
        </div>
      </div>
    </MobileFrame>
  );
}
