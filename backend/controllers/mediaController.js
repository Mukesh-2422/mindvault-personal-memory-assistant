const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { findOne } = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

const MIME_TYPES = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".3gp": "video/3gpp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".weba": "audio/webm",
  ".flac": "audio/flac",
  ".pdf": "application/pdf",
};

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
 * Serve a media file with HTTP Range streaming support for video/audio playback.
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

    // Determine the actual file path (audio files live under uploads/audio/ or uploads/).
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

    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const stat = fs.statSync(resolved);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Handle HTTP Range requests for video and audio streaming
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).set("Content-Range", `bytes */${fileSize}`);
        return res.end();
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(resolved, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType,
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      };
      res.writeHead(200, head);
      fs.createReadStream(resolved).pipe(res);
    }
  } catch (err) {
    console.error("Error serving media:", err.message);
    res.status(500).json({ error: "Failed to serve media" });
  }
}

module.exports = { serveMedia };