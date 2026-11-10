import React, { useCallback, useEffect, useState } from "react";
import { Activity, BookOpen, CalendarCheck, RefreshCw } from "lucide-react";
import api from "../api/api";
import "../CSS/DashboardAnalytics.css";
import { DashboardError, DashboardLoading, EmptyAnalytics, SectionCard, StatCard, formatPercent } from "./DashboardShared";

const StudentDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await api.get("/api/analytics/student/summary"); setSummary(response.data); }
    catch (err) { setError(err.response?.data?.message || "Could not load your attendance summary. Please retry."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  if (loading && !summary) return <DashboardLoading />;
  if (error && !summary) return <DashboardError message={error} onRetry={load} />;
  const rate = Number(summary?.attendancePercentage || 0);
  return (
    <div className="analytics-dashboard">
      <div className="analytics-page-header"><div><p className="analytics-eyebrow">PERSONAL OVERVIEW</p><h1>Student Dashboard</h1><p>{summary?.departmentName || "Your department"} · Year {summary?.year ?? "—"}, Semester {summary?.semester ?? "—"}, Section {summary?.section || "—"}</p></div><button className="analytics-refresh" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "analytics-spin" : ""}/> Refresh</button></div>
      {error && <DashboardError message={error} onRetry={load} />}
      <div className="analytics-stat-grid">
        <StatCard label="Overall Attendance" value={formatPercent(rate)} hint={summary?.isDefaulter ? "Below the required 75% threshold" : "75% minimum attendance target"} icon={Activity} tone={summary?.isDefaulter ? "red" : "green"} />
        <StatCard label="Classes Attended" value={summary?.classesAttended ?? 0} icon={CalendarCheck} tone="blue" />
        <StatCard label="Classes Conducted" value={summary?.classesConducted ?? 0} icon={BookOpen} tone="violet" />
      </div>
      {summary?.isDefaulter && <div className="analytics-warning" role="status"><b>Attendance alert:</b> Your attendance is below 75%. Please attend upcoming classes regularly to improve your percentage.</div>}
      <SectionCard title="Subject-wise attendance" subtitle="Your attendance in each subject based on conducted sessions">
        {summary?.subjects?.length ? <div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th>Subject</th><th>Classes Conducted</th><th>Classes Attended</th><th>Attendance</th><th>Progress</th></tr></thead><tbody>{summary.subjects.map((s) => <tr key={`${s.classSessionId}-${s.subjectCode}`}><td><b>{s.subjectCode}</b><small className="analytics-cell-subtitle">{s.subjectName}</small></td><td>{s.classesConducted}</td><td>{s.classesAttended}</td><td><span className={`analytics-rate ${s.attendancePercentage < 75 ? "analytics-rate-low" : ""}`}>{formatPercent(s.attendancePercentage)}</span></td><td><div className="analytics-progress"><span className={s.attendancePercentage < 75 ? "analytics-progress-low" : ""} style={{ width: `${Math.min(100, Math.max(0, Number(s.attendancePercentage || 0)))}%` }}/></div></td></tr>)}</tbody></table></div> : <EmptyAnalytics>No conducted classes have been recorded for your cohort yet.</EmptyAnalytics>}
      </SectionCard>
    </div>
  );
};
export default StudentDashboard;
