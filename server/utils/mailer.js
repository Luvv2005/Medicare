// Brevo HTTP API (port 443). Render free par SMTP block hota hai, isliye API use hoti hai.
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

export const mailConfigured = () =>
  Boolean(process.env.BREVO_API_KEY && process.env.MAIL_FROM_EMAIL);

export async function sendMail(to, subject, text) {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n[DEV MAIL - sirf development] To: ${to}\n${subject}\n${text}\n`);
      return;
    }
    throw new Error('Email is not configured');
  }

  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: process.env.MAIL_FROM_NAME || 'MediCare', email: process.env.MAIL_FROM_EMAIL },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json()).message || '';
    } catch {
      // koi detail nahi
    }
    // Key ya email body log nahi hoti, sirf status aur Brevo ka message
    throw new Error(`Brevo error ${res.status}${detail ? `: ${detail}` : ''}`);
  }
}