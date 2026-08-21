import { api, API_BASE } from "./client";

export async function uploadVoiceMemory(formData) {
  const token = localStorage.getItem("mv_auth_token");
  const response = await fetch(`${API_BASE}/voice`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || "Failed to upload voice memory");
  }

  return response.json();
}

/**
 * Transcribe recorded audio Blob to text using backend /api/transcribe endpoint
 * @param {Blob} audioBlob
 * @returns {Promise<{ transcript: string, success: boolean }>}
 */
export async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  const filename = audioBlob.type && audioBlob.type.includes("mp4") ? "recording.mp4" : "recording.webm";
  formData.append("audio", audioBlob, filename);

  const token = localStorage.getItem("mv_auth_token");
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}/transcribe`, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch (fetchErr) {
    if (API_BASE === "/api") {
      response = await fetch("http://localhost:5000/api/transcribe", {
        method: "POST",
        headers,
        body: formData,
      });
    } else {
      throw fetchErr;
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Transcription failed (${response.status})`);
  }

  return response.json();
}

export async function getVoiceMemories() {
  return api.get("/voice");
}

export async function getVoiceMemory(id) {
  return api.get(`/voice/${id}`);
}

export async function deleteVoiceMemory(id) {
  return api.delete(`/voice/${id}`);
}

/**
 * Get the authenticated media URL with auth token appended as query param.
 * This is needed for <img>/<audio>/<video> elements that cannot set custom headers.
 */
export function getMediaUrl(mediaUrl) {
  if (!mediaUrl) return null;
  const token = localStorage.getItem("mv_auth_token");

  let fullUrl = mediaUrl;
  if (API_BASE.startsWith("http://") || API_BASE.startsWith("https://")) {
    const origin = API_BASE.replace(/\/api\/?$/, "");
    if (mediaUrl.startsWith("/api/media/")) {
      fullUrl = `${origin}${mediaUrl}`;
    } else if (mediaUrl.startsWith("http://localhost:5000/api/media/")) {
      fullUrl = mediaUrl.replace("http://localhost:5000", origin);
    }
  }

  if (token && (fullUrl.includes("/api/media/") || fullUrl.includes("/media/"))) {
    const separator = fullUrl.includes("?") ? "&" : "?";
    return `${fullUrl}${separator}token=${encodeURIComponent(token)}`;
  }
  return fullUrl;
}