const express = require("express");
const { vaultPasswordResetLimiter } = require("../middleware/security");
const {
  getVaultStatus,
  createVault,
  unlockVault,
  lockVault,
  getVaultMemories,
  changeVaultPassword,
  resetVault,
  forgotVaultPassword,
  resetVaultPassword,
} = require("../controllers/vaultController");

// Protected vault routes (require authentication) - handled by authMiddleware at mount.
const router = express.Router();

// Public vault password-reset routes (token-based, like /auth/reset-password).
// These must NOT require the main app session: the email reset link is opened
// from a browser that may not be logged in. The reset token is the authorization.
const publicRouter = express.Router();

router.get("/status", getVaultStatus);
router.post("/create", createVault);
router.post("/unlock", unlockVault);
router.post("/lock", lockVault);
router.get("/memories", getVaultMemories);
router.post("/change-password", changeVaultPassword);
router.post("/reset", resetVault);

publicRouter.post("/forgot-password", vaultPasswordResetLimiter, forgotVaultPassword);
publicRouter.post("/reset-password/:token", vaultPasswordResetLimiter, resetVaultPassword);

module.exports = { vaultRoutes: router, publicVaultRoutes: publicRouter };
