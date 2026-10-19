import { useEffect, useRef, useState } from "react";

// Each step is paired with the app screen that illustrates it.
const steps = [
  {
    text: "Get an electric three - wheeler  with minimal upfront",
    size: "lg:w-[515px] lg:h-[102px]",
    screen: "/driver-app-purchase.png",
    alt: "3rike app: buy a three-wheeler fleet",
  },
  {
    text: "Own the vehicle outright  in  70 weeks",
    size: "lg:w-[511px] lg:h-[65px]",
    screen: "/driver-app-dashboard.png",
    alt: "3rike app: driver earnings dashboard",
  },
  {
    text: "Pay  affordable  weekly\ninstallments",
    size: "lg:w-[509px] lg:h-[84px]",
    screen: "/driver-app-transfer.png",
    alt: "3rike app: deposit by bank transfer",
  },
];

// The incoming screen slides up over the current one, which sinks back and dims.
const SCREEN_EASE = "duration-[900ms] ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:duration-0";
const screenState = {
  active: `z-20 [clip-path:inset(0_0_0_0_round_50px)] scale-100 brightness-100 transition-[clip-path,scale,filter] ${SCREEN_EASE}`,
  previous: `z-10 [clip-path:inset(0_0_0_0_round_50px)] scale-[0.92] brightness-[0.55] transition-[scale,filter] ${SCREEN_EASE}`,
  idle: "z-0 [clip-path:inset(100%_0_0_0_round_50px)] scale-[1.08] transition-none",
};

type PhoneScreensProps = {
  active: number;
  previous: number | null;
  onNext: () => void;
};

const PhoneScreens = ({ active, previous, onNext }: PhoneScreensProps) => {
  return (
    <button
      type="button"
      onClick={onNext}
      aria-label="Show next app screen"
      className="relative block aspect-[321.508/699] w-[260px] shrink-0 cursor-pointer rounded-[50px] border-[5px] border-black bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#829E04] sm:w-[321.508px]"
    >
      {steps.map((step, i) => {
        const state = i === active ? "active" : i === previous ? "previous" : "idle";
        return (
          <img
            key={step.screen}
            src={step.screen}
            alt={i === active ? step.alt : ""}
            aria-hidden={i !== active}
            decoding="async"
            className={`pointer-events-none absolute inset-0 size-full rounded-[50px] object-cover ${screenState[state]}`}
          />
        );
      })}
    </button>
  );
};

const ForDrivers = () => {
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  // Bumped on every selection so the countdown bar remounts and starts over.
  const [cycle, setCycle] = useState(0);
  const [inView, setInView] = useState(false);
  const [hovering, setHovering] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const goTo = (i: number) => {
    if (i !== active) {
      setPrevious(active);
      setActive(i);
    }
    setCycle((c) => c + 1);
  };
  const goNext = () => goTo((active + 1) % steps.length);

  // Only count down while the section is on screen.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.3,
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  const countdownPaused = !inView || hovering;

  return (
    <div className="border-b-[10px] border-[#F3FFBC] font-jakarta">
      <div className="mx-auto max-w-[1440px] px-4 pt-16 pb-16 md:px-[78px] md:pt-24 lg:pt-[162px] lg:pr-[72px] lg:pb-[125px] lg:pl-[107px]">
        {/* HOW IT WORKS pill */}
        <div className="inline-flex h-[35px] w-[195px] items-center rounded-[100px] border border-[#EDE4FF] bg-[#F5F0FF] pl-[6px]">
          <span className="flex size-[25px] shrink-0 items-start rounded-[12.5px] bg-[#829E04] pt-[5.488px] pl-[5.488px]">
            <img src="/flash.svg" alt="" className="size-[14.634px]" />
          </span>
          <span className="flex-1 text-center text-[18px] font-medium uppercase leading-[31px] tracking-[-0.48px] text-[#1A0A33]">
            How it works
          </span>
        </div>

        {/* Heading + intro */}
        <div className="mt-8 flex flex-col gap-4 lg:mt-[89.5px] lg:flex-row lg:items-center lg:justify-between lg:gap-0">
          <h2 className="whitespace-pre-wrap text-[40px] font-semibold leading-[1.015] tracking-[-2px] text-white md:text-[60px] md:tracking-[-3.24px] lg:w-[448px]">
            {`FOR  DRIVERS`}
          </h2>
          <p className="max-w-[292px] text-[18px] font-medium leading-[31px] tracking-[-0.48px] text-[#FEFFF8] md:text-[20px]">
            Owning a ride should feel as simple as saying what you need.
          </p>
        </div>

        {/* Steps + phone */}
        <div
          ref={rowRef}
          onPointerEnter={(e) => e.pointerType === "mouse" && setHovering(true)}
          onPointerLeave={() => setHovering(false)}
          className="mt-12 flex flex-col items-center gap-12 lg:mt-[101.5px] lg:flex-row lg:items-start lg:justify-between lg:gap-0"
        >
          <ul className="flex w-full flex-col gap-8 lg:mt-[80px] lg:w-[592.5px] lg:gap-[44px] lg:py-[81px]">
            {steps.map((step, i) => {
              const isActive = i === active;
              return (
                <li key={step.text} className="flex flex-col items-center gap-6 lg:gap-[40px]">
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={isActive ? "step" : undefined}
                    className={`w-full cursor-pointer whitespace-pre-wrap text-left text-[24px] font-bold leading-[1.2] tracking-[-0.8px] text-white transition-opacity duration-500 focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-[#D5FF19] md:text-[32px] md:leading-[31px] md:tracking-[-1.4px] lg:flex lg:items-center ${step.size} ${
                      isActive ? "opacity-100" : "opacity-45 hover:opacity-75"
                    }`}
                  >
                    {step.text}
                  </button>
                  <div className="relative h-0 w-full">
                    <img src="/divider-line.svg" alt="" className="absolute inset-x-0 -top-[0.5px] block h-px w-full" />
                    {isActive && (
                      <span
                        key={cycle}
                        onAnimationEnd={goNext}
                        style={{ animationPlayState: countdownPaused ? "paused" : "running" }}
                        className="animate-step-progress absolute inset-x-0 -top-[1.5px] h-[3px] origin-left rounded-full bg-[#D5FF19]"
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="relative flex w-full max-w-[514px] shrink-0 justify-center overflow-hidden rounded-[50px] bg-[#F3FFBC] pt-[50px] pb-[51px] lg:h-[800px] lg:w-[514px] lg:justify-start lg:pl-[104px]">
            <div className="pointer-events-none absolute -right-[6.69%] -bottom-[59px] -left-[3.59%] h-[223px] rounded-[135px] bg-[#F5F0FF] opacity-[0.28] blur-[43.131px]" />
            <PhoneScreens active={active} previous={previous} onNext={goNext} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForDrivers;
