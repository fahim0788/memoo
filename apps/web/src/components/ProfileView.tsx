"use client";

import { useState } from "react";
import { Header } from "./Header";
import { StatsDetail } from "./StatsCard";

import { t } from "../lib/i18n";
import { useLanguage } from "../hooks/useLanguage";
import { useAuth } from "../contexts/AuthContext";
import type { Stats } from "../hooks/useStats";

type ProfileViewProps = {
  onBack: () => void;
  userName?: string;
  onLogout?: () => void;
  onHelp?: () => void;
  stats?: Stats | null;
};

export function ProfileView({ onBack, userName, onLogout, onHelp, stats }: ProfileViewProps) {
  useLanguage();
  const { user, updateProfile } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasInfoChanges =
    firstName !== (user?.firstName || "") ||
    lastName !== (user?.lastName || "") ||
    email !== (user?.email || "");

  const hasPasswordChange = newPassword.length > 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (hasPasswordChange) {
      if (newPassword !== confirmPassword) {
        setError(t.profile.passwordMismatch);
        return;
      }
      if (!currentPassword) {
        setError(t.profile.currentPasswordRequired);
        return;
      }
    }

    if (email !== (user?.email || "") && !currentPassword) {
      setError(t.profile.currentPasswordRequired);
      return;
    }

    try {
      setSaving(true);
      await updateProfile({
        ...(firstName !== user?.firstName && { firstName }),
        ...(lastName !== user?.lastName && { lastName }),
        ...(email !== user?.email && { email }),
        ...(currentPassword && { currentPassword }),
        ...(newPassword && { newPassword }),
      });
      setSuccess(t.profile.saved);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.profile.errorUpdate);
    } finally {
      setSaving(false);
    }
  }

  const memberSinceDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <>
      <Header
        userName={userName}
        onLogout={onLogout}
        onHelp={onHelp}
        title={t.profile.title}
        onBack={onBack}
      />

      {stats && <StatsDetail stats={stats} />}

      <form
        onSubmit={handleSave}
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}
      >
        <div>
          <label htmlFor="profile-firstName" className="small">{t.profile.firstName}</label>
          <input
            id="profile-firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="profile-lastName" className="small">{t.profile.lastName}</label>
          <input
            id="profile-lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="profile-email" className="small">{t.profile.email}</label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {memberSinceDate && (
          <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
            {t.profile.memberSince} {memberSinceDate}
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
          {!showPasswordSection ? (
            <button
              type="button"
              onClick={() => setShowPasswordSection(true)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--color-primary)",
                fontSize: "0.875rem",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              {t.profile.changePassword}
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label htmlFor="profile-currentPassword" className="small">{t.profile.currentPassword}</label>
                <input
                  id="profile-currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label htmlFor="profile-newPassword" className="small">{t.profile.newPassword}</label>
                <input
                  id="profile-newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
              <div>
                <label htmlFor="profile-confirmPassword" className="small">{t.profile.confirmPassword}</label>
                <input
                  id="profile-confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}
        </div>

        {/* Email change also requires current password */}
        {email !== (user?.email || "") && !showPasswordSection && (
          <div>
            <label htmlFor="profile-currentPassword-email" className="small">{t.profile.currentPassword}</label>
            <input
              id="profile-currentPassword-email"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        )}

        {error && (
          <div className="badge bad" style={{ alignSelf: "stretch", textAlign: "center" }}>
            {error}
          </div>
        )}

        {success && (
          <div className="badge good" style={{ alignSelf: "stretch", textAlign: "center" }}>
            {success}
          </div>
        )}

        <button
          type="submit"
          className="primary"
          disabled={saving || (!hasInfoChanges && !hasPasswordChange)}
          style={{ opacity: saving || (!hasInfoChanges && !hasPasswordChange) ? 0.7 : 1, marginTop: "0.25rem" }}
        >
          {saving ? t.profile.saving : t.profile.save}
        </button>
      </form>
    </>
  );
}
