import React, { useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import ManagerDashboard from '../dashboard/Managerdashboard'
import HODDashboard from '../dashboard/Hoddashboard'
import StaffDashboard from '../dashboard/Staffdashboard'
import StudentDashboard from '../dashboard/Studentdashboard'
import Admindashboard from '../dashboard/Admindashboard'

const Dashboard = () => {

     const role = localStorage.getItem("role"); 
     const token=localStorage.getItem("token");

    const renderDashboard = () => {
    switch (role) {
      case "MANAGER":
        return <ManagerDashboard />;
      case "HOD":
        return <HODDashboard />;
      case "STAFF":
        return <StaffDashboard />;
      case "STUDENT":
        return <StudentDashboard />;
      case "ADMIN":
        return <Admindashboard/>
      default:
        return <h2>No role found</h2>;
    }
  };


  

  return (

     <div className="dashboard-layout flex">
    <Sidebar role={role} />

    <div className="flex-1">
      <Navbar /><br />

      <div className="flex-1">

        <div className="p-6">
          {renderDashboard()}
          {/* <h1>{role}</h1>
          <h1>{token}</h1> */}
        </div>
      </div>
    </div>
  </div>
  )
}

export default Dashboard