
import { Navigate, useLocation } from "react-router-dom";
import { getUser, getToken } from "../services/auth";

function ProtectedRoute({ children, role }) {
  const location = useLocation();

  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    const requestedPath =
      location.pathname + location.search + location.hash;

    return (
      <Navigate
        to="/login"
        state={{ from: requestedPath }}
        replace
      />
    );
  }

  // Enforce a role only when a route explicitly requires one.
  if (role && user.role !== role) {
    return (
      <div className="access-denied-page">
        <div className="access-denied-card">
          <h1>Access denied</h1>
          <p>You do not have permission to access this page.</p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              window.location.href =
                user.role === "admin" ? "/admin" : "/student";
            }}
          >
            Go to my area
          </button>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
