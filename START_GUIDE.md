# DeEx Trade - Startup Guide

This guide explains how to run the frontend and backend services locally.

---

## 📋 Prerequisites

Before running the application, make sure you have the following installed:
1. **Node.js** (v20+ recommended)
2. **pnpm** (Package Manager)
3. **Go** (v1.21+ recommended)

---

## 1. 🖥️ Backend Startup (Go)

The Go backend serves the API on port `8099` (which the frontend proxies to).

### Step A: Configure Environment Variables
Ensure the backend configuration file exists at `backend/.env` with your Supabase database credentials:
```env
PORT=8099
ENVIRONMENT=development

# Database - Supabase PostgreSQL
DB_HOST=aws-0-eu-west-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.zhzihlfavquifmccvhqz
DB_PASSWORD='pa5r!mGb$Ax?NHG'
DB_NAME=postgres
DB_SSL_MODE=require
```

### Step B: Start the Server

#### Option 1: On Windows (PowerShell)
Open a terminal, navigate to the `backend` folder, and run:
```powershell
cd "DeEx-Trade-main/backend"
go run ./cmd/api/...

#### Option 2: On macOS / Linux / Git Bash
```bash
cd backend
go run ./cmd/api/...
```

The Go server will start, run database migrations, and listen on **`http://localhost:8099`**.

---

## 2. 🎨 Frontend Startup (Vite / React)

The frontend requires the `PORT` and `BASE_PATH` environment variables to run.

### Step A: Install dependencies (if you haven't already)
From the root workspace directory (`DeEx-Trade-main`), run:
```bash
pnpm install
```

### Step B: Start the Server

#### Option 1: On Windows (PowerShell)
From the root project directory (`DeEx-Trade-main`), run:
```powershell
$env:PORT="5000"; $env:BASE_PATH="/"; pnpm --filter @workspace/dex dev
```

#### Option 2: On macOS / Linux / Git Bash / Command Prompt (sh/bash)
From the root project directory (`DeEx-Trade-main`), run:
```bash
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/dex dev
```

The frontend will start and be accessible at **`http://localhost:5000`**.

---

## 3. 🔄 Real-Time Workers (Optional)

If you need the full setup running, including the price worker / pair indexer:
1. Open a new terminal.
2. Navigate to `server`:
   ```bash
   cd server
   npm install
   node index.js
   ```
   This indexer runs on port `3001` and handles background operations.
