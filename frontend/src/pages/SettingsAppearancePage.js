import React, { useEffect, useRef } from "react";
import TopNav from "../components/layout/TopNav";
import { useApp } from "../context/AppContext";
import { useAppBackNavigation } from "../utils/useAppBackNavigation";
import { ArrowLeft, Sun, Moon, Monitor, Check } from "lucide-react";
import "../styles/global.css";
import "../styles/pages.css";

const THEMES = [
  { label: "Light", value: "light", desc: "Clean, bright display", icon: Sun },
  { label: "Dark", value: "dark", desc: "Easy on the eyes in low light", icon: Moon },
  { label: "System", value: "system", desc: "Matches your device theme", icon: Monitor },
];

export default function SettingsAppearancePage() {
  const goBack = useAppBackNavigation("/settings");
  const { state, dispatch } = useApp();
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

  const handleSelect = (value) => {
    dispatch({ type: "SET_THEME", payload: value });
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
            <Sun size={12} strokeWidth={2.5} />
            <span>Appearance</span>
          </div>
          <h1 className="settings-title">Appearance</h1>
          <p className="settings-subtitle">Manage theme and display preferences.</p>
        </div>

        <div className="modern-settings-section">
          <div className="modern-section-label">THEME MODE</div>
          <div className="modern-settings-card">
            {THEMES.map((t) => {
              const Icon = t.icon;
              const isSelected = state.theme === t.value;
              return (
                <div
                  key={t.value}
                  onClick={() => handleSelect(t.value)}
                  className={`seamless-option-row ${isSelected ? "selected" : ""}`}
                >
                  <div className="seamless-row-left">
                    <div className="seamless-row-icon">
                      <Icon size={16} strokeWidth={2} />
                    </div>
                    <div>
                      <div className="seamless-row-title">{t.label}</div>
                      <div className="seamless-row-desc">{t.desc}</div>
                    </div>
                  </div>

                  {isSelected ? (
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "var(--accent)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: "1.5px solid var(--border-color)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}