/**
 * Lightweight outbound alerting. Posts a short message to an incoming webhook
 * (Discord or Slack — both are supported by sending `content` and `text`). No
 * SDK, no hard dependency: if ALERT_WEBHOOK_URL is unset the call is a safe
 * no-op so local/dev and unconfigured deploys never throw.
 *
 * Used to surface autonomous-scanner failures (the one part of the app no human
 * is watching) so a broken scan can't silently rot the picks board.
 */
export async function sendAlert(message: string): Promise<boolean> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return false;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // `content` → Discord, `text` → Slack. Each ignores the other's key.
      body: JSON.stringify({ content: message, text: message }),
    });
    return res.ok;
  } catch {
    // Alerting must never throw into the caller — a failed alert is not worse
    // than the failure it was trying to report.
    return false;
  }
}
