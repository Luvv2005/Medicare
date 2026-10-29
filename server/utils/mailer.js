import nodemailer from 'nodemailer';

let tx = null;
const transport = () => {
  if (!process.env.SMTP_HOST) return null;
  if (!tx) {
    const port = Number(process.env.SMTP_PORT) || 587;
    tx = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port, secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return tx;
};

export async function sendMail(to, subject, text) {
  const t = transport();
  if (t) {
    await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
    return;
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n[DEV MAIL - sirf development] To: ${to}\n${subject}\n${text}\n`);
    return;
  }
  throw new Error('Email is not configured');
}