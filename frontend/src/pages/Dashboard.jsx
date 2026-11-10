import React from "react";
import Layout from "../components/Layout";
import ManagerDashboard from "../dashboard/Managerdashboard";
import HODDashboard from "../dashboard/Hoddashboard";
import StaffDashboard from "../dashboard/Staffdashboard";
import StudentDashboard from "../dashboard/Studentdashboard";
import Admindashboard from "../dashboard/Admindashboard";

const DASHBOARDS = {
  MANAGER: ManagerDashboard,
  HOD: HODDashboard,
  STAFF: StaffDashboard,
  STUDENT: StudentDashboard,
  ADMIN: Admindashboard,
};

const Dashboard = () => {
  const role = localStorage.getItem("role");
  const RoleDashboard = DASHBOARDS[role];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {RoleDashboard ? <RoleDashboard /> : <h2 className="text-lg font-semibold">No role found</h2>}
      </div>
    </Layout>
  );
};

export default Dashboard;
