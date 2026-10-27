const nodemailer = require('nodemailer');
const { Resend } = require('resend');

/**
 * Builds the modern, fintech-styled verification email HTML template.
 */
const buildEmailTemplate = (otpCode) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your BlockBank Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0;">
          
          <!-- Header with Brand Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%); padding: 36px 32px 30px 32px; text-align: center;">
              <!-- Shield / Vault Icon -->
              <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 14px; margin-bottom: 14px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
                <span style="font-size: 26px; line-height: 52px; display: inline-block;">🛡️</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">BlockBank</h1>
              <p style="color: #94a3b8; font-size: 11px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Secure Digital Banking</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 24px 32px; text-align: center;">
              <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 10px 0;">Verify Your Email Address</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 28px 0;">
                Your BlockBank verification code is below. Enter this one-time code on the registration page to verify your identity.
              </p>

              <!-- OTP Display Box -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px 20px; margin: 0 auto 28px auto; text-align: center;">
                <p style="color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 0 14px 0;">
                  One-Time Verification Code
                </p>
                <div style="display: inline-block; font-family: 'SF Mono', Monaco, Menlo, 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e3a8a; background: #ffffff; border: 2px dashed #93c5fd; border-radius: 10px; padding: 12px 26px; box-shadow: 0 2px 6px rgba(30, 58, 138, 0.06);">
                  ${otpCode}
                </div>
                <div style="margin-top: 14px;">
                  <span style="display: inline-block; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; border: 1px solid #dbeafe;">
                    ⏱️ Expires in 10 minutes
                  </span>
                </div>
              </div>

              <!-- Security Callout -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; text-align: left; margin-bottom: 24px;">
                <div style="display: flex; align-items: flex-start;">
                  <p style="color: #92400e; font-size: 12px; line-height: 1.5; margin: 0; font-weight: 500;">
                    <strong style="color: #78350f;">Security Notice:</strong> Never share this code with anyone. BlockBank representatives will never call or message asking for your code. If you did not request it, ignore this email.
                  </p>
                </div>
              </div>
            </td>
          </tr>

          <!-- Subtle Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 0;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; background-color: #f8fafc; text-align: center;">
              <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 0 0 6px 0;">
                This is an automated security verification message from <strong>BlockBank</strong>.
              </p>
              <p style="color: #cbd5e1; font-size: 10px; margin: 0;">
                © ${new Date().getFullYear()} BlockBank Inc. • Blockchain-Powered Banking Security
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
};

/**
 * Sends a 6-digit verification code to the recipient's email address.
 * Supports Resend (HTTPS port 443 - works on Render Free Tier) and Gmail SMTP (port 465)
 * with strict fail-fast timeouts and optional ALLOW_CONSOLE_OTP fallback.
 *
 * @param {string} toEmail - Recipient email address
 * @param {string} otpCode - 6-digit plain OTP code
 * @returns {Promise<boolean>}
 */
const sendVerificationEmail = async (toEmail, otpCode) => {
    const senderName = process.env.EMAIL_SENDER_NAME || 'BlockBank';
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_APP_PASSWORD;
    const resendApiKey = process.env.RESEND_API_KEY;
    const allowConsoleOtp = process.env.ALLOW_CONSOLE_OTP === 'true';

    // ALWAYS log OTP to server console (visible in Render logs and terminal)
    console.log('================================================================');
    console.log(`🔐 [BLOCKBANK OTP] Recipient: ${toEmail} | Code: ${otpCode}`);
    console.log('================================================================');

    const htmlContent = buildEmailTemplate(otpCode);
    let lastError = null;

    // 1. If RESEND_API_KEY is configured, try Resend over HTTPS port 443 (NEVER blocked by Render Free Tier)
    if (resendApiKey) {
        try {
            const resend = new Resend(resendApiKey);
            const { data, error } = await resend.emails.send({
                from: `${senderName} <onboarding@resend.dev>`,
                to: [toEmail],
                subject: `${otpCode} is your BlockBank verification code`,
                html: htmlContent
            });

            if (!error && data?.id) {
                console.log(`[EMAIL SUCCESS] OTP delivered to ${toEmail} via Resend (HTTPS). ID: ${data.id}`);
                return true;
            } else if (error) {
                console.warn(`[EMAIL WARNING] Resend HTTP API rejected: ${error.message}`);
                lastError = new Error(error.message);
            }
        } catch (resendErr) {
            console.warn(`[EMAIL WARNING] Resend request exception: ${resendErr.message}`);
            lastError = resendErr;
        }
    }

    // 2. Try Gmail SMTP with strict 7-second timeouts to avoid hanging indefinitely on Render Free Tier
    if (emailUser && emailPass) {
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: emailUser,
                    pass: emailPass
                },
                connectionTimeout: 7000, // 7 seconds timeout
                greetingTimeout: 7000,
                socketTimeout: 7000
            });

            await transporter.sendMail({
                from: `"${senderName}" <${emailUser}>`,
                to: toEmail,
                subject: `${otpCode} is your BlockBank verification code`,
                html: htmlContent
            });

            console.log(`[EMAIL SUCCESS] OTP delivered to ${toEmail} via Gmail SMTP.`);
            return true;
        } catch (smtpErr) {
            console.error(`[EMAIL ERROR] Gmail SMTP failed: ${smtpErr.message}`);
            lastError = smtpErr;
        }
    }

    // 3. Fallback: ALLOW_CONSOLE_OTP for Render Free Tier or Demo presentations
    if (allowConsoleOtp) {
        console.log(`[CONSOLE OTP ACTIVE] ALLOW_CONSOLE_OTP=true. Use code ${otpCode} displayed in logs.`);
        return true;
    }

    // 4. If neither service is configured
    if (!resendApiKey && (!emailUser || !emailPass)) {
        throw new Error('Email service is not configured. Please set EMAIL_USER/EMAIL_APP_PASSWORD or RESEND_API_KEY.');
    }

    // 5. Detect Render SMTP timeout
    const isTimeout = lastError && (
        lastError.code === 'ETIMEDOUT' ||
        lastError.code === 'ESOCKETTIMEDOUT' ||
        (lastError.message && lastError.message.toLowerCase().includes('timeout'))
    );

    if (isTimeout) {
        throw new Error(
            'Email delivery timed out. Note: Render Free Tier blocks outbound SMTP (ports 465/587). ' +
            'Add ALLOW_CONSOLE_OTP=true in Render environment variables or use Resend API.'
        );
    }

    throw new Error(lastError?.message || 'Failed to send verification email.');
};

module.exports = { sendVerificationEmail };
