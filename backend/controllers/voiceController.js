const { v4: uuidv4 } = require("uuid");
const { insertOne, getCollection, findOne, deleteOne } = require("../db");

// Upload voice memory — saves to the unified 'memories' collection
exports.uploadVoiceMemory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No audio file uploaded" });
    }

    const { title, description, duration } = req.body;

    const audioUrl = `/api/media/${req.file.filename}`;

    const memory = {
      id: uuidv4(),
      userId: req.user.id,
      title: title || "Voice Memory",
      content: description || "",
      type: "voice",
      category: "General",
      tags: [],
      importance: "medium",
      pinned: false,
      checklist: undefined,
      mediaUrl: audioUrl,
      mediaName: req.file.filename,
      mediaType: req.file.mimetype,
      mediaSize: req.file.size,
      duration: duration ? parseInt(duration) : 0,
      relatedPerson: null,
      date: new Date().toISOString(),
      deleted: false,
      deletedAt: null,
      vaultId: null,
    };

    await insertOne("memories", memory);

    res.status(201).json({
      success: true,
      message: "Voice memory saved successfully",
      audioUrl,
      memory,
    });
  } catch (error) {
    console.error("Error uploading voice memory:", error);
    res.status(500).json({ success: false, message: "Failed to save voice memory", error: error.message });
  }
};

// Get all voice memories for a user (from unified memories collection)
exports.getVoiceMemories = async (req, res) => {
  try {
    const all = await getCollection("memories", { userId: req.user.id });
    const voiceMemories = all.filter((m) => m.type === "voice" && !m.deleted);
    res.json({ success: true, data: voiceMemories });
  } catch (error) {
    console.error("Error fetching voice memories:", error);
    res.status(500).json({ success: false, message: "Failed to fetch voice memories", error: error.message });
  }
};

// Get single voice memory
exports.getVoiceMemory = async (req, res) => {
  try {
    const memory = await findOne("memories", { id: req.params.id, userId: req.user.id });
    if (!memory || memory.type !== "voice") {
      return res.status(404).json({ success: false, message: "Voice memory not found" });
    }
    res.json({ success: true, data: memory });
  } catch (error) {
    console.error("Error fetching voice memory:", error);
    res.status(500).json({ success: false, message: "Failed to fetch voice memory", error: error.message });
  }
};

// Delete voice memory
exports.deleteVoiceMemory = async (req, res) => {
  try {
    const memory = await findOne("memories", { id: req.params.id, userId: req.user.id });
    if (!memory || memory.type !== "voice") {
      return res.status(404).json({ success: false, message: "Voice memory not found" });
    }

    // Optionally delete the audio file from disk
    const fs = require("fs");
    const path = require("path");
    if (memory.mediaName) {
      const filePath = path.join(__dirname, "..", "uploads", "audio", memory.mediaName);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Error deleting audio file:", err);
      }
    }

    await deleteOne("memories", req.params.id);
    res.json({ success: true, message: "Voice memory deleted successfully" });
  } catch (error) {
    console.error("Error deleting voice memory:", error);
    res.status(500).json({ success: false, message: "Failed to delete voice memory", error: error.message });
  }
};