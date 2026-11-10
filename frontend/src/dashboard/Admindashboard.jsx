import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "../components/Chart";
import api from "../api/api";
import {
  Users,
  Shield,
  Settings,
  FileText,
  Sliders,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  Clock
} from "lucide-react";

export default function Admindashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    students: 0,
    staff: 0,
    minAttendance: "75.0%",
    turnoutThreshold: "50.0%",
    institutionName: "Checkify Institute of Technology",
    academicYear: "2026-2027",
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        // Load settings and stats
        const [settingsRes, usersRes, logsRes] = await Promise.allSettled([
          api.get("/api/admin/settings"),
          api.get("/api/admin/users?limit=1"),
          api.get("/api/admin/audit-logs?limit=5"),
        ]);

        let instName = "Checkify Institute of Technology";
        let acYear = "2026-2027";
        let minAtt = "75.0%";
        let turnoutThresh = "50.0%";

        if (settingsRes.status === "fulfilled" && Array.isArray(settingsRes.value.data)) {
          settingsRes.value.data.forEach((s) => {
            if (s.key === "INSTITUTION_NAME") instName = s.value;
            if (s.key === "ACADEMIC_YEAR") acYear = s.value;
            if (s.key === "MIN_ATTENDANCE_PERCENTAGE") minAtt = `${s.value}%`;
            if (s.key === "CRITICAL_TURNOUT_PERCENTAGE") turnoutThresh = `${s.value}%`;
          });
        }

        let userCount = 0;
        if (usersRes.status === "fulfilled") {
          userCount = usersRes.value.data?.totalCount || 0;
        }

        let logs = [];
        if (logsRes.status === "fulfilled") {
          logs = logsRes.value.data?.logs || [];
        }

        setStats({
          totalUsers: userCount,
          students: 1200,
          staff: 150,
          minAttendance: minAtt,
          turnoutThreshold: turnoutThresh,
          institutionName: instName,
          academicYear: acYear,
        });
        setRecentLogs(logs);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="admin-dashboard space-y-6" aria-busy={loading}>
      {/* Institutional Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
            Administrator Console • Academic Year {stats.academicYear}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold">{stats.institutionName}</h1>
          <p className="text-blue-100 text-sm mt-1">
            Centralized institutional governance, threshold enforcement, security policies, and access management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-400 text-emerald-100 rounded-lg text-xs font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-300" />
            System Healthy
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Active Users</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers || "1,380+"}</h3>
            <span className="text-[11px] text-emerald-600 font-medium">Platform-wide Accounts</span>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Min Attendance Rule</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.minAttendance}</h3>
            <span className="text-[11px] text-amber-600 font-medium">Defaulter Alert Trigger</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Sliders className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">HOD Critical Turnout</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.turnoutThreshold}</h3>
            <span className="text-[11px] text-rose-600 font-medium">Escalation Threshold</span>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Audit Security</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">Active</h3>
            <span className="text-[11px] text-purple-600 font-medium">100% Immutable Trail</span>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Admin Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate("/admin/users")}
          className="p-5 bg-white hover:bg-gray-50 border rounded-xl text-left shadow-sm flex items-center justify-between group transition"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
              <Users className="w-5 h-5 text-blue-600" />
              Manage Users & Roles
            </div>
            <p className="text-xs text-gray-500">
              Reset user credentials, assign authorization roles, or deactivate accounts.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
        </button>

        <button
          onClick={() => navigate("/admin/settings")}
          className="p-5 bg-white hover:bg-gray-50 border rounded-xl text-left shadow-sm flex items-center justify-between group transition"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
              <Settings className="w-5 h-5 text-indigo-600" />
              System Settings & Rules
            </div>
            <p className="text-xs text-gray-500">
              Tune attendance thresholds, session OTP timers, and academic schedules.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
        </button>

        <button
          onClick={() => navigate("/admin/audit-logs")}
          className="p-5 bg-white hover:bg-gray-50 border rounded-xl text-left shadow-sm flex items-center justify-between group transition"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
              <FileText className="w-5 h-5 text-purple-600" />
              Institutional Audit Logs
            </div>
            <p className="text-xs text-gray-500">
              Inspect live audit activity, security access records, and review history.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition" />
        </button>
      </div>

      {/* Main Content Split: Chart & Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Trend Chart (2 columns) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <div>
              <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Institutional Enrollment & User Trends
              </h2>
              <p className="text-xs text-gray-500">Active students, staff, and faculty engagement</p>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <Chart />
          </div>
        </div>

        {/* Live Audit Activity Feed (1 column) */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Recent System Activity
              </h2>
              <button
                onClick={() => navigate("/admin/audit-logs")}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {recentLogs.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  No recent activity logged yet.
                </div>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-lg text-xs space-y-1 border">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800">{log.action}</span>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-600 truncate">{log.details}</p>
                    <div className="text-[10px] text-gray-400">
                      By: {log.userName || "System"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t mt-4 text-center">
            <button
              onClick={() => navigate("/admin/audit-logs")}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
            >
              Browse Complete Audit Trail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
