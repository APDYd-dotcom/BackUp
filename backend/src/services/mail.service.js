import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  const mailTransporter = getTransporter();
  if (!mailTransporter) {
    console.warn(`MAIL_NOT_CONFIGURED: email not sent to ${to} (${subject})`);
    return { skipped: true };
  }

  try {
    return await mailTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error("MAIL_SEND_FAILED:", error.message);
    return { failed: true, error: error.message };
  }
}
