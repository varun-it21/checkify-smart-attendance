import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import reportService from "../services/reportService";
import "../CSS/Reports.css";
import {
  BarChart2,
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Layers,
  Award,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function AttendanceTrends() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "MANAGER";
  const basePath = role === "HOD" ? "/hod" : "/manager";

  // Filter state
  const [groupBy, setGroupBy] = useState("day"); // 'day' | 'week'
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);

  // Data state
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load department list for Manager
  useEffect(() => {
    if (role !== "HOD") {
      reportService.getDepartments().then(setDepartments);
    }
  }, [role]);

  // Set initial 30 days preset if dates are empty
  useEffect(() => {
    if (!fromDate && !toDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      setFromDate(start.toISOString().slice(0, 10));
      setToDate(end.toISOString().slice(0, 10));
    }
  }, [fromDate, toDate]);

  // Fetch trends data
  const fetchTrends = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        groupBy,
      };
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (departmentId) params.departmentId = parseInt(departmentId, 10);

      const res = await reportService.getTrends(params);
      setTrends(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load attendance trends:", err);
      setError(err.response?.data?.message || "Failed to load attendance trends.");
    } finally {
      setLoading(false);
    }
  }, [groupBy, fromDate, toDate, departmentId]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  // Quick Date Presets
  const handlePreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setFromDate(start.toISOString().slice(0, 10));
    setToDate(end.toISOString().slice(0, 10));
  };

  const handleResetFilters = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    setFromDate(start.toISOString().slice(0, 10));
    setToDate(end.toISOString().slice(0, 10));
    setDepartmentId("");
    setGroupBy("day");
  };

  // CSV Export
  const handleExportCsv = () => {
    if (!trends.length) return;
    const headers = [
      "Period Start",
      "Group By",
      "Sessions Conducted",
      "Attendance Records",
      "Avg Attendance Per Session",
    ];
    const rows = trends.map((t) => {
      const avg =
        t.sessionsConducted > 0
          ? (t.attendanceCount / t.sessionsConducted).toFixed(1)
          : "0.0";
      return [
        t.periodStart,
        groupBy.toUpperCase(),
        t.sessionsConducted,
        t.attendanceCount,
        avg,
      ];
    });
    const filename = `attendance_trends_${groupBy}_${new Date().toISOString().slice(0, 10)}`;
    reportService.exportToCsv(filename, headers, rows);
  };

  // Formatted chart data
  const chartData = useMemo(() => {
    return trends.map((t) => ({
      date: t.periodStart,
      sessions: t.sessionsConducted,
      attendance: t.attendanceCount,
      avgPerSession:
        t.sessionsConducted > 0
          ? Number((t.attendanceCount / t.sessionsConducted).toFixed(1))
          : 0,
    }));
  }, [trends]);

  // Aggregate stats
  const totalSessions = useMemo(
    () => trends.reduce((acc, curr) => acc + (curr.sessionsConducted || 0), 0),
    [trends]
  );

  const totalAttendance = useMemo(
    () => trends.reduce((acc, curr) => acc + (curr.attendanceCount || 0), 0),
    [trends]
  );

  const avgPerSessionOverall = useMemo(() => {
    if (!totalSessions) return 0;
    return (totalAttendance / totalSessions).toFixed(1);
  }, [totalAttendance, totalSessions]);

  const peakPeriod = useMemo(() => {
    if (!trends.length) return null;
    return trends.reduce((max, curr) =>
      curr.attendanceCount > (max?.attendanceCount || 0) ? curr : max
    );
  }, [trends]);

  return (
    <Layout>
      <div className="reports-container">
        {/* Header Ribbon */}
        <div className="reports-header">
          <div className="reports-title-area">
            <h1>Attendance Trends & Patterns</h1>
            <p>
              Daily and weekly attendance volume, class frequency, and participation patterns
            </p>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="reports-tabs">
            <button
              className="reports-tab-btn"
              onClick={() => navigate(`${basePath}/reports`)}
            >
              <BarChart2 size={16} /> Overview
            </button>
            <button
              className="reports-tab-btn"
              onClick={() => navigate(`${basePath}/defaulters`)}
            >
              <AlertTriangle size={16} /> Defaulters
            </button>
            <button className="reports-tab-btn active">
              <TrendingUp size={16} /> Trends
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="reports-filter-bar">
          {/* Daily vs Weekly Toggle */}
          <div className="filter-group">
            <label>Group By</label>
            <div className="toggle-btn-group">
              <button
                type="button"
                className={`toggle-btn ${groupBy === "day" ? "active" : ""}`}
                onClick={() => setGroupBy("day")}
              >
                Daily
              </button>
              <button
                type="button"
                className={`toggle-btn ${groupBy === "week" ? "active" : ""}`}
                onClick={() => setGroupBy("week")}
              >
                Weekly
              </button>
            </div>
          </div>

          {/* Department selector (Manager only) */}
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

          {/* From Date */}
          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="filter-input"
            />
          </div>

          {/* To Date */}
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
                onClick={() => handlePreset(90)}
                className="filter-select"
                style={{ cursor: "pointer", padding: "8px 10px", fontSize: "12px" }}
              >
                90 Days
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="filter-select"
                style={{ cursor: "pointer", padding: "8px 10px", fontSize: "12px", color: "#2563eb" }}
              >
                Reset
              </button>
            </div>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={!trends.length}
            className="export-btn"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        {/* KPI Summary Grid */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-info">
              <span>Total Sessions in Period</span>
              <h3>{totalSessions.toLocaleString()}</h3>
            </div>
            <div className="kpi-icon blue">
              <Calendar size={24} />
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-info">
              <span>Total Attendance Logged</span>
              <h3>{totalAttendance.toLocaleString()}</h3>
            </div>
            <div className="kpi-icon green">
              <TrendingUp size={24} />
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-info">
              <span>Avg Students / Session</span>
              <h3>{avgPerSessionOverall}</h3>
            </div>
            <div className="kpi-icon purple">
              <Layers size={24} />
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-info">
              <span>Peak Attendance Period</span>
              <h3 style={{ fontSize: "18px", color: "#d97706" }}>
                {peakPeriod ? `${peakPeriod.periodStart}` : "N/A"}
              </h3>
              <small style={{ fontSize: "12px", color: "#6b7280" }}>
                {peakPeriod ? `${peakPeriod.attendanceCount} records` : ""}
              </small>
            </div>
            <div className="kpi-icon amber">
              <Award size={24} />
            </div>
          </div>
        </div>

        {/* Visual Charts */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Attendance Volume Trend ({groupBy.toUpperCase()})</h3>
              <p>Total student attendance logs across recorded sessions</p>
            </div>
            <button
              onClick={fetchTrends}
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

          <div className="chart-wrapper">
            {loading ? (
              <div style={{ textAlign: "center", paddingTop: "120px", color: "#6b7280" }}>
                Loading trend visualization...
              </div>
            ) : error ? (
              <div style={{ textAlign: "center", paddingTop: "120px", color: "#dc2626" }}>
                {error}
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: "120px", color: "#9ca3af" }}>
                No attendance trend records for the chosen date range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderRadius: "8px",
                      border: "none",
                      color: "#ffffff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="attendance"
                    name="Attendance Marked"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#attendanceGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Conducted Sessions Volume Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Conducted Sessions Volume ({groupBy.toUpperCase()})</h3>
              <p>Number of completed teaching sessions conducted per period</p>
            </div>
          </div>

          <div className="chart-wrapper">
            {loading ? (
              <div style={{ textAlign: "center", paddingTop: "120px", color: "#6b7280" }}>
                Loading session metrics...
              </div>
            ) : error ? (
              <div style={{ textAlign: "center", paddingTop: "120px", color: "#dc2626" }}>
                {error}
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: "120px", color: "#9ca3af" }}>
                No session volume records for the chosen date range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderRadius: "8px",
                      border: "none",
                      color: "#ffffff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="sessions"
                    name="Sessions Conducted"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Detailed Trends Data Table */}
        <div className="report-table-card">
          <div className="report-table-header">
            <h2>Detailed Periodic Metrics ({groupBy.toUpperCase()})</h2>
          </div>

          <div className="report-table-wrap">
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                Loading tabular trend points...
              </div>
            ) : error ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#dc2626" }}>
                {error}
              </div>
            ) : trends.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                No data points found.
              </div>
            ) : (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Period Date</th>
                    <th>Grouping</th>
                    <th>Sessions Conducted</th>
                    <th>Attendance Records</th>
                    <th>Avg Records / Session</th>
                    <th>Volume Level</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.map((t, idx) => {
                    const avg =
                      t.sessionsConducted > 0
                        ? (t.attendanceCount / t.sessionsConducted).toFixed(1)
                        : "0.0";
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: "#111827" }}>
                          {t.periodStart}
                        </td>
                        <td>
                          <span className="badge-cohort">{groupBy.toUpperCase()}</span>
                        </td>
                        <td>{t.sessionsConducted} classes</td>
                        <td style={{ fontWeight: 600, color: "#2563eb" }}>
                          {t.attendanceCount} logs
                        </td>
                        <td>{avg} students</td>
                        <td>
                          {t.attendanceCount > 0 ? (
                            <span className="badge-rate good">Active</span>
                          ) : (
                            <span className="badge-rate warning">No Attendance</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

