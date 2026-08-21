const express = require("express");
const {
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
} = require("../controllers/memoriesController");

const router = express.Router();

router.get("/", getMemories);
router.post("/", createMemory);
router.post("/select", selectMemory);
router.get("/:id", getMemoryById);
router.put("/:id", updateMemory);
router.delete("/:id", deleteMemory);
router.post("/:id/move-to-vault", moveMemoryToVault);
router.post("/:id/restore", restoreMemory);
router.delete("/:id/permanent", permanentlyDeleteMemory);
router.post("/:id/toggle-pin", togglePinMemory);

module.exports = router;
