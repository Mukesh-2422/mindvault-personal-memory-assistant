const express = require("express");
const { serveMedia } = require("../controllers/mediaController");

const router = express.Router();

// Protected media serving — requires authentication via either:
// 1. Authorization: Bearer header (for API calls)
// 2. ?token= query parameter (for <img>/<audio>/<video> tags)
// Ownership verification is performed inside the controller.
router.get("/:filename", serveMedia);

module.exports = router;