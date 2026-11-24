# Account Management System

This project is a full-stack web application consisting of a React frontend and a Node.js/Express backend, using a local SQLite database for data storage.

## Project Structure

The repository is organized into two main directories:

- `/frontend`: Contains the React application created with Vite. It uses Tailwind CSS for styling and React Router for navigation. Key features include an authentication flow, a Dashboard, Add Account pages, and an Admin Dashboard.
- `/backend`: Contains the Express.js server and API endpoints. It handles user authentication (JWT + bcrypt), account management, and admin duties, storing data in an SQLite database.

## Prerequisites

Before running this project, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- npm (Node Package Manager)

## Installation and Setup

To run the application locally, you will need to start both the backend server and the frontend development server.

### 1. Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install the backend dependencies:
   ```bash
   npm install
   ```
3. Start the backend server:
   ```bash
   node src/server.js
   ```
   *The server should now be running on `http://localhost:5000`.*

### 2. Frontend Setup

1. Open a new, separate terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend should now be running on `http://localhost:5173` (or the port specified by Vite).*

## API Endpoints Overview

The backend exposes several REST API routes on port `5000`:
- `/api/auth`: Endpoints for user login, registration, and session management.
- `/api/accounts`: Endpoints to create, read, update, and delete accounts data.
- `/api/admin`: Protected admin-only endpoints.

## Technologies Used

- **Frontend:** React, Vite, TailwindCSS, React Router, Axios
- **Backend:** Node.js, Express.js, SQLite3, JSON Web Tokens (JWT), bcrypt

## Security & Authentication

The application includes additive security models for 2FA, login number-matching approval, action approval, audit logs, and notifications.

### Environment setup

Copy the examples before starting the services:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Set the following backend values:

- `JWT_SECRET`: a strong random signing secret.
- `ENCRYPTION_KEY`: exactly 64 hexadecimal characters for AES-256 account and TOTP encryption.
- `OTP_PEPPER`: a strong random HMAC pepper for OTP and backup-code hashes.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`: SMTP delivery settings.
- `DATABASE_PATH`: optional absolute SQLite path.
- `PROTECTED_RESOURCES`: comma-separated protected resource types, default `account,user`.

Frontend variables:

- `VITE_APP_BASE_PATH`: deployment base path, default `/vault/`.
- `VITE_API_PROXY_TARGET`: backend URL used by Vite.

Real `.env` files are ignored by Git. Never commit secrets or SMTP credentials.

### Authentication flow

1. Every user submits an email and password.
2. Existing accounts must configure TOTP or email 2FA.
3. For enabled 2FA, the user verifies an email code, authenticator code, or backup code.
4. Super Admin login continues without number approval.
5. Admin and user logins receive a three-minute number-matching approval request.
6. A Super Admin or applicable Admin approves by selecting the number shown on the user's screen.

Password-protected accounts are locked temporarily after repeated failed passwords.

### Protected account updates and deletes

Non-Super Admin updates and deletes require server-side action approval:

1. `POST /api/actions/request` creates a 10-minute resource-bound approval.
2. The backend emails the 6-digit OTP to Super Admin accounts.
3. `POST /api/actions/:id/verify` verifies the OTP and consumes it for that user/action/resource.
4. The original update or delete endpoint requires the verified approval ID and executes only once.

Super Admin accounts can act directly, and every direct or approved action is audit logged.

### Audit and notifications

Sensitive events are written to append-only `audit_logs`; database triggers reject updates and deletes. Super Admins can filter audit entries and view notifications through `/api/admin/audit`, `/api/admin/notifications`, and `/api/admin/login-approvals/pending`.

### Testing

```bash
cd backend
npm test
```

The test suite currently covers random OTP formatting, constant-time secret comparison, and TOTP generation/validation.
