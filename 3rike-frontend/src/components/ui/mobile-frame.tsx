import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /**
   * Background color of the inner phone-shaped frame. Defaults to white. Pages
   * that need a tinted background (success screens, etc.) can override.
   */
  innerBg?: string;
  /** Extra classes for the inner frame (padding, padding-bottom, etc.). */
  innerClassName?: string;
};

/**
 * Phone-frame wrapper used by every full-page screen in the driver app. Places
 * a max-width column with shadow on a white canvas so the app reads as a
 * mobile-first product even on desktop. Use this around full pages — modals
 * and overlays manage their own positioning.
 */
export default function MobileFrame({
  children,
  innerBg = "bg-white",
  innerClassName = "",
}: Props) {
  return (
    <div className="min-h-screen bg-white flex justify-center overflow-x-hidden">
      <div
        className={`w-full max-w-100 ${innerBg} shadow-2xl overflow-hidden min-h-200 relative ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
