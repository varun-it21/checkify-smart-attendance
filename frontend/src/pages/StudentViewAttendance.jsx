import React, { useState, useEffect, useMemo, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../api/api";
import {
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  BookOpen,
  User,
  GraduationCap,
  Layers,
  Download,
  RefreshCw,
  QrCode,
  KeyRound,
  Filter
} from "lucide-react";

export default function StudentViewAttendance() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL"); // "ALL", "OTP", "QR"
  const [dateFilter, setDateFilter] = useState("");

  // -------------------------------------------------------------
  // Fetch personal attendance history for authenticated student
  // -------------------------------------------------------------
  const fetchAttendanceHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/student/attendance/history");
      setHistory(res.data || []);
    } catch (err) {
      console.error("Failed to load student attendance history:", err);
      setError(
        err.response?.data?.message || "Failed to load your attendance history."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [fetchAttendanceHistory]);

  // -------------------------------------------------------------
  // Filtered records
  // -------------------------------------------------------------
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        item.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subjectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.staffName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMethod =
        methodFilter === "ALL" || item.method.toUpperCase() === methodFilter;

      const matchesDate = !dateFilter || item.sessionDate === dateFilter;

      return matchesSearch && matchesMethod && matchesDate;
    });
  }, [history, searchQuery, methodFilter, dateFilter]);

  // -------------------------------------------------------------
  // Summary Stats
  // -------------------------------------------------------------
  const totalClassesAttended = history.length;
  const otpCount = history.filter((r) => r.method === "OTP").length;
  const qrCount = history.filter((r) => r.method === "QR").length;
  const mostRecent = history.length > 0 ? history[0] : null;

  // -------------------------------------------------------------
  // Export CSV
  // -------------------------------------------------------------
  const exportToCsv = () => {
    if (history.length === 0) return;
    const headers = [
      "Sl No",
      "Subject Code",
      "Subject Name",
      "Faculty",
      "Session Date",
      "Marked Time (UTC)",
      "Method",
      "Status",
    ];

    const rows = filteredHistory.map((r, i) => [
      i + 1,
      r.subjectCode,
      `"${r.subjectName.replace(/"/g, '""')}"`,
      `"${r.staffName.replace(/"/g, '""')}"`,
      r.sessionDate,
      new Date(r.markedAt).toISOString(),
      r.method,
      r.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `my_attendance_history_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Ribbon */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <BarChart2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Attendance History</h1>
              <p className="text-sm text-gray-500">
                Track all classes you attended, verified timestamps, and attendance methods
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportToCsv}
              disabled={filteredHistory.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={fetchAttendanceHistory}
              title="Refresh attendance records"
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Classes Attended
              </p>
              <h3 className="text-2xl font-bold text-blue-700 mt-1">{totalClassesAttended}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                OTP Verified
              </p>
              <h3 className="text-2xl font-bold text-indigo-700 mt-1">{otpCount}</h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <KeyRound className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                QR Verified
              </p>
              <h3 className="text-2xl font-bold text-purple-700 mt-1">{qrCount}</h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <QrCode className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Last Attended Class
              </p>
              <h4 className="text-sm font-bold text-gray-900 mt-1 truncate max-w-[150px]">
                {mostRecent ? mostRecent.subjectName : "None yet"}
              </h4>
              <span className="text-xs text-gray-400 block font-mono">
                {mostRecent ? mostRecent.sessionDate : "—"}
              </span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter Ribbon */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by subject, code, or faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Methods</option>
              <option value="OTP">OTP Only</option>
              <option value="QR">QR Code Only</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500"
            />

            {(searchQuery || methodFilter !== "ALL" || dateFilter) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setMethodFilter("ALL");
                  setDateFilter("");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Table of Attendance Records */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-sm">Loading your attendance records...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              <p>{error}</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No attendance records found.</p>
              <p className="text-xs text-gray-400 mt-1">
                Classes you verify through OTP or QR code will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Faculty</th>
                    <th className="py-3 px-4">Session Date</th>
                    <th className="py-3 px-4">Marked At</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredHistory.map((item, index) => (
                    <tr key={item.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3.5 px-4 text-xs text-gray-400">{index + 1}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-gray-900 block">
                          {item.subjectName}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {item.subjectCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">
                        <span className="flex items-center gap-1.5 text-xs">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {item.staffName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-700 text-xs">
                        {item.sessionDate}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 font-mono">
                        {new Date(item.markedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.method === "QR"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {item.method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
