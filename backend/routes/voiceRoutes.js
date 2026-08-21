const express = require("express");
const router = express.Router();
const voiceController = require("../controllers/voiceController");
const upload = require("../middleware/uploadAudio");
const { authMiddleware } = require("../middleware/auth");

// Upload voice memory (protected route)
router.post("/", authMiddleware, upload.single("audio"), voiceController.uploadVoiceMemory);

// Get all voice memories (protected route)
router.get("/", authMiddleware, voiceController.getVoiceMemories);

// Get single voice memory (protected route)
router.get("/:id", authMiddleware, voiceController.getVoiceMemory);

// Delete voice memory (protected route)
router.delete("/:id", authMiddleware, voiceController.deleteVoiceMemory);

module.exports = router;