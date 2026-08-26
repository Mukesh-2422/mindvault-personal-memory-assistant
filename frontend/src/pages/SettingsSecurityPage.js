import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/layout/TopNav";
import { useApp } from "../context/AppContext";
import { useAppBackNavigation } from "../utils/useAppBackNavigation";
import * as authApi from "../api/auth";
import { ArrowLeft, Key, Lock, CheckCircle2 } from "lucide-react";
import "../styles/global.css";
import "../styles/pages.css";

export default function SettingsSecurityPage() {
  const navigate = useNavigate();
  const goBack = useAppBackNavigation("/settings");
  const containerRef = useRef(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage("All fields are required");
      return;
    }
    if (newPassword.length < 6) {
      setMessage("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const result = await authApi.changePassword(currentPassword, newPassword);
      setMessage(result.message || "Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app">
      <TopNav />
      <div className="main-content settings-sub-page" ref={containerRef}>
        <button className="back-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>

        <div className="settings-header">
          <div className="settings-pill-badge">
            <Lock size={12} strokeWidth={2.5} />
            <span>Security</span>
          </div>
          <h1 className="settings-title">Password & Security</h1>
          <p className="settings-subtitle">Manage your account password.</p>
        </div>


        <div className="modern-settings-section">
          <div className="modern-section-label">CHANGE PASSWORD</div>
          <div className="modern-settings-card" style={{ padding: "20px" }}>
            <div className="input-group" style={{ marginBottom: "16px" }}>
              <label className="input-label" style={{ fontSize: "12.5px" }}>Current Password</label>
              <input
                type="password"
                className="input-field"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="input-group" style={{ marginBottom: "16px" }}>
              <label className="input-label" style={{ fontSize: "12.5px" }}>New Password</label>
              <input
                type="password"
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>

            <div className="input-group" style={{ marginBottom: "16px" }}>
              <label className="input-label" style={{ fontSize: "12.5px" }}>Confirm New Password</label>
              <input
                type="password"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
              />
            </div>

            {message && (
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: "500",
                  color: message.includes("success") || message.includes("updated") ? "#10B981" : "#EF4444",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {message.includes("success") || message.includes("updated") ? <CheckCircle2 size={16} /> : null}
                <span>{message}</span>
              </p>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate("/settings")}
                style={{ borderRadius: "10px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleChangePassword}
                disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: "6px", borderRadius: "10px" }}
              >
                <Key size={13} strokeWidth={2} />
                <span>{saving ? "Updating..." : "Update Password"}</span>
              </button>
            </div>
          </div>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}