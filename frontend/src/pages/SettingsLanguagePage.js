import React, { useEffect, useRef } from "react";
import TopNav from "../components/layout/TopNav";
import { useApp } from "../context/AppContext";
import { useAppBackNavigation } from "../utils/useAppBackNavigation";
import { ArrowLeft, Check, Globe } from "lucide-react";
import "../styles/global.css";
import "../styles/pages.css";

const LANGUAGES = [
  { label: "English", sub: "English (Default)", value: "en" },
  { label: "தமிழ்", sub: "Tamil", value: "ta" },
  { label: "हिन्दी", sub: "Hindi", value: "hi" },
];

export default function SettingsLanguagePage() {
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
    dispatch({ type: "SET_LANGUAGE", payload: value });
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
            <Globe size={12} strokeWidth={2.5} />
            <span>Language</span>
          </div>
          <h1 className="settings-title">Language</h1>
          <p className="settings-subtitle">Choose your preferred app language.</p>
        </div>


        <div className="modern-settings-section">
          <div className="modern-section-label">AVAILABLE LANGUAGES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {LANGUAGES.map((l) => {
              const isSelected = state.language === l.value;
              return (
                <div
                  key={l.value}
                  onClick={() => handleSelect(l.value)}
                  className={`modern-option-tile ${isSelected ? "selected" : ""}`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div className="modern-tile-icon">
                      <Globe size={18} strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontSize: "14.5px", fontWeight: "600", color: "var(--text-primary)" }}>
                        {l.label}
                      </div>
                      <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {l.sub}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: "var(--accent)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)",
                      }}
                    >
                      <Check size={13} strokeWidth={3} />
                    </div>
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