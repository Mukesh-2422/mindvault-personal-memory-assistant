import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/layout/TopNav";
import MemoryCard from "../components/memory/MemoryCard";
import { useApp } from "../context/AppContext";
import { useAppBackNavigation } from "../utils/useAppBackNavigation";
import {
  Layout,
  FileText,
  Mic,
  Image,
  Video,
  CheckSquare,
  ArrowLeft,
  AlertCircle,
  Plus,
  Briefcase,
  GraduationCap,
  Plane,
  User,
  Lightbulb,
  Target,
  BookOpen,
  FolderPlus,
  Folder,
  Tag,
  Search,
} from "lucide-react";
import "../styles/global.css";
import "../styles/pages.css";

const DEFAULT_CATEGORIES = [
  { id: "Studies", label: "Studies", icon: GraduationCap, color: "#3B82F6", desc: "Exams, coursework, and revision notes" },
  { id: "Work", label: "Work", icon: Briefcase, color: "#8B5CF6", desc: "Projects, meetings, and workplace milestones" },
  { id: "Travel", label: "Travel", icon: Plane, color: "#06B6D4", desc: "Trips, tickets, itineraries, and places" },
  { id: "Personal", label: "Personal", icon: User, color: "#10B981", desc: "Daily thoughts, habits, and life events" },
  { id: "Ideas", label: "Ideas", icon: Lightbulb, color: "#F59E0B", desc: "Brainstorms, concepts, and inspirations" },
  { id: "Goals", label: "Goals", icon: Target, color: "#EC4899", desc: "Aspirations, targets, and checkpoints" },
  { id: "Journal", label: "Journal", icon: BookOpen, color: "#6366F1", desc: "Reflections and personal journals" },
];

const MEDIA_TYPES = [
  { id: "text", label: "Text Notes", icon: FileText, desc: "Written notes and saved snippets" },
  { id: "voice", label: "Voice Memos", icon: Mic, desc: "Audio recordings with transcripts" },
  { id: "image", label: "Photos & Images", icon: Image, desc: "Uploaded photos and visual memories" },
  { id: "video", label: "Video Clips", icon: Video, desc: "Video memories and recordings" },
  { id: "checklist", label: "Checklists & Tasks", icon: CheckSquare, desc: "To-do lists and milestone tracking" },
];

export default function CollectionsPage() {
  const navigate = useNavigate();
  const { state } = useApp();
  const goBack = useAppBackNavigation("/home");

  const [activeTab, setActiveTab] = useState("categories"); // "categories" | "types"
  const [selectedCollection, setSelectedCollection] = useState(null); // { type: 'category'|'media', id, label, icon }
  const [searchFilter, setSearchFilter] = useState("");
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mv_custom_categories") || "[]");
    } catch {
      return [];
    }
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  const activeMemories = useMemo(() => {
    return (state.memories || []).filter((m) => m && !m.deleted && !m.vaultId);
  }, [state.memories]);

  // Combine default and custom categories + any discovered in existing memories
  const allCategories = useMemo(() => {
    const map = new Map();
    DEFAULT_CATEGORIES.forEach((cat) => map.set(cat.id.toLowerCase(), cat));
    customCategories.forEach((cat) => map.set(cat.id.toLowerCase(), cat));

    activeMemories.forEach((m) => {
      if (m.category && typeof m.category === "string" && m.category.trim()) {
        const lower = m.category.trim().toLowerCase();
        if (!map.has(lower)) {
          map.set(lower, {
            id: m.category.trim(),
            label: m.category.trim(),
            icon: Folder,
            color: "#6366F1",
            desc: "User defined collection",
          });
        }
      }
    });
    return Array.from(map.values());
  }, [customCategories, activeMemories]);

  const getCategoryCount = (catId) => {
    const norm = String(catId).toLowerCase().trim();
    return activeMemories.filter(
      (m) => m.category && String(m.category).toLowerCase().trim() === norm
    ).length;
  };

  const getMediaTypeCount = (typeId) => {
    return activeMemories.filter((m) => (m.type || "text") === typeId).length;
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newCat = {
      id: newCatName.trim(),
      label: newCatName.trim(),
      desc: newCatDesc.trim() || "Custom collection",
      icon: Folder,
      color: "#8B5CF6",
    };
    const updated = [...customCategories, newCat];
    setCustomCategories(updated);
    try {
      localStorage.setItem("mv_custom_categories", JSON.stringify(updated));
    } catch {}
    setNewCatName("");
    setNewCatDesc("");
    setShowCreateModal(false);
  };

  // Filtered items when a collection is clicked
  const filteredItems = useMemo(() => {
    if (!selectedCollection) return [];
    let list = [];
    if (selectedCollection.type === "category") {
      const norm = String(selectedCollection.id).toLowerCase().trim();
      list = activeMemories.filter(
        (m) => m.category && String(m.category).toLowerCase().trim() === norm
      );
    } else if (selectedCollection.type === "media") {
      list = activeMemories.filter(
        (m) => (m.type || "text") === selectedCollection.id
      );
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      list = list.filter(
        (m) =>
          (m.title && m.title.toLowerCase().includes(q)) ||
          (m.content && m.content.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }, [selectedCollection, activeMemories, searchFilter]);

  return (
    <div className="app">
      <TopNav />
      <div className="main-content collections-page">
        {!selectedCollection ? (
          <>
            <div className="page-header-row">
              <button className="back-btn" onClick={goBack} aria-label="Go back">
                <ArrowLeft size={16} strokeWidth={1.5} />
              </button>
              <div className="collections-header-title-box">
                <h1 className="collections-title">
                  <Layout size={22} strokeWidth={1.5} />
                  Collections
                </h1>
                <p className="collections-subtitle">
                  Organize your memory bank by topics, categories, and formats.
                </p>
              </div>
            </div>

            {/* View Switcher Tabs */}
            <div className="collections-tabs-bar">
              <button
                type="button"
                className={`collections-tab-btn ${activeTab === "categories" ? "active" : ""}`}
                onClick={() => setActiveTab("categories")}
              >
                <span>Topics & Categories</span>
                <span className="collections-tab-badge">{allCategories.length}</span>
              </button>
              <button
                type="button"
                className={`collections-tab-btn ${activeTab === "types" ? "active" : ""}`}
                onClick={() => setActiveTab("types")}
              >
                <span>Media Formats</span>
                <span className="collections-tab-badge">{MEDIA_TYPES.length}</span>
              </button>
            </div>

            {/* Action Bar */}
            <div className="collections-action-row">
              {activeTab === "categories" && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowCreateModal(true)}
                >
                  <FolderPlus size={15} />
                  <span>New Category</span>
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate("/new?type=text")}
              >
                <Plus size={15} />
                <span>Capture Memory</span>
              </button>
            </div>

            {/* Grid View */}
            {activeTab === "categories" ? (
              <div className="collections-grid">
                {allCategories.map((cat) => {
                  const count = getCategoryCount(cat.id);
                  const Icon = cat.icon || Folder;
                  return (
                    <div
                      key={cat.id}
                      className="collection-card-item"
                      onClick={() =>
                        setSelectedCollection({
                          type: "category",
                          id: cat.id,
                          label: cat.label,
                          desc: cat.desc,
                          icon: Icon,
                          color: cat.color,
                        })
                      }
                      role="button"
                      tabIndex={0}
                    >
                      <div className="collection-card-top">
                        <div
                          className="collection-icon-badge"
                          style={{
                            color: cat.color || "var(--accent)",
                            backgroundColor: `${cat.color || "#8B5CF6"}18`,
                          }}
                        >
                          <Icon size={20} strokeWidth={2} />
                        </div>
                        <span className="collection-count-badge">
                          {count} {count === 1 ? "memory" : "memories"}
                        </span>
                      </div>
                      <div className="collection-card-info">
                        <h3 className="collection-card-title">{cat.label}</h3>
                        <p className="collection-card-desc">{cat.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="collections-grid">
                {MEDIA_TYPES.map((mType) => {
                  const count = getMediaTypeCount(mType.id);
                  const Icon = mType.icon;
                  return (
                    <div
                      key={mType.id}
                      className="collection-card-item"
                      onClick={() =>
                        setSelectedCollection({
                          type: "media",
                          id: mType.id,
                          label: mType.label,
                          desc: mType.desc,
                          icon: Icon,
                          color: "var(--accent)",
                        })
                      }
                      role="button"
                      tabIndex={0}
                    >
                      <div className="collection-card-top">
                        <div className="collection-icon-badge">
                          <Icon size={20} strokeWidth={2} />
                        </div>
                        <span className="collection-count-badge">
                          {count} {count === 1 ? "memory" : "memories"}
                        </span>
                      </div>
                      <div className="collection-card-info">
                        <h3 className="collection-card-title">{mType.label}</h3>
                        <p className="collection-card-desc">{mType.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Collection Detail View */
          <>
            <div className="page-header-row">
              <button
                className="back-btn"
                onClick={() => {
                  setSelectedCollection(null);
                  setSearchFilter("");
                }}
                aria-label="Back to Collections"
              >
                <ArrowLeft size={16} strokeWidth={1.5} />
              </button>
              <div className="collection-detail-title-box">
                <div className="collection-detail-pill">
                  {React.createElement(selectedCollection.icon || Folder, { size: 18 })}
                  <span>{selectedCollection.label}</span>
                  <span className="collection-count-tag">{filteredItems.length}</span>
                </div>
              </div>
            </div>

            {/* Quick Search within Collection */}
            <div className="collection-search-bar">
              <Search size={15} />
              <input
                placeholder={`Search in ${selectedCollection.label}...`}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
              {searchFilter && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchFilter("")}
                >
                  ×
                </button>
              )}
            </div>

            {filteredItems.length > 0 ? (
              <div className="collection-items-grid">
                {filteredItems.map((m) => (
                  <MemoryCard key={m.id || m._id} memory={m} />
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ marginTop: 40 }}>
                <div className="empty-state-icon">
                  <AlertCircle size={44} strokeWidth={1.5} />
                </div>
                <p className="empty-state-title">
                  {searchFilter ? "No matching memories" : `No ${selectedCollection.label} memories yet`}
                </p>
                <p className="empty-state-text">
                  {searchFilter
                    ? "Try adjusting your search terms."
                    : `Capture a memory under the "${selectedCollection.label}" collection to see it here.`}
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 16 }}
                  onClick={() =>
                    navigate(
                      selectedCollection.type === "media"
                        ? `/new?type=${selectedCollection.id}`
                        : `/new?type=text&category=${encodeURIComponent(selectedCollection.id)}`
                    )
                  }
                >
                  <Plus size={15} />
                  <span>Create in this collection</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Modal for Creating New Custom Category */}
        {showCreateModal && (
          <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New Category</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCreateCategory}>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label>Category Name</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Finance, Health, Fitness, Books"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label>Short Description (Optional)</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Budget notes and receipts"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={!newCatName.trim()}>
                    Create Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}