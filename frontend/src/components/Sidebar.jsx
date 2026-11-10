import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Users,
  PlusCircle,
  Edit,
  Calendar,
  ClipboardList,
  UserCheck,
  QrCode,
  BarChart2,
  Table2,
  Home,
  NotebookPen,
  AlertTriangle,
  TrendingUp,
  Shield,
  Settings,
  FileText,
} from "lucide-react";

const ICON_SIZE = 22;

const DASHBOARD_PATHS = {
  MANAGER: "/manager/dashboard",
  HOD: "/hod/dashboard",
  STAFF: "/staff/dashboard",
  STUDENT: "/student/dashboard",
  ADMIN: "/admin/dashboard",
};

const MENU_ITEMS = {
  ADMIN: [
    { icon: Shield, label: "User Management", path: "/admin/users" },
    { icon: Settings, label: "System Settings", path: "/admin/settings" },
    { icon: FileText, label: "Audit Logs", path: "/admin/audit-logs" },
    { icon: Users, label: "Add Student", path: "/admin/add-students" },
    { icon: PlusCircle, label: "Add Staff", path: "/admin/add-staffs" },
    { icon: Edit, label: "Edit Student", path: "/admin/edit-students" },
    { icon: NotebookPen, label: "Edit Staff", path: "/admin/edit-staffs" },
    { icon: ClipboardList, label: "Approve Leaves", path: "/admin/leave-approve" },
    { icon: BarChart2, label: "Reports & Analytics", path: "/admin/reports" },
    { icon: AlertTriangle, label: "Defaulters List", path: "/admin/defaulters" },
    { icon: TrendingUp, label: "Attendance Trends", path: "/admin/trends" },
  ],
  MANAGER: [
    { icon: Users, label: "Add Student", path: "/manager/add-students" },
    { icon: PlusCircle, label: "Add Staff", path: "/manager/add-staffs" },
    { icon: Edit, label: "Edit Student", path: "/manager/edit-students" },
    { icon: NotebookPen, label: "Edit Staff", path: "/manager/edit-staffs" },
    { icon: ClipboardList, label: "Approve Leaves", path: "/manager/leave-approve" },
    { icon: Calendar, label: "Apply Leave", path: "/manager/apply-leave" },
    { icon: FileText, label: "My Leave Status", path: "/manager/leave-status" },
    { icon: BarChart2, label: "Reports & Analytics", path: "/manager/reports" },
    { icon: AlertTriangle, label: "Defaulters List", path: "/manager/defaulters" },
    { icon: TrendingUp, label: "Attendance Trends", path: "/manager/trends" },
  ],
  HOD: [
    { icon: Users, label: "Assign Staff to Class", path: "/hod/assign-staff" },
    { icon: ClipboardList, label: "Approve Leave", path: "/hod/leave-approve" },
    { icon: Calendar, label: "Apply Leave", path: "/hod/apply-leave" },
    { icon: FileText, label: "My Leave Status", path: "/hod/leave-status" },
    { icon: BarChart2, label: "Department Reports", path: "/hod/reports" },
    { icon: AlertTriangle, label: "Defaulters List", path: "/hod/defaulters" },
    { icon: TrendingUp, label: "Attendance Trends", path: "/hod/trends" },
  ],
  STAFF: [
    { icon: Calendar, label: "Apply Leave to HOD", path: "/staff/apply-leave" },
    { icon: FileText, label: "My Leave Status", path: "/staff/leave-status" },
    { icon: QrCode, label: "Generate OTP", path: "/staff/generate-otp" },
    { icon: BarChart2, label: "View Attendance", path: "/staff/view-attendance" },
  ],
  STUDENT: [
    { icon: Calendar, label: "Apply Leave", path: "/student/leave-apply" },
    { icon: FileText, label: "My Leave Status", path: "/student/leave-status" },
    { icon: QrCode, label: "Mark Attendance", path: "/student/mark-attendance" },
    { icon: BarChart2, label: "View Attendance", path: "/student/view-attendance" },
    { icon: Table2, label: "View Time Table", path: "/student/view-timetable" },
  ],
};

function Sidebar({ isOpen = true, isDesktop = true, onToggle, onNavigate }) {
  const role = localStorage.getItem("role");
  const dashboardPath = DASHBOARD_PATHS[role] || "/dashboard";
  const items = MENU_ITEMS[role] || [];

  // Desktop collapses to an icon rail; mobile is an off-canvas drawer.
  const showLabels = isOpen || !isDesktop;

  // Close the mobile drawer with Escape.
  useEffect(() => {
    if (isDesktop || !isOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && onToggle?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isDesktop, isOpen, onToggle]);

  const linkClass = ({ isActive }) =>
    [
      "flex items-center gap-3 rounded-xl p-3 text-sm font-medium transition-colors",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
      showLabels ? "" : "justify-center",
      isActive ? "bg-white/20 text-white" : "text-blue-50 hover:bg-white/10",
    ].join(" ");

  const renderLink = (to, Icon, label, end = false) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      onClick={onNavigate}
      className={linkClass}
      title={showLabels ? undefined : label}
      aria-label={label}
    >
      <Icon size={ICON_SIZE} className="shrink-0" aria-hidden="true" />
      {showLabels && <span className="truncate">{label}</span>}
    </NavLink>
  );

  const drawerHidden = !isDesktop && !isOpen;

  return (
    <>
      {/* Backdrop for the mobile drawer */}
      {!isDesktop && isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Main navigation"
        aria-hidden={drawerHidden || undefined}
        inert={drawerHidden}
        className={[
          "bg-blue-700 text-white flex flex-col shrink-0 transition-all duration-300",
          isDesktop
            ? `relative h-screen ${isOpen ? "w-64" : "w-20"}`
            : `fixed inset-y-0 left-0 z-40 w-64 max-w-[85vw] ${
                isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
              }`,
        ].join(" ")}
      >
        <div className={`flex items-center h-14 px-4 shrink-0 ${showLabels ? "justify-between" : "justify-center"}`}>
          {showLabels && <span className="text-lg font-bold tracking-wide">Checkify</span>}
          <button
            type="button"
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label={isDesktop ? (isOpen ? "Collapse sidebar" : "Expand sidebar") : "Close menu"}
          >
            {!isDesktop ? <X size={22} /> : isOpen ? <PanelLeftClose size={22} /> : <PanelLeftOpen size={22} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-6 flex flex-col gap-1.5">
          {renderLink(dashboardPath, Home, "Dashboard", true)}
          {items.map((item) => renderLink(item.path, item.icon, item.label))}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
