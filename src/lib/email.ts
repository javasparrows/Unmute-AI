import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const SENDER_EMAIL = "security@unmute-ai.com";

/**
 * Parse user-agent string into a human-readable device description.
 * Simple parsing without external dependencies.
 */
function parseUserAgent(ua: string | null): string {
  if (!ua) return "Unknown device";

  let browser = "Unknown browser";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";

  let os = "Unknown OS";
  if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";

  return `${browser} on ${os}`;
}

/**
 * Format a Date to JST (Asia/Tokyo) string.
 */
function formatDateJST(date: Date): string {
  return date.toLocaleString("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }) + " (JST)";
}

/**
 * Build the HTML body for the login notification email.
 */
function buildLoginNotificationHtml(params: {
  device: string;
  ip: string;
  loginTime: string;
}): string {
  const { device, ip, loginTime } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#111827;padding:24px 32px;">
              <span style="color:#ffffff;font-size:20px;font-weight:600;">Unmute AI</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">New login detected</h2>
              <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
                Hi, a new login to your Unmute AI account was detected.
              </p>
              <!-- Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:6px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding:8px 16px;font-size:13px;color:#6b7280;">Device</td>
                  <td style="padding:8px 16px;font-size:13px;color:#111827;font-weight:500;">${device}</td>
                </tr>
                <tr>
                  <td style="padding:8px 16px;font-size:13px;color:#6b7280;">IP Address</td>
                  <td style="padding:8px 16px;font-size:13px;color:#111827;font-weight:500;">${ip}</td>
                </tr>
                <tr>
                  <td style="padding:8px 16px;font-size:13px;color:#6b7280;">Date &amp; Time</td>
                  <td style="padding:8px 16px;font-size:13px;color:#111827;font-weight:500;">${loginTime}</td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">
                If this was you, no action is needed.
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
                If you don't recognize this activity, please secure your Google account immediately.
              </p>
              <a href="https://myaccount.google.com/security"
                 style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:500;">
                Review Google Security Settings
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                This email was sent by Unmute AI security notifications.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Send a login notification email to the user.
 * This is designed to be fire-and-forget -- it should never block login.
 */
export async function sendLoginNotification(params: {
  to: string;
  ip: string | null;
  userAgent: string | null;
  loginTime: Date;
}): Promise<void> {
  const { to, ip, userAgent, loginTime } = params;

  const device = parseUserAgent(userAgent);
  const displayIp = ip ?? "Unknown";
  const formattedTime = formatDateJST(loginTime);

  const html = buildLoginNotificationHtml({
    device,
    ip: displayIp,
    loginTime: formattedTime,
  });

  await resend.emails.send({
    from: `Unmute AI <${SENDER_EMAIL}>`,
    to,
    subject: "New login to Unmute AI",
    html,
  });
}
