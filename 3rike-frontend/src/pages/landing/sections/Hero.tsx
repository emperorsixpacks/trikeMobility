import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col text-center justify-center items-center pt-28 md:pt-48 pb-12 md:pb-20 px-4">
      <span
        className="border border-[#E2F490] bg-white rounded-full px-4 md:px-6 py-2 text-[#666666] text-sm md:text-md mb-6 md:mb-10 animate-[fade-in_0.6s_ease-out_0.2s_both]"
      >
        Sustainable and Inclusive Finance
      </span>

      <div>
        <h1 className="text-[48px] sm:text-[72px] md:text-[90px] lg:text-[110px] leading-[1.05] font-semibold text-[#1A1A1A] tracking-tight font-hepta space-y-2 md:space-y-6">
          <div className="animate-[fade-in_0.8s_ease-out_0.4s_both]">
            Own the <span className="text-[#829E04]">Ride</span>
          </div>
          <div className="animate-[fade-in_0.8s_ease-out_0.6s_both]">
            Power the <span className="text-[#829E04]">Future</span>
          </div>
        </h1>

        <p className="text-[#666666] text-base md:text-lg max-w-2xl mx-auto mt-6 md:mt-10 leading-relaxed px-0 md:px-2 animate-[fade-in_0.8s_ease-out_0.8s_both]">
          Helping Africa's mobility workers own electric vehicles and build financial identity, while offering investors predictable yields from real-world, green assets.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-8 md:mt-10 justify-center px-0 md:px-4 animate-[fade-in_0.8s_ease-out_1s_both]">
          <button
            type="button"
            onClick={() => navigate("/create-account-rider")}
            className="bg-[#829E04] text-white rounded-xm py-3 md:py-4 px-8 md:px-10 text-base md:text-lg font-medium cursor-pointer hover:bg-[#6f8703] transition-colors"
          >
            Join as a 3riker
          </button>
          <button
            type="button"
            onClick={() => navigate("/role-select")}
            className="border border-[#829E04] rounded-xm py-3 md:py-4 px-8 md:px-10 text-base md:text-lg font-medium text-[#829E04] cursor-pointer hover:bg-[#829E04]/10 transition-colors"
          >
            Earn Yields (Invest)
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
