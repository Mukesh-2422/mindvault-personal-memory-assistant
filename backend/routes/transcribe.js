const express = require("express");
const multer = require("multer");
const router = express.Router();
const transcribeController = require("../controllers/transcribeController");

// Use memory storage for quick streaming of audio chunks to Whisper API
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow all standard audio mime types and browser recording formats
  if (
    file.mimetype.startsWith("audio/") ||
    file.mimetype === "video/webm" ||
    file.mimetype === "application/octet-stream" ||
    /\.(webm|mp3|wav|ogg|m4a|aac|mp4|weba)$/i.test(file.originalname || "")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Please upload a valid audio file."), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max Whisper file limit
  },
  fileFilter: fileFilter,
});

// POST /api/transcribe
router.post("/", (req, res, next) => {
  upload.single("audio")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error: "Audio recording file size exceeds the 25MB limit.",
        });
      }
      return res.status(400).json({
        success: false,
        error: err.message || "Failed to process uploaded audio file.",
      });
    }
    next();
  });
}, transcribeController.transcribeAudio);

module.exports = router;
