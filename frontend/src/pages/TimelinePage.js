import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/layout/TopNav";
import MemoryCard from "../components/memory/MemoryCard";
import { useApp } from "../context/AppContext";
import { useAppBackNavigation } from "../utils/useAppBackNavigation";
import {
  getMemoryTypeIcon,
  formatTime,
  formatDate,
  truncate,
} from "../utils/helpers";
import {
  Calendar,
  Pin,
  ArrowLeft,
  Filter,
  FileText,
  Mic,
  Image,
  Video,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import "../styles/global.css";
import "../styles/pages.css";

const TYPE_FILTERS = [
  { id: "all", label: "All Types", icon: null },
  { id: "text", label: "Text", icon: FileText },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "image", label: "Image", icon: Image },
  { id: "video", label: "Video", icon: Video },
  { id: "checklist", label: "Checklist", icon: CheckSquare },
];

export default function TimelinePage() {
  const navigate = useNavigate();
  const { state } = useApp();
  const goBack = useAppBackNavigation("/home");

  const [selectedType, setSelectedType] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");

  const activeMemories = useMemo(() => {
    return (state.memories || []).filter((m) => m && !m.deleted && !m.vaultId);
  }, [state.memories]);

  // Extract unique years from active memories
  const availableYears = useMemo(() => {
    const years = new Set();
    activeMemories.forEach((m) => {
      const d = new Date(m.date || m.createdAt);
      if (!isNaN(d.getFullYear())) {
        years.add(d.getFullYear().toString());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [activeMemories]);

  // Filtered memories by type & year
  const filteredMemories = useMemo(() => {
    let list = [...activeMemories];
    if (selectedType !== "all") {
      list = list.filter((m) => (m.type || "text") === selectedType);
    }
    if (selectedYear !== "all") {
      list = list.filter((m) => {
        const d = new Date(m.date || m.createdAt);
        return d.getFullYear().toString() === selectedYear;
      });
    }
    return list.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }, [activeMemories, selectedType, selectedYear]);

  // Group by Year -> Month -> Days
  const timelineGroups = useMemo(() => {
    const map = new Map(); // "Month Year" -> memories[]
    filteredMemories.forEach((m) => {
      const d = new Date(m.date || m.createdAt);
      const monthYear = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!map.has(monthYear)) {
        map.set(monthYear, []);
      }
      map.get(monthYear).push(m);
    });
    return Array.from(map.entries());
  }, [filteredMemories]);

  return (
    <div className="app">
      <TopNav />
      <div className="main-content timeline-page">
        <div className="page-header-row">
          <button className="back-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
          <div className="timeline-header-title-box">
            <h1 className="timeline-title">
              <Calendar size={22} strokeWidth={1.5} />
              Timeline
            </h1>
            <p className="timeline-subtitle">
              Your memory journey organized across time.
            </p>
          </div>
        </div>

        {/* Filter Bar: Year Selector & Media Types */}
        <div className="timeline-filter-section">
          {availableYears.length > 1 && (
            <div className="timeline-years-bar">
              <button
                type="button"
                className={`filter-chip ${selectedYear === "all" ? "active" : ""}`}
                onClick={() => setSelectedYear("all")}
              >
                All Years
              </button>
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  className={`filter-chip ${selectedYear === yr ? "active" : ""}`}
                  onClick={() => setSelectedYear(yr)}
                >
                  {yr}
                </button>
              ))}
            </div>
          )}

          <div className="timeline-types-bar">
            {TYPE_FILTERS.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`filter-chip ${selectedType === f.id ? "active" : ""}`}
                  onClick={() => setSelectedType(f.id)}
                >
                  {Icon && <Icon size={14} />}
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chronological Timeline Groups */}
        {filteredMemories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Calendar size={48} strokeWidth={1.5} />
            </div>
            <p className="empty-state-title">No memories in this timeline</p>
            <p className="empty-state-text">
              Try changing the filter options or capture a new memory.
            </p>
          </div>
        ) : (
          <div className="timeline-container">
            {timelineGroups.map(([monthYear, mems]) => (
              <div key={monthYear} className="timeline-group-block">
                <div className="timeline-month-header">
                  <span className="timeline-month-badge">{monthYear}</span>
                  <span className="timeline-month-count">{mems.length} memories</span>
                </div>

                <div className="timeline-stream">
                  {mems.map((m) => (
                    <div key={m.id || m._id} className="timeline-node">
                      <div className="timeline-node-marker">
                        <div className="timeline-node-dot" />
                        <div className="timeline-node-line" />
                      </div>
                      <div className="timeline-node-content">
                        <MemoryCard memory={m} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

