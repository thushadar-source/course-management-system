import axios from "axios";
import { clearAuth, getToken } from "./auth";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
});

// Prevent multiple simultaneous 401 responses
// from causing multiple redirects.
let redirectingToLogin = false;

// Add JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const response = error.response;
    const requestUrl = error.config?.url || "";

    // --------------------------------------------------
    // Network error
    // --------------------------------------------------
    // If there is no response, this is not a 401.
    // Do not clear authentication data.
    if (!response) {
      return Promise.reject(error);
    }

    // --------------------------------------------------
    // HTTP 401 - Unauthorized
    // --------------------------------------------------
    if (response.status === 401) {
      // Login request must NOT trigger session-expiry handling.
      const isLoginRequest =
        requestUrl.includes("/auth/login");

      if (!isLoginRequest) {
        // Only treat 401 as session expiry when the user
        // currently has an authentication token.
        const token = getToken();

        if (token && !redirectingToLogin) {
          redirectingToLogin = true;

          // Preserve the page the user was trying to access.
          const currentPath =
            window.location.pathname +
            window.location.search +
            window.location.hash;

          // Save the original destination.
          if (
            currentPath &&
            currentPath !== "/login" &&
            !currentPath.startsWith("/login?")
          ) {
            sessionStorage.setItem(
              "sessionExpiredRedirect",
              currentPath
            );
          }

          // Tell Login page why the user was redirected.
          sessionStorage.setItem(
            "sessionExpired",
            "true"
          );

          // Clear stored authentication information.
          clearAuth();

          // Redirect to Login.
          window.location.href = "/login";
        }
      }
    }

    // --------------------------------------------------
    // HTTP 403 - Forbidden
    // --------------------------------------------------
    // Do NOT clear authentication information.
    // Do NOT redirect to Login.
    if (response.status === 403) {
      // The original error is passed back to the component
      // so it can display an access-denied message.
      return Promise.reject(error);
    }

    // Other errors are passed through normally.
    return Promise.reject(error);
  }
);

export default api;