import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/layout/TopNav";
import { useApp } from "../context/AppContext";
import { useAppBackNavigation } from "../utils/useAppBackNavigation";
import * as authApi from "../api/auth";
import * as memoriesApi from "../api/memories";
import {
  ArrowLeft,
  Download,
  Upload,
  Trash2,
  Database,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Mic,
  Image as ImageIcon,
  CheckSquare,
  Video,
  X,
  Loader2,
} from "lucide-react";
import "../styles/global.css";
import "../styles/pages.css";

export default function SettingsDataPage() {
  const navigate = useNavigate();
  const goBack = useAppBackNavigation("/settings");
  const { state, dispatch, handleLogout } = useApp();
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [toast, setToast] = useState({ text: "", type: "success" });
  const [importing, setImporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  const showToastMsg = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "success" }), 3000);
  };

  // 1. Export Data as JSON
  const handleExportData = () => {
    try {
      const exportPayload = {
        exportDate: new Date().toISOString(),
        version: "1.0.0",
        appName: "MindVault",
        user: {
          name: state.user?.name,
          email: state.user?.email,
        },
        memoriesCount: (state.memories || []).length,
        memories: state.memories || [],
        people: state.people || [],
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement("a");
      const filename = `mindvault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToastMsg(`Exported ${exportPayload.memoriesCount} memories!`);
    } catch (err) {
      console.error("Export error:", err);
      showToastMsg("Export failed.", "error");
    }
  };

  // 2. Import JSON Backup
  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const incomingMemories = parsed.memories || (Array.isArray(parsed) ? parsed : []);

        if (!Array.isArray(incomingMemories) || incomingMemories.length === 0) {
          showToastMsg("No memories found in file.", "error");
          setImporting(false);
          return;
        }

        let importedCount = 0;
        for (const mem of incomingMemories) {
          try {
            await memoriesApi.createMemory({
              title: mem.title || "Imported Memory",
              content: mem.content || "",
              type: mem.type || "text",
              category: mem.category || "General",
              tags: Array.isArray(mem.tags) ? mem.tags : [],
              mediaUrl: mem.mediaUrl || null,
              mediaData: mem.mediaData || null,
              checklist: Array.isArray(mem.checklist) ? mem.checklist : null,
              relatedPerson: mem.relatedPerson || null,
              pinned: Boolean(mem.pinned),
            });
            importedCount++;
          } catch (mErr) {
            console.warn("Error importing item:", mErr);
          }
        }

        const updatedList = await memoriesApi.getMemories();
        dispatch({ type: "SET_MEMORIES", payload: updatedList });

        showToastMsg(`Imported ${importedCount} memories!`);
      } catch (parseErr) {
        console.error("Parse error:", parseErr);
        showToastMsg("Invalid backup file.", "error");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // 3. Clear Chat History
  const handleClearChat = () => {
    if (window.confirm("Clear your chat conversation? Your saved memories will not be deleted.")) {
      dispatch({ type: "CLEAR_CHAT_MESSAGES" });
      showToastMsg("Chat cleared.");
    }
  };

  // 4. Delete Account
  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError("Enter password to confirm.");
      return;
    }

    setDeletingAccount(true);
    setDeleteError("");
    try {
      await authApi.deleteAccount(deletePassword);
      handleLogout();
      navigate("/");
    } catch (err) {
      setDeleteError(err.message || "Incorrect password.");
      setDeletingAccount(false);
    }
  };

  const activeMemories = (state.memories || []).filter((m) => !m.deleted);
  const textCount = activeMemories.filter((m) => !m.type || m.type === "text").length;
  const voiceCount = activeMemories.filter((m) => m.type === "voice" || m.type === "audio").length;
  const imageCount = activeMemories.filter((m) => m.type === "image").length;
  const videoCount = activeMemories.filter((m) => m.type === "video").length;
  const checklistCount = activeMemories.filter((m) => m.type === "checklist").length;

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
            <Database size={13} strokeWidth={2.5} />
            <span>Vault Data</span>
          </div>
          <h1 className="settings-title">Backup & Data</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
            Export, import, and manage your data.
          </p>
        </div>

        {/* Storage Breakdown Card */}
        <p className="section-label">SAVED MEMORIES</p>
        <div className="profile-section" style={{ padding: "16px" }}>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
              {activeMemories.length} Total Memories
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
              Stored in your vault
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
              gap: "8px",
            }}
          >
            <div style={{ padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={15} color="var(--accent)" />
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700" }}>{textCount}</div>
                <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Notes</div>
              </div>
            </div>

            <div style={{ padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Mic size={15} color="#10B981" />
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700" }}>{voiceCount}</div>
                <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Voice</div>
              </div>
            </div>

            <div style={{ padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <ImageIcon size={15} color="#F59E0B" />
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700" }}>{imageCount}</div>
                <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Photos</div>
              </div>
            </div>

            <div style={{ padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckSquare size={15} color="#8B5CF6" />
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700" }}>{checklistCount}</div>
                <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Checklists</div>
              </div>
            </div>

            <div style={{ padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Video size={15} color="#EC4899" />
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700" }}>{videoCount}</div>
                <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>Videos</div>
              </div>
            </div>
          </div>
        </div>

        {/* Backup & Restore Section */}
        <p className="section-label" style={{ marginTop: "24px" }}>BACKUP & ACTIONS</p>
        <div className="profile-section" style={{ padding: "8px 16px" }}>
          {/* Export JSON Button */}
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
                <Download size={15} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                  Export Backup
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  Download memories as a JSON file
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportData}
              style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
            >
              <Download size={13} />
              <span>Export</span>
            </button>
          </div>

          {/* Import JSON Button */}
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
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={handleFileImport}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "var(--bg-secondary)",
                  color: "#10B981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Upload size={15} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                  Import Backup
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  Restore memories from a JSON file
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
            >
              {importing ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
              <span>{importing ? "Importing..." : "Import"}</span>
            </button>
          </div>

          {/* Clear AI Chat */}
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
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={15} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                  Clear Chat
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  Reset home page conversation
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClearChat}
              style={{ flexShrink: 0 }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <p className="section-label" style={{ marginTop: "24px", color: "var(--danger, #EF4444)" }}>
          DANGER ZONE
        </p>
        <div
          className="profile-section"
          style={{
            padding: "16px",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            background: "rgba(239, 68, 68, 0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--danger, #EF4444)" }}>
                Delete Account
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                Permanently remove your account and all memories.
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDeletePassword("");
                setDeleteError("");
                setShowDeleteModal(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "var(--danger, #EF4444)",
                color: "#ffffff",
                border: "none",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "16px",
            }}
            onClick={() => setShowDeleteModal(false)}
          >
            <div
              style={{
                background: "var(--card-bg, #ffffff)",
                borderRadius: "16px",
                width: "100%",
                maxWidth: "400px",
                border: "1px solid var(--border-color)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--danger, #EF4444)" }}>
                  <AlertTriangle size={18} strokeWidth={2.5} />
                  <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>Delete Account</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: "20px" }}>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 16px 0", lineHeight: "1.4" }}>
                  This will delete your account and all <strong>{activeMemories.length} memories</strong>. Enter password to confirm:
                </p>

                <div className="input-group">
                  <input
                    type="password"
                    className="input-field"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter password"
                    autoFocus
                  />
                </div>

                {deleteError && (
                  <div style={{ fontSize: "12px", color: "var(--danger, #EF4444)", marginTop: "8px", fontWeight: "500" }}>
                    {deleteError}
                  </div>
                )}
              </div>

              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: "10px", background: "var(--bg-secondary)" }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  style={{
                    background: "var(--danger, #EF4444)",
                    color: "#ffffff",
                    border: "none",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: deletingAccount ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {deletingAccount ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                  <span>{deletingAccount ? "Deleting..." : "Delete"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Toast Notification */}
        {toast.text && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              position: "fixed",
              bottom: "24px",
              left: "50%",
              transform: "translateX(-50%)",
              background: toast.type === "error" ? "#EF4444" : "var(--navy, #0F2F5B)",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "600",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              zIndex: 9999,
            }}
          >
            <CheckCircle2 size={16} color={toast.type === "error" ? "#ffffff" : "#38bdf8"} />
            <span>{toast.text}</span>
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
