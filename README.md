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
