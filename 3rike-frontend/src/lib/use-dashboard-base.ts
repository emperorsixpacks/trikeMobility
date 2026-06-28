import { useAuth } from "./auth";

/** Returns "/driver" or "/investor" based on the current user's role. */
export function useDashboardBase(): string {
  const { user } = useAuth();
  return user?.role === "investor" ? "/investor" : "/driver";
}
