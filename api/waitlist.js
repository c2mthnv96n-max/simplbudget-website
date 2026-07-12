/**
 * SimplBudget waitlist API (Vercel serverless).
 * Stores signups via Resend Audiences and sends a confirmation email.
 *
 * Required Vercel environment variables:
 *   RESEND_API_KEY       — Resend API key
 *   RESEND_FROM_EMAIL    — e.g. welcome@simplbudget.com (verified domain)
 *   RESEND_AUDIENCE_ID   — optional Resend audience ID for contact storage
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function resendRequest(path, options) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const response = await fetch(`https://api.resend.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function addToAudience(email) {
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    return { stored: false, duplicate: false };
  }

  const { response, payload } = await resendRequest(
    `/audiences/${audienceId}/contacts`,
    {
      method: "POST",
      body: JSON.stringify({
        email,
        unsubscribed: false,
      }),
    },
  );

  if (response.ok) {
    return { stored: true, duplicate: false };
  }

  const message = String(payload.message || payload.error || "").toLowerCase();
  if (response.status === 409 || message.includes("already")) {
    return { stored: true, duplicate: true };
  }

  throw new Error(payload.message || "Unable to store waitlist signup.");
}

async function sendConfirmation(email) {
  const from = process.env.RESEND_FROM_EMAIL || "SimplBudget <onboarding@resend.dev>";

  const { response, payload } = await resendRequest("/emails", {
    method: "POST",
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Welcome to the SimplBudget Waitlist",
      text: [
        "Thank you for joining the SimplBudget waitlist.",
        "",
        "We'll notify you as soon as early access becomes available.",
        "",
        "— The SimplBudget Team",
      ].join("\n"),
      html: [
        "<p>Thank you for joining the SimplBudget waitlist.</p>",
        "<p>We'll notify you as soon as early access becomes available.</p>",
        "<p>— The SimplBudget Team</p>",
      ].join(""),
    }),
  });

  if (!response.ok) {
    throw new Error(payload.message || "Unable to send confirmation email.");
  }

  return payload;
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();

  if (!email) {
    return res.status(400).json({ ok: false, error: "Please enter your email address." });
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
  }

  try {
    const audienceResult = await addToAudience(email);
    await sendConfirmation(email);

    return res.status(200).json({
      ok: true,
      duplicate: audienceResult.duplicate,
      message: audienceResult.duplicate
        ? "You're already on the waitlist. We'll be in touch soon."
        : "You're on the list! Check your inbox for a confirmation email.",
    });
  } catch (error) {
    console.error("waitlist error", error);
    return res.status(500).json({
      ok: false,
      error: "We couldn't complete your signup right now. Please try again shortly.",
    });
  }
};
