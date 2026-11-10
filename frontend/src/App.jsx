import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import { getAuthSession, getDashboardPath } from "./utils/auth";
import "./index.css";

// Lazy-loaded page components for Milestone 11 code splitting & bundle optimization
const Login = lazy(() => import("./pages/Login.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));

// Admin pages
const AdminUserManagement = lazy(() => import("./pages/AdminUserManagement.jsx"));
const AdminSettings = lazy(() => import("./pages/AdminSettings.jsx"));
const AdminAuditLogs = lazy(() => import("./pages/AdminAuditLogs.jsx"));

// Management pages
const AddStudent = lazy(() => import("./pages/AddStudent.jsx"));
const AddStaff = lazy(() => import("./pages/AddStaff.jsx"));
const EditStudent = lazy(() => import("./pages/EditStudent.jsx"));
const EditStaff = lazy(() => import("./pages/EditStaff.jsx"));

const ManagerLeaveApply = lazy(() => import("./pages/ManagerLeaveApply.jsx"));
const HodAssignStaff = lazy(() => import("./pages/HodAssignStaff.jsx"));
const HodLeaveApply = lazy(() => import("./pages/HodLeaveApply.jsx"));
const StaffLeaveApply = lazy(() => import("./pages/StaffLeaveApply.jsx"));

const GenerateOTP = lazy(() => import("./pages/GenerateOTP.jsx"));
const StaffViewAttendance = lazy(() => import("./pages/StaffViewAttendance.jsx"));

const StudentLeaveApply = lazy(() => import("./pages/StudentLeaveApply.jsx"));
const StudentMarkAttendance = lazy(() => import("./pages/StudentMarkAttendance.jsx"));
const StudentViewAttendance = lazy(() => import("./pages/StudentViewAttendance.jsx"));
const StudentViewTimetable = lazy(() => import("./pages/StudentViewTimetable.jsx"));

const Profile = lazy(() => import("./pages/Profile.jsx"));
const LeaveApprove = lazy(() => import("./pages/LeaveApprove.jsx"));
const LeaveStatus = lazy(() => import("./pages/LeaveStatus.jsx"));

const ReportsDashboard = lazy(() => import("./pages/ReportsDashboard.jsx"));
const DefaultersReport = lazy(() => import("./pages/DefaultersReport.jsx"));
const AttendanceTrends = lazy(() => import("./pages/AttendanceTrends.jsx"));

// Centered loading fallback for lazy-loaded routes
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-medium text-gray-500">Loading module...</p>
    </div>
  </div>
);

const RoleRoute = ({ roles, children }) => (
  <ProtectedRoute allowedRoles={roles}>
    {children}
  </ProtectedRoute>
);

const AuthenticatedRoute = ({ children }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

function App() {
  // Re-read the session on every navigation so login/logout are reflected immediately.
  useLocation();
  const session = getAuthSession();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Entry point: send visitors to their dashboard or the login page */}
        <Route
          path="/"
          element={
            <Navigate
              to={session ? getDashboardPath(session.role) : "/login"}
              replace
            />
          }
        />

        {/* Login */}
        <Route
          path="/login"
          element={
            session
              ? <Navigate to={getDashboardPath(session.role)} replace />
              : <Login />
          }
        />

        {/* Dashboards */}
        <Route
          path="/dashboard"
          element={<AuthenticatedRoute><Dashboard /></AuthenticatedRoute>}
        />

        <Route path="/admin/dashboard" element={<RoleRoute roles={["ADMIN"]}><Dashboard /></RoleRoute>} />
        <Route path="/manager/dashboard" element={<RoleRoute roles={["MANAGER"]}><Dashboard /></RoleRoute>} />
        <Route path="/hod/dashboard" element={<RoleRoute roles={["HOD"]}><Dashboard /></RoleRoute>} />
        <Route path="/staff/dashboard" element={<RoleRoute roles={["STAFF"]}><Dashboard /></RoleRoute>} />
        <Route path="/student/dashboard" element={<RoleRoute roles={["STUDENT"]}><Dashboard /></RoleRoute>} />

        {/* Admin Console */}
        <Route path="/admin/users" element={<RoleRoute roles={["ADMIN"]}><AdminUserManagement /></RoleRoute>} />
        <Route path="/admin/settings" element={<RoleRoute roles={["ADMIN"]}><AdminSettings /></RoleRoute>} />
        <Route path="/admin/audit-logs" element={<RoleRoute roles={["ADMIN"]}><AdminAuditLogs /></RoleRoute>} />
        <Route path="/admin/add-students" element={<RoleRoute roles={["ADMIN"]}><AddStudent /></RoleRoute>} />
        <Route path="/admin/add-staffs" element={<RoleRoute roles={["ADMIN"]}><AddStaff /></RoleRoute>} />
        <Route path="/admin/edit-students" element={<RoleRoute roles={["ADMIN"]}><EditStudent /></RoleRoute>} />
        <Route path="/admin/edit-staffs" element={<RoleRoute roles={["ADMIN"]}><EditStaff /></RoleRoute>} />
        <Route path="/admin/leave-approve" element={<RoleRoute roles={["ADMIN"]}><LeaveApprove /></RoleRoute>} />
        <Route path="/admin/reports" element={<RoleRoute roles={["ADMIN", "MANAGER"]}><ReportsDashboard /></RoleRoute>} />
        <Route path="/admin/defaulters" element={<RoleRoute roles={["ADMIN", "MANAGER"]}><DefaultersReport /></RoleRoute>} />
        <Route path="/admin/trends" element={<RoleRoute roles={["ADMIN", "MANAGER"]}><AttendanceTrends /></RoleRoute>} />

        {/* Manager */}
        <Route path="/manager/add-students" element={<RoleRoute roles={["MANAGER"]}><AddStudent /></RoleRoute>} />
        <Route path="/manager/add-staffs" element={<RoleRoute roles={["MANAGER"]}><AddStaff /></RoleRoute>} />
        <Route path="/manager/edit-students" element={<RoleRoute roles={["MANAGER"]}><EditStudent /></RoleRoute>} />
        <Route path="/manager/edit-staffs" element={<RoleRoute roles={["MANAGER"]}><EditStaff /></RoleRoute>} />
        <Route path="/manager/leave-approve" element={<RoleRoute roles={["MANAGER"]}><LeaveApprove /></RoleRoute>} />
        <Route path="/manager/apply-leave" element={<RoleRoute roles={["MANAGER"]}><ManagerLeaveApply /></RoleRoute>} />
        <Route path="/manager/leave-status" element={<RoleRoute roles={["MANAGER"]}><LeaveStatus /></RoleRoute>} />
        <Route path="/manager/reports" element={<RoleRoute roles={["MANAGER", "ADMIN"]}><ReportsDashboard /></RoleRoute>} />
        <Route path="/manager/defaulters" element={<RoleRoute roles={["MANAGER", "ADMIN"]}><DefaultersReport /></RoleRoute>} />
        <Route path="/manager/trends" element={<RoleRoute roles={["MANAGER", "ADMIN"]}><AttendanceTrends /></RoleRoute>} />

        {/* HOD */}
        <Route path="/hod/assign-staff" element={<RoleRoute roles={["HOD"]}><HodAssignStaff /></RoleRoute>} />
        <Route path="/hod/apply-leave" element={<RoleRoute roles={["HOD"]}><HodLeaveApply /></RoleRoute>} />
        <Route path="/hod/leave-approve" element={<RoleRoute roles={["HOD"]}><LeaveApprove /></RoleRoute>} />
        <Route path="/hod/leave-status" element={<RoleRoute roles={["HOD"]}><LeaveStatus /></RoleRoute>} />
        <Route path="/hod/reports" element={<RoleRoute roles={["HOD"]}><ReportsDashboard /></RoleRoute>} />
        <Route path="/hod/defaulters" element={<RoleRoute roles={["HOD"]}><DefaultersReport /></RoleRoute>} />
        <Route path="/hod/trends" element={<RoleRoute roles={["HOD"]}><AttendanceTrends /></RoleRoute>} />

        {/* Staff */}
        <Route path="/staff/apply-leave" element={<RoleRoute roles={["STAFF"]}><StaffLeaveApply /></RoleRoute>} />
        <Route path="/staff/leave-status" element={<RoleRoute roles={["STAFF"]}><LeaveStatus /></RoleRoute>} />
        <Route path="/staff/generate-otp" element={<RoleRoute roles={["STAFF"]}><GenerateOTP /></RoleRoute>} />
        <Route path="/staff/view-attendance" element={<RoleRoute roles={["STAFF"]}><StaffViewAttendance /></RoleRoute>} />

        {/* Student */}
        <Route path="/student/leave-apply" element={<RoleRoute roles={["STUDENT"]}><StudentLeaveApply /></RoleRoute>} />
        <Route path="/student/leave-status" element={<RoleRoute roles={["STUDENT"]}><LeaveStatus /></RoleRoute>} />
        <Route path="/student/mark-attendance" element={<RoleRoute roles={["STUDENT"]}><StudentMarkAttendance /></RoleRoute>} />
        <Route path="/student/view-attendance" element={<RoleRoute roles={["STUDENT"]}><StudentViewAttendance /></RoleRoute>} />
        <Route path="/student/view-timetable" element={<RoleRoute roles={["STUDENT"]}><StudentViewTimetable /></RoleRoute>} />

        {/* All authenticated roles */}
        <Route path="/profile" element={<AuthenticatedRoute><Profile /></AuthenticatedRoute>} />

        {/* Unknown route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
