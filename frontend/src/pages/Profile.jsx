import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const Profile = () => {
  const USE_MOCK_DATA = true; // Set false when backend is ready
  const role = localStorage.getItem("role") || "student";
  const userId = localStorage.getItem("userId") || "123";

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (USE_MOCK_DATA) {
      const mockData = {
        student: {
          firstName: "Varun",
          lastName: "Varun",
          email: "varun@example.com",
          rollNumber: "23",
          department: "Science",
          role: "Student",
        },
        staff: {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          staffId: "S123",
          department: "CS",
          role: "Staff",
        },
        hod: {
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          staffId: "HOD01",
          department: "Physics",
          role: "HOD",
        },
        manager: {
          firstName: "Alice",
          lastName: "Johnson",
          email: "alice@example.com",
          staffId: "M001",
          department: "Admin",
          role: "Manager",
        },
        admin: {
          firstName: "Super",
          lastName: "Admin",
          email: "admin@example.com",
          role: "Admin",
        },
      };
      setTimeout(() => {
        setProfile(mockData[role]);
        setLoading(false);
      }, 500);
    } else {
      // fetch profile from backend
    }
  }, [role, userId]);

  if (loading) return <p>Loading profile…</p>;
  if (!profile) return <p>Profile not found</p>;

  return (
    <div className="dashboard-layout flex">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Navbar />

        <div className="p-6 overflow-auto flex-1 bg-gray-50">
  {/* Header */}
  <div style={{ display: "flex", alignItems: "center", marginBottom: "30px", gap: "20px" }}>
    <div style={{
      width: "80px",
      height: "80px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #4f46e5, #3b82f6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "28px",
      color: "#fff",
      fontWeight: "700",
      boxShadow: "0 4px 10px rgba(0,0,0,0.15)"
    }}>
      {profile.firstName[0]}
    </div>
    <div>
      <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "5px", color: "#111827" }}>
        {profile.firstName} {profile.lastName}
      </h1>
      <p style={{
        color: "#6b7280",
        fontWeight: "500",
        background: "#e0e7ff",
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "6px",
        fontSize: "14px"
      }}>
        {profile.role}
      </p>
    </div>
  </div>

  {/* Personal Information Card */}
  <div style={{
    background: "#fff",
    borderRadius: "12px",
    padding: "25px",
    marginBottom: "25px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)"
  }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
      {Object.entries(profile).map(([key, value]) => {
        if (!value) return null;
        const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        return (
          <div key={key}>
            <p style={{ fontWeight: "500", color: "#6b7280", marginBottom: "5px", textTransform: "capitalize" }}>{title}</p>
            <p style={{ color: "#111827", fontWeight: "500" }}>{value}</p>
          </div>
        );
      })}
    </div>
  </div>

  {/* Change Password Card */}
  <div style={{
    background: "#fff",
    borderRadius: "12px",
    padding: "25px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)"
  }}>
    <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px", color: "#111827" }}>Change Password</h2>
    <div style={{ display: "flex", flexDirection: "column", gap: "15px", maxWidth: "400px" }}>
      <input
        type="password"
        placeholder="Current Password"
        style={{
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #d1d5db",
          outline: "none",
          fontSize: "14px"
        }}
      />
      <input
        type="password"
        placeholder="New Password"
        style={{
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #d1d5db",
          outline: "none",
          fontSize: "14px"
        }}
      />
      <button style={{
        padding: "12px 20px",
        background: "#4f46e5",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "500",
        fontSize: "14px",
        width: "fit-content"
      }}>Update Password</button>
    </div>
  </div>
</div>

      </div>
    </div>
  );
};

export default Profile;
