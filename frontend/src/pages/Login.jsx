import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaSearch, FaSignInAlt } from "react-icons/fa";

import api from "../services/api";
import { saveAuth } from "../services/auth";
import Navbar from "../components/Navbar";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from;

  // Check whether Login was reached because of session expiry.
  useEffect(() => {
    const expired =
      sessionStorage.getItem("sessionExpired");

    if (expired === "true") {
      setSessionExpired(true);

      // Remove the flag so the message is not shown
      // on future normal visits to Login.
      sessionStorage.removeItem("sessionExpired");
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        username,
        password,
      });

      // Save new JWT and user information.
      saveAuth(
        response.data.token,
        response.data.user
      );

      // --------------------------------------------------
      // Find original destination after session expiry.
      // --------------------------------------------------
      const savedRedirect =
        sessionStorage.getItem(
          "sessionExpiredRedirect"
        );

      // Remove it after reading.
      sessionStorage.removeItem(
        "sessionExpiredRedirect"
      );

      const role = response.data.user.role;

      // Prefer the session-expiry destination.
      if (
        savedRedirect &&
        savedRedirect.startsWith("/") &&
        !savedRedirect.startsWith("/login")
      ) {
        navigate(savedRedirect, { replace: true });
      }

      // Existing ProtectedRoute redirect destination.
      else if (
        redirectTo &&
        !redirectTo.startsWith("/login")
      ) {
        navigate(redirectTo, { replace: true });
      }

      // Normal admin login.
      else if (role === "admin") {
        navigate("/admin", { replace: true });
      }

      // Normal student login.
      else {
        navigate("/student", { replace: true });
      }
    } catch (error) {
      // --------------------------------------------------
      // Login 401 is NOT handled by the global session
      // expiry interceptor because /auth/login is excluded.
      // --------------------------------------------------

      if (error.response) {
        if (error.response.status === 401) {
          setError("Invalid username or password");
        } else if (error.response.status === 403) {
          setError(
            "Access denied. You do not have permission to log in."
          );
        } else {
          setError(
            error.response.data?.message ||
              `Login failed (status ${error.response.status})`
          );
        }
      } else {
        // Network error.
        setError(
          "Cannot reach the server. Please check that the backend is running on http://localhost:3000"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="login-container">
        <h1>Login</h1>

        <p className="login-subtitle">
          Sign in to enroll in courses.
        </p>

        {/* Session expired message */}
        {sessionExpired && (
          <p className="error">
            Your session has expired. Please log in again.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="Enter username"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {/* Login error */}
          {error && (
            <p className="error">{error}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            <FaSignInAlt />

            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        <p className="login-footer">
          Not sure where to go?{" "}
          <Link to="/courses">
            <FaSearch /> Browse the courses
          </Link>{" "}
          first.
        </p>
      </div>
    </>
  );
}

export default Login;