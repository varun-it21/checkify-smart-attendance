import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Building2, CalendarCheck, GraduationCap, RefreshCw, Users } from "lucide-react";
import { ResponsiveContainer, CartesianGrid, LineChart, Line, Tooltip, XAxis, YAxis } from "recharts";
import api from "../api/api";
import "../CSS/DashboardAnalytics.css";
import { DashboardError, DashboardLoading, EmptyAnalytics, SectionCard, StatCard } from "./DashboardShared";
import { formatPercent } from "./dashboardUtils";

const ManagerDashboard = () => {
  const [stats, setStats] = useState(null);
  const [department, setDepartment] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [statsRes, deptRes, trendRes] = await Promise.all([
        api.get("/api/analytics/dashboard"),
        api.get("/api/analytics/department"),
        api.get("/api/analytics/trends", { params: { groupBy: "day" } }),
      ]);
      setStats(statsRes.data);
      setDepartment(deptRes.data);
      setTrends(Array.isArray(trendRes.data) ? trendRes.data.slice(-14) : []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load manager analytics. Check that the API is running and your account has access.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const chartData = useMemo(() => trends.map((item) => ({
    date: new Date(`${item.periodStart}T00:00:00`).toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
    attendance: item.attendanceCount,
    sessions: item.sessionsConducted,
  })), [trends]);

  if (loading && !stats) return <DashboardLoading />;
  if (error && !stats) return <DashboardError message={error} onRetry={load} />;

  return (
    <div className="analytics-dashboard">
      <div className="analytics-page-header">
        <div><p className="analytics-eyebrow">INSTITUTION OVERVIEW</p><h1>Manager Dashboard</h1><p>Live institutional statistics and attendance activity.</p></div>
        <button className="analytics-refresh" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "analytics-spin" : ""}/> Refresh</button>
      </div>
      {error && <DashboardError message={error} onRetry={load} />}
      <div className="analytics-stat-grid">
        <StatCard label="Total Students" value={stats?.studentCount?.toLocaleString() ?? "—"} icon={GraduationCap} tone="blue" />
        <StatCard label="Total Staff" value={stats?.staffCount?.toLocaleString() ?? "—"} icon={Users} tone="green" />
        <StatCard label="Departments" value={stats?.departmentCount?.toLocaleString() ?? "—"} icon={Building2} tone="amber" />
        <StatCard label="Sessions Today" value={stats?.sessionsToday?.toLocaleString() ?? "—"} icon={CalendarCheck} tone="violet" />
      </div>
      <div className="analytics-stat-grid analytics-stat-grid-secondary">
        <StatCard label="Attendance Rate" value={formatPercent(stats?.attendancePercentage)} hint="Across conducted sessions" icon={Activity} tone="teal" />
        <StatCard label="Sessions Conducted" value={stats?.totalSessionsInRange?.toLocaleString() ?? "—"} hint="All available records" icon={CalendarCheck} tone="blue" />
        <StatCard label="Attendance Entries" value={stats?.totalAttendanceRecords?.toLocaleString() ?? "—"} hint={`${stats?.expectedAttendanceCount?.toLocaleString() ?? 0} expected`} icon={Users} tone="green" />
      </div>
      <div className="analytics-content-grid">
        <SectionCard title="Attendance activity" subtitle="Daily attendance entries and conducted sessions">
          {chartData.length ? <div className="analytics-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9edf4"/><XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/><Tooltip/><Line type="monotone" dataKey="attendance" name="Attendance" stroke="#2563eb" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="sessions" name="Sessions" stroke="#10b981" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div> : <EmptyAnalytics>No conducted sessions found for the trend report.</EmptyAnalytics>}
        </SectionCard>
        <SectionCard title="Department snapshot" subtitle={department?.departmentName || "Institution-wide"}>
          <div className="analytics-dept-summary"><strong>{formatPercent(department?.attendancePercentage)}</strong><span>Overall attendance</span></div>
          <div className="analytics-mini-list"><div><span>Students</span><b>{department?.studentCount ?? 0}</b></div><div><span>Staff</span><b>{department?.staffCount ?? 0}</b></div><div><span>Conducted sessions</span><b>{department?.sessionsConducted ?? 0}</b></div></div>
        </SectionCard>
      </div>
    </div>
  );
};

export default ManagerDashboard;
