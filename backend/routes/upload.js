const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { handleFileUpload } = require("../controllers/uploadController");

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const safeExtensions = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".heic", ".heif", ".bmp",
  ".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv", ".3gp", ".wmv", ".flv", ".ts",
  ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".weba", ".flac", ".opus",
  ".pdf", ".txt", ".doc", ".docx", ".csv", ".json"
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = safeExtensions.has(ext) ? ext : ".bin";
    cb(null, uuidv4() + safeExt);
  },
});

// Validate MIME types — allow media and standard documents
const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || "").toLowerCase();
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    mime === "application/pdf" ||
    mime === "text/plain" ||
    mime === "application/msword" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    safeExtensions.has(ext)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only media files (video, audio, image) and documents are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for high-res videos
});

router.post("/", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File size exceeds maximum limit (500MB)." });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || "Failed to upload file." });
    }
    handleFileUpload(req, res, next);
  });
});

module.exports = router;