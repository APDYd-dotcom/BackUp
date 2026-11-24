# Security Administration Guide

## First-time setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Generate a 64-character hexadecimal encryption key and store it in `ENCRYPTION_KEY`.
3. Generate separate random JWT and OTP pepper secrets.
4. Configure SMTP credentials.
5. Restart the backend before approving or creating users.

## Email OTP SMTP configuration

Set these values in `backend/.env`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-sender@example.com
SMTP_PASS=your-app-password
SMTP_FROM=Vault Security <your-sender@example.com>
```

- `SMTP_HOST` is the outgoing mail server host.
- `SMTP_PORT` is usually `587` for STARTTLS or `465` for implicit TLS.
- `SMTP_USER` is the sender account.
- `SMTP_PASS` is the account password or provider app password.
- `SMTP_FROM` is the visible sender name and address.

The Security settings page reports whether SMTP is configured. It does not display or store SMTP passwords in the browser.

Changing `ENCRYPTION_KEY` or `OTP_PEPPER` after encrypted data or hashes exist may make existing data unreadable or invalidate OTP/backup-code records.

## Enabling user 2FA

Users open **Security** in the app:

- Email OTP: send a code, enter it, and confirm.
- Authenticator app: scan the QR code, enter a six-digit code, and save the backup codes shown once.

To reset or disable 2FA, the user must verify the account password and an authenticator code when TOTP is enabled.

## Login approval

When a non-Super Admin signs in, the approver sees three two-digit numbers. Approve only the number shown on the user's screen. A wrong number or explicit deny blocks the login and creates a security event.

If no approver responds, the request expires after three minutes. Never approve by guessing or resending a number.

## Protected updates and deletes

Users request approval from the affected update/delete action. The Super Admin receives the 6-digit action OTP and resource details by email. The OTP expires after ten minutes and is limited to three attempts.

The backend enforces the action/resource binding; frontend verification is not a security boundary.

## Audit and notifications

Super Admin can filter audit events in `/api/admin/audit` and view pending login requests and notifications. Audit rows cannot be updated or deleted through the application or database API triggers.
