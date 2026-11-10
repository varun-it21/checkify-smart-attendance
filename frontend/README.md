# Checkify – Frontend

The frontend application for Checkify Smart Attendance Management System.

Built using React 19 and Vite, this application provides role-based dashboards and interfaces for academic management, attendance, leave processing, analytics and notifications.

---

## 1. Technology Stack

- **React 19**
- **Vite**
- **JavaScript**
- **React Router**
- **Axios**
- **Tailwind CSS**
- **Recharts**
- **Chart.js**
- **Framer Motion**
- **Lucide React**
- **QRCode React**

---

## 2. Features

- Role-based dashboards.
- JWT-based authentication integration.
- Protected routes.
- Department, student and staff management.
- Timetable and staff assignment.
- OTP and QR attendance.
- Attendance history.
- Leave application and approval.
- Analytics and reporting dashboards.
- Defaulter reports.
- Notification centre.
- Administrative user management.
- System settings and audit logs.
- CSV report export.

---

## 3. Project Structure

```
frontend/
├── public/
├── src/
│   ├── api/              # Centralized API client
│   ├── components/       # Shared UI components
│   ├── dashboard/        # Role-based dashboards
│   ├── pages/            # Application pages
│   ├── services/         # API service modules
│   ├── utils/            # Shared utilities
│   ├── CSS/              # Stylesheets
│   └── App.jsx           # Application routing
├── .env.example
├── package.json
├── package-lock.json
└── vite.config.js
```

---

## 4. Requirements

- Node.js 22 or compatible supported version.
- npm.
- Running Checkify backend API.

---

## 5. Installation

From the repository root:
```bash
cd frontend
npm install
```

---

## 6. Environment Configuration

Create a `.env.local` file in the frontend directory.

Use `.env.example` as the configuration reference:
```env
VITE_API_BASE_URL=http://localhost:5006
```
The API client uses this variable to communicate with the backend.

> [!WARNING]
> Do not place passwords, JWT signing keys or other server-side secrets in frontend environment variables. Vite exposes `VITE_` variables to browser code.

---

## 7. Run Development Server

```bash
npm run dev
```

Open: `http://localhost:5173`

Ensure the backend API is running before testing authenticated features.

---

## 8. Available Scripts

| Command | Description |
| :--- | :--- |
| `npm install` | Install project dependencies |
| `npm run dev` | Start Vite development server |
| `npm run build` | Build the production frontend |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

---

## 9. API Integration

The frontend communicates with the ASP.NET Core backend through the centralized Axios client.

The API client is located at:
`src/api/api.js`

Application service modules and pages use the shared API integration layer.

The backend provides role-protected endpoints for authentication, academic management, attendance, leave, analytics, notifications and administration.

---

## 10. Production Build

Run:
```bash
npm run build
```

Vite generates the production assets in: `dist/`

Preview the build locally:
```bash
npm run preview
```

---

## 11. Development Guidelines

- Use the centralized API client for backend requests.
- Keep authentication and authorization logic consistent.
- Protect role-specific pages.
- Reuse shared components where possible.
- Keep API services separate from presentation logic where practical.
- Handle loading, validation and API error states.
- Do not commit `.env.local` or other local secrets.

---

*Checkify Frontend – React 19 + Vite*
