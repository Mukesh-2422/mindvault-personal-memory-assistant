require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const { connect, countDocuments } = require("./db");
const { seedData } = require("./seed");
const { authMiddleware } = require("./middleware/auth");
const { apiLimiter } = require("./middleware/security");
const { verifySmtpConnection } = require("./utils/email");
const authRoutes = require("./routes/auth");
const memoriesRoutes = require("./routes/memories");
const peopleRoutes = require("./routes/people");
const chatRoutes = require("./routes/chat");
const { vaultRoutes, publicVaultRoutes } = require("./routes/vault");
const uploadRoutes = require("./routes/upload");
const voiceRoutes = require("./routes/voiceRoutes");
const mediaRoutes = require("./routes/media");
const transcribeRoutes = require("./routes/transcribe");

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy so express-rate-limit can correctly identify client IPs
app.set("trust proxy", 1);

// Security headers — allow cross-origin resource policy for media streaming
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS — allow only the React frontend
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Range"],
  exposedHeaders: ["Content-Range", "Accept-Ranges", "Content-Length", "Content-Type"],
  credentials: true,
}));

// Handle OPTIONS preflight requests explicitly
app.options("*", cors());

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));


// Apply a global API rate limiter as a safety net
app.use("/api", apiLimiter);

// Private uploads are NO LONGER served as public static files.
// Media is served only through the protected /api/media/:filename route,
// which verifies authentication and ownership before sending the file.

// Public auth routes
app.use("/api/auth", authRoutes);

// Protected routes
app.use("/api/memories", authMiddleware, memoriesRoutes);
app.use("/api/people", authMiddleware, peopleRoutes);
app.use("/api/chat", authMiddleware, chatRoutes);
app.use("/api/vault", publicVaultRoutes);
app.use("/api/vault", authMiddleware, vaultRoutes);
app.use("/api/upload", authMiddleware, uploadRoutes);
app.use("/api/voice", authMiddleware, voiceRoutes);
app.use("/api/transcribe", transcribeRoutes);
app.use("/api/media", mediaRoutes); // mediaRoutes applies authMiddleware internally

// 404 for unknown API routes — return JSON, not HTML
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global error handler — never leak internal details to the client
app.use((err, req, res, next) => {
  if (err && err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Not allowed by CORS" });
  }
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// Serve React build in production
const buildPath = path.join(__dirname, "..", "frontend", "build");
app.use(express.static(buildPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

async function startServer() {
  await connect();
  if ((await countDocuments("users")) === 0) {
    await seedData();
  }
  // Verify SMTP config at startup so email misconfiguration fails loudly.
  await verifySmtpConnection();
  app.listen(PORT, () => {
    console.log(`MindVault server running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Server startup failed:", err);
    process.exit(1);
  });
}

module.exports = app;