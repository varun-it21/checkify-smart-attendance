# Checkify Smart Attendance Management System - Hosting & Deployment Guide

This guide provides setup and operational instructions for running **Checkify** in both local development environments and self-hosted production servers without containerization overhead.

---

## 1. System Architecture Overview

Checkify uses a decoupled three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browsers                        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / HTTPS (Port 5173 / 80 / 443)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Frontend: React 19 SPA                      │
│   - Vite build, Tailwind CSS, Recharts                      │
│   - Communicates via Axios with JWT Bearer tokens           │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON (Port 5006)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Backend: ASP.NET Core (.NET 10)                 │
│   - JWT Bearer Authentication & Role-Based Authorization    │
│   - Login Rate Limiting (Fixed-window policy)               │
│   - Attendance Verification Engine (OTP & QR)               │
│   - Automated Leave-to-Attendance Reconciliation            │
│   - Notification Center & Defaulter Alert Pipeline          │
│   - Centralized Audit Logging Service                       │
└──────────────────────────────┬──────────────────────────────┘
                               │ TCP / Port 3306
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Database: MySQL 8.0                         │
│   - InnoDB Storage Engine                                   │
│   - 12 Normalized Relational Tables                         │
│   - 21 Composite & Unique Indexes                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites

| Component | Minimum Version | Recommended |
|---|---|---|
| **.NET SDK** | .NET 10.0 | Latest .NET 10 SDK |
| **Node.js** | Node.js 18 LTS | Node.js 20 or 22 LTS |
| **npm** | npm 9+ | Latest npm |
| **MySQL Server** | MySQL 8.0 | MySQL 8.0.36+ |
| **Operating System** | Windows 10/11 or Ubuntu 22.04 LTS | Windows / Linux |

---

## 3. Local Development Setup

### 3.1 Database Initialization
1. Ensure your local MySQL 8.0 server is running on port `3306`.
2. Connect to MySQL via MySQL Workbench or command line and create the database:
   ```sql
   CREATE DATABASE IF NOT EXISTS checkify CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### 3.2 Backend Setup (.NET 10)
1. Navigate to the backend directory:
   ```powershell
   cd backend-dotnet\Checkify.API
   ```
2. Initialize development secrets using .NET User Secrets (keeps credentials outside the repository):
   ```powershell
   dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Port=3306;Database=checkify;Uid=root;Pwd=your_local_password;"
   dotnet user-secrets set "Jwt:Secret" "your-secure-base64-encoded-secret-key-at-least-32-bytes"
   dotnet user-secrets set "Attendance:OtpPepper" "your-secure-base64-encoded-otp-pepper-at-least-32-bytes"
   ```
3. Apply Entity Framework Core database migrations:
   ```powershell
   dotnet ef database update
   ```
4. Start the backend Web API:
   ```powershell
   dotnet run --launch-profile http
   ```
   The API will listen at: `http://localhost:5006`

### 3.3 Frontend Setup (React 19 + Vite)
1. Open a new terminal and navigate to the frontend directory:
   ```powershell
   cd frontend
   ```
2. Install npm dependencies:
   ```powershell
   npm install
   ```
3. Create your local environment configuration:
   ```powershell
   Copy-Item .env.example .env.local
   ```
   Ensure `.env.local` contains:
   ```env
   VITE_API_BASE_URL=http://localhost:5006
   ```
4. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   The frontend will be available at: `http://localhost:5173`

---

## 4. Production Self-Hosted Deployment

### 4.1 Backend Service Configuration

For production hosting on a dedicated Windows or Linux server, run the published binary as a managed service:

#### Publish the Release Binary:
```powershell
dotnet publish backend-dotnet\Checkify.API -c Release -o C:\inetpub\checkify-api
```

#### Pass Secrets via Environment Variables:
In production, pass database credentials and JWT keys as system environment variables:
```bash
ConnectionStrings__DefaultConnection="Server=127.0.0.1;Port=3306;Database=checkify;Uid=checkify_user;Pwd=StrongProductionPassword!;"
Jwt__Secret="Base64EncodedProductionJwtSecretKey32BytesMinimum=="
Attendance__OtpPepper="Base64EncodedProductionOtpPepperKey32BytesMinimum=="
ASPNETCORE_ENVIRONMENT="Production"
ASPNETCORE_URLS="http://127.0.0.1:5006"
```

#### Linux systemd Service (`/etc/systemd/system/checkify-api.service`):
```ini
[Unit]
Description=Checkify ASP.NET Core API Service
After=network.target mysql.service

[Service]
WorkingDirectory=/var/www/checkify-api
ExecStart=/usr/bin/dotnet /var/www/checkify-api/Checkify.API.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=checkify-api
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://127.0.0.1:5006

[Install]
WantedBy=multi-user.target
```

---

### 4.2 Frontend Production Build

1. Build the production React assets:
   ```bash
   cd frontend
   npm run build
   ```
2. The compiled assets will be in `frontend/dist/`.
3. Serve `frontend/dist/` using any standard web server (Nginx, Apache, or IIS) configured to rewrite client routes to `index.html`.

#### Sample Nginx Configuration (`/etc/nginx/sites-available/checkify`):
```nginx
server {
    listen 80;
    server_name attendance.college.edu;

    root /var/www/checkify-frontend;
    index index.html;

    # React Router SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Reverse proxy backend API calls
    location /api/ {
        proxy_pass http://127.0.0.1:5006/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    location /auth/ {
        proxy_pass http://127.0.0.1:5006/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }

    location /manager/ {
        proxy_pass http://127.0.0.1:5006/manager/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

---

## 5. Security & Operational Checklist

1. **Least-Privilege Database Account**: Use a dedicated MySQL user (`checkify_user`) restricted to the `checkify` database rather than `root`.
2. **Reverse Proxy TLS/SSL**: Terminate HTTPS at Nginx/IIS with a valid SSL/TLS certificate (e.g., Let's Encrypt).
3. **Automated Database Backups**: Schedule automated daily backups via `mysqldump`:
   ```bash
   mysqldump -u checkify_user -p checkify | gzip > /var/backups/checkify_$(date +%Y%m%d).sql.gz
   ```
4. **Health Monitoring**:
   - Web API liveness probe: `GET /api/health` (Returns HTTP 200 `{"status": "Healthy"}`)
   - Database connectivity probe: `GET /api/health/db` (Returns HTTP 200 `Connected`)
