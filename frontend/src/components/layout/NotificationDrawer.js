import React from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import {
  Bell,
  X,
  Clock,
  Cake,
  Calendar,
  Sparkles,
  ArrowRight,
  Check,
  Trash2,
} from "lucide-react";
import { formatDate } from "../../utils/helpers";
import "../../styles/global.css";

export default function NotificationDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { state } = useApp();

  if (!isOpen) return null;

  const now = new Date();
  const memories = (state.memories || []).filter((m) => !m.deleted && !m.vaultId);
  const people = state.people || [];

  // 1. Gather all memory reminders
  const reminders = [];
  memories.forEach((m) => {
    if (Array.isArray(m.reminders)) {
      m.reminders.forEach((r, idx) => {
        if (r && r.title) {
          reminders.push({
            id: `rem_${m.id || m._id}_${idx}`,
            type: "reminder",
            title: r.title,
            memoryId: m.id || m._id,
            memoryTitle: m.title,
            date: r.date ? new Date(r.date) : null,
            icon: Clock,
          });
        }
      });
    }

    // Check for exam / interview / event memories
    const lowerTitle = (m.title || "").toLowerCase();
    const lowerContent = (m.content || "").toLowerCase();
    if (lowerTitle.includes("exam") || lowerContent.includes("exam")) {
      reminders.push({
        id: `exam_${m.id || m._id}`,
        type: "exam",
        title: `Upcoming Exam: ${m.title}`,
        memoryId: m.id || m._id,
        memoryTitle: m.title,
        date: m.date ? new Date(m.date) : null,
        icon: Calendar,
      });
    }
  });

  // 2. Gather birthdays from people directory
  people.forEach((p) => {
    if (p.birthday) {
      reminders.push({
        id: `bday_${p.id || p._id}`,
        type: "birthday",
        title: `${p.name}'s Birthday`,
        personId: p.id || p._id,
        personName: p.name,
        date: new Date(p.birthday),
        icon: Cake,
      });
    }
  });

  // 3. Weekly reflection hint
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentMemoriesCount = memories.filter(
    (m) => new Date(m.createdAt || m.date) >= sevenDaysAgo
  ).length;

  return (
    <div
      className="notification-drawer-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        zIndex: 9998,
        display: "flex",
        justifyContent: "flex-end",
        animation: "fadeIn 0.15s ease-out",
      }}
    >
      <div
        className="notification-drawer"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "380px",
          height: "100%",
          backgroundColor: "var(--card-bg, #ffffff)",
          color: "var(--text-primary, #1e293b)",
          boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.2s ease-out",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color, rgba(0,0,0,0.08))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Bell size={20} style={{ color: "var(--brand-primary, #0f2f5b)" }} />
            <h2 style={{ fontSize: "17px", fontWeight: 600, margin: 0 }}>Notifications & Reminders</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-secondary, #64748b)",
              padding: "4px",
              borderRadius: "6px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {recentMemoriesCount > 0 && (
            <div
              onClick={() => {
                onClose();
                navigate("/timeline");
              }}
              style={{
                padding: "14px",
                borderRadius: "12px",
                backgroundColor: "var(--bg-subtle, rgba(15, 47, 91, 0.05))",
                border: "1px solid var(--border-color, rgba(15, 47, 91, 0.1))",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <Sparkles size={16} style={{ color: "var(--brand-primary, #0f2f5b)" }} />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--brand-primary, #0f2f5b)" }}>
                  Weekly Activity
                </span>
              </div>
              <p style={{ fontSize: "13px", margin: "0 0 6px 0", color: "var(--text-secondary, #475569)" }}>
                You recorded <strong>{recentMemoriesCount} memories</strong> this past week. Review your timeline.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--brand-primary, #0f2f5b)", fontWeight: 500 }}>
                <span>View Timeline</span>
                <ArrowRight size={12} />
              </div>
            </div>
          )}

          {reminders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--text-tertiary, #94a3b8)" }}>
              <Clock size={36} style={{ margin: "0 auto 12px", opacity: 0.6 }} />
              <p style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 4px 0", color: "var(--text-secondary)" }}>
                No active notifications
              </p>
              <p style={{ fontSize: "13px", margin: 0 }}>
                Reminders, exam dates, and birthdays will appear here.
              </p>
            </div>
          ) : (
            reminders.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onClose();
                    if (item.memoryId) navigate(`/memory/${item.memoryId}`);
                    else if (item.personId) navigate(`/people/${item.personId}`);
                  }}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    backgroundColor: "var(--card-bg, #ffffff)",
                    border: "1px solid var(--border-color, rgba(0,0,0,0.08))",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    transition: "transform 0.12s ease, box-shadow 0.12s ease",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      backgroundColor: "var(--bg-subtle, rgba(0,0,0,0.04))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: "var(--brand-primary, #0f2f5b)",
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {item.title}
                    </div>
                    {item.date && (
                      <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                        {formatDate(item.date)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
