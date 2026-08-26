import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/layout/TopNav";
import { useApp } from "../context/AppContext";
import { useAppBackNavigation } from "../utils/useAppBackNavigation";
import {
  User, Lock, Globe, Sun, Trash2, LogOut, ChevronRight,
  ArrowLeft, Sparkles, Shield, Database,
} from "lucide-react";
import "../styles/global.css";
import "../styles/pages.css";

const SETTINGS_SECTIONS = [
  {
    title: "PREFERENCES",
    items: [
      { label: "Appearance", desc: "Light, dark, or system theme", icon: Sun, iconColor: "#F59E0B", iconBg: "rgba(245, 158, 11, 0.1)", to: "/settings/appearance" },
      { label: "Language", desc: "English, Tamil, or Hindi", icon: Globe, iconColor: "#3B82F6", iconBg: "rgba(59, 130, 246, 0.1)", to: "/settings/language" },
      { label: "AI Assistant", desc: "Answer style and memory recall", icon: Sparkles, iconColor: "#8B5CF6", iconBg: "rgba(139, 92, 246, 0.1)", to: "/settings/ai" },
    ],
  },
  {
    title: "ACCOUNT & SECURITY",
    items: [
      { label: "Personal Info", desc: "Name and profile photo", icon: User, iconColor: "#10B981", iconBg: "rgba(16, 185, 129, 0.1)", to: "/settings/profile" },
      { label: "Security", desc: "Change account password", icon: Lock, iconColor: "#EC4899", iconBg: "rgba(236, 72, 153, 0.1)", to: "/settings/security" },
      { label: "Vault Lock", desc: "Auto-lock timer and PIN", icon: Shield, iconColor: "#06B6D4", iconBg: "rgba(6, 182, 212, 0.1)", to: "/settings/vault-security" },
    ],
  },
  {
    title: "DATA & STORAGE",
    items: [
      { label: "Backup & Data", desc: "Export, import, and storage", icon: Database, iconColor: "#3B82F6", iconBg: "rgba(59, 130, 246, 0.1)", to: "/settings/data" },
      { label: "Recently Deleted", desc: "Restore deleted memories", icon: Trash2, iconColor: "#64748B", iconBg: "rgba(100, 116, 139, 0.1)", to: "/deleted" },
    ],
  },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { handleLogout } = useApp();
  const goBack = useAppBackNavigation("/profile");
  const containerRef = useRef(null);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  const onLogout = () => {
    handleLogout();
    navigate("/");
  };

  return (
    <div className="app">
      <TopNav />
      <div className="main-content settings-page" ref={containerRef}>
        <button className="back-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>

        <div className="settings-header">
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Manage preferences, security, and personal data</p>
        </div>


        {SETTINGS_SECTIONS.map((section) => (
          <div key={section.title} className="modern-settings-section">
            <div className="modern-section-label">{section.title}</div>
            <div className="modern-settings-card">
              {section.items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    onClick={() => navigate(item.to, { state: { from: "/settings" } })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      borderBottom: idx < section.items.length - 1 ? "1px solid var(--border-light, #f1f5f9)" : "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: item.iconBg,
                          color: item.iconColor,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <div style={{ fontSize: "14.5px", fontWeight: "600", color: "var(--text-primary)" }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <span style={{ color: "var(--text-tertiary)" }}>
                      <ChevronRight size={18} strokeWidth={2} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="modern-settings-section" style={{ marginTop: "32px" }}>
          <div className="modern-section-label">ACCOUNT ACTIONS</div>
          <div className="modern-settings-card">
            <div
              onClick={onLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 16px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#EF4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <LogOut size={18} strokeWidth={2} />
              </div>
              <span style={{ fontSize: "14.5px", fontWeight: "600", color: "#EF4444" }}>Log Out</span>
            </div>
          </div>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}