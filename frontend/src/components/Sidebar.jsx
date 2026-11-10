import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
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

function Sidebar() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const dashboardPath = {
    MANAGER: "/manager/dashboard",
    HOD: "/hod/dashboard",
    STAFF: "/staff/dashboard",
    STUDENT: "/student/dashboard",
    ADMIN: "/admin/dashboard"
  }[role];

  const menuItems = {
    ADMIN: [
      { icon: <Shield size={26} />, label: "User Management", path: "/admin/users" },
      { icon: <Settings size={26} />, label: "System Settings", path: "/admin/settings" },
      { icon: <FileText size={26} />, label: "Audit Logs", path: "/admin/audit-logs" },
      { icon: <Users size={26} />, label: "Add Student", path: "/admin/add-students" },
      { icon: <PlusCircle size={26} />, label: "Add Staff", path: "/admin/add-staffs" },
      { icon: <Edit size={26} />, label: "Edit Student", path: "/admin/edit-students" },
      { icon: <NotebookPen size={26} />, label: "Edit Staff", path: "/admin/edit-staffs" },
      { icon: <ClipboardList size={26} />, label: "Approve Leaves", path: "/admin/leave-approve" },
      { icon: <BarChart2 size={26} />, label: "Reports & Analytics", path: "/admin/reports" },
      { icon: <AlertTriangle size={26} />, label: "Defaulters List", path: "/admin/defaulters" },
      { icon: <TrendingUp size={26} />, label: "Attendance Trends", path: "/admin/trends" }
    ],
    MANAGER: [
      { icon: <Users size={30} />, label: "Add Student", path: "/manager/add-students" },
      { icon: <PlusCircle size={30} />, label: "Add Staff", path: "/manager/add-staffs" },
      { icon: <Edit size={30} />, label: "Edit Student", path: "/manager/edit-students" },
      { icon: <NotebookPen size={30} />, label: "Edit Staff", path: "/manager/edit-staffs" },
      { icon: <Calendar size={30} />, label: "Apply Leave", path: "/manager/apply-leave" },
      { icon: <BarChart2 size={30} />, label: "Reports & Analytics", path: "/manager/reports" },
      { icon: <AlertTriangle size={30} />, label: "Defaulters List", path: "/manager/defaulters" },
      { icon: <TrendingUp size={30} />, label: "Attendance Trends", path: "/manager/trends" }
    ],
    HOD: [
      { icon: <Users size={30} />, label: "Assign Staff to Class", path: "/hod/assign-staff" },
      { icon: <ClipboardList size={30} />, label: "Approve Staff Leave", path: "/hod/leave-approve" },
      { icon: <Calendar size={30} />, label: "Apply Leave", path: "/hod/apply-leave" },
      { icon: <BarChart2 size={30} />, label: "Department Reports", path: "/hod/reports" },
      { icon: <AlertTriangle size={30} />, label: "Defaulters List", path: "/hod/defaulters" },
      { icon: <TrendingUp size={30} />, label: "Attendance Trends", path: "/hod/trends" }
    ],
    STAFF: [
      { icon: <UserCheck size={30} />, label: "Approve Student Leave", path: "/staff/approve-leave" },
      { icon: <Calendar size={30} />, label: "Apply Leave to HOD", path: "/staff/apply-leave" },
      { icon: <QrCode size={30} />, label: "Generate OTP", path: "/staff/generate-otp" },
      { icon: <BarChart2 size={30} />, label: "View Attendance", path: "/staff/view-attendance" }
    ],
    STUDENT : [
      { icon: <Calendar size={30} />, label: "Apply Leave", path: "/student/leave-apply" },
      { icon: <QrCode size={30} />, label: "Mark Attendance", path: "/student/mark-attendance" },
      { icon: <BarChart2 size={30} />, label: "View Attendance", path: "/student/view-attendance" },
      { icon: <Table2 size={30} />, label: "View Time Table", path: "/student/view-timetable" }
    ]
  };

  const items = menuItems[role] || [];

  return (
    <>
      <style>
        {`
          .sidebar-icon {
            display: flex;
            justify-content: center;
          }

          .sidebar-menu {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }
        `}
      </style>

      <div className="flex h-screen bg-gray-100">
        <div className={`bg-blue-700 text-white p-6 pt-10 ${open ? "w-64" : "w-20"}`}>
          <button onClick={() => setOpen(!open)} className="absolute top-6 left-4 text-white">
            {open ? <X size={40} /> : <ArrowRight size={40} />}
          </button>

          <br /><br /><br /><br />

          {/* Dashboard Button */}
          <button
            onClick={() => navigate(dashboardPath)}
            className="flex items-center w-full hover:bg-blue-600 p-3 rounded-xl gap-3 mb-5"
          >
            <div className="sidebar-icon"><Home size={30} /></div>
            {open && <span className="font-semibold">Dashboard</span>}
          </button>

          {/* Menu Items */}
          <nav className="sidebar-menu mt-5 font-medium">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className="flex items-center hover:bg-blue-600 p-3 rounded-xl gap-3 mb-4"
              >
                <div className="sidebar-icon">{item.icon}</div>
                {open && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
