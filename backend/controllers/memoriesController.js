const { v4: uuidv4 } = require("uuid");
const { getCollection, insertOne, updateOne, deleteOne, findById } = require("../db");

async function getUserMemories(userId) {
  return getCollection("memories", { userId });
}

async function getMemories(req, res) {
  try {
    const memories = await getUserMemories(req.user.id);
    res.json(memories);
  } catch (err) {
    console.error("Error fetching memories:", err);
    res.status(500).json({ error: "Failed to fetch memories" });
  }
}

async function createMemory(req, res) {
  try {
    const {
      title,
      content,
      type,
      tags,
      pinned,
      checklist,
      mediaData,
      mediaUrl,
      mediaName,
      mediaType,
      mediaSize,
      duration,
    } = req.body;

    if (!title && !content) {
      return res.status(400).json({ error: "Title or content required" });
    }

    const memory = {
      id: uuidv4(),
      userId: req.user.id,
      title: title || content?.substring(0, 50) || "Untitled",
      content: content || "",
      type: type || "text",
      tags: tags || [],
      pinned: pinned || false,
      checklist: type === "checklist" ? checklist || [] : undefined,
      mediaData: mediaData || null,
      mediaUrl: mediaUrl || null,
      mediaName: mediaName || null,
      mediaType: mediaType || null,
      mediaSize: mediaSize || null,
      duration: duration || null,
      relatedPerson: req.body.relatedPerson || null,
      date: new Date().toISOString(),
      deleted: false,
      deletedAt: null,
      vaultId: null,
    };

    await insertOne("memories", memory);
    res.status(201).json(memory);
  } catch (err) {
    console.error("Error saving memory:", err);
    res.status(500).json({ error: "Failed to save memory: " + err.message });
  }
}

async function getMemoryById(req, res) {
  try {
    const memory = await findById("memories", req.params.id);
    if (!memory || memory.userId !== req.user.id) {
      return res.status(404).json({ error: "Memory not found" });
    }
    res.json(memory);
  } catch (err) {
    console.error("Error fetching memory:", err);
    res.status(500).json({ error: "Failed to fetch memory" });
  }
}

/**
 * Securely retrieve a single memory for use as chat context.
 * Ownership is verified server-side: the memory must belong to the
 * authenticated user.  Only the fields needed by the AI/chat layer
 * are returned — never expose internal DB fields or other users' data.
 */
async function selectMemory(req, res) {
  try {
    const { memoryId } = req.body;
    if (!memoryId) {
      return res.status(400).json({ error: "Memory ID required" });
    }

    const memory = await findById("memories", memoryId);
    if (!memory || memory.userId !== req.user.id) {
      // Do not reveal whether the memory exists for another user
      return res.status(404).json({ error: "Memory not found" });
    }

    res.json({
      id: memory.id,
      title: memory.title,
      content: memory.content,
      type: memory.type,
      tags: memory.tags,
      category: memory.category,
      relatedPerson: memory.relatedPerson,
      checklist: memory.checklist,
      date: memory.date,
    });
  } catch (err) {
    console.error("Error selecting memory:", err);
    res.status(500).json({ error: "Failed to select memory" });
  }
}

async function updateMemory(req, res) {
  try {
    const existing = await findById("memories", req.params.id);
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: "Memory not found" });
    }

    const allowed = [
      "title",
      "content",
      "type",
      "tags",
      "pinned",
      "checklist",
      "relatedPerson",
      "vaultId",
      "mediaData",
      "mediaUrl",
      "mediaName",
      "mediaType",
      "mediaSize",
      "duration",
      "date",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const updated = await updateOne("memories", req.params.id, updates);
    res.json(updated);
  } catch (err) {
    console.error("Error updating memory:", err);
    res.status(500).json({ error: "Failed to update memory" });
  }
}

async function deleteMemory(req, res) {
  try {
    const existing = await findById("memories", req.params.id);
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: "Memory not found" });
    }
    await updateOne("memories", req.params.id, {
      deleted: true,
      deletedAt: new Date().toISOString(),
    });
    res.json({ message: "Memory moved to trash" });
  } catch (err) {
    console.error("Error deleting memory:", err);
    res.status(500).json({ error: "Failed to delete memory" });
  }
}

async function restoreMemory(req, res) {
  try {
    const existing = await findById("memories", req.params.id);
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: "Memory not found" });
    }
    await updateOne("memories", req.params.id, { deleted: false, deletedAt: null });
    res.json({ message: "Memory restored" });
  } catch (err) {
    console.error("Error restoring memory:", err);
    res.status(500).json({ error: "Failed to restore memory" });
  }
}

async function permanentlyDeleteMemory(req, res) {
  try {
    const existing = await findById("memories", req.params.id);
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: "Memory not found" });
    }
    await deleteOne("memories", req.params.id);
    res.json({ message: "Memory permanently deleted" });
  } catch (err) {
    console.error("Error permanently deleting memory:", err);
    res.status(500).json({ error: "Failed to permanently delete memory" });
  }
}

async function moveMemoryToVault(req, res) {
  try {
    const existing = await findById("memories", req.params.id);
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: "Memory not found" });
    }
    const updated = await updateOne("memories", req.params.id, { vaultId: req.body.vaultId || "vault" });
    res.json(updated);
  } catch (err) {
    console.error("Error moving memory to vault:", err);
    res.status(500).json({ error: "Failed to move memory to vault" });
  }
}

async function togglePinMemory(req, res) {
  try {
    const existing = await findById("memories", req.params.id);
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: "Memory not found" });
    }
    const updated = await updateOne("memories", req.params.id, { pinned: !existing.pinned });
    res.json(updated);
  } catch (err) {
    console.error("Error toggling pin:", err);
    res.status(500).json({ error: "Failed to toggle pin" });
  }
}

module.exports = {
  getMemories,
  createMemory,
  getMemoryById,
  updateMemory,
  deleteMemory,
  restoreMemory,
  permanentlyDeleteMemory,
  moveMemoryToVault,
  togglePinMemory,
  selectMemory,
};
