/**
 * SimplBudget waitlist API (Vercel serverless).
 *
 * Stores signups in Supabase `waitlist` and emails info@simplbudget.com.
 *
 * Required Vercel environment variables:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * Optional (notification):
 *   RESEND_API_KEY
 *   RESEND_FROM_EMAIL
 *   WAITLIST_NOTIFY_EMAIL (defaults to info@simplbudget.com)
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[\p{L}\p{M}'’\-\s]{1,80}$/u;

const MSG = {
  duplicate:
    "You're already on the waitlist. We'll contact you when invitations begin.",
  invalidEmail: "Please enter a valid email address.",
  missingFirst: "Please enter your first name.",
  missingLast: "Please enter your last name.",
  missingEmail: "Please enter your email address.",
  missingConsent:
    "Please agree to the privacy policy to join the waitlist.",
  server:
    "We're having trouble processing signups right now. Please try again in a few minutes.",
  success:
    "You're on the list!\nWe'll let you know as soon as SimplBudget is ready.",
};

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isConfigError(error) {
  const message = String(error && error.message ? error.message : error);
  return /not configured|missing|SUPABASE_|RESEND_/i.test(message);
}

async function hashIp(ip) {
  if (!ip) return null;
  const data = new TextEncoder().encode(`simplbudget-waitlist:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers["x-real-ip"] || null;
}

function isDuplicatePayload(response, payload) {
  if (response.status === 409) return true;
  const code = String(payload.code || "");
  if (code === "23505") return true;
  const message = String(payload.message || payload.error || "").toLowerCase();
  return message.includes("duplicate") || message.includes("unique");
}

async function insertWaitlistRow(row) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const err = new Error("Supabase waitlist credentials are not configured.");
    err.code = "CONFIG";
    throw err;
  }

  const response = await fetch(`${url}/rest/v1/waitlist`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  const payload = await response.json().catch(() => ({}));

  if (isDuplicatePayload(response, payload)) {
    return { duplicate: true, row: null };
  }

  if (!response.ok) {
    const err = new Error(
      payload.message || payload.error || "Unable to store waitlist signup.",
    );
    err.code = payload.code || "INSERT_FAILED";
    err.details = payload;
    throw err;
  }

  const saved = Array.isArray(payload) ? payload[0] : payload;
  return { duplicate: false, row: saved };
}

async function notifyTeam(signup) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("waitlist_notify_skipped", { reason: "RESEND_API_KEY missing" });
    return { sent: false, skipped: true };
  }

  const from =
    process.env.RESEND_FROM_EMAIL || "SimplBudget <onboarding@resend.dev>";
  const to = process.env.WAITLIST_NOTIFY_EMAIL || "info@simplbudget.com";
  const signupDate = signup.created_at
    ? new Date(signup.created_at).toISOString()
    : new Date().toISOString();
  const fullName = `${signup.first_name} ${signup.last_name}`.trim();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "New SimplBudget Waitlist Signup",
      text: [
        "Name: " + fullName,
        "Email: " + signup.email,
        "Signup Date: " + signupDate,
        "Source: " + (signup.source || "website"),
      ].join("\n"),
      html: [
        "<p><strong>Name:</strong> " + fullName + "</p>",
        "<p><strong>Email:</strong> " + signup.email + "</p>",
        "<p><strong>Signup Date:</strong> " + signupDate + "</p>",
        "<p><strong>Source:</strong> " + (signup.source || "website") + "</p>",
      ].join(""),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("waitlist_notify_failed", {
      status: response.status,
      payload,
      to,
      from,
    });
    return { sent: false, error: payload };
  }
  console.log("waitlist_notify_sent", { to, emailId: payload.id || null });
  return { sent: true, id: payload.id || null };
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  const firstName = normalizeName(req.body?.first_name ?? req.body?.firstName);
  const lastName = normalizeName(req.body?.last_name ?? req.body?.lastName);
  const email = normalizeEmail(req.body?.email);
  const consent = Boolean(req.body?.consent);
  const source = String(req.body?.source || "website").slice(0, 64);

  if (!firstName || !NAME_RE.test(firstName)) {
    return res.status(400).json({ ok: false, code: "VALIDATION", error: MSG.missingFirst });
  }
  if (!lastName || !NAME_RE.test(lastName)) {
    return res.status(400).json({ ok: false, code: "VALIDATION", error: MSG.missingLast });
  }
  if (!email) {
    return res.status(400).json({ ok: false, code: "VALIDATION", error: MSG.missingEmail });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, code: "VALIDATION", error: MSG.invalidEmail });
  }
  if (!consent) {
    return res.status(400).json({ ok: false, code: "VALIDATION", error: MSG.missingConsent });
  }

  const consentAt = new Date().toISOString();
  const ipHash = await hashIp(clientIp(req));

  try {
    const result = await insertWaitlistRow({
      first_name: firstName,
      last_name: lastName,
      email,
      source,
      ip_hash: ipHash,
      consent_at: consentAt,
      status: "active",
      metadata: {},
    });

    if (result.duplicate) {
      return res.status(200).json({
        ok: true,
        duplicate: true,
        message: MSG.duplicate,
      });
    }

    // Notification failure must not block a successful signup.
    const notify = await notifyTeam({
      first_name: firstName,
      last_name: lastName,
      email,
      source,
      created_at: result.row?.created_at || consentAt,
    });

    return res.status(200).json({
      ok: true,
      duplicate: false,
      notified: Boolean(notify.sent),
      message: MSG.success,
    });
  } catch (error) {
    console.error("waitlist_error", {
      message: error && error.message,
      code: error && error.code,
      details: error && error.details,
      config: isConfigError(error),
    });
    return res.status(500).json({
      ok: false,
      code: "SERVER",
      error: MSG.server,
    });
  }
};
