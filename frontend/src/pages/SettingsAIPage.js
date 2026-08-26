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
          <div className="settings-pill-badge">
            <Sparkles size={12} strokeWidth={2.5} />
            <span>AI Assistant</span>
          </div>
          <h1 className="settings-title">AI Assistant</h1>
          <p className="settings-subtitle">
            Choose how AI answers your questions.
          </p>
        </div>


        {/* Answer Style - Mild Single Card with Clean Dividers */}
        <div className="modern-settings-section">
          <div className="modern-section-label">ANSWER STYLE</div>
          <div className="modern-settings-card">
            {RESPONSE_STYLES.map((style) => {
              const isSelected = aiPrefs.responseStyle === style.id;
              return (
                <div
                  key={style.id}
                  onClick={() => setResponseStyle(style.id)}
                  className={`seamless-option-row ${isSelected ? "selected" : ""}`}
                >
                  <div className="seamless-row-left">
                    <div className="seamless-row-icon">
                      <Bot size={16} strokeWidth={2} />
                    </div>
                    <div>
                      <div className="seamless-row-title">{style.title}</div>
                      <div className="seamless-row-desc">{style.desc}</div>
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

        {/* Features - Mild Single Card */}
        <div className="modern-settings-section">
          <div className="modern-section-label">FEATURES</div>
          <div className="modern-settings-card">
            {/* On This Day Flashback Toggle */}
            <div className="modern-toggle-row">
              <div className="seamless-row-left">
                <div
                  className="seamless-row-icon"
                  style={{ background: "rgba(59, 130, 246, 0.08)", color: "var(--accent)" }}
                >
                  <Calendar size={16} strokeWidth={2} />
                </div>
                <div>
                  <div className="seamless-row-title">"On This Day" Flashbacks</div>
                  <div className="seamless-row-desc">Show past memories on Home page</div>
                </div>
              </div>

              <button
                type="button"
                className={`modern-switch-btn ${aiPrefs.onThisDayEnabled ? "active" : ""}`}
                onClick={toggleOnThisDay}
                aria-label="Toggle On This Day"
              >
                <div className="modern-switch-thumb" />
              </button>
            </div>

            {/* Show Referenced Sources Toggle */}
            <div className="modern-toggle-row">
              <div className="seamless-row-left">
                <div
                  className="seamless-row-icon"
                  style={{ background: "rgba(16, 185, 129, 0.08)", color: "#10B981" }}
                >
                  <Layers size={16} strokeWidth={2} />
                </div>
                <div>
                  <div className="seamless-row-title">Show Memory Sources</div>
                  <div className="seamless-row-desc">Show related memory chips under answers</div>
                </div>
              </div>

              <button
                type="button"
                className={`modern-switch-btn ${aiPrefs.showSources ? "active" : ""}`}
                onClick={toggleSources}
                aria-label="Toggle Memory Sources"
              >
                <div className="modern-switch-thumb" />
              </button>
            </div>
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
