import React, { useEffect, useRef, useState } from "react";
import TopNav from "../components/layout/TopNav";
import { useApp } from "../context/AppContext";
import { useAppBackNavigation } from "../utils/useAppBackNavigation";
import {
  ArrowLeft,
  Sparkles,
  Bot,
  Check,
  Calendar,
  Layers,
  CheckCircle2,
} from "lucide-react";
import "../styles/global.css";
import "../styles/pages.css";

const RESPONSE_STYLES = [
  {
    id: "concise",
    title: "Short & Direct",
    desc: "Quick, to-the-point answers.",
  },
  {
    id: "detailed",
    title: "Detailed",
    desc: "Complete answers with full background.",
  },
  {
    id: "bullet",
    title: "Bullet Points",
    desc: "Key points listed with bullet points.",
  },
];

export default function SettingsAIPage() {
  const goBack = useAppBackNavigation("/settings");
  const { state, dispatch } = useApp();
  const containerRef = useRef(null);
  const [toast, setToast] = useState(null);

  const aiPrefs = state.aiPreferences || {
    responseStyle: "concise",
    onThisDayEnabled: true,
    showSources: true,
  };

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  const showSavedToast = (msg = "Saved") => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const setResponseStyle = (styleId) => {
    dispatch({
      type: "SET_AI_PREFERENCES",
      payload: { responseStyle: styleId },
    });
    showSavedToast();
  };

  const toggleOnThisDay = () => {
    dispatch({
      type: "SET_AI_PREFERENCES",
      payload: { onThisDayEnabled: !aiPrefs.onThisDayEnabled },
    });
    showSavedToast();
  };

  const toggleSources = () => {
    dispatch({
      type: "SET_AI_PREFERENCES",
      payload: { showSources: !aiPrefs.showSources },
    });
    showSavedToast();
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
            <Sparkles size={13} strokeWidth={2.5} />
            <span>AI Assistant</span>
          </div>
          <h1 className="settings-title">AI Assistant</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
            Choose how AI answers your questions.
          </p>
        </div>

        {/* Response Style Section */}
        <p className="section-label">ANSWER STYLE</p>
        <div className="profile-section" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "14px" }}>
          {RESPONSE_STYLES.map((style) => {
            const isSelected = aiPrefs.responseStyle === style.id;
            return (
              <div
                key={style.id}
                onClick={() => setResponseStyle(style.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: isSelected ? "var(--bg-secondary)" : "transparent",
                  border: isSelected ? "1.5px solid var(--accent)" : "1px solid var(--border-color)",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: isSelected ? "var(--accent)" : "var(--bg-secondary)",
                      color: isSelected ? "#ffffff" : "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={16} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                      {style.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {style.desc}
                    </div>
                  </div>
                </div>
                {isSelected && (
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
                )}
              </div>
            );
          })}
        </div>

        {/* Display Toggles */}
        <p className="section-label" style={{ marginTop: "24px" }}>FEATURES</p>
        <div className="profile-section" style={{ padding: "8px 16px" }}>
          {/* On This Day Flashback Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: "1px solid var(--border-color)",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "var(--bg-secondary)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Calendar size={16} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                  "On This Day" Flashbacks
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  Show past memories on Home page
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleOnThisDay}
              style={{
                width: "44px",
                height: "24px",
                borderRadius: "12px",
                background: aiPrefs.onThisDayEnabled ? "var(--accent)" : "var(--border-color)",
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s ease",
                padding: 0,
                flexShrink: 0,
              }}
              aria-label="Toggle On This Day"
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  position: "absolute",
                  top: "3px",
                  left: aiPrefs.onThisDayEnabled ? "23px" : "3px",
                  transition: "left 0.2s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>

          {/* Show Referenced Sources Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 0",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "var(--bg-secondary)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Layers size={16} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                  Show Memory Sources
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  Show related memory chips under answers
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleSources}
              style={{
                width: "44px",
                height: "24px",
                borderRadius: "12px",
                background: aiPrefs.showSources ? "var(--accent)" : "var(--border-color)",
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s ease",
                padding: 0,
                flexShrink: 0,
              }}
              aria-label="Toggle Memory Sources"
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  position: "absolute",
                  top: "3px",
                  left: aiPrefs.showSources ? "23px" : "3px",
                  transition: "left 0.2s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>
        </div>

        {/* Toast alert */}
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
