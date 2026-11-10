# Checkify – Smart Attendance Management System

A full-stack attendance management platform built to simplify academic attendance, timetable management, leave processing, notifications and institutional reporting.

Checkify provides role-based dashboards and multiple attendance-marking methods, including OTP and QR verification.

- **Version**: 1.0.0
- **Status**: Feature-complete release
- **Frontend**: React 19 + Vite
- **Backend**: ASP.NET Core Web API (.NET 10)
- **Database**: MySQL 8.0

---

## 1. Project Overview

Checkify is designed for educational institutions to manage their daily academic attendance operations through a centralized application.

The system supports five user roles:
- **Admin** – institutional settings, user management, audit logs and administrative operations.
- **Manager** – institution-wide management and reporting.
- **HOD** – department-level academic and attendance management.
- **Staff** – timetable access and attendance management.
- **Student** – timetable, attendance history, leave applications and attendance marking.

---

## 2. Key Features

### Authentication and Access Control
- JWT-based authentication.
- Role-based authorization.
- Protected frontend routes.
- User activation and deactivation.
- Administrative password reset and role management.

### Academic Management
- Department management.
- Student and staff management.
- Staff assignment to class sessions.
- Timetable management.
- Department and cohort-based access restrictions.
- Timetable conflict prevention.

### Attendance Management
- OTP-based attendance marking.
- QR-based attendance marking.
- Staff-managed attendance sessions.
- Attendance history and records.
- Attendance statuses: PRESENT, ABSENT, LATE and EXCUSED.
- OTP attempt limits and temporary lockout.
- QR token expiry and rotation.
- Attendance session lifecycle management.

### Leave Management
- Student and staff leave applications.
- Role-based leave approval.
- Leave overlap validation.
- Leave cancellation.
- Approved leave integration with attendance records.
- Leave status notifications.

### Analytics and Reports
- Institutional dashboard.
- Department analytics.
- Student attendance summaries.
- Staff attendance insights.
- Attendance trends.
- Defaulter reports.
- CSV export support.

### Notification Centre
- Session-opened notifications.
- Attendance-marked notifications.
- Defaulter warnings.
- Staff session summaries.
- HOD turnout alerts.
- Leave application and review notifications.
- Read, unread and delete operations.

### Administration and Governance
- Configurable system settings.
- Dynamic attendance thresholds.
- Audit log tracking.
- User role and account management.
- Protection against demoting the last administrator.
- Login rate limiting.

---

## 3. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, JavaScript, Vite |
| **Routing** | React Router |
| **HTTP Client** | Axios |
| **UI** | Tailwind CSS, CSS |
| **Charts** | Recharts, Chart.js |
| **Backend** | ASP.NET Core Web API |
| **Runtime** | .NET 10 |
| **ORM** | Entity Framework Core 10 |
| **Database** | MySQL 8.0 |
| **Authentication** | JWT |
| **Password Security** | BCrypt |
| **QR Generation** | QR code generation and cryptographic tokens |
| **Testing** | Automated integration and E2E test scripts |

---

## 4. Architecture

Checkify follows a layered backend architecture with a React frontend.

```
                CHECKIFY APPLICATION
                         |
             +-----------+-----------+
             |                       |
        React Frontend          ASP.NET Core API
             |                       |
       React Router          Controllers
             |                       |
       API Services          Service Interfaces
             |                       |
       Axios Client          Service Implementations
             |                       |
             +-----------------------+
                         |
                  EF Core 10
                         |
                     MySQL 8
```

### Backend structure
```
backend-dotnet/
├── Checkify.API/
│   ├── Controllers/
│   ├── Services/
│   │   └── Interfaces/
│   ├── DTOs/
│   ├── Middlewares/
│   ├── Entities/
│   ├── Data/
│   ├── Configurations/
│   └── Migrations/
└── Checkify.slnx
```

### Frontend structure
```
frontend/
├── public/
├── src/
│   ├── api/
│   ├── components/
│   ├── dashboard/
│   ├── pages/
│   ├── services/
│   ├── utils/
│   ├── CSS/
│   └── App.jsx
├── .env.example
├── package.json
└── vite.config.js
```

---

## 5. User Roles

| Role | Main responsibilities |
| :--- | :--- |
| **ADMIN** | System governance and administration |
| **MANAGER** | Institution-wide management |
| **HOD** | Department-level management |
| **STAFF** | Attendance and timetable operations |
| **STUDENT** | Attendance, timetable and leave operations |

Access is controlled through backend authorization policies and frontend protected routes.

---

## 6. Local Development Setup

### Prerequisites
Install the following:
- .NET 10 SDK
- MySQL Server 8.0
- Node.js 22 or compatible supported version
- npm
- Visual Studio 2026 or Visual Studio Code
- Git

### Step 1 – Clone the repository
```bash
git clone YOUR_REPOSITORY_URL
cd Smart-Attendance-Management-System
```
*Replace `YOUR_REPOSITORY_URL` with your actual Git repository URL.*

### Step 2 – Configure the database
1. Start MySQL Server.
2. Create the `checkify` database.
3. Configure the backend database connection using your local development secrets.
4. Never commit database passwords or production credentials.

### Step 3 – Start the backend
```bash
dotnet restore .\backend-dotnet\Checkify.slnx
dotnet build .\backend-dotnet\Checkify.slnx
```

Run the API:
```bash
dotnet run --project .\backend-dotnet\Checkify.API
```
The development API is configured to use port 5006.

Apply migrations using the project's configured EF Core database setup if the database has not already been initialized.

### Step 4 – Configure the frontend
Navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Create `.env.local` using `.env.example` as the reference.

Set the API base URL:
```env
VITE_API_BASE_URL=http://localhost:5006
```

### Step 5 – Start the frontend
```bash
npm run dev
```

Vite normally starts the development server at: `http://localhost:5173`

---

## 7. Available Frontend Commands

Run these commands inside `frontend/`.

| Command | Purpose |
| :--- | :--- |
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Generate production frontend build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## 8. Testing and Verification

The v1.0.0 release verification report records:
- **35/35 automated production E2E tests passed**.
- Database health and schema checks.
- Authentication and authorization checks.
- Security middleware and rate-limiting checks.
- Administrative operations.
- Attendance and leave workflows.
- Notification verification.
- Test data cleanup.

Backend build and frontend production build were also reported successful.

---

## 9. Security Considerations

- Keep secrets outside source control.
- Use HTTPS in production environments.
- Use strong database credentials.
- Protect JWT signing keys.
- Keep environment-specific configuration outside committed files.
- Review authorization policies whenever adding endpoints.
- Maintain database backups.
- Avoid exposing sensitive information in application logs.
- Review audit log access and retention policies.

---

## 10. Project Documentation

| Document | Description |
| :--- | :--- |
| `README.md` | Main project overview, architecture, and local run guide |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Relational schema, Mermaid ER diagram, indexes, and FK integrity |
| [`docs/API.md`](docs/API.md) | Complete REST API specification, RBAC matrix, and payload schemas |
| [`docs/PORTFOLIO_GUIDE.md`](docs/PORTFOLIO_GUIDE.md) | Portfolio presentation, STAR/XYZ resume bullets, and interview deep dives |
| `frontend/README.md` | Frontend React 19 architecture, environment config, and scripts |
| `DEPLOYMENT.md` | Deployment and infrastructure guidance |

---

## 11. Project Status

**Checkify v1.0.0** – Feature-complete development release.

The initial release includes academic management, attendance, leave processing, analytics, notifications and administration.

The current focus is repository cleanup, security review, documentation and portfolio preparation.

---

*Checkify – Smart Attendance Management System*  
*Built with React, ASP.NET Core and MySQL.*

