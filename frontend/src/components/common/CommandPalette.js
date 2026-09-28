import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import {
  Search,
  Plus,
  Mic,
  Image,
  Video,
  CheckSquare,
  FileText,
  Calendar,
  Users,
  Layout,
  Lock,
  Sun,
  Moon,
  Trash2,
  Settings,
  Sparkles,
  ArrowRight,
  X,
} from "lucide-react";
import "../../styles/global.css";

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle ESC and Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const activeMemories = (state.memories || []).filter((m) => !m.deleted && !m.vaultId);

  // Filter actions and matching memories
  const defaultActions = [
    {
      id: "ask-ai",
      title: "Ask MindVault AI",
      subtitle: query ? `Search & ask: "${query}"` : "Natural language search across memories",
      icon: Sparkles,
      action: () => {
        onClose();
        navigate(`/search?q=${encodeURIComponent(query)}`);
      },
    },
    {
      id: "new-text",
      title: "New Text Memory",
      subtitle: "Capture notes, thoughts, or ideas",
      icon: FileText,
      action: () => {
        onClose();
        navigate("/new?type=text");
      },
    },
    {
      id: "new-voice",
      title: "New Voice Note",
      subtitle: "Record audio with automatic transcription",
      icon: Mic,
      action: () => {
        onClose();
        navigate("/new?type=voice");
      },
    },
    {
      id: "new-image",
      title: "New Image Memory",
      subtitle: "Upload photo, screenshot, or scan",
      icon: Image,
      action: () => {
        onClose();
        navigate("/new?type=image");
      },
    },
    {
      id: "new-video",
      title: "New Video Memory",
      subtitle: "Save video clips and recordings",
      icon: Video,
      action: () => {
        onClose();
        navigate("/new?type=video");
      },
    },
    {
      id: "new-checklist",
      title: "New Checklist",
      subtitle: "Create task lists and reminders",
      icon: CheckSquare,
      action: () => {
        onClose();
        navigate("/new?type=checklist");
      },
    },
    {
      id: "nav-timeline",
      title: "Open Timeline",
      subtitle: "View chronological memory feed",
      icon: Calendar,
      action: () => {
        onClose();
        navigate("/timeline");
      },
    },
    {
      id: "nav-people",
      title: "Open People Directory",
      subtitle: "Manage contacts, birthdays & linked memories",
      icon: Users,
      action: () => {
        onClose();
        navigate("/people");
      },
    },
    {
      id: "nav-collections",
      title: "Open Collections",
      subtitle: "Organized by topics and media types",
      icon: Layout,
      action: () => {
        onClose();
        navigate("/collections");
      },
    },
    {
      id: "nav-vault",
      title: "Open Encrypted Vault",
      subtitle: "Access PIN-protected private memories",
      icon: Lock,
      action: () => {
        onClose();
        navigate("/vault");
      },
    },
    {
      id: "toggle-theme",
      title: state.theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme",
      subtitle: "Toggle application appearance",
      icon: state.theme === "dark" ? Sun : Moon,
      action: () => {
        dispatch({ type: "SET_THEME", payload: state.theme === "dark" ? "light" : "dark" });
      },
    },
    {
      id: "nav-trash",
      title: "Trash & Recovery",
      subtitle: "View deleted memories",
      icon: Trash2,
      action: () => {
        onClose();
        navigate("/deleted");
      },
    },
    {
      id: "nav-settings",
      title: "Settings & Export",
      subtitle: "Manage profile, security, and data backups",
      icon: Settings,
      action: () => {
        onClose();
        navigate("/settings");
      },
    },
  ];

  const matchingMemories = query.trim()
    ? activeMemories
        .filter((m) => {
          const q = query.toLowerCase();
          return (
            (m.title && m.title.toLowerCase().includes(q)) ||
            (m.content && m.content.toLowerCase().includes(q)) ||
            (m.tags && Array.isArray(m.tags) && m.tags.some((t) => t.toLowerCase().includes(q))) ||
            (m.relatedPerson && m.relatedPerson.toLowerCase().includes(q))
          );
        })
        .slice(0, 5)
        .map((m) => ({
          id: `mem-${m.id || m._id}`,
          title: m.title || "Untitled Memory",
          subtitle: m.content ? (m.content.length > 60 ? m.content.slice(0, 60) + "..." : m.content) : `Memory · ${m.type || "text"}`,
          icon: FileText,
          action: () => {
            onClose();
            navigate(`/memory/${m.id || m._id}`);
          },
        }))
    : [];

  const filteredActions = query.trim()
    ? defaultActions.filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : defaultActions;

  const combinedItems = [...matchingMemories, ...filteredActions];

  const handleKeyDownList = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < combinedItems.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : combinedItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (combinedItems[selectedIndex]) {
        combinedItems[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="command-palette-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        zIndex: 9999,
        animation: "fadeIn 0.15s ease-out",
      }}
    >
      <div
        className="command-palette-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "92%",
          maxWidth: "560px",
          backgroundColor: "var(--card-bg, #ffffff)",
          color: "var(--text-primary, #1e293b)",
          borderRadius: "16px",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--border-color, rgba(0,0,0,0.08))",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "70vh",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 18px",
            borderBottom: "1px solid var(--border-color, rgba(0,0,0,0.08))",
            gap: "12px",
          }}
        >
          <Search size={20} style={{ color: "var(--text-tertiary, #94a3b8)" }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search memories... (ESC to close)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownList}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "15px",
              color: "inherit",
              fontFamily: "inherit",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--text-tertiary, #94a3b8)",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={16} />
            </button>
          )}
          <kbd
            style={{
              padding: "2px 6px",
              fontSize: "11px",
              borderRadius: "4px",
              background: "var(--bg-hover, rgba(0,0,0,0.05))",
              color: "var(--text-tertiary, #94a3b8)",
              border: "1px solid var(--border-color, rgba(0,0,0,0.08))",
            }}
          >
            ESC
          </kbd>
        </div>

        <div
          ref={listRef}
          style={{
            padding: "8px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {matchingMemories.length > 0 && (
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--text-tertiary, #94a3b8)",
                padding: "6px 10px 2px",
              }}
            >
              Memories
            </div>
          )}

          {combinedItems.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  backgroundColor: isSelected ? "var(--bg-hover, rgba(15, 47, 91, 0.08))" : "transparent",
                  transition: "background-color 0.12s ease",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: isSelected ? "var(--brand-primary, #0f2f5b)" : "var(--bg-subtle, rgba(0,0,0,0.04))",
                    color: isSelected ? "#ffffff" : "var(--text-secondary, #64748b)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.12s ease",
                  }}
                >
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: isSelected ? "var(--brand-primary, #0f2f5b)" : "var(--text-primary, #1e293b)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-tertiary, #94a3b8)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.subtitle}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <ArrowRight size={14} style={{ color: "var(--brand-primary, #0f2f5b)", opacity: 0.8 }} />
                )}
              </div>
            );
          })}

          {combinedItems.length === 0 && (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "var(--text-tertiary, #94a3b8)",
                fontSize: "14px",
              }}
            >
              No matching commands or memories found.
            </div>
          )}
        </div>

        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--border-color, rgba(0,0,0,0.08))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "var(--text-tertiary, #94a3b8)",
            backgroundColor: "var(--bg-subtle, rgba(0,0,0,0.02))",
          }}
        >
          <div style={{ display: "flex", gap: "12px" }}>
            <span><kbd style={{ padding: "1px 4px", borderRadius: "3px", border: "1px solid var(--border-color)" }}>↑↓</kbd> Navigate</span>
            <span><kbd style={{ padding: "1px 4px", borderRadius: "3px", border: "1px solid var(--border-color)" }}>↵</kbd> Select</span>
          </div>
          <span>MindVault Second Brain</span>
        </div>
      </div>
    </div>
  );
}
