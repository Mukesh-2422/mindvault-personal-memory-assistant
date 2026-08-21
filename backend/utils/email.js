require("dotenv").config();

const nodemailer = require("nodemailer");

// Create transporter using Gmail SMTP
// The Gmail account (EMAIL_USER) is the SENDER only.
// The App Password authenticates the sender; it is never exposed to the frontend.
// Recipients are the registered MindVault user emails - the sender account can
// send to any recipient address, not just itself.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: (process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS || "").replace(/\s+/g, ""),
  },
});

/**
 * Verify the SMTP connection at startup so misconfiguration fails loudly
 * instead of silently swallowing delivery failures. Logs a SAFE error.
 * Never logs the password.
 */
async function verifySmtpConnection() {
  if (!process.env.EMAIL_USER) {
    console.warn(
      "[Email] EMAIL_USER is not configured - password reset emails will not be sent."
    );
    return false;
  }
  try {
    await transporter.verify();
    console.log("[Email] SMTP connection verified successfully.");
    return true;
  } catch (err) {
    console.error(
      `[Email] SMTP verification failed: ${err.message} (${err.code || "unknown code"}). Check EMAIL_USER / EMAIL_APP_PASSWORD.`
    );
    return false;
  }
}


/**
 * Send a password reset email to the user
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {string} resetLink - Password reset link
 */
async function sendPasswordResetEmail(to, name, resetLink) {
  const mailOptions = {
    from: `"MindVault" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset Your MindVault Password",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 560px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 32px 24px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            font-size: 24px;
            margin: 0;
            font-weight: 700;
            letter-spacing: 1px;
          }
          .body {
            padding: 32px 24px;
          }
          .body h2 {
            color: #1a1a1a;
            font-size: 20px;
            margin: 0 0 12px 0;
          }
          .body p {
            color: #555;
            font-size: 15px;
            line-height: 1.6;
            margin: 0 0 24px 0;
          }
          .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            margin: 8px 0;
          }
          .reset-link {
            word-break: break-all;
            color: #667eea;
            font-size: 13px;
            margin: 16px 0 0 0;
          }
          .footer {
            padding: 20px 24px;
            background: #f9f9f9;
            text-align: center;
          }
          .footer p {
            color: #888;
            font-size: 12px;
            margin: 0;
          }
          .expiry-notice {
            background: #fff3e0;
            border-radius: 8px;
            padding: 12px 16px;
            margin: 16px 0;
            font-size: 13px;
            color: #e65100;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧠 MindVault</h1>
          </div>
          <div class="body">
            <h2>Hi ${name},</h2>
            <p>
              We received a request to reset the password for your MindVault account.
              Click the button below to set a new password:
            </p>
            <div style="text-align: center;">
              <a href="${resetLink}" class="reset-button">Reset Password</a>
            </div>
            <div class="expiry-notice">
              ⏰ This reset link will expire in <strong>30 minutes</strong>.
            </div>
            <p style="font-size: 13px; color: #888;">
              If you didn't request this, you can safely ignore this email.
              Your password will remain unchanged.
            </p>
            <p class="reset-link">
              Or copy this link into your browser:<br>
              <a href="${resetLink}">${resetLink}</a>
            </p>
          </div>
          <div class="footer">
            <p>MindVault — Your personal memory space</p>
            <p style="margin-top: 4px;">© ${new Date().getFullYear()} MindVault. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${name},

We received a request to reset the password for your MindVault account.

Click the link below to set a new password:

${resetLink}

This link will expire in 30 minutes.

If you didn't request this, you can safely ignore this email.
Your password will remain unchanged.

— MindVault`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
    throw err;
  }
}

/**
 * Send a vault password reset email
 */
async function sendVaultResetEmail(to, name, resetLink) {
  const mailOptions = {
    from: `"MindVault Vault" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset Your Private Vault Password - MindVault",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 24px; text-align: center; }
          .header h1 { color: #ffffff; font-size: 24px; margin: 0; font-weight: 700; letter-spacing: 1px; }
          .body { padding: 32px 24px; }
          .body h2 { color: #1a1a1a; font-size: 20px; margin: 0 0 12px 0; }
          .body p { color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; }
          .reset-button { display: inline-block; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; margin: 8px 0; }
          .reset-link { word-break: break-all; color: #1a1a2e; font-size: 13px; margin: 16px 0 0 0; }
          .footer { padding: 20px 24px; background: #f9f9f9; text-align: center; }
          .footer p { color: #888; font-size: 12px; margin: 0; }
          .expiry-notice { background: #fce4ec; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #c62828; }
          .badge { display: inline-block; background: #1a1a2e; color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Private Vault</h1>
          </div>
          <div class="body">
            <div class="badge">Vault Password Reset</div>
            <h2>Hi ${name},</h2>
            <p>
              We received a request to reset the password for your <strong>Private Vault</strong>.
              Click the button below to set a new vault password:
            </p>
            <div style="text-align: center;">
              <a href="${resetLink}" class="reset-button">Reset Vault Password</a>
            </div>
            <div class="expiry-notice">
              ⏰ This reset link will expire in <strong>30 minutes</strong>.
            </div>
            <p style="font-size: 13px; color: #888;">
              If you didn't request this, you can safely ignore this email.
              Your vault will remain secure.
            </p>
            <p class="reset-link">
              Or copy this link into your browser:<br>
              <a href="${resetLink}">${resetLink}</a>
            </p>
          </div>
          <div class="footer">
            <p>MindVault — Your personal memory space</p>
            <p style="margin-top: 4px;">© ${new Date().getFullYear()} MindVault. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${name},

We received a request to reset the password for your Private Vault.

Click the link below to set a new vault password:

${resetLink}

This link will expire in 30 minutes.

If you didn't request this, you can safely ignore this email.
Your vault will remain secure.

— MindVault`,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Vault reset email sent to ${to}: ${info.messageId}`);
  return true;
}

module.exports = {
  sendPasswordResetEmail,
  sendVaultResetEmail,
  verifySmtpConnection,
};
