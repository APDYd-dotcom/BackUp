import { openDB } from "../config/db.js";
import { sendMail } from "./mail.service.js";

export async function writeAudit({
  userId = null,
  action,
  resourceType = null,
  resourceId = null,
  ipAddress = null,
  userAgent = null,
  metadata = {},
  result,
}) {
  const db = await openDB();
  await db.run(
    `INSERT INTO audit_logs
     (user_id, action, resource_type, resource_id, ip_address, user_agent, metadata, result)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      action,
      resourceType,
      resourceId ? String(resourceId) : null,
      ipAddress,
      userAgent,
      JSON.stringify(metadata),
      result,
    ],
  );
}

export async function notifySuperAdmins({ title, message, type = "security", resourceType, resourceId, metadata = {} }) {
  const db = await openDB();
  const recipients = await db.all(
    "SELECT id, name, email FROM users WHERE role = 'superadmin'",
  );

  for (const recipient of recipients) {
    await db.run(
      `INSERT INTO notifications
       (recipient_id, type, title, message, resource_type, resource_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [recipient.id, type, title, message, resourceType || null, resourceId ? String(resourceId) : null],
    );

    void sendMail({
      to: recipient.email,
      subject: title,
      text: `${message}\n\nDetails: ${JSON.stringify(metadata)}`,
    });
  }
}
