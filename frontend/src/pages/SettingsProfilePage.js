import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TopNav from "../components/layout/TopNav";
import ImageCropModal from "../components/common/ImageCropModal";
import { useApp } from "../context/AppContext";
import { useAppBackNavigation } from "../utils/useAppBackNavigation";
import { getInitials } from "../utils/helpers";
import * as authApi from "../api/auth";
import {
  ArrowLeft,
  Save,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Crop,
  User,
  Mail,
  Lock,
  Sparkles,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import "../styles/global.css";
import "../styles/pages.css";

export default function SettingsProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useApp();
  const targetDestination = location.state?.from || "/profile";
  const goBack = useAppBackNavigation(targetDestination);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [name, setName] = useState(state.user?.name || "");
  const [email] = useState(state.user?.email || "");
  const [avatar, setAvatar] = useState(state.user?.avatar || null);
  const [rawSelectedImage, setRawSelectedImage] = useState(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [avatarHover, setAvatarHover] = useState(false);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  useEffect(() => {
    if (state.user) {
      setName(state.user.name || "");
      setAvatar(state.user.avatar || null);
    }
  }, [state.user]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ text: "Please select a valid image file", type: "error" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage({ text: "Image size must be less than 10MB", type: "error" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setRawSelectedImage(loadEvent.target.result);
      setIsCropModalOpen(true);
      setMessage({ text: "", type: "" });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarClick = () => {
    if (avatar) {
      setRawSelectedImage(avatar);
      setIsCropModalOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleOpenAdjust = () => {
    if (avatar) {
      setRawSelectedImage(avatar);
      setIsCropModalOpen(true);
    }
  };

  const handleCropApply = (croppedBase64) => {
    setAvatar(croppedBase64);
    setIsCropModalOpen(false);
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const hasChanges =
    (name.trim() !== (state.user?.name || "").trim()) ||
    (avatar !== (state.user?.avatar || null));

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage({ text: "Name cannot be empty", type: "error" });
      return;
    }

    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const updated = await authApi.updateProfile({
        name: trimmedName,
        avatar: avatar || null,
      });

      dispatch({ type: "UPDATE_USER", payload: updated });
      navigate(targetDestination, { replace: true });
    } catch (err) {
      setMessage({
        text: err.message || "Failed to update profile",
        type: "error",
      });
      setSaving(false);
    }
  };

  return (
    <div className="app" style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <TopNav />

      <div
        className="main-content"
        ref={containerRef}
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          padding: "28px 20px 80px",
          width: "100%",
        }}
      >
        {/* Top Back Navigation Bar */}
        <div style={{ marginBottom: "20px" }}>
          <button
            type="button"
            onClick={goBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--card-bg)",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.transform = "translateX(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.borderColor = "var(--border-color)";
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            <ArrowLeft size={15} strokeWidth={2} />
            <span>Back to Profile</span>
          </button>
        </div>

        {/* Page Header */}
        <div style={{ marginBottom: "24px" }}>
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
            <ShieldCheck size={13} strokeWidth={2.5} />
            <span>Account Settings</span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "26px",
              fontWeight: "800",
              color: "var(--text-primary)",
              letterSpacing: "-0.5px",
              margin: "0 0 6px 0",
            }}
          >
            Personal Information
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-secondary)",
              margin: 0,
              lineHeight: "1.5",
            }}
          >
            Manage your personal identity, avatar image, and account profile details.
          </p>
        </div>

        {/* Main Profile Card */}
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "20px",
            boxShadow: "var(--shadow-md)",
            overflow: "hidden",
            transition: "box-shadow var(--transition-base)",
          }}
        >
          <form onSubmit={handleSave} style={{ padding: "28px" }}>
            {/* Avatar & Identity Hero Section */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "24px",
                paddingBottom: "28px",
                borderBottom: "1px solid var(--border-color)",
                flexWrap: "wrap",
              }}
            >
              {/* Interactive Avatar */}
              <div
                style={{
                  position: "relative",
                  width: "88px",
                  height: "88px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  flexShrink: 0,
                  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.12)",
                }}
                onClick={handleAvatarClick}
                onMouseEnter={() => setAvatarHover(true)}
                onMouseLeave={() => setAvatarHover(false)}
                title={avatar ? "Click to adjust & crop photo" : "Click to upload photo"}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "3px solid var(--accent)",
                    background: "var(--navy, #0F2F5B)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFFFFF",
                    fontSize: "30px",
                    fontWeight: "700",
                    transition: "transform var(--transition-fast)",
                    transform: avatarHover ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Profile Avatar"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    getInitials(name || state.user?.name || "U")
                  )}
                </div>

                {/* Hover Overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    backgroundColor: "rgba(0, 0, 0, 0.45)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    opacity: avatarHover ? 1 : 0,
                    transition: "opacity var(--transition-fast)",
                    pointerEvents: "none",
                  }}
                >
                  {avatar ? <Crop size={22} strokeWidth={2} /> : <Camera size={22} strokeWidth={2} />}
                </div>

                {/* Corner Badge */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "var(--accent)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid var(--card-bg)",
                    boxShadow: "var(--shadow-sm)",
                    pointerEvents: "none",
                  }}
                >
                  {avatar ? <Crop size={13} strokeWidth={2.2} /> : <Camera size={13} strokeWidth={2.2} />}
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleImageUpload}
              />

              {/* Avatar Info & Actions */}
              <div style={{ flex: 1, minWidth: "220px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <h3
                    style={{
                      fontSize: "17px",
                      fontWeight: "700",
                      color: "var(--text-primary)",
                      margin: 0,
                    }}
                  >
                    Profile Photo
                  </h3>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "var(--bg-secondary)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {avatar ? "Custom Photo" : "Initials Avatar"}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-tertiary)",
                    margin: "0 0 12px 0",
                    lineHeight: "1.4",
                  }}
                >
                  Click the photo to pan & zoom, or upload a new square photo (up to 10MB).
                </p>

                {/* Buttons */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  {avatar && (
                    <button
                      type="button"
                      onClick={handleOpenAdjust}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        borderRadius: "8px",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-color)",
                        cursor: "pointer",
                        transition: "all var(--transition-fast)",
                      }}
                      title="Adjust position, zoom, and framing"
                    >
                      <Crop size={13} strokeWidth={2} />
                      <span>Adjust Framing</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 12px",
                      fontSize: "12px",
                      fontWeight: "600",
                      borderRadius: "8px",
                      background: avatar ? "var(--bg-secondary)" : "var(--accent)",
                      color: avatar ? "var(--text-primary)" : "#FFFFFF",
                      border: "1px solid var(--border-color)",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    <Camera size={13} strokeWidth={2} />
                    <span>{avatar ? "Upload New" : "Upload Photo"}</span>
                  </button>

                  {avatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        borderRadius: "8px",
                        background: "transparent",
                        color: "var(--danger, #EF4444)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        cursor: "pointer",
                        transition: "all var(--transition-fast)",
                      }}
                    >
                      <Trash2 size={13} strokeWidth={2} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Form Fields Section */}
            <div style={{ paddingTop: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Full Name */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <User size={15} strokeWidth={2} color="var(--accent)" />
                    <span>Full Name</span>
                    <span style={{ color: "var(--danger, #EF4444)", fontSize: "14px" }}>*</span>
                  </label>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                    {name.length}/50
                  </span>
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={name}
                    maxLength={50}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      fontSize: "14px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      outline: "none",
                      transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--accent)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(56, 189, 248, 0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--border-color)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              {/* Email Address (Read-only) */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Mail size={15} strokeWidth={2} color="var(--accent)" />
                    <span>Email Address</span>
                  </label>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      color: "var(--text-tertiary)",
                      background: "var(--bg-secondary)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    <Lock size={10} strokeWidth={2} />
                    <span>Primary Identifier</span>
                  </span>
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    type="email"
                    value={email}
                    disabled
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      fontSize: "14px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-secondary)",
                      cursor: "not-allowed",
                      opacity: 0.75,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--text-tertiary)",
                    marginTop: "6px",
                    lineHeight: "1.4",
                  }}
                >
                  Your email address is linked to your authentication provider and cannot be changed here.
                </p>
              </div>
            </div>

            {/* Notification / Message Alert */}
            {message.text && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "13px",
                  fontWeight: "500",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  marginTop: "20px",
                  background:
                    message.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  color: message.type === "success" ? "var(--success, #22C55E)" : "var(--danger, #EF4444)",
                  border: `1px solid ${
                    message.type === "success"
                      ? "rgba(34, 197, 94, 0.25)"
                      : "rgba(239, 68, 68, 0.25)"
                  }`,
                }}
              >
                {message.type === "success" ? (
                  <CheckCircle2 size={16} strokeWidth={2} />
                ) : (
                  <AlertCircle size={16} strokeWidth={2} />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {/* Form Footer Action Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "28px",
                paddingTop: "20px",
                borderTop: "1px solid var(--border-color)",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                {hasChanges && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      color: "var(--accent)",
                      fontWeight: "600",
                    }}
                  >
                    <Sparkles size={13} />
                    <span>You have unsaved changes</span>
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={goBack}
                  style={{
                    padding: "10px 18px",
                    fontSize: "13px",
                    fontWeight: "600",
                    borderRadius: "10px",
                    background: "var(--bg-secondary)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.borderColor = "var(--border-color)";
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 22px",
                    fontSize: "13px",
                    fontWeight: "700",
                    borderRadius: "10px",
                    background: saving
                      ? "var(--text-tertiary)"
                      : "var(--accent)",
                    color: "#FFFFFF",
                    border: "none",
                    cursor: saving ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) e.currentTarget.style.filter = "brightness(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = "none";
                  }}
                >
                  {saving ? (
                    <>
                      <Loader2 size={15} className="spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} strokeWidth={2} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Interactive Image Adjust / Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={rawSelectedImage}
        onClose={() => setIsCropModalOpen(false)}
        onApply={handleCropApply}
      />
    </div>
  );
}