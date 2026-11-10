import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import reportService from "../services/reportService";
import "../CSS/Reports.css";
import {
  BarChart2,
  Calendar,
  Users,
  AlertTriangle,
  TrendingUp,
  Download,
  Filter,
  RefreshCw,
  Building2,
  GraduationCap,
  Layers,
  ArrowRight
} from "lucide-react";

export default function ReportsDashboard() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "MANAGER";
  const basePath = role === "HOD" ? "/hod" : "/manager";

  // Filter state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);

  // Data state
  const [stats, setStats] = useState(null);
  const [deptAnalytics, setDeptAnalytics] = useState(null);
  const [defaultersCount, setDefaultersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load department list for Manager
  useEffect(() => {
    if (role !== "HOD") {
      reportService.getDepartments().then(setDepartments);
    }
  }, [role]);

  // Fetch report data
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (departmentId) params.departmentId = parseInt(departmentId, 10);

      const [dashRes, deptRes, defRes] = await Promise.all([
        reportService.getDashboardStats(params),
        reportService.getDepartmentAnalytics(params),
        reportService.getDefaulters(params),
      ]);

      setStats(dashRes.data);
      setDeptAnalytics(deptRes.data);
      setDefaultersCount(Array.isArray(defRes.data) ? defRes.data.length : 0);
    } catch (err) {
      console.error("Failed to load reports:", err);
      setError(err.response?.data?.message || "Failed to load report analytics.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, departmentId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Quick Date Presets
  const handlePreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setFromDate(start.toISOString().slice(0, 10));
    setToDate(end.toISOString().slice(0, 10));
  };

  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setDepartmentId("");
  };

  // CSV Export for Cohort Report
  const handleExportCsv = () => {
    if (!deptAnalytics?.cohorts || deptAnalytics.cohorts.length === 0) return;
    const headers = [
      "Department",
      "Year",
      "Semester",
      "Section",
      "Students",
      "Sessions Conducted",
      "Attendance Count",
      "Expected Count",
      "Attendance Rate (%)",
    ];
    const rows = deptAnalytics.cohorts.map((c) => [
      c.departmentName || deptAnalytics.departmentName,
      `Year ${c.year}`,
      `Semester ${c.semester}`,
      `Section ${c.section}`,
      c.studentCount,
      c.sessionsConducted,
      c.attendanceCount,
      c.expectedAttendanceCount,
      `${c.attendancePercentage}%`,
    ]);
    const filename = `attendance_cohort_report_${new Date().toISOString().slice(0, 10)}`;
    reportService.exportToCsv(filename, headers, rows);
  };

  return (
    <Layout>
      <div className="reports-container">
        {/* Header Ribbon */}
        <div className="reports-header">
          <div className="reports-title-area">
            <h1>Reports & Analytics Hub</h1>
            <p>
              {role === "HOD" ? "Department" : "Institution"}-wide attendance reports, cohort analytics, and audit exports
            </p>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="reports-tabs">
            <button className="reports-tab-btn active">
              <BarChart2 size={16} /> Overview
            </button>
            <button
              className="reports-tab-btn"
              onClick={() => navigate(`${basePath}/defaulters`)}
            >
              <AlertTriangle size={16} /> Defaulters ({defaultersCount})
            </button>
            <button
              className="reports-tab-btn"
              onClick={() => navigate(`${basePath}/trends`)}
            >
              <TrendingUp size={16} /> Trends
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="reports-filter-bar">
          {role !== "HOD" && (
            <div className="filter-group">
              <label>Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="filter-select"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="filter-input"
            />
          </div>

          {/* Quick Presets */}
          <div className="filter-group">
            <label>Presets</label>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => handlePreset(7)}
                className="filter-select"
                style={{ cursor: "pointer", padding: "8px 10px", fontSize: "12px" }}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => handlePreset(30)}
                className="filter-select"
                style={{ cursor: "pointer", padding: "8px 10px", fontSize: "12px" }}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="filter-select"
                style={{ cursor: "pointer", padding: "8px 10px", fontSize: "12px", color: "#2563eb" }}
              >
                Clear
              </button>
            </div>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={!deptAnalytics?.cohorts?.length}
            className="export-btn"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        {/* KPI Summary Grid */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-info">
              <span>Overall Attendance Rate</span>
              <h3 style={{ color: (stats?.attendancePercentage || 0) < 75 ? "#dc2626" : "#059669" }}>
                {Number(stats?.attendancePercentage || 0).toFixed(1)}%
              </h3>
            </div>
            <div className="kpi-icon green">
              <BarChart2 size={24} />
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-info">
              <span>Conducted Sessions</span>
              <h3>{stats?.totalSessionsInRange?.toLocaleString() ?? 0}</h3>
            </div>
            <div className="kpi-icon blue">
              <Calendar size={24} />
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-info">
              <span>Attendance Entries</span>
              <h3>
                {stats?.totalAttendanceRecords?.toLocaleString() ?? 0}
                <small style={{ fontSize: "13px", color: "#6b7280", fontWeight: 400 }}>
                  {" "}/ {stats?.expectedAttendanceCount?.toLocaleString() ?? 0}
                </small>
              </h3>
            </div>
            <div className="kpi-icon amber">
              <Users size={24} />
            </div>
          </div>

          <div className="kpi-card" style={{ cursor: "pointer" }} onClick={() => navigate(`${basePath}/defaulters`)}>
            <div className="kpi-info">
              <span>Defaulters Alert (&lt; 75%)</span>
              <h3 style={{ color: defaultersCount > 0 ? "#dc2626" : "#059669" }}>
                {defaultersCount} Students
              </h3>
            </div>
            <div className="kpi-icon red">
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>

        {/* Cohort Breakdown Table */}
        <div className="report-table-card">
          <div className="report-table-header">
            <h2>Cohort Attendance Breakdown</h2>
            <button
              onClick={fetchReports}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#2563eb",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <RefreshCw size={14} className={loading ? "analytics-spin" : ""} /> Refresh
            </button>
          </div>

          <div className="report-table-wrap">
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                Loading cohort analytics...
              </div>
            ) : error ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#dc2626" }}>
                {error}
              </div>
            ) : !deptAnalytics?.cohorts?.length ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                No conducted sessions recorded for this selection.
              </div>
            ) : (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Cohort</th>
                    <th>Enrolled</th>
                    <th>Conducted Sessions</th>
                    <th>Attendance Volume</th>
                    <th>Attendance Rate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deptAnalytics.cohorts.map((cohort, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: "#111827" }}>
                        {cohort.departmentName || deptAnalytics.departmentName}
                      </td>
                      <td>
                        <span className="badge-cohort">
                          <GraduationCap size={13} /> Year {cohort.year} • Sem {cohort.semester} • Sec {cohort.section}
                        </span>
                      </td>
                      <td>{cohort.studentCount} students</td>
                      <td>{cohort.sessionsConducted} classes</td>
                      <td>
                        {cohort.attendanceCount} / {cohort.expectedAttendanceCount}
                      </td>
                      <td>
                        <span
                          className={`badge-rate ${
                            cohort.attendancePercentage >= 75 ? "good" : "low"
                          }`}
                        >
                          {Number(cohort.attendancePercentage || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        {cohort.attendancePercentage >= 75 ? (
                          <span style={{ color: "#059669", fontWeight: 600, fontSize: "12px" }}>
                            Healthy
                          </span>
                        ) : (
                          <span style={{ color: "#dc2626", fontWeight: 600, fontSize: "12px" }}>
                            Low Attendance
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

