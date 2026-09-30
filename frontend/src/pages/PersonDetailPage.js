import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopNav from "../components/layout/TopNav";
import MemoryCard from "../components/memory/MemoryCard";
import { useApp } from "../context/AppContext";
import { getInitials, formatDate } from "../utils/helpers";
import { useAppBackNavigation } from "../utils/useAppBackNavigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  Cake,
  Clock,
  FileText,
  Sparkles,
  Heart,
  Tag,
  Calendar,
  MessageSquare,
  Plus,
} from "lucide-react";
import "../styles/global.css";
import "../styles/pages.css";

export default function PersonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const goBack = useAppBackNavigation("/people");

  const [aiSummary, setAiSummary] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const person = (state.people || []).find(
    (p) =>
      p &&
      (p.id === id ||
        p._id === id ||
        String(p.id) === String(id) ||
        String(p._id) === String(id))
  );

  if (!person) {
    return (
      <div className="app">
        <TopNav />
        <div className="main-content">
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={48} strokeWidth={1.5} />
            </div>
            <p className="empty-state-title">Person not found</p>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 16 }}
              onClick={goBack}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const relatedMemories = (state.memories || []).filter(
    (m) =>
      m &&
      !m.deleted &&
      ((Array.isArray(person.relatedMemoryIds) &&
        person.relatedMemoryIds.some((rmId) => rmId === m.id || rmId === m._id)) ||
        (person.name &&
          m.relatedPerson &&
          m.relatedPerson.toLowerCase().includes(person.name.toLowerCase())) ||
        (person.name &&
          ((m.title && m.title.toLowerCase().includes(person.name.toLowerCase())) ||
            (m.content && m.content.toLowerCase().includes(person.name.toLowerCase())))))
  );

  // Extract shared topics / tags
  const sharedTopics = Array.from(
    new Set(
      relatedMemories.flatMap((m) =>
        Array.isArray(m.tags) ? m.tags : m.category ? [m.category] : []
      )
    )
  ).slice(0, 6);

  const birthday = person.birthday
    ? new Date(person.birthday).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const handleAskAboutPerson = () => {
    navigate(`/home`, {
      state: { prefillQuery: `What do I know about ${person.name}?` },
    });
  };

  const handleGenerateSummary = () => {
    setGeneratingSummary(true);
    setTimeout(() => {
      if (relatedMemories.length === 0) {
        setAiSummary(
          `No memories recorded yet mentioning ${person.name}. Save a memory or note to generate knowledge insights.`
        );
      } else {
        const memTitles = relatedMemories.map((m) => m.title).slice(0, 3).join(", ");
        const notes = person.notes ? ` Notes: "${person.notes}".` : "";
        setAiSummary(
          `You have ${relatedMemories.length} memory${relatedMemories.length > 1 ? "s" : ""} connected with ${person.name} (${memTitles}).${notes} Topics frequently include ${sharedTopics.join(", ") || "daily updates"}.`
        );
      }
      setGeneratingSummary(false);
    }, 400);
  };

  return (
    <div className="app">
      <TopNav />
      <div className="main-content person-detail-page">
        <div style={{ paddingTop: 16 }}>
          <button className="back-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="person-detail-header">
          <div className="person-detail-avatar">
            {getInitials(person.name)}
          </div>
          <h1 className="person-detail-name">{person.name}</h1>
          {person.relationship && (
            <div className="person-relationship-chip">
              <Heart size={12} />
              <span>{person.relationship}</span>
            </div>
          )}
          {person.notes && (
            <p className="person-detail-note">{person.notes}</p>
          )}
        </div>

        {/* AI Knowledge Summary Card */}
        <div className="person-ai-summary-card">
          <div className="ai-summary-header">
            <div className="ai-summary-title">
              <Sparkles size={16} className="text-accent" />
              <span>Memory Intelligence Summary</span>
            </div>
            {!aiSummary && (
              <button
                type="button"
                className="ai-summary-btn"
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
              >
                {generatingSummary ? "Synthesizing…" : "Generate Brief"}
              </button>
            )}
          </div>
          {aiSummary ? (
            <p className="ai-summary-text">{aiSummary}</p>
          ) : (
            <p className="ai-summary-placeholder">
              Synthesize everything your second brain knows about {person.name} from linked memories.
            </p>
          )}
        </div>

        {/* Contact & Profile Info Card */}
        <div className="person-info-card">
          {person.phone && (
            <div className="person-info-row">
              <Phone size={17} strokeWidth={1.5} />
              <div>
                <p className="person-info-label">Phone</p>
                <p className="person-info-value">{person.phone}</p>
              </div>
            </div>
          )}
          {person.email && (
            <div className="person-info-row">
              <Mail size={17} strokeWidth={1.5} />
              <div>
                <p className="person-info-label">Email</p>
                <p className="person-info-value">{person.email}</p>
              </div>
            </div>
          )}
          {birthday && (
            <div className="person-info-row">
              <Cake size={17} strokeWidth={1.5} />
              <div>
                <p className="person-info-label">Birthday</p>
                <p className="person-info-value">{birthday}</p>
              </div>
            </div>
          )}
          <div className="person-info-row">
            <Clock size={17} strokeWidth={1.5} />
            <div>
              <p className="person-info-label">Last Interaction</p>
              <p className="person-info-value">
                {person.lastInteraction ? formatDate(person.lastInteraction) : "Recent"}
              </p>
            </div>
          </div>
        </div>

        {/* Extracted Topics */}
        {sharedTopics.length > 0 && (
          <div className="person-topics-section">
            <p className="section-label">Connected Topics & Tags</p>
            <div className="person-topics-row">
              {sharedTopics.map((top) => (
                <span key={top} className="person-topic-pill">
                  #{top}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related Memories */}
        <div style={{ marginTop: 24 }}>
          <div className="section-header-row">
            <p className="section-label">
              Connected Memories ({relatedMemories.length})
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() =>
                navigate(`/new?type=text&person=${encodeURIComponent(person.name)}`)
              }
            >
              <Plus size={13} />
              <span>Add Memory</span>
            </button>
          </div>

          {relatedMemories.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
              {relatedMemories.map((m) => (
                <MemoryCard key={m.id || m._id} memory={m} />
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ paddingTop: 28 }}>
              <div className="empty-state-icon">
                <FileText size={44} strokeWidth={1.5} />
              </div>
              <p className="empty-state-title">No connected memories yet</p>
              <p className="empty-state-text">
                Mention {person.name} in any text, voice memo, or event to automatically link it here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

