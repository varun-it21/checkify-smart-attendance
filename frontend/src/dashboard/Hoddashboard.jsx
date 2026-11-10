import React, { useCallback, useEffect, useState } from "react";
import { Activity, CalendarCheck, GraduationCap, RefreshCw, Users } from "lucide-react";
import api from "../api/api";
import "../CSS/DashboardAnalytics.css";
import { DashboardError, DashboardLoading, EmptyAnalytics, SectionCard, StatCard } from "./DashboardShared";
import { formatPercent } from "./dashboardUtils";

const HODDashboard = () => {
  const [stats, setStats] = useState(null);
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [a, b] = await Promise.all([api.get("/api/analytics/dashboard"), api.get("/api/analytics/department")]);
      setStats(a.data); setDepartment(b.data);
    } catch (err) { setError(err.response?.data?.message || "Could not load department analytics. Please retry."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  if (loading && !stats) return <DashboardLoading />;
  if (error && !stats) return <DashboardError message={error} onRetry={load} />;
  return (
    <div className="analytics-dashboard">
      <div className="analytics-page-header"><div><p className="analytics-eyebrow">DEPARTMENT OVERVIEW</p><h1>HOD Dashboard</h1><p>{department?.departmentName || "Your department"} · Live attendance and cohort performance.</p></div><button className="analytics-refresh" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "analytics-spin" : ""}/> Refresh</button></div>
      {error && <DashboardError message={error} onRetry={load} />}
      <div className="analytics-stat-grid">
        <StatCard label="Department Students" value={department?.studentCount ?? 0} icon={GraduationCap} tone="blue" />
        <StatCard label="Department Staff" value={department?.staffCount ?? 0} icon={Users} tone="green" />
        <StatCard label="Sessions Conducted" value={department?.sessionsConducted ?? 0} icon={CalendarCheck} tone="amber" />
        <StatCard label="Attendance Rate" value={formatPercent(department?.attendancePercentage)} icon={Activity} tone="violet" />
      </div>
      <div className="analytics-stat-grid analytics-stat-grid-secondary"><StatCard label="Sessions Today" value={stats?.sessionsToday ?? 0} hint="Department scope" icon={CalendarCheck} tone="teal"/><StatCard label="Attendance Entries" value={department?.attendanceCount ?? 0} hint={`${department?.expectedAttendanceCount ?? 0} expected`} icon={Activity} tone="blue"/></div>
      <SectionCard title="Cohort attendance" subtitle="Attendance by year, semester and section">
        {department?.cohorts?.length ? <div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th>Year</th><th>Semester</th><th>Section</th><th>Students</th><th>Sessions</th><th>Attendance</th><th>Rate</th></tr></thead><tbody>{department.cohorts.map((c) => <tr key={`${c.departmentId}-${c.year}-${c.semester}-${c.section}`}><td>Year {c.year}</td><td>{c.semester}</td><td>{c.section}</td><td>{c.studentCount}</td><td>{c.sessionsConducted}</td><td>{c.attendanceCount}/{c.expectedAttendanceCount}</td><td><span className={`analytics-rate ${c.attendancePercentage < 75 ? "analytics-rate-low" : ""}`}>{formatPercent(c.attendancePercentage)}</span></td></tr>)}</tbody></table></div> : <EmptyAnalytics>No conducted sessions are available for your department yet.</EmptyAnalytics>}
      </SectionCard>
    </div>
  );
};
export default HODDashboard;
