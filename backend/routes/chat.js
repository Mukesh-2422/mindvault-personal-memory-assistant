const express = require("express");
const {
  sendChatMessage,
  updateMemoryFromChat,
  processChatLogic,
  selectMemoryFromChat,
} = require("../controllers/chatController");

const router = express.Router();

router.post("/", sendChatMessage);
router.post("/select-memory", selectMemoryFromChat);
router.put("/memory/:memoryId", updateMemoryFromChat);

module.exports = router;
module.exports.processChatLogic = processChatLogic;
