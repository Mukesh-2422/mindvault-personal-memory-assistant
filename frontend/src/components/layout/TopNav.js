import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { getInitials } from "../../utils/helpers";
import { Search, Users, Calendar, Layout, Brain, Bell, Command } from "lucide-react";
import CommandPalette from "../common/CommandPalette";
import NotificationDrawer from "./NotificationDrawer";

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useApp();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  // Global keyboard shortcut for Command Palette (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Only show the navigation bar on the main/home/dashboard page
  if (!isActive("/home")) {
    return (
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    );
  }

  // Count active notifications/reminders
  const memories = (state.memories || []).filter((m) => !m.deleted && !m.vaultId);
  const reminderCount = memories.reduce((acc, m) => {
    if (Array.isArray(m.reminders) && m.reminders.length > 0) return acc + m.reminders.length;
    return acc;
  }, 0);

  return (
    <>
      <nav className="top-nav">
        <div className="nav-left">
          <button
            className="nav-brand-btn"
            onClick={() => navigate("/vault")}
            title="Open Private Vault"
          >
            <div className="nav-brand-icon-wrapper">
              <Brain size={18} strokeWidth={2} />
            </div>
            <span className="nav-brand-title">MindVault</span>
          </button>
          <button
            className={`nav-btn nav-search-pill ${isActive("/search") ? "active" : ""}`}
            onClick={() => setCommandPaletteOpen(true)}
            title="Search & Commands (Ctrl+K)"
          >
            <Search size={15} strokeWidth={2} />
            <span>Search</span>
            <kbd
              style={{
                marginLeft: "6px",
                fontSize: "10px",
                padding: "1px 5px",
                borderRadius: "4px",
                background: "var(--bg-subtle, rgba(0,0,0,0.06))",
                color: "var(--text-tertiary)",
                border: "1px solid var(--border-color, rgba(0,0,0,0.08))",
              }}
            >
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="nav-center">
          <button
            className={`nav-btn ${isActive("/collections") ? "active" : ""}`}
            onClick={() => navigate("/collections")}
          >
            <Layout size={16} strokeWidth={1.5} />
            <span>Collections</span>
          </button>
          <button
            className={`nav-btn ${isActive("/people") ? "active" : ""}`}
            onClick={() => navigate("/people")}
          >
            <Users size={16} strokeWidth={1.5} />
            <span>People</span>
          </button>
        </div>

        <div className="nav-right">
          <button
            className={`nav-btn ${isActive("/timeline") ? "active" : ""}`}
            onClick={() => navigate("/timeline")}
          >
            <Calendar size={16} strokeWidth={1.5} />
            <span>Timeline</span>
          </button>

          <button
            className="nav-btn"
            onClick={() => setNotificationDrawerOpen(true)}
            title="Notifications & Reminders"
            style={{ position: "relative", padding: "8px" }}
          >
            <Bell size={17} strokeWidth={1.5} />
            {reminderCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "4px",
                  right: "4px",
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: "#ef4444",
                }}
              />
            )}
          </button>

          <button
            className="nav-avatar"
            onClick={() => navigate("/profile")}
            title="Profile"
          >
            {state.user?.avatar ? (
              <img src={state.user.avatar} alt={state.user?.name || "User"} />
            ) : (
              getInitials(state.user?.name || "M")
            )}
          </button>
        </div>
      </nav>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      <NotificationDrawer
        isOpen={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
      />
    </>
  );
}
