import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import reportService from "../services/reportService";
import "../CSS/Reports.css";
import {
  AlertTriangle,
  Search,
  Download,
  RefreshCw,
  UserX,
  ChevronDown,
  ChevronUp,
  BarChart2,
  TrendingUp,
  GraduationCap,
  Sliders,
  CheckCircle,
  BookOpen,
} from "lucide-react";

export default function DefaultersReport() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "MANAGER";
  const basePath = role === "HOD" ? "/hod" : "/manager";

  // Filter state
  const [threshold, setThreshold] = useState(75);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");

  // Search & Accordion
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  // Data state
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load department list for Manager
  useEffect(() => {
    if (role !== "HOD") {
      reportService.getDepartments().then(setDepartments);
    }
  }, [role]);

  // Fetch defaulters
  const fetchDefaulters = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        threshold: Number(threshold) || 75,
      };
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (departmentId) params.departmentId = parseInt(departmentId, 10);
      if (year) params.year = parseInt(year, 10);
      if (semester) params.semester = parseInt(semester, 10);
      if (section.trim()) params.section = section.trim();

      const res = await reportService.getDefaulters(params);
      setDefaulters(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load defaulters:", err);
      setError(err.response?.data?.message || "Failed to load defaulters report.");
    } finally {
      setLoading(false);
    }
  }, [threshold, fromDate, toDate, departmentId, year, semester, section]);

  useEffect(() => {
    fetchDefaulters();
  }, [fetchDefaulters]);

  // Calculate classes needed to reach threshold
  const calcDeficit = (conducted, attended, targetThreshold) => {
    const T = (Number(targetThreshold) || 75) / 100;
    if (!conducted || conducted <= 0) return 0;
    const currentRate = attended / conducted;
    if (currentRate >= T) return 0;
    if (T >= 1) return 0;
    const needed = Math.ceil((T * conducted - attended) / (1 - T));
    return Math.max(0, needed);
  };

  // Client-side search filtering
  const filteredDefaulters = useMemo(() => {
    if (!searchQuery.trim()) return defaulters;
    const q = searchQuery.toLowerCase().trim();
    return defaulters.filter(
      (d) =>
        d.studentName?.toLowerCase().includes(q) ||
        String(d.studentId).includes(q) ||
        d.departmentName?.toLowerCase().includes(q) ||
        d.section?.toLowerCase().includes(q)
    );
  }, [defaulters, searchQuery]);

  // Quick Presets
  const handlePreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setFromDate(start.toISOString().slice(0, 10));
    setToDate(end.toISOString().slice(0, 10));
  };

  const handleResetFilters = () => {
    setThreshold(75);
    setFromDate("");
    setToDate("");
    setDepartmentId("");
    setYear("");
    setSemester("");
    setSection("");
    setSearchQuery("");
  };

  // CSV Export
  const handleExportCsv = () => {
    if (filteredDefaulters.length === 0) return;
    const headers = [
      "Student ID",
      "Student Name",
      "Department",
      "Year",
      "Semester",
      "Section",
      "Classes Conducted",
      "Classes Attended",
      "Attendance Rate (%)",
      "Threshold (%)",
      "Classes Needed to Reach Threshold",
      "Risk Status",
    ];

    const rows = filteredDefaulters.map((d) => {
      const deficit = calcDeficit(d.classesConducted, d.classesAttended, threshold);
      const rate = Number(d.attendancePercentage || 0);
      const risk = rate < 50 ? "Critical" : "Warning";
      return [
        d.studentId,
        d.studentName,
        d.departmentName,
        `Year ${d.year}`,
        `Sem ${d.semester}`,
        `Sec ${d.section}`,
        d.classesConducted,
        d.classesAttended,
        `${rate.toFixed(1)}%`,
        `${threshold}%`,
        deficit,
        risk,
      ];
    });

    const filename = `defaulters_report_${threshold}pct_${new Date().toISOString().slice(0, 10)}`;
    reportService.exportToCsv(filename, headers, rows);
  };

  // Statistics summaries
  const criticalCount = useMemo(
    () => defaulters.filter((d) => (d.attendancePercentage || 0) < 50).length,
    [defaulters]
  );

  const avgDefaulterRate = useMemo(() => {
    if (!defaulters.length) return 0;
    const total = defaulters.reduce((acc, curr) => acc + (Number(curr.attendancePercentage) || 0), 0);
    return (total / defaulters.length).toFixed(1);
  }, [defaulters]);

  const totalClassesDeficit = useMemo(() => {
    return defaulters.reduce(
      (acc, curr) => acc + calcDeficit(curr.classesConducted, curr.classesAttended, threshold),
      0
    );
  }, [defaulters, threshold]);

  return (
    <Layout>
      <div className="reports-container">
        {/* Header Ribbon */}
        <div className="reports-header">
          <div className="reports-title-area">
            <h1>Defaulters Tracking & Intervention</h1>
            <p>
              Identify students falling below the mandatory attendance threshold, evaluate deficit classes, and export reports
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
            <button className="reports-tab-btn active">
              <AlertTriangle size={16} /> Defaulters ({defaulters.length})
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
          {/* Threshold Slider */}
          <div className="filter-group">
            <label>Threshold (%)</label>
            <div className="threshold-slider-wrap">
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
              <span className="threshold-val-pill">{threshold}%</span>
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

          {/* Year */}
          <div className="filter-group">
            <label>Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="filter-select"
            >
              <option value="">All</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>
          </div>

          {/* Semester */}
          <div className="filter-group">
            <label>Sem</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="filter-select"
            >
              <option value="">All</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Sem {s}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div className="filter-group">
            <label>Sec</label>
            <input
              type="text"
              placeholder="e.g. A"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="filter-input"
              style={{ width: "70px" }}
            />
          </div>

          {/* From / To Dates */}
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
                7d
              </button>
              <button
                type="button"
                onClick={() => handlePreset(30)}
                className="filter-select"
                style={{ cursor: "pointer", padding: "8px 10px", fontSize: "12px" }}
              >
                30d
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
            disabled={filteredDefaulters.length === 0}
            className="export-btn"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        {/* KPI Summary Grid */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-info">
              <span>Total Defaulters</span>
              <h3 style={{ color: defaulters.length > 0 ? "#dc2626" : "#059669" }}>
                {defaulters.length} Students
              </h3>
            </div>
            <div className="kpi-icon red">
              <UserX size={24} />
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-info">
              <span>Critical Risk (&lt; 50%)</span>
              <h3 style={{ color: criticalCount > 0 ? "#b91c1c" : "#059669" }}>
                {criticalCount} Students
              </h3>
            </div>
            <div className="kpi-icon amber">
              <AlertTriangle size={24} />
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-info">
              <span>Avg Defaulter Rate</span>
              <h3>{avgDefaulterRate}%</h3>
            </div>
            <div className="kpi-icon blue">
              <BarChart2 size={24} />
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-info">
              <span>Total Deficit Classes</span>
              <h3 style={{ color: "#2563eb" }}>{totalClassesDeficit} Needed</h3>
            </div>
            <div className="kpi-icon purple">
              <BookOpen size={24} />
            </div>
          </div>
        </div>

        {/* Defaulter Table Card */}
        <div className="report-table-card">
          <div className="report-table-header">
            <h2>
              Defaulter List (&lt; {threshold}% Attendance)
              <span style={{ fontSize: "13px", fontWeight: 400, color: "#6b7280", marginLeft: "8px" }}>
                Showing {filteredDefaulters.length} of {defaulters.length}
              </span>
            </h2>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Search Bar */}
              <div className="table-search-input">
                <Search size={16} color="#9ca3af" />
                <input
                  type="text"
                  placeholder="Search student or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Refresh button */}
              <button
                onClick={fetchDefaulters}
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
          </div>

          <div className="report-table-wrap">
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                Analyzing attendance records and calculating defaulter status...
              </div>
            ) : error ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#dc2626" }}>
                {error}
              </div>
            ) : filteredDefaulters.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#059669" }}>
                <CheckCircle size={32} style={{ margin: "0 auto 8px" }} />
                <p style={{ margin: 0, fontWeight: 600 }}>
                  No defaulters found! All students meet or exceed the {threshold}% attendance threshold.
                </p>
              </div>
            ) : (
              <table className="report-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}></th>
                    <th>Student Name & ID</th>
                    <th>Department</th>
                    <th>Cohort</th>
                    <th>Attended / Conducted</th>
                    <th>Attendance Rate</th>
                    <th>Classes to Reach {threshold}%</th>
                    <th>Risk Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDefaulters.map((student) => {
                    const isExpanded = expandedStudentId === student.studentId;
                    const deficit = calcDeficit(student.classesConducted, student.classesAttended, threshold);
                    const rate = Number(student.attendancePercentage || 0);
                    const isCritical = rate < 50;

                    return (
                      <React.Fragment key={student.studentId}>
                        <tr
                          style={{ cursor: "pointer", background: isExpanded ? "#f8fafc" : "inherit" }}
                          onClick={() => setExpandedStudentId(isExpanded ? null : student.studentId)}
                        >
                          <td style={{ textAlign: "center", color: "#6b7280" }}>
                            {student.subjects && student.subjects.length > 0 ? (
                              isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                            ) : null}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: "#111827" }}>
                              {student.studentName}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>
                              ID: #{student.studentId}
                            </div>
                          </td>
                          <td style={{ color: "#374151" }}>{student.departmentName}</td>
                          <td>
                            <span className="badge-cohort">
                              <GraduationCap size={13} /> Y{student.year} • S{student.semester} • {student.section}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{student.classesAttended}</span> / {student.classesConducted}
                          </td>
                          <td>
                            <span className={`badge-rate ${isCritical ? "low" : "warning"}`}>
                              {rate.toFixed(1)}%
                            </span>
                          </td>
                          <td>
                            <span className="badge-deficit">
                              +{deficit} {deficit === 1 ? "class" : "classes"}
                            </span>
                          </td>
                          <td>
                            {isCritical ? (
                              <span className="badge-critical">Critical</span>
                            ) : (
                              <span style={{ color: "#d97706", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                                Warning
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Accordion Row for Subject Breakdown */}
                        {isExpanded && student.subjects && student.subjects.length > 0 && (
                          <tr>
                            <td colSpan={8} style={{ padding: 0 }}>
                              <div className="subject-subtable-box">
                                <div className="subject-subtable-title">
                                  <BookOpen size={14} /> Subject Breakdown for {student.studentName}
                                </div>
                                <table className="subject-subtable">
                                  <thead>
                                    <tr>
                                      <th>Subject Code</th>
                                      <th>Subject Name</th>
                                      <th>Classes Conducted</th>
                                      <th>Classes Attended</th>
                                      <th>Attendance Rate</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {student.subjects.map((sub, sIdx) => {
                                      const subRate = Number(sub.attendancePercentage || 0);
                                      return (
                                        <tr key={sIdx}>
                                          <td style={{ fontWeight: 600 }}>{sub.subjectCode}</td>
                                          <td>{sub.subjectName}</td>
                                          <td>{sub.classesConducted}</td>
                                          <td>{sub.classesAttended}</td>
                                          <td>
                                            <span
                                              className={`badge-rate ${
                                                subRate >= threshold ? "good" : "low"
                                              }`}
                                            >
                                              {subRate.toFixed(1)}%
                                            </span>
                                          </td>
                                          <td>
                                            {subRate >= threshold ? (
                                              <span style={{ color: "#059669", fontWeight: 600 }}>
                                                Satisfactory
                                              </span>
                                            ) : (
                                              <span style={{ color: "#dc2626", fontWeight: 600 }}>
                                                Defaulter
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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

