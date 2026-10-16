import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/layout/TopNav";
import FAB from "../components/layout/FAB";
import MemoryCard from "../components/memory/MemoryCard";
import { useApp } from "../context/AppContext";
import { formatTime } from "../utils/helpers";
import { getOnThisDay } from "../data/dummyData";
import {
  Brain, Mic, Send, Search, Play, Pause, FileText, Image as ImageIcon,
  Video as VideoIcon, CheckSquare, Sparkles, ArrowDown, Plus, ArrowUpRight, X,
  Paperclip, ChevronDown, Link2, Bell, Users, Layout, Calendar
} from "lucide-react";

import { getMediaUrl, transcribeAudio } from "../api/voice";
import "../styles/global.css";
import "../styles/dashboard.css";

const WAVEFORM_HEIGHTS = [
  6, 10, 14, 8, 18, 12, 22, 16, 24, 14, 10, 18, 20, 12, 8, 16,
  22, 14, 18, 24, 16, 10, 14, 20, 12, 18, 22, 16, 24, 14, 8, 12,
  18, 20, 14, 22, 16, 10, 14, 18, 12, 22, 16, 14, 10, 16, 12, 6
];

function getResolvedMemoryType(memory) {
  if (!memory) return "text";
  const explicitType = typeof memory.type === "string" ? memory.type.toLowerCase() : "";

  // 1. Image
  if (
    explicitType === "image" ||
    memory.imageUrl ||
    (typeof memory.mediaData === "string" && memory.mediaData.startsWith("data:image")) ||
    (typeof memory.mediaUrl === "string" && memory.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i))
  ) {
    return "image";
  }

  // 2. Voice / Audio
  if (
    explicitType === "voice" ||
    explicitType === "audio" ||
    memory.audioUrl ||
    (typeof memory.mediaData === "string" && memory.mediaData.startsWith("data:audio")) ||
    (typeof memory.mediaUrl === "string" && memory.mediaUrl.match(/\.(mp3|wav|ogg|m4a|aac|weba)(\?.*)?$/i) && explicitType !== "video")
  ) {
    return "voice";
  }

  // 3. Video
  if (
    explicitType === "video" ||
    memory.videoUrl ||
    (typeof memory.mediaUrl === "string" && memory.mediaUrl.match(/\.(mp4|webm|mov|mkv)(\?.*)?$/i))
  ) {
    return "video";
  }

  // 4. Checklist
  if (explicitType === "checklist" || Array.isArray(memory.checklist)) {
    return "checklist";
  }

  // 5. Link
  if (explicitType === "link" || memory.url || (typeof memory.content === "string" && /^https?:\/\//i.test(memory.content.trim()))) {
    return "link";
  }

  return explicitType || "text";
}

function getMemoryTypeIconHelper(type, memory) {
  const resolved = getResolvedMemoryType({ ...memory, type });
  switch (resolved) {
    case "image":
      return <ImageIcon size={14} className="source-pill-icon text-slate-500" />;
    case "voice":
      return <Mic size={14} className="source-pill-icon text-slate-500" />;
    case "video":
      return <VideoIcon size={14} className="source-pill-icon text-slate-500" />;
    case "link":
      return <Link2 size={14} className="source-pill-icon text-slate-500" />;
    case "checklist":
      return <CheckSquare size={14} className="source-pill-icon text-slate-500" />;
    default:
      return <FileText size={14} className="source-pill-icon text-slate-500" />;
  }
}

function InlineVoicePlayer({ memory, onNavigate, onSelectMemory }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(memory.duration || 0);
  const audioRef = useRef(null);

  const audioSrc = getMediaUrl(memory.mediaUrl || memory.mediaData || memory.audioUrl);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatAudioTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="inline-memory-bubble-card inline-voice-bubble-card">
      {/* Top Header Badge */}
      <div className="inline-memory-card-header">
        <span className="inline-memory-type-badge">
          <Mic size={13} strokeWidth={2.2} />
          <span>Voice Memo</span>
        </span>
        <span className="inline-memory-card-title">{memory.title || "Voice Note"}</span>
      </div>

      {/* Audio Player Controls */}
      <div className="inline-voice-player">
        {audioSrc && (
          <audio
            ref={audioRef}
            src={audioSrc}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            preload="metadata"
          />
        )}

        <button
          type="button"
          className={`inline-voice-play-btn ${isPlaying ? "playing" : ""}`}
          onClick={togglePlay}
          title={isPlaying ? "Pause" : "Play audio"}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isPlaying ? (
            <Pause size={15} strokeWidth={2.5} />
          ) : (
            <Play size={15} strokeWidth={2.5} style={{ marginLeft: "2px" }} />
          )}
        </button>

        <div className="inline-voice-progress-container">
          <div className="inline-voice-wave-bars">
            {WAVEFORM_HEIGHTS.map((h, i) => {
              const barPercent = (i / WAVEFORM_HEIGHTS.length) * 100;
              const isPassed = progressPercent >= barPercent;
              return (
                <span
                  key={i}
                  className={`inline-wave-bar ${isPassed ? "active" : ""}`}
                  style={{ height: `${h}px` }}
                />
              );
            })}
          </div>

          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="inline-voice-slider"
          />

          <div className="inline-voice-time">
            <span>{formatAudioTime(currentTime)}</span>
            <span>/</span>
            <span>{formatAudioTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Transcription / Memory Content Text */}
      <div className="inline-voice-transcription">
        <span className="transcription-label">{memory.content ? "Transcription:" : "Memory Note:"}</span>
        <span className="transcription-text">
          {memory.content || memory.title || "Voice recording"}
        </span>
      </div>

      {/* Secondary Bottom Right Detail Link */}
      <div className="inline-memory-card-footer">
        <button
          type="button"
          className="inline-voice-detail-link"
          onClick={() => onNavigate(`/memory/${memory.id || memory._id}`, { state: { from: "/home" } })}
        >
          <span>See memory</span>
          <ArrowUpRight size={13} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

function InlineImageCard({ memory, onNavigate }) {
  const imgSrc = getMediaUrl(memory.imageUrl || memory.mediaUrl || memory.mediaData);

  return (
    <div className="inline-memory-bubble-card inline-image-bubble-card">
      <div className="inline-memory-card-header">
        <span className="inline-memory-type-badge">
          <ImageIcon size={13} strokeWidth={2} />
          <span>Image Memory</span>
        </span>
        <span className="inline-memory-card-title">{memory.title || "Image"}</span>
      </div>

      {imgSrc && (
        <div className="inline-image-preview-container">
          <img
            src={imgSrc}
            alt={memory.title || "Image memory"}
            className="inline-image-preview"
          />
        </div>
      )}

      {memory.content && (
        <div className="inline-memory-caption">
          <span className="inline-memory-caption-text">{memory.content}</span>
        </div>
      )}

      <div className="inline-memory-card-footer">
        <button
          type="button"
          className="inline-voice-detail-link"
          onClick={() => onNavigate(`/memory/${memory.id || memory._id}`, { state: { from: "/home" } })}
        >
          <span>See memory</span>
          <ArrowUpRight size={13} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

function InlineTextCard({ memory, onNavigate }) {
  const isChecklist = memory.type === "checklist" && Array.isArray(memory.checklist);

  return (
    <div className="inline-memory-bubble-card inline-text-bubble-card">
      <div className="inline-memory-card-header">
        <span className="inline-memory-type-badge">
          {isChecklist ? <CheckSquare size={13} strokeWidth={2} /> : <FileText size={13} strokeWidth={2} />}
          <span>{isChecklist ? "Checklist" : "Note"}</span>
        </span>
        <span className="inline-memory-card-title">{memory.title || "Note"}</span>
      </div>

      <div className="inline-text-preview-container">
        {isChecklist ? (
          <div className="inline-checklist-preview">
            {memory.checklist.slice(0, 4).map((item, idx) => (
              <div key={idx} className="inline-checklist-item">
                <span className={`inline-checklist-bullet ${item.done ? "done" : ""}`}>
                  {item.done ? "✓" : "○"}
                </span>
                <span className={`inline-checklist-text ${item.done ? "done" : ""}`}>
                  {item.text}
                </span>
              </div>
            ))}
            {memory.checklist.length > 4 && (
              <div className="inline-checklist-more">
                +{memory.checklist.length - 4} more items
              </div>
            )}
          </div>
        ) : (
          <div className="inline-text-content">
            {memory.content || "No preview available."}
          </div>
        )}
      </div>

      <div className="inline-memory-card-footer">
        <button
          type="button"
          className="inline-voice-detail-link"
          onClick={() => onNavigate(`/memory/${memory.id || memory._id}`, { state: { from: "/home" } })}
        >
          <span>See memory</span>
          <ArrowUpRight size={13} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

function InlineMemoryRenderer({ memory, onNavigate }) {
  if (!memory) return null;
  const resolvedType = getResolvedMemoryType(memory);

  if (resolvedType === "voice") {
    return <InlineVoicePlayer memory={memory} onNavigate={onNavigate} />;
  }
  if (resolvedType === "image") {
    return <InlineImageCard memory={memory} onNavigate={onNavigate} />;
  }
  return <InlineTextCard memory={memory} onNavigate={onNavigate} />;
}

function ChatSourcePillsGroup({ memories, allMemories, onNavigate }) {
  const [selectedId, setSelectedId] = useState(null);

  if (!memories || memories.length === 0) return null;

  const handlePillClick = (memId) => {
    setSelectedId((prev) => (prev === memId ? null : memId));
  };

  const fullSelectedMemory = selectedId
    ? (allMemories || []).find((m) => m && (m.id === selectedId || m._id === selectedId)) || memories.find((m) => m && (m.id === selectedId || m._id === selectedId))
    : null;

  return (
    <div className="chat-sources-container">
      <div className="chat-sources-heading">REFERENCED MEMORIES</div>
      <div className="chat-sources-pills-row">
        {memories.map((mem, idx) => {
          const memId = mem?.id || mem?._id || `src_${idx}`;
          const fullMem = (allMemories || []).find((m) => m && (m.id === memId || m._id === memId)) || mem;
          const isSelected = selectedId === memId;
          return (
            <button
              key={memId}
              type="button"
              className={`chat-source-universal-pill ${isSelected ? "selected" : ""}`}
              onClick={() => handlePillClick(memId)}
              aria-expanded={isSelected}
              title={`View ${fullMem?.title || "memory"}`}
            >
              {getMemoryTypeIconHelper(fullMem?.type, fullMem)}
              <span className="source-pill-title">{fullMem?.title || "Untitled"}</span>
              <ChevronDown size={13} className={`source-pill-chevron ${isSelected ? "rotated" : ""}`} />
            </button>
          );
        })}
      </div>

      {fullSelectedMemory && (
        <div className="chat-source-selected-preview">
          <InlineMemoryRenderer memory={fullSelectedMemory} onNavigate={onNavigate} />
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { state, processChat, selectMemoryContext, dispatch } = useApp();
  const [loading, setLoading] = useState(!state.dataLoaded && state.loading);
  const [input, setInput] = useState("");
  
  const messages = state.chatMessages || [];
  const setMessages = useCallback((updaterOrArray) => {
    if (typeof updaterOrArray === "function") {
      dispatch({
        type: "SET_CHAT_MESSAGES",
        payload: updaterOrArray(state.chatMessages || []),
      });
    } else {
      dispatch({
        type: "SET_CHAT_MESSAGES",
        payload: updaterOrArray,
      });
    }
  }, [dispatch, state.chatMessages]);

  const [isTyping, setIsTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [fileAccept, setFileAccept] = useState("*/*");
  const fileInputRef = useRef(null);
  const attachMenuRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const [chatError, setChatError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((msg, duration = 4000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, duration);
  }, []);

  const [selectedMemory, setSelectedMemory] = useState(null);

  const upcomingReminders = React.useMemo(() => {
    if (!state.memories) return [];
    const list = [];
    state.memories
      .filter((m) => !m.deleted && !m.vaultId)
      .forEach((m) => {
        if (Array.isArray(m.reminders)) {
          m.reminders.forEach((r) => {
            if (r && r.title) {
              list.push({
                id: `rem_${m.id || m._id}_${r.title}`,
                memoryId: m.id || m._id,
                memoryTitle: m.title,
                title: r.title,
                date: r.date,
              });
            }
          });
        }
        const lowerTitle = (m.title || "").toLowerCase();
        if (lowerTitle.includes("exam") || lowerTitle.includes("interview")) {
          list.push({
            id: `evt_${m.id || m._id}`,
            memoryId: m.id || m._id,
            memoryTitle: m.title,
            title: m.title,
            date: m.date,
          });
        }
      });
    return list.slice(0, 4);
  }, [state.memories]);

  const pinnedMemories = React.useMemo(() => {
    return (state.memories || []).filter((m) => m && !m.deleted && !m.vaultId && m.pinned);
  }, [state.memories]);

  const recentMemories = React.useMemo(() => {
    return (state.memories || [])
      .filter((m) => m && !m.deleted && !m.vaultId)
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
      .slice(0, 4);
  }, [state.memories]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };


  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const voiceTranscriptRef = useRef("");
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(0.2);

  // Sync loading state when data is loaded from context
  useEffect(() => {
    if (state.dataLoaded || !state.loading) {
      setLoading(false);
    }
  }, [state.dataLoaded, state.loading]);

  // Click outside to close attachment menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isTyping]);

  const onThisDay = getOnThisDay(state.memories || []);


  const triggerFileSelect = (acceptType) => {
    setFileAccept(acceptType);
    setAttachMenuOpen(false);
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.accept = acceptType;
        fileInputRef.current.click();
      }
    }, 50);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let fileType = "document";
    if (file.type.startsWith("image/")) {
      fileType = "image";
    } else if (file.type.startsWith("audio/")) {
      fileType = "voice";
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        file,
        name: file.name,
        size: file.size,
        type: fileType,
        previewUrl: reader.result,
      });
      inputRef.current?.focus();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const submitMessage = useCallback(async (msgText, currentAttachment = null) => {
    const text = (msgText || "").trim();
    if (!text && !currentAttachment) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const promptText = text || (currentAttachment ? `Search memories matching attached ${currentAttachment.type}: ${currentAttachment.name}` : "");

    setInput("");
    setAttachedFile(null);
    setChatError(null);

    const userMsg = {
      id: `user_${Date.now()}`,
      role: "user",
      content: promptText,
      attachment: currentAttachment,
      timestamp: new Date().toISOString(),
    };

    // Immediately dispatch and persist user message
    dispatch({ type: "ADD_CHAT_MESSAGE", payload: userMsg });
    setIsTyping(true);

    try {
      const historyWithUser = [...(state.chatMessages || []), userMsg];
      const result = await processChat(promptText, selectedMemory, historyWithUser, currentAttachment);
      if (result?.assistant || result?.answer) {
        const assistantData = result.assistant || {};
        const directAnswer = assistantData.answer || assistantData.content || result.answer || "";
        const refMems = assistantData.referencedMemories || result.referencedMemories || assistantData.relatedMemories || [];

        const assistantMsg = {
          id: assistantData.id || `assistant_${Date.now()}`,
          role: "assistant",
          content: directAnswer,
          answer: directAnswer,
          referencedMemories: refMems,
          relatedMemories: refMems,
          requiresSelection: false,
          timestamp: assistantData.timestamp || new Date().toISOString(),
        };
        dispatch({ type: "ADD_CHAT_MESSAGE", payload: assistantMsg });
      } else if (result?.error) {
        setChatError(result.error);
      }
    } catch {
      setChatError("Failed to get a response. Please try again.");
    } finally {
      setIsTyping(false);
      isSubmittingRef.current = false;
    }
  }, [dispatch, processChat, selectedMemory, state.chatMessages]);

  const formatRecordingTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const cleanupAudioAnalyser = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0.2);
  };

  // Cleanup media streams, speech recognition, and audio analyser on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      cleanupAudioAnalyser();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startVoiceSearch = async () => {
    setChatError(null);
    setVoiceTranscript("");
    voiceTranscriptRef.current = "";
    setRecordingTime(0);
    setAudioLevel(0.2);
    setIsTranscribing(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast("Microphone access is not supported in this browser; please type your query.");
      return;
    }

    try {
      // 1. Request microphone stream (Brave / Cross-Browser Compatible)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // 2. Setup Web Audio API Analyser for real-time live volume visualization
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const sourceNode = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.4;
          sourceNode.connect(analyser);

          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const pollAudio = () => {
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              const level = Math.min(1, Math.max(0.15, avg / 80));
              setAudioLevel(level);
              animFrameRef.current = requestAnimationFrame(pollAudio);
            }
          };
          animFrameRef.current = requestAnimationFrame(pollAudio);
        }
      } catch (audioCtxErr) {
        console.warn("Audio analyser initialization notice:", audioCtxErr);
      }

      // 3. Setup MediaRecorder for audio chunks capture
      let mimeType = "";
      if (window.MediaRecorder && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        }
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);
      setIsVoiceRecording(true);
      setListening(true);

      // Start duration timer
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // 4. Setup parallel live interim SpeechRecognition if available in the browser
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch {}
          }

          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = navigator.language || "en-US";
          recognition.maxAlternatives = 1;

          recognition.onresult = (event) => {
            let final = "";
            let interim = "";
            for (let i = 0; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                final += event.results[i][0].transcript + " ";
              } else {
                interim += event.results[i][0].transcript;
              }
            }
            const cleanText = (final + interim).trim();
            if (cleanText) {
              voiceTranscriptRef.current = cleanText;
              setVoiceTranscript(cleanText);
              setInput(cleanText);
            }
          };

          recognition.onerror = (event) => {
            console.warn("Live speech recognition notice:", event.error);
          };

          recognitionRef.current = recognition;
          recognition.start();
        } catch (recErr) {
          console.warn("Live speech recognition start notice:", recErr);
        }
      }
    } catch (err) {
      console.warn("Microphone access check:", err);
      setIsVoiceRecording(false);
      setListening(false);
      cleanupAudioAnalyser();

      // Only show toast if hardware microphone permission was explicitly denied
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError" ||
        err.message?.toLowerCase().includes("permission denied") ||
        err.message?.toLowerCase().includes("not allowed")
      ) {
        showToast("Microphone access denied. Please allow microphone permission in your browser settings.");
      }
    }
  };

  const finishVoiceSearch = async (andSubmit = false) => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      cleanupAudioAnalyser();
      setIsVoiceRecording(false);
      setListening(false);
      if (andSubmit) {
        const textToSubmit = (voiceTranscriptRef.current || voiceTranscript || input || "").trim();
        if (textToSubmit) {
          submitMessage(textToSubmit, attachedFile);
        }
      }
      return;
    }

    // Stop microphone stream tracks immediately
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    cleanupAudioAnalyser();

    const currentLiveTranscript = (voiceTranscriptRef.current || voiceTranscript || input || "").trim();

    // Create a promise to resolve audio Blob from recorded chunks
    const audioBlob = await new Promise((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        resolve(blob);
      };

      try {
        if (recorder.state === "recording") {
          recorder.stop();
        } else {
          const mimeType = recorder.mimeType || "audio/webm";
          resolve(new Blob(audioChunksRef.current, { type: mimeType }));
        }
      } catch (stopErr) {
        console.warn("MediaRecorder stop error:", stopErr);
        const mimeType = recorder.mimeType || "audio/webm";
        resolve(new Blob(audioChunksRef.current, { type: mimeType }));
      }
    });

    setIsVoiceRecording(false);
    setListening(false);

    let finalQuery = currentLiveTranscript;

    // If live WebSpeech didn't catch anything, transcribe via backend Whisper endpoint
    if (!finalQuery && audioBlob && audioBlob.size > 0) {
      setIsTranscribing(true);
      try {
        const res = await transcribeAudio(audioBlob);
        const transcript = (res?.transcript || "").trim();
        if (transcript) {
          finalQuery = transcript;
          setVoiceTranscript(transcript);
          setInput(transcript);
        }
      } catch (transcribeErr) {
        console.warn("Backend transcription notice:", transcribeErr.message);
      } finally {
        setIsTranscribing(false);
      }
    }

    setRecordingTime(0);
    audioChunksRef.current = [];

    // Focus input area so user can press Enter immediately
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    // If submitted via enter key or send button, trigger response
    if (andSubmit && finalQuery) {
      submitMessage(finalQuery, attachedFile);
    }
  };

  const cancelVoiceSearch = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    cleanupAudioAnalyser();
    setIsVoiceRecording(false);
    setListening(false);
    setIsTranscribing(false);
    voiceTranscriptRef.current = "";
    setVoiceTranscript("");
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const toggleListening = () => {
    if (isVoiceRecording || listening) {
      finishVoiceSearch(false);
    } else {
      startVoiceSearch();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isVoiceRecording) {
        finishVoiceSearch(true);
      } else {
        handleSend();
      }
    }
  };

  const handleSend = (overrideText = null) => {
    if (isVoiceRecording) {
      finishVoiceSearch(true);
    } else {
      submitMessage(typeof overrideText === "string" ? overrideText : input, attachedFile);
    }
  };


  const handleSelectMemory = async (memoryId, memoryObj = null) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    // Use the current typed input or default to memory title
    const typedQuery = input.trim();
    const userQuery = typedQuery || (memoryObj?.title ? `Tell me about ${memoryObj.title}` : "Tell me about this memory");

    // Clear input
    setInput("");
    setChatError(null);

    // Add user question to the chat stream
    const userMsg = {
      id: `user_${Date.now()}`,
      role: "user",
      content: userQuery,
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: "ADD_CHAT_MESSAGE", payload: userMsg });
    setIsTyping(true);

    try {
      const result = await selectMemoryContext(memoryId, userQuery);
      if (result?.assistant) {
        const assistantMsg = {
          id: result.assistant.id || `assistant_${Date.now()}`,
          role: "assistant",
          content: result.assistant.content,
          answer: result.assistant.content,
          memorySource: result.assistant.memorySource || result.assistant.selectedMemory || result.assistant.relatedMemories,
          selectedMemory: result.assistant.selectedMemory || (memoryObj ? { id: memoryId, title: memoryObj.title } : null),
          referencedMemories: result.assistant.relatedMemories || (memoryObj ? [{ id: memoryId, title: memoryObj.title, preview: (memoryObj.content || "").substring(0, 100) }] : []),
          relatedMemories: result.assistant.relatedMemories || (memoryObj ? [{ id: memoryId, title: memoryObj.title, preview: (memoryObj.content || "").substring(0, 100) }] : []),
          requiresSelection: false,
          timestamp: result.assistant.timestamp || new Date().toISOString(),
        };
        dispatch({ type: "ADD_CHAT_MESSAGE", payload: assistantMsg });
      } else if (result?.error) {
        setChatError(result.error);
      }
    } catch {
      setChatError("Failed to get response for selected memory.");
    } finally {
      setIsTyping(false);
      isSubmittingRef.current = false;
    }
  };

  const hasMemories = Array.isArray(state.memories) && state.memories.some((m) => m && !m.deleted);
  const isInitialLoading = loading || (!state.dataLoaded && state.loading);
  const isEmptyState = !isInitialLoading && !hasMemories && messages.length === 0;

  return (
    <div className="app">
      <TopNav />
      <div className="main-content home-page is-minimal-layout">
        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="chat-container">
            <div className="chat-messages">
              {messages.map((msg, index) => {
                const referencedList = msg.referencedMemories || msg.relatedMemories || [];
                const referencedMemId = msg.selectedMemory?.id || msg.selectedMemory?._id || (referencedList.length === 1 ? (referencedList[0]?.id || referencedList[0]?._id) : null);
                const matchedMem = referencedMemId ? (state.memories || []).find((m) => m && (m.id === referencedMemId || m._id === referencedMemId)) : null;

                // Collect sources to display as universal pills
                const displaySources = referencedList.length > 0
                  ? referencedList
                  : (msg.selectedMemory || matchedMem ? [msg.selectedMemory || matchedMem] : []);

                const isDisambiguation = msg.role === "assistant" && msg.requiresSelection && referencedList.length > 1;

                return (
                  <div key={msg.id || msg._id || `msg_${index}`} className={`chat-message ${msg.role || "assistant"}`}>
                    <div className="chat-avatar">
                      {msg.role === "user" ? (
                        state.user?.name?.charAt(0).toUpperCase() || "U"
                      ) : (
                        <Brain size={18} strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="chat-content">
                      <div className="chat-bubble">
                        {/* If user attached a file, show the preview inside user message */}
                        {msg.attachment && (
                          <div className="chat-user-attachment">
                            {msg.attachment.type === "image" ? (
                              <img src={msg.attachment.previewUrl} alt={msg.attachment.name} className="chat-user-attachment-img" />
                            ) : (
                              <div className="chat-user-attachment-file">
                                {msg.attachment.type === "voice" ? <Mic size={14} /> : <FileText size={14} />}
                                <span>{msg.attachment.name}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {msg.answer || msg.content}
                      </div>

                      {/* Multiple matches disambiguation cards */}
                      {isDisambiguation && (
                        <div className="chat-disambiguation-container">
                          <div className="chat-disambiguation-prompt">
                            Select a memory to recall details:
                          </div>
                          <div className="chat-disambiguation-grid">
                            {referencedList.map((cand) => {
                              const fullCand = (state.memories || []).find((m) => m && (m.id === (cand.id || cand._id) || m._id === (cand.id || cand._id))) || cand;
                              return (
                                <MemoryCard
                                  key={cand.id || cand._id}
                                  memory={fullCand}
                                  showSelect={true}
                                  selectLabel="Select"
                                  onSelect={(selectedId, selectedObj) => handleSelectMemory(selectedId, selectedObj)}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Render Universal REFERENCED MEMORIES Pills & Dynamic Previews */}
                      {msg.role === "assistant" && !isDisambiguation && displaySources.length > 0 && (state.aiPreferences?.showSources !== false) && (
                        <ChatSourcePillsGroup
                          memories={displaySources}
                          allMemories={state.memories}
                          onNavigate={navigate}
                        />
                      )}

                      <div className="chat-time">{formatTime(msg.timestamp)}</div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="chat-message assistant">
                  <div className="chat-avatar">
                    <Brain size={18} strokeWidth={1.5} />
                  </div>
                  <div className="chat-bubble">
                    <div className="typing-indicator">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </div>
                </div>
              )}

              {chatError && (
                <div className="chat-message assistant">
                  <div className="chat-avatar">
                    <Brain size={18} strokeWidth={1.5} />
                  </div>
                  <div className="chat-bubble chat-error">
                    {chatError}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="chat-input-wrapper">
          <input
            ref={fileInputRef}
            type="file"
            accept={fileAccept}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {/* Attachment Preview Chip */}
          {attachedFile && (
            <div className="chat-attachment-chip">
              {attachedFile.type === "image" ? (
                <img src={attachedFile.previewUrl} alt={attachedFile.name} className="attachment-chip-thumb" />
              ) : attachedFile.type === "voice" ? (
                <div className="attachment-chip-icon-box"><Mic size={14} /></div>
              ) : (
                <div className="attachment-chip-icon-box"><FileText size={14} /></div>
              )}
              <div className="attachment-chip-info">
                <span className="attachment-chip-name">{attachedFile.name}</span>
                <span className="attachment-chip-size">
                  {(attachedFile.size / 1024).toFixed(0)} KB
                </span>
              </div>
              <button
                type="button"
                className="attachment-chip-remove"
                onClick={() => setAttachedFile(null)}
                title="Remove attachment"
                aria-label="Remove attachment"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Floating Chat Error Banner */}
          {chatError && (
            <div className="chat-floating-error">
              <span>{chatError}</span>
              <button
                type="button"
                className="chat-floating-error-close"
                onClick={() => setChatError(null)}
                title="Dismiss message"
                aria-label="Dismiss message"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className={`chat-input-box capsule-input-bar ${isEmptyState ? "empty-onboarding-input" : ""} ${isVoiceRecording || isTranscribing ? "recording-active" : ""}`}>
            {isVoiceRecording || isTranscribing ? (
              <div className="chat-voice-active-bar">
                <div className="voice-active-indicator">
                  <span className={`voice-active-pulse-dot ${isTranscribing ? "transcribing" : ""}`} />
                  <span className="voice-active-timer">
                    {isTranscribing ? "Processing..." : formatRecordingTime(recordingTime)}
                  </span>
                </div>
                <div className="voice-active-wave" title="Audio level meter">
                  <span className="voice-wave-bar bar-1" style={{ transform: `scaleY(${isTranscribing ? 0.6 : Math.max(0.3, audioLevel * 1.5)})` }} />
                  <span className="voice-wave-bar bar-2" style={{ transform: `scaleY(${isTranscribing ? 0.9 : Math.max(0.4, audioLevel * 1.9)})` }} />
                  <span className="voice-wave-bar bar-3" style={{ transform: `scaleY(${isTranscribing ? 1.2 : Math.max(0.5, audioLevel * 2.4)})` }} />
                  <span className="voice-wave-bar bar-4" style={{ transform: `scaleY(${isTranscribing ? 0.8 : Math.max(0.3, audioLevel * 1.6)})` }} />
                  <span className="voice-wave-bar bar-5" style={{ transform: `scaleY(${isTranscribing ? 1.1 : Math.max(0.5, audioLevel * 2.2)})` }} />
                  <span className="voice-wave-bar bar-6" style={{ transform: `scaleY(${isTranscribing ? 0.9 : Math.max(0.4, audioLevel * 1.8)})` }} />
                  <span className="voice-wave-bar bar-7" style={{ transform: `scaleY(${isTranscribing ? 0.5 : Math.max(0.3, audioLevel * 1.4)})` }} />
                </div>
                <div className="voice-active-text" title={isTranscribing ? "Transcribing audio..." : (voiceTranscript || "Listening...")}>
                  {isTranscribing ? (
                    <span className="voice-listening-placeholder voice-transcribing-text">
                      Transcribing audio with Whisper STT...
                    </span>
                  ) : voiceTranscript ? (
                    <span className="voice-transcript-text">"{voiceTranscript}"</span>
                  ) : (
                    <span className="voice-listening-placeholder">Listening... Speak your query (e.g. "Where did I put my keys?")...</span>
                  )}
                </div>
                <div className="voice-active-actions">
                  <button
                    type="button"
                    className="voice-action-btn cancel"
                    onClick={cancelVoiceSearch}
                    title="Cancel voice search"
                    aria-label="Cancel voice search"
                    disabled={isTranscribing}
                  >
                    <X size={16} />
                  </button>
                  <button
                    type="button"
                    className="voice-action-btn submit"
                    onClick={() => finishVoiceSearch(true)}
                    title="Search memories with this voice query"
                    aria-label="Search memories with this voice query"
                    disabled={isTranscribing}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="chat-add-btn-wrapper" ref={attachMenuRef}>
                  <button
                    type="button"
                    className="chat-add-btn"
                    onClick={() => setAttachMenuOpen((prev) => !prev)}
                    title="Attach file or media to search"
                    aria-label="Attach file or media to search"
                  >
                    <Plus size={18} strokeWidth={2.5} style={{ transform: attachMenuOpen ? "rotate(45deg)" : "none", transition: "transform 0.2s" }} />
                  </button>

                  {/* Attachment Options Popover */}
                  {attachMenuOpen && (
                    <div className="chat-attachment-popover">
                      <button
                        type="button"
                        className="attachment-popover-item"
                        onClick={() => triggerFileSelect("image/*")}
                      >
                        <span className="attachment-popover-icon"><ImageIcon size={16} /></span>
                        <span className="attachment-popover-text">Upload Image</span>
                      </button>
                      <button
                        type="button"
                        className="attachment-popover-item"
                        onClick={() => triggerFileSelect("audio/*")}
                      >
                        <span className="attachment-popover-icon"><Mic size={16} /></span>
                        <span className="attachment-popover-text">Upload Audio</span>
                      </button>
                      <button
                        type="button"
                        className="attachment-popover-item"
                        onClick={() => triggerFileSelect(".pdf,.doc,.docx,.txt,.md,application/pdf,text/*")}
                      >
                        <span className="attachment-popover-icon"><FileText size={16} /></span>
                        <span className="attachment-popover-text">Upload Document/File</span>
                      </button>
                    </div>
                  )}
                </div>

                <textarea
                  ref={inputRef}
                  className="chat-input"
                  placeholder={attachedFile ? `Ask about "${attachedFile.name}"...` : "Type or speak your memory..."}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <div className="chat-input-actions-right">
                  <button
                    type="button"
                    className={`chat-mic-btn ${isVoiceRecording ? "recording" : ""}`}
                    title={isVoiceRecording ? "Stop and search memory" : "Search or ask memory using voice"}
                    onClick={isVoiceRecording ? finishVoiceSearch : startVoiceSearch}
                  >
                    <Mic size={18} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    className="chat-send-btn"
                    onClick={handleSend}
                    disabled={(!input.trim() && !attachedFile) || isTyping}
                    title="Send"
                  >
                    <Send size={16} strokeWidth={2} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toastMessage && (
        <div className="toast">
          {toastMessage}
        </div>
      )}

      {/* Floating Action Button */}
      <FAB />
    </div>
  );
}
