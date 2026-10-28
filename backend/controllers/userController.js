
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");

const BCRYPT_ROUNDS = 10;
const BCRYPT_MAX_BYTES = 72;
const MAX_FAILED_PASSWORD_ATTEMPTS = 5;
const PASSWORD_LOCKOUT_MS = 15 * 60 * 1000;

// In-memory failed password attempt tracking.
// Keyed by authenticated user ID.
const passwordAttempts = new Map();

function getAuthenticatedUserId(req) {
  // Adapt this to the field your existing authentication middleware sets.
  return req.user?.id ?? req.user?.userId ?? null;
}

function getAuthenticatedRole(req) {
  return req.user?.role ?? null;
}

function publicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
  };
}

function validateFullName(value) {
  if (typeof value !== "string") {
    return "Full name is required.";
  }

  const fullName = value.trim();

  if (!fullName) {
    return "Full name cannot be blank.";
  }

  if (fullName.length < 3 || fullName.length > 100) {
    return "Full name must be between 3 and 100 characters.";
  }

  return null;
}

function getPasswordAttemptState(userId) {
  const current = passwordAttempts.get(String(userId));

  if (!current) {
    return { count: 0, lockedUntil: 0 };
  }

  if (current.lockedUntil && Date.now() >= current.lockedUntil) {
    passwordAttempts.delete(String(userId));
    return { count: 0, lockedUntil: 0 };
  }

  return current;
}

function recordFailedPasswordAttempt(userId) {
  const key = String(userId);
  const state = getPasswordAttemptState(userId);
  const nextCount = state.count + 1;

  if (nextCount >= MAX_FAILED_PASSWORD_ATTEMPTS) {
    const lockedUntil = Date.now() + PASSWORD_LOCKOUT_MS;

    passwordAttempts.set(key, {
      count: nextCount,
      lockedUntil,
    });

    return {
      limited: true,
      retryAfterSeconds: Math.ceil(PASSWORD_LOCKOUT_MS / 1000),
    };
  }

  passwordAttempts.set(key, {
    count: nextCount,
    lockedUntil: 0,
  });

  return {
    limited: false,
    remainingAttempts: MAX_FAILED_PASSWORD_ATTEMPTS - nextCount,
  };
}

// GET /api/users/me
const getMyProfile = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "Profile retrieved successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    // Do not log credentials, request bodies, or password hashes.
    console.error("Error retrieving profile.");

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// PUT /api/users/me
const updateMyProfile = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    // Only full_name is accepted.
    // Any username/role fields in the request are ignored.
    const validationError = validateFullName(req.body?.full_name);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
        errors: {
          full_name: validationError,
        },
      });
    }

    const fullName = req.body.full_name.trim();
    const updatedUser = await User.updateFullName(userId, fullName);

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: publicUser(updatedUser),
    });
  } catch (error) {
    console.error("Error updating profile.");

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// PUT /api/users/me/password
const changeMyPassword = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const attemptState = getPasswordAttemptState(userId);

    if (
      attemptState.lockedUntil &&
      Date.now() < attemptState.lockedUntil
    ) {
      const retryAfterSeconds = Math.ceil(
        (attemptState.lockedUntil - Date.now()) / 1000
      );

      res.set("Retry-After", String(retryAfterSeconds));

      return res.status(429).json({
        message:
          "Too many failed password attempts. Please try again later.",
        retryAfterSeconds,
      });
    }

    const { currentPassword, newPassword, confirmPassword } =
      req.body || {};

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return res.status(400).json({
        message: "All password fields are required.",
        errors: {
          currentPassword: "Current password is required.",
          newPassword: "New password is required.",
          confirmPassword: "Password confirmation is required.",
        },
      });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "All password fields are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters long.",
        errors: {
          newPassword: "Use at least 8 characters.",
        },
      });
    }

    // bcrypt processes a maximum of 72 bytes, not 72 characters.
    if (Buffer.byteLength(newPassword, "utf8") > BCRYPT_MAX_BYTES) {
      return res.status(400).json({
        message: "New password exceeds bcrypt's 72-byte maximum.",
        errors: {
          newPassword: "Password must not exceed 72 UTF-8 bytes.",
        },
      });
    }

    if (Buffer.byteLength(currentPassword, "utf8") > BCRYPT_MAX_BYTES) {
      return res.status(400).json({
        message: "Current password is invalid.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Password confirmation does not match.",
        errors: {
          confirmPassword: "Passwords do not match.",
        },
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must differ from the current password.",
        errors: {
          newPassword: "Choose a different password.",
        },
      });
    }

    const currentHash = await User.findPasswordHashById(userId);

    if (!currentHash) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      currentHash
    );

    if (!passwordMatches) {
      const failure = recordFailedPasswordAttempt(userId);

      if (failure.limited) {
        res.set(
          "Retry-After",
          String(failure.retryAfterSeconds)
        );

        return res.status(429).json({
          message:
            "Too many failed password attempts. Please try again later.",
          retryAfterSeconds: failure.retryAfterSeconds,
        });
      }

      return res.status(401).json({
        message: "Current password is incorrect.",
        remainingAttempts: failure.remainingAttempts,
      });
    }

    // Reset the failed-attempt counter after successful verification.
    passwordAttempts.delete(String(userId));

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await User.updatePassword(userId, newHash);

    // Never return the hash or any password.
    return res.status(200).json({
      message: "Password changed successfully.",
    });
  } catch (error) {
    // Never log the request body, password values, or hash.
    console.error("Error changing password.");

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const requesterId = getAuthenticatedUserId(req);
    const requesterRole = getAuthenticatedRole(req);
    const requestedId = String(req.params.id);

    if (!requesterId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    if (
      String(requesterId) !== requestedId &&
      requesterRole !== "admin"
    ) {
      return res.status(403).json({
        message: "You are not allowed to access this user's information.",
      });
    }

    const user = await User.findById(requestedId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "User found.",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Error finding user by ID.");

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// GET /api/users/username/:username
const getUserByUsername = async (req, res) => {
  try {
    const requesterId = getAuthenticatedUserId(req);
    const requesterRole = getAuthenticatedRole(req);

    if (!requesterId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const requestedUsername = req.params.username;
    const requestedUser = await User.findByUsername(requestedUsername);

    if (!requestedUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (
      String(requesterId) !== String(requestedUser.id) &&
      requesterRole !== "admin"
    ) {
      return res.status(403).json({
        message: "You are not allowed to access this user's information.",
      });
    }

    return res.status(200).json({
      message: "User found.",
      user: publicUser(requestedUser),
    });
  } catch (error) {
    console.error("Error finding user by username.");

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  getUserByUsername,
  getUserById,
};
