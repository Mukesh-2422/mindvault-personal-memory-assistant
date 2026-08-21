const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { findOne } = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

/**
 * Extract the authenticated user from the request.
 * Tries Authorization header first, then falls back to ?token= query param
 * (needed for <img>/<audio>/<video> tags that cannot set custom headers).
 */
function getUserId(req) {
  // Try Authorization header
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
      return decoded.id;
    } catch {
      return null;
    }
  }
  // Try query param token
  const token = req.query.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded.id;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Serve a private media file ONLY if the authenticated user owns a memory
 * referencing that file. This prevents User A from accessing User B's files
 * even if User A knows/crafts the file URL.
 */
async function serveMedia(req, res) {
  try {
    const filename = req.params.filename;
    if (!filename) {
      return res.status(400).json({ error: "Filename required" });
    }

    // Prevent path traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Search the user's memories for one referencing this file.
    const memory = await findOne(
      "memories",
      (m) =>
        m.userId === userId &&
        !m.deleted &&
        (m.mediaName === filename || (m.mediaUrl && m.mediaUrl.includes(filename)))
    );

    if (!memory) {
      return res.status(404).json({ error: "Media not found" });
    }

    // Determine the actual file path (audio files live under uploads/audio/).
    let filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      const audioPath = path.join(UPLOADS_DIR, "audio", filename);
      if (fs.existsSync(audioPath)) {
        filePath = audioPath;
      } else {
        return res.status(404).json({ error: "Media file not found on disk" });
      }
    }

    // Resolve and enforce the file is within the uploads directory.
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(UPLOADS_DIR))) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    res.sendFile(resolved);
  } catch (err) {
    console.error("Error serving media:", err.message);
    res.status(500).json({ error: "Failed to serve media" });
  }
}

module.exports = { serveMedia };