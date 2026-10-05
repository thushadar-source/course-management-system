import { Navigate, useLocation } from "react-router-dom";

import { getUser, getToken } from "../services/auth";

function ProtectedRoute({ children, role }) {
  const location = useLocation();

  const token = getToken();
  const user = getUser();

  // --------------------------------------------------
  // 1. Not logged in
  // --------------------------------------------------
  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        state={{
          from:
            location.pathname +
            location.search +
            location.hash,
        }}
        replace
      />
    );
  }

  // --------------------------------------------------
  // 2. Logged in but wrong role
  // --------------------------------------------------
  if (role && user.role !== role) {
    return (
      <div className="access-denied-container">
        <h1>Access Denied</h1>

        <p>
          Access denied. You do not have permission
          to access this page.
        </p>

        <p>
          You are currently logged in as{" "}
          <strong>{user.role}</strong>.
        </p>
      </div>
    );
  }

  // --------------------------------------------------
  // 3. Authenticated and authorized
  // --------------------------------------------------
  return children;
}

export default ProtectedRoute;