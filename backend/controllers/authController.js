const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const { findOne, insertOne, updateOne, getCollection } = require("../db");
const { JWT_SECRET } = require("../middleware/auth");
const { sendPasswordResetEmail } = require("../utils/email");

/**
 * Register a new user
 */
async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    if (name.trim().length < 1) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!email.includes("@") || !email.includes(".")) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const existing = await findOne("users", (u) => u.email === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const user = {
      id: uuidv4(),
      name,
      email: email.toLowerCase(),
      password: hashed,
      avatar: null,
      createdAt: new Date().toISOString(),
    };

    await insertOne("users", user);

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    });
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ error: "Failed to register user" });
  }
}

/**
 * Log in an existing user
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await findOne("users", (u) => u.email === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "Account not found. Please register first." });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    });
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({ error: "Failed to log in" });
  }
}

/**
 * Get current user profile
 */
async function getProfile(req, res) {
  try {
    const user = await findOne("users", (u) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
}

/**
 * Update user profile
 */
async function updateProfile(req, res) {
  try {
    const { name, avatar } = req.body;
    const updated = await updateOne("users", req.user.id, { name, avatar });
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json({ id: updated.id, name: updated.name, email: updated.email, avatar: updated.avatar });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
}

/**
 * Hash a reset token using SHA-256 so the raw token is never stored.
 */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Forgot password - send reset link via email to the user's registered email.
 *
 * Security:
 * - Does NOT reveal whether the email exists (prevents account enumeration).
 * - Stores only a SHA-256 hash of the reset token.
 * - Invalidates any previous unused tokens for the user.
 * - Token expires after 30 minutes.
 * - Recipient is the user's registered email (user.email), NOT the sender.
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Normalize the email exactly like registration does (trim + lowercase)
    // so "  Mukesh@Gmail.com  " resolves to "mukesh@gmail.com".
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const user = await findOne("users", (u) => u.email === normalizedEmail);

    // Always return the same message whether or not the account exists.
    const genericMessage =
      "If an account exists for this email, a password reset link has been sent.";

    console.log(`[Password Reset] Request received for: ${normalizedEmail}`);
    console.log(`[Password Reset] User found: ${!!user}`);

    if (!user) {
      console.log(`[Password Reset] No registered account - returning generic response.`);
      return res.json({ message: genericMessage });
    }

    // Invalidate any previous unused tokens for this user.
    const existingTokens = await getCollection("passwordResetTokens");
    for (const t of existingTokens) {
      if (t.userId === user.id && !t.used) {
        await updateOne("passwordResetTokens", t.id, { used: true });
      }
    }

    // Generate a cryptographically secure random token.
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    console.log(`[Password Reset] Reset token generated for user ${user.id} (expires ${expiresAt.toISOString()}).`);

    // Store only the token hash.
    await insertOne("passwordResetTokens", {
      id: uuidv4(),
      userId: user.id,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      used: false,
      createdAt: new Date().toISOString(),
    });

    // Build the reset URL using the configured frontend URL.
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;
    console.log(`[Password Reset] Reset URL generated for user ${user.id} (token omitted from logs).`);

    // Send the email to the user's registered email address.
    // Recipient is user.email - the SMTP sender account can send to ANY
    // registered user, not only to itself.
    console.log(`[Password Reset] Sending reset email to ${user.email} (sender: ${process.env.EMAIL_USER}).`);
    try {
      await sendPasswordResetEmail(user.email, user.name, resetLink);
      console.log(`[Password Reset] Email sent successfully to ${user.email}.`);
    } catch (emailErr) {
      // Log enough to diagnose (provider response, SMTP code) but never log
      // the password, app password, or the raw reset token.
      console.error(
        `[Password Reset] Email sending FAILED for ${user.email}: ${emailErr.message} (code: ${emailErr.code || "n/a"}, response: ${emailErr.response || "n/a"})`
      );
    }

    res.json({ message: genericMessage });
  } catch (err) {
    console.error("Error in forgot password:", err);
    res.status(500).json({ error: "Failed to process forgot password request" });
  }
}

/**
 * Reset password with token.
 *
 * Security:
 * - Looks up the token by its SHA-256 hash.
 * - Validates the token exists, belongs to a user, is not expired, and is unused.
 * - Marks the token as used so it cannot be reused.
 * - Hashes the new password with bcrypt.
 */
async function resetPassword(req, res) {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Reset token is required" });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const tokenHash = hashToken(token);
    const now = new Date();

    // Find the token record by its hash.
    const tokenRecord = await findOne(
      "passwordResetTokens",
      (t) => t.tokenHash === tokenHash
    );

    if (!tokenRecord) {
      return res.status(400).json({ error: "Invalid reset link. Please request a new password reset." });
    }

    if (tokenRecord.used) {
      return res.status(400).json({ error: "This reset link has already been used. Please request a new password reset." });
    }

    if (new Date(tokenRecord.expiresAt) < now) {
      return res.status(400).json({ error: "This reset link has expired. Please request a new password reset." });
    }

    // Find the user associated with the token.
    const user = await findOne("users", (u) => u.id === tokenRecord.userId);
    if (!user) {
      return res.status(400).json({ error: "Invalid reset link. Please request a new password reset." });
    }

    // Hash the new password and update the user.
    const hashedPassword = bcrypt.hashSync(password, 10);
    await updateOne("users", user.id, { password: hashedPassword });

    // Mark the token as used so it cannot be reused.
    await updateOne("passwordResetTokens", tokenRecord.id, { used: true });

    res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
}

/**
 * Change password (authenticated)
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    // Get user with password
    const user = await findOne("users", (u) => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const valid = bcrypt.compareSync(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Update password
    await updateOne("users", user.id, {
      password: hashedPassword,
    });

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
};