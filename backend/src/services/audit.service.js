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
  try {
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
  } catch (error) {
    console.error("AUDIT_WRITE_FAILED:", error.message);
  }
}

export async function notifySuperAdmins({ title, message, type = "security", resourceType, resourceId, metadata = {} }) {
  let recipients;
  let db;

  try {
    db = await openDB();
    recipients = await db.all(
      "SELECT id, name, email FROM users WHERE role = 'superadmin'",
    );
  } catch (error) {
    console.error("NOTIFICATION_RECIPIENT_LOOKUP_FAILED:", error.message);
    return { recipients: 0, emailsSent: 0, emailFailures: 0, emailsSkipped: 0 };
  }

  if (recipients.length === 0) {
    console.error("NOTIFICATION_NO_SUPERADMINS: no Super Admin recipients found");
    return { recipients: 0, emailsSent: 0, emailFailures: 0, emailsSkipped: 0 };
  }

  let emailsSent = 0;
  let emailFailures = 0;
  let emailsSkipped = 0;

  for (const recipient of recipients) {
    try {
      await db.run(
        `INSERT INTO notifications
         (recipient_id, type, title, message, resource_type, resource_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [recipient.id, type, title, message, resourceType || null, resourceId ? String(resourceId) : null],
      );
    } catch (error) {
      console.error("NOTIFICATION_CREATE_FAILED:", error.message);
    }

    try {
      const delivery = await sendMail({
        to: recipient.email,
        subject: title,
        text: `${message}\n\nDetails: ${JSON.stringify(metadata)}`,
      });
      if (delivery?.failed) {
        emailFailures += 1;
      } else if (delivery?.skipped || !recipient.email) {
        emailsSkipped += 1;
      } else {
        emailsSent += 1;
      }
    } catch (error) {
      emailFailures += 1;
      console.error("NOTIFICATION_EMAIL_FAILED:", error.message);
    }
  }

  return { recipients: recipients.length, emailsSent, emailFailures, emailsSkipped };
}
