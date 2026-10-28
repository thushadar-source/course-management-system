
import { useEffect, useState } from "react";
import { FaLock, FaSave, FaUserEdit } from "react-icons/fa";

import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  getUser,
  updateStoredUser,
} from "../services/auth";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [nameFieldError, setNameFieldError] = useState("");
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({});

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setProfileError("");

      try {
        const response = await api.get("/users/me");
        const user = response.data.user;

        if (!active) return;

        setProfile(user);
        setFullName(user.full_name || "");

        // Keep local user information consistent with the server.
        updateStoredUser(user);
      } catch (error) {
        if (!active) return;

        setProfileError(
          error.response?.data?.message ||
            "Unable to load your profile."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  function validateName() {
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      setNameFieldError("Full name is required.");
      return null;
    }

    if (trimmedName.length < 3 || trimmedName.length > 100) {
      setNameFieldError(
        "Full name must be between 3 and 100 characters."
      );
      return null;
    }

    setNameFieldError("");
    return trimmedName;
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();

    setProfileError("");
    setProfileSuccess("");

    const trimmedName = validateName();

    if (!trimmedName) return;

    setSavingProfile(true);

    try {
      const response = await api.put("/users/me", {
        full_name: trimmedName,
      });

      const updatedUser = response.data.user;

      setProfile(updatedUser);
      setFullName(updatedUser.full_name || "");

      // Update Navbar's locally stored name as well.
      updateStoredUser(updatedUser);

      setProfileSuccess(
        response.data.message || "Profile updated successfully."
      );
    } catch (error) {
      const data = error.response?.data;

      setProfileError(
        data?.message || "Unable to update your profile."
      );

      if (data?.errors?.full_name) {
        setNameFieldError(data.errors.full_name);
      }
    } finally {
      setSavingProfile(false);
    }
  }

  function validatePasswords() {
    const errors = {};

    if (!currentPassword) {
      errors.currentPassword = "Current password is required.";
    }

    if (!newPassword) {
      errors.newPassword = "New password is required.";
    } else if (newPassword.length < 8) {
      errors.newPassword =
        "New password must be at least 8 characters.";
    } else if (
      new TextEncoder().encode(newPassword).length > 72
    ) {
      errors.newPassword =
        "Password must not exceed 72 UTF-8 bytes.";
    }

    if (!confirmPassword) {
      errors.confirmPassword =
        "Please confirm your new password.";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (
      currentPassword &&
      newPassword &&
      currentPassword === newPassword
    ) {
      errors.newPassword =
        "New password must differ from the current password.";
    }

    setPasswordFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    if (!validatePasswords()) return;

    setSavingPassword(true);

    try {
      const response = await api.put("/users/me/password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPasswordSuccess(
        response.data.message || "Password changed successfully."
      );

      // Clear sensitive fields after successful change.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFieldErrors({});
    } catch (error) {
      const data = error.response?.data;

      setPasswordError(
        data?.message || "Unable to change your password."
      );

      if (data?.errors) {
        setPasswordFieldErrors(data.errors);
      }
    } finally {
      setSavingPassword(false);
    }
  }

  const displayedUser = profile || getUser();

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="container profile-page">
          <p className="loading">Loading your profile...</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="container profile-page">
        <header className="page-header">
          <div>
            <h1>My Profile</h1>
            <p className="page-subtitle">
              View your account information and manage your security.
            </p>
          </div>
        </header>

        {profileError && (
          <div className="error" role="alert">
            {profileError}
          </div>
        )}

        {/* Profile information */}
        <section className="section-card profile-card">
          <div className="section-card-header">
            <h2>
              <FaUserEdit /> Profile Information
            </h2>
          </div>

          {displayedUser && (
            <dl className="profile-information">
              <div className="profile-information-row">
                <dt>User ID</dt>
                <dd>{displayedUser.id ?? "—"}</dd>
              </div>

              <div className="profile-information-row">
                <dt>Username</dt>
                <dd>{displayedUser.username || "—"}</dd>
              </div>

              <div className="profile-information-row">
                <dt>Role</dt>
                <dd>
                  <span className="role-badge">
                    {displayedUser.role || "—"}
                  </span>
                </dd>
              </div>
            </dl>
          )}

          <p className="profile-help-text">
            Your username and role cannot be changed from this page.
          </p>
        </section>

        {/* Update full name */}
        <section className="section-card profile-card">
          <div className="section-card-header">
            <h2>
              <FaUserEdit /> Change Full Name
            </h2>
          </div>

          {profileSuccess && (
            <div className="success" role="status">
              {profileSuccess}
            </div>
          )}

          <form className="form" onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label htmlFor="profile-username">Username</label>
              <input
                id="profile-username"
                className="input"
                value={displayedUser?.username || ""}
                readOnly
              />
            </div>

            <div className="form-group">
              <label htmlFor="profile-full-name">Full name</label>
              <input
                id="profile-full-name"
                className="input"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  setNameFieldError("");
                  setProfileSuccess("");
                }}
                minLength={3}
                maxLength={100}
                autoComplete="name"
                aria-invalid={Boolean(nameFieldError)}
                aria-describedby={
                  nameFieldError ? "full-name-error" : undefined
                }
              />

              {nameFieldError && (
                <small
                  id="full-name-error"
                  className="field-error"
                >
                  {nameFieldError}
                </small>
              )}
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingProfile}
              >
                <FaSave />
                {savingProfile ? "Saving..." : "Save Full Name"}
              </button>
            </div>
          </form>
        </section>

        {/* Change password */}
        <section className="section-card profile-card">
          <div className="section-card-header">
            <h2>
              <FaLock /> Change Password
            </h2>
          </div>

          <p className="profile-help-text">
            Use at least 8 characters. Your current password is
            required to authorize this change.
          </p>

          {passwordError && (
            <div className="error" role="alert">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="success" role="status">
              {passwordSuccess}
            </div>
          )}

          <form className="form" onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label htmlFor="current-password">
                Current password
              </label>
              <input
                id="current-password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);
                  setPasswordFieldErrors((old) => ({
                    ...old,
                    currentPassword: "",
                  }));
                }}
                aria-invalid={Boolean(
                  passwordFieldErrors.currentPassword
                )}
              />
              {passwordFieldErrors.currentPassword && (
                <small className="field-error">
                  {passwordFieldErrors.currentPassword}
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                className="input"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setPasswordFieldErrors((old) => ({
                    ...old,
                    newPassword: "",
                  }));
                }}
                aria-invalid={Boolean(
                  passwordFieldErrors.newPassword
                )}
              />
              {passwordFieldErrors.newPassword && (
                <small className="field-error">
                  {passwordFieldErrors.newPassword}
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                className="input"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setPasswordFieldErrors((old) => ({
                    ...old,
                    confirmPassword: "",
                  }));
                }}
                aria-invalid={Boolean(
                  passwordFieldErrors.confirmPassword
                )}
              />
              {passwordFieldErrors.confirmPassword && (
                <small className="field-error">
                  {passwordFieldErrors.confirmPassword}
                </small>
              )}
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingPassword}
              >
                <FaLock />
                {savingPassword
                  ? "Changing password..."
                  : "Change Password"}
              </button>
            </div>
          </form>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Profile;
