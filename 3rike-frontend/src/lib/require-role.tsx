// Route guard that requires a specific role. Must be used inside <RequireAuth />.
// Redirects to the correct dashboard if the user has the wrong role.

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth";
import type { Role } from "./api";

export default function RequireRole({ roles }: { roles: Role[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-3 border-[#01C259] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!roles.includes(user.role)) {
    // Redirect to the correct dashboard for their role
    return <Navigate to={user.role === "investor" ? "/investor" : "/driver"} replace />;
  }

  return <Outlet />;
}
