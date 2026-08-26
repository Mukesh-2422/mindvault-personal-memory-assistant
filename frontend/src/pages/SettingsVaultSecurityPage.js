import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/layout/TopNav";
import { useApp } from "../context/AppContext";
import { useAppBackNavigation } from "../utils/useAppBackNavigation";
import {
  ArrowLeft,
  Shield,
  Lock,
  Clock,
  Check,
  CheckCircle2,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import "../styles/global.css";
import "../styles/pages.css";

const AUTO_LOCK_OPTIONS = [
  { id: "immediately", label: "Immediately", desc: "Locks when leaving the vault page" },
  { id: "5m", label: "5 minutes", desc: "Locks after 5 minutes of inactivity" },
  { id: "15m", label: "15 minutes", desc: "Locks after 15 minutes of inactivity" },
  { id: "30m", label: "30 minutes", desc: "Locks after 30 minutes of inactivity" },
  { id: "never", label: "When browser closes", desc: "Stays unlocked during this session" },
];

export default function SettingsVaultSecurityPage() {
  const navigate = useNavigate();
  const goBack = useAppBackNavigation("/settings");
  const { state, dispatch } = useApp();
  const containerRef = useRef(null);
  const [toast, setToast] = useState(null);

  const currentAutoLock = state.vaultAutoLock || "5m";

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  const handleSelectAutoLock = (optionId) => {
    dispatch({ type: "SET_VAULT_AUTO_LOCK", payload: optionId });
    setToast("Auto-lock updated");
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="app">
      <TopNav />
      <div className="main-content settings-sub-page" ref={containerRef}>
        <button className="back-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>

        <div className="settings-header">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              background: "var(--accent-subtle)",
              color: "var(--accent)",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            <Shield size={13} strokeWidth={2.5} />
            <span>Vault Security</span>
          </div>
          <h1 className="settings-title">Vault Lock</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
            Choose auto-lock timer and manage vault security.
          </p>
        </div>

        {/* Vault Status Summary */}
        <p className="section-label">VAULT PIN</p>
        <div className="profile-section" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: state.vaultPasswordSet ? "rgba(16, 185, 129, 0.1)" : "var(--bg-secondary)",
                color: state.vaultPasswordSet ? "#10B981" : "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lock size={16} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                {state.vaultPasswordSet ? "PIN Active" : "No PIN Set"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                {state.vaultPasswordSet ? "Private memories are locked with PIN" : "Set a PIN to lock private memories"}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate("/vault")}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <KeyRound size={13} />
            <span>Open Vault</span>
            <ExternalLink size={12} />
          </button>
        </div>

        {/* Auto Lock Timer Options */}
        <p className="section-label" style={{ marginTop: "24px" }}>AUTO-LOCK TIMER</p>
        <div className="profile-section" style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "12px" }}>
          {AUTO_LOCK_OPTIONS.map((opt) => {
            const isSelected = currentAutoLock === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => handleSelectAutoLock(opt.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: isSelected ? "var(--bg-secondary)" : "transparent",
                  border: isSelected ? "1.5px solid var(--accent)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Clock size={15} color={isSelected ? "var(--accent)" : "var(--text-tertiary)"} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "1px" }}>
                      {opt.desc}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "var(--accent)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={11} strokeWidth={3} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Toast */}
        {toast && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              position: "fixed",
              bottom: "24px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--navy, #0F2F5B)",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "600",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              zIndex: 9999,
            }}
          >
            <CheckCircle2 size={16} color="#38bdf8" />
            <span>{toast}</span>
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
