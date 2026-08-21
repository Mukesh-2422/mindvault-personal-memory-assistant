const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { insertOne, updateOne, deleteOne, findOne, getCollection } = require("../db");
const { sendVaultResetEmail } = require("../utils/email");

/**
 * Hash a reset token using SHA-256 so the raw token is never stored.
 */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function getVaultStatus(req, res) {
  try {
    const vault = await findOne("vaults", (v) => v.userId === req.user.id);
    res.json({
      locked: vault ? vault.locked : true,
      passwordSet: !!vault,
    });
  } catch (err) {
    console.error("Error checking vault status:", err);
    res.status(500).json({ error: "Failed to check vault status" });
  }
}

async function createVault(req, res) {
  try {
    const { password } = req.body;
    if (!password || password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }

    const existing = await findOne("vaults", (v) => v.userId === req.user.id);
    if (existing) {
      return res.status(409).json({ error: "Vault already exists" });
    }

    const vault = {
      id: uuidv4(),
      userId: req.user.id,
      password: bcrypt.hashSync(password, 10),
      locked: false,
      createdAt: new Date().toISOString(),
    };

    await insertOne("vaults", vault);
    res.status(201).json({ locked: false, passwordSet: true });
  } catch (err) {
    console.error("Error creating vault:", err);
    res.status(500).json({ error: "Failed to create vault" });
  }
}

async function unlockVault(req, res) {
  try {
    const { password } = req.body;
    const vault = await findOne("vaults", (v) => v.userId === req.user.id);
    if (!vault) {
      return res.status(404).json({ error: "No vault found. Create one first." });
    }

    if (!bcrypt.compareSync(password, vault.password)) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    await updateOne("vaults", vault.id, { locked: false });
    res.json({ locked: false, passwordSet: true });
  } catch (err) {
    console.error("Error unlocking vault:", err);
    res.status(500).json({ error: "Failed to unlock vault" });
  }
}

async function lockVault(req, res) {
  try {
    const vault = await findOne("vaults", (v) => v.userId === req.user.id);
    if (!vault) return res.status(404).json({ error: "No vault found" });

    await updateOne("vaults", vault.id, { locked: true });
    res.json({ locked: true, passwordSet: true });
  } catch (err) {
    console.error("Error locking vault:", err);
    res.status(500).json({ error: "Failed to lock vault" });
  }
}

async function getVaultMemories(req, res) {
  try {
    const vault = await findOne("vaults", (v) => v.userId === req.user.id);
    if (!vault || vault.locked) {
      return res.status(401).json({ error: "Vault is locked" });
    }
    const memories = await getCollection("memories", { userId: req.user.id });
    const vaultMemories = memories.filter((m) => m.vaultId);
    res.json(vaultMemories);
  } catch (err) {
    console.error("Error fetching vault memories:", err);
    res.status(500).json({ error: "Failed to fetch vault memories" });
  }
}

async function changeVaultPassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: "New password must be at least 4 characters" });
    }

    const vault = await findOne("vaults", (v) => v.userId === req.user.id);
    if (!vault) {
      return res.status(404).json({ error: "No vault found" });
    }

    if (!bcrypt.compareSync(currentPassword, vault.password)) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const newHashedPassword = bcrypt.hashSync(newPassword, 10);
    await updateOne("vaults", vault.id, { password: newHashedPassword });
    res.json({ message: "Vault password changed successfully" });
  } catch (err) {
    console.error("Error changing vault password:", err);
    res.status(500).json({ error: "Failed to change vault password" });
  }
}

async function resetVault(req, res) {
  try {
    const vault = await findOne("vaults", (v) => v.userId === req.user.id);
    if (!vault) {
      return res.status(404).json({ error: "No vault found" });
    }

    // Delete all vault memories
    const memories = await getCollection("memories", { userId: req.user.id });
    const vaultMemories = memories.filter((m) => m.vaultId);
    for (const mem of vaultMemories) {
      await deleteOne("memories", mem.id);
    }

    // Delete the vault itself
    await deleteOne("vaults", vault.id);

    res.json({ message: "Vault has been reset. All vault memories and the vault password have been removed." });
  } catch (err) {
    console.error("Error resetting vault:", err);
    res.status(500).json({ error: "Failed to reset vault" });
  }
}

async function forgotVaultPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Normalize the email exactly like account lookup (trim + lowercase).
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const user = await findOne("users", (u) => u.email === normalizedEmail);
    if (!user) {
      return res.json({ message: "If an account exists with this email, you will receive instructions." });
    }

    const vault = await findOne("vaults", (v) => v.userId === user.id);
    if (!vault) {
      return res.json({ message: "If an account exists with this email, you will receive instructions." });
    }

    // Generate vault reset token (30 minute expiry)
    const vaultResetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(vaultResetToken);
    const vaultResetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);

    // Store only the hashed token — never the raw token.
    await updateOne("vaults", vault.id, {
      vaultResetToken: tokenHash,
      vaultResetTokenExpiry,
    });

    // Send email
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/vault-reset/${vaultResetToken}`;

    try {
      await sendVaultResetEmail(user.email, user.name, resetLink);
      console.log(`✅ Vault password reset email sent to ${user.email}`);
    } catch (emailErr) {
      console.error(`❌ Failed to send vault reset email:`, emailErr.message);
      // Do NOT log the reset token
    }

    res.json({ message: "If an account exists with this email, you will receive instructions." });
  } catch (err) {
    console.error("Error in forgot vault password:", err);
    res.status(500).json({ error: "Failed to process request" });
  }
}

async function resetVaultPassword(req, res) {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 4) {
      return res.status(400).json({ error: "New password must be at least 4 characters" });
    }

    const now = new Date();
    const tokenHash = hashToken(token);
    const vault = await findOne("vaults", (v) => v.vaultResetToken === tokenHash && new Date(v.vaultResetTokenExpiry) > now);

    if (!vault) {
      const expiredVault = await findOne("vaults", (v) => v.vaultResetToken === tokenHash);
      if (expiredVault) {
        return res.status(400).json({ error: "This reset link has expired. Please request a new one." });
      }
      return res.status(400).json({ error: "Invalid reset link." });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    await updateOne("vaults", vault.id, {
      password: hashedPassword,
      locked: false,
      vaultResetToken: null,
      vaultResetTokenExpiry: null,
    });

    res.json({ message: "Vault password has been reset successfully." });
  } catch (err) {
    console.error("Error resetting vault password:", err);
    res.status(500).json({ error: "Failed to reset vault password" });
  }
}

module.exports = {
  getVaultStatus,
  createVault,
  unlockVault,
  lockVault,
  getVaultMemories,
  changeVaultPassword,
  resetVault,
  forgotVaultPassword,
  resetVaultPassword,
};
