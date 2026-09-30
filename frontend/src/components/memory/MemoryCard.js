import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Pin, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { formatDate, getMemoryTypeIcon, truncate } from "../../utils/helpers";
import { getMediaUrl } from "../../api/voice";

export default function MemoryCard({
  memory,
  onSelect,
  showSelect = false,
  selectLabel = "Select →",
}) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!memory) return null;

  const memId = memory.id || memory._id;

  const handleClick = (e) => {
    if (showSelect && onSelect) {
      e.stopPropagation();
      onSelect(memId, memory);
      return;
    }
    navigate(`/memory/${memId}`, { state: { from: location.pathname } });
  };

  const typeIcon = getMemoryTypeIcon(memory.type, 16);

  const getPreview = () => {
    if (memory.type === "checklist" && memory.checklist) {
      const done = memory.checklist.filter((c) => c.done).length;
      return `${done}/${memory.checklist.length} items completed`;
    }
    if (memory.type === "voice") {
      return memory.duration ? `Voice memo (${memory.duration})` : "Voice memo recording";
    }
    if (memory.type === "image") {
      return memory.content || "Photo memory with attached image";
    }
    if (memory.type === "video") {
      return memory.content || "Video memory with attached recording";
    }
    return truncate(memory.content || "No text content", 120);
  };

  const mediaSource = memory.mediaUrl || memory.mediaData;

  return (
    <div
      className={`memory-card ${showSelect ? "memory-card-selectable" : ""}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e);
        }
      }}
      aria-label={`Open memory: ${memory.title || "Untitled"}`}
    >
      <div className="memory-card-header">
        <div className="memory-card-title-group">
          <span className="memory-card-type-icon">{typeIcon}</span>
          <span className="memory-card-title">{memory.title || "Untitled"}</span>
        </div>
        <div className="memory-card-header-actions">
          {memory.pinned && (
            <span className="pin-icon" title="Pinned memory">
              <Pin size={13} strokeWidth={2.2} />
            </span>
          )}
          {memory.category && (
            <span className="memory-card-category-badge">{memory.category}</span>
          )}
        </div>
      </div>

      {(memory.type === "image" || memory.type === "video") && mediaSource ? (
        <div className="memory-card-media-preview">
          {memory.type === "image" ? (
            <img
              src={getMediaUrl(mediaSource)}
              alt={memory.title || "Memory attachment"}
              loading="lazy"
            />
          ) : (
            <video src={getMediaUrl(mediaSource)} preload="metadata" />
          )}
        </div>
      ) : null}

      <p className="memory-card-content">{getPreview()}</p>

      <div className="memory-card-footer">
        <span className="memory-card-date">
          {memory.date ? formatDate(memory.date) : "Recent"}
        </span>

        <div className="memory-card-tags-row">
          {memory.tags && memory.tags.length > 0 && (
            <div className="memory-card-tags">
              {memory.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="tag">
                  #{tag}
                </span>
              ))}
              {memory.tags.length > 2 && (
                <span className="tag tag-more">+{memory.tags.length - 2}</span>
              )}
            </div>
          )}

          {showSelect ? (
            <button
              type="button"
              className="memory-card-select-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onSelect) onSelect(memId, memory);
              }}
            >
              <span>{selectLabel}</span>
              <CheckCircle2 size={13} />
            </button>
          ) : (
            <span className="memory-card-open-hint" title="Open memory">
              <ArrowUpRight size={13} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

