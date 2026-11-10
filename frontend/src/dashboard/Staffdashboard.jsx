import React, { useCallback, useEffect, useState } from "react";
import { Activity, BookOpen, CalendarCheck, QrCode, RefreshCw, ShieldCheck } from "lucide-react";
import api from "../api/api";
import "../CSS/DashboardAnalytics.css";
import { DashboardError, DashboardLoading, EmptyAnalytics, SectionCard, StatCard } from "./DashboardShared";
import { formatPercent } from "./dashboardUtils";

const StaffDashboard = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await api.get("/api/analytics/staff/insights"); setInsights(response.data); }
    catch (err) { setError(err.response?.data?.message || "Could not load your teaching insights. Please retry."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  if (loading && !insights) return <DashboardLoading />;
  if (error && !insights) return <DashboardError message={error} onRetry={load} />;
  const totalMethods = (insights?.otpAttendanceCount || 0) + (insights?.qrAttendanceCount || 0);
  return (
    <div className="analytics-dashboard">
      <div className="analytics-page-header"><div><p className="analytics-eyebrow">TEACHING OVERVIEW</p><h1>Staff Dashboard</h1><p>Your conducted classes, attendance performance and verification methods.</p></div><button className="analytics-refresh" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "analytics-spin" : ""}/> Refresh</button></div>
      {error && <DashboardError message={error} onRetry={load} />}
      <div className="analytics-stat-grid">
        <StatCard label="Sessions Conducted" value={insights?.sessionsConducted ?? 0} icon={CalendarCheck} tone="blue" />
        <StatCard label="Attendance Rate" value={formatPercent(insights?.attendancePercentage)} hint={`${insights?.attendanceCount ?? 0} / ${insights?.expectedAttendanceCount ?? 0} attendance entries`} icon={Activity} tone="green" />
        <StatCard label="OTP Verified" value={insights?.otpAttendanceCount ?? 0} hint={formatPercent(insights?.otpPercentage)} icon={ShieldCheck} tone="violet" />
        <StatCard label="QR Verified" value={insights?.qrAttendanceCount ?? 0} hint={formatPercent(insights?.qrPercentage)} icon={QrCode} tone="amber" />
      </div>
      <SectionCard title="Verification method adoption" subtitle="Share of recorded attendance by verification method">
        <div className="analytics-method-bar"><span style={{ width: `${totalMethods ? (insights.otpAttendanceCount / totalMethods) * 100 : 0}%` }} /><span style={{ width: `${totalMethods ? (insights.qrAttendanceCount / totalMethods) * 100 : 0}%` }} /></div>
        <div className="analytics-method-legend"><span><i className="analytics-dot analytics-dot-otp"/> OTP <b>{formatPercent(insights?.otpPercentage)}</b></span><span><i className="analytics-dot analytics-dot-qr"/> QR <b>{formatPercent(insights?.qrPercentage)}</b></span></div>
      </SectionCard>
      <SectionCard title="Subject-wise teaching insights" subtitle="Attendance across your conducted sessions">
        {insights?.subjects?.length ? <div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th>Subject</th><th>Sessions</th><th>Attendance</th><th>Rate</th><th>OTP</th><th>QR</th></tr></thead><tbody>{insights.subjects.map((s) => <tr key={`${s.subjectCode}-${s.subjectName}`}><td><b>{s.subjectCode}</b><small className="analytics-cell-subtitle">{s.subjectName}</small></td><td>{s.sessionsConducted}</td><td>{s.attendanceCount}/{s.expectedAttendanceCount}</td><td><span className={`analytics-rate ${s.attendancePercentage < 75 ? "analytics-rate-low" : ""}`}>{formatPercent(s.attendancePercentage)}</span></td><td>{s.otpAttendanceCount}</td><td>{s.qrAttendanceCount}</td></tr>)}</tbody></table></div> : <EmptyAnalytics><BookOpen size={17}/> No conducted classes found for your account.</EmptyAnalytics>}
      </SectionCard>
    </div>
  );
};
export default StaffDashboard;
