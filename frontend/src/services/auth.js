
const TOKEN_KEY = "token";
const USER_KEY = "user";

// Save authentication data after login.
export function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Get saved token.
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Get saved user.
export function getUser() {
  const userJson = localStorage.getItem(USER_KEY);

  if (!userJson) {
    return null;
  }

  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

// Update saved user information after a profile update.
// This does not change the token, username, or role.
export function updateStoredUser(updatedUser) {
  const currentUser = getUser();

  if (!currentUser || !updatedUser) {
    return null;
  }

  const mergedUser = {
    ...currentUser,
    id: updatedUser.id ?? currentUser.id,
    username: updatedUser.username ?? currentUser.username,
    full_name: updatedUser.full_name ?? currentUser.full_name,
    role: updatedUser.role ?? currentUser.role,
  };

  localStorage.setItem(USER_KEY, JSON.stringify(mergedUser));

  return mergedUser;
}

// Clear authentication data on logout.
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Check login state.
export function isLoggedIn() {
  return Boolean(getToken() && getUser());
}

// Get current role.
export function getUserRole() {
  const user = getUser();
  return user ? user.role : null;
}

// Role helpers.
export function isAdmin() {
  return getUserRole() === "admin";
}

export function isStudent() {
  return getUserRole() === "student";
}
