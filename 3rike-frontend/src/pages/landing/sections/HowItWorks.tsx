import ForDrivers from "./ForDrivers";

const HowItWorks = () => {
  return (
    <div className="bg-[#829E04]">
      <ForDrivers />

      {/* INVESTORS Section */}
      {/*
          <div className="px-4 md:px-6 md:px-[78px] pb-16 md:pb-24">
            <h2 className="text-white text-[36px] md:text-[65px] font-bold text-center mt-16 md:mt-24 mb-10 md:mb-16">
              How 3riKE Works
            </h2>

            <p className="text-[#F3FFBC] text-base md:text-[25px] font-bold tracking-[0.15em] uppercase mb-4 md:mb-6">
              INVESTORS
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-6 mb-3 md:mb-6">
              <div className="relative rounded-2xl overflow-hidden h-[220px] md:h-[350px] bg-[#FFFFFF]">
                <img
                  src="/investor_work1.png"
                  alt="Track performance transparently"
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <span className="absolute bottom-3 left-4 bg-[#829E04]/80 text-white text-sm md:text-lg italic px-3 md:px-4 py-1.5 md:py-2 rounded-lg max-w-[240px] md:max-w-xs">
                  Track performance transparently through our platform
                </span>
              </div>

              <div className="relative rounded-2xl overflow-hidden h-[220px] md:h-[350px] bg-[#FFFFFF]">
                <img
                  src="/investor_work2.png"
                  alt="Buy fractional shares"
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <span className="absolute bottom-3 left-4 bg-[#829E04]/80 text-white text-sm md:text-lg italic px-3 md:px-4 py-1.5 md:py-2 rounded-lg max-w-[240px] md:max-w-md">
                  Buy fractional shares in vehicles and batteries
                </span>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden h-[220px] md:h-[400px] bg-[#FFFFFF]">
              <img
                src="/investor_work3.png"
                alt="Earn predictable weekly yields"
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <span className="absolute top-4 left-4 bg-[#829E04]/80 text-white text-sm md:text-lg italic px-3 md:px-4 py-1.5 md:py-2 rounded-lg max-w-[280px] md:max-w-sm">
                Earn predictable weekly yields from real driver payments and swap
                fees
              </span>
            </div>
          </div>
          */}
    </div>
  );
};

export default HowItWorks;
