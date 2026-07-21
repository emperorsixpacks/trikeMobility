import { Outlet } from "react-router-dom";
import MobileFrame from "@/components/ui/mobile-frame";

const Loan = () => {
  return (
    <MobileFrame>
      <Outlet />
    </MobileFrame>
  );
};

export default Loan;
