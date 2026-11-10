import React, { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../components/Layout";
import api from "../api/api";
import {
  BarChart2,
  Calendar,
  Users,
  Search,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  RefreshCw,
  BookOpen,
  GraduationCap,
  Layers,
  ArrowUpDown,
  X
} from "lucide-react";

export default function StaffViewAttendance() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // "ALL", "OPEN", "CLOSED"
  const [dateFilter, setDateFilter] = useState("");

  // Expanded Session Details Modal / Drawer
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionRecords, setSessionRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsSearch, setRecordsSearch] = useState("");

  // -------------------------------------------------------------
  // Fetch session history for authenticated staff
  // -------------------------------------------------------------
  const fetchSessionHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/staff/attendance/history");
      setSessions(res.data || []);
    } catch (err) {
      console.error("Failed to load staff attendance history:", err);
      setError(
        err.response?.data?.message || "Failed to load your attendance history."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessionHistory();
  }, [fetchSessionHistory]);

  // -------------------------------------------------------------
  // Fetch records for a particular session
  // -------------------------------------------------------------
  const handleOpenDetails = async (session) => {
    setSelectedSession(session);
    setRecordsLoading(true);
    setRecordsSearch("");
    try {
      const res = await api.get(`/api/staff/attendance/${session.id}/records`);
      setSessionRecords(res.data || []);
    } catch (err) {
      console.error("Failed to fetch session records:", err);
    } finally {
      setRecordsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Export records to CSV
  // -------------------------------------------------------------
  const exportToCsv = (session, records) => {
    if (!records || records.length === 0) return;
    const headers = ["Serial No", "Student ID", "Student Name", "Status", "Method", "Marked Time (UTC)"];
    const rows = records.map((r, i) => [
      i + 1,
      r.studentId,
      `"${r.studentName.replace(/"/g, '""')}"`,
      r.status,
      r.method,
      new Date(r.markedAt).toISOString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `attendance_${session.subjectCode}_${session.sessionDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // Filtering & Stats
  // -------------------------------------------------------------
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch =
        s.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.subjectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.section.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || s.status.toUpperCase() === statusFilter;

      const matchesDate = !dateFilter || s.sessionDate === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [sessions, searchQuery, statusFilter, dateFilter]);

  const totalSessionsCount = sessions.length;
  const totalStudentsMarked = useMemo(() => {
    return sessions.reduce((acc, s) => acc + (s.presentCount || 0), 0);
  }, [sessions]);

  const filteredRecords = useMemo(() => {
    return sessionRecords.filter(
      (r) =>
        r.studentName.toLowerCase().includes(recordsSearch.toLowerCase()) ||
        String(r.studentId).includes(recordsSearch) ||
        r.method.toLowerCase().includes(recordsSearch.toLowerCase())
    );
  }, [sessionRecords, recordsSearch]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Ribbon */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <BarChart2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
              <p className="text-sm text-gray-500">
                Review past sessions, attendee breakdowns, and verification audits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSessionHistory}
              title="Refresh list"
              className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Sessions
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalSessionsCount}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Attendances Logged
              </p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{totalStudentsMarked}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Active / Open Now
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {sessions.filter((s) => s.status === "OPEN").length}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by subject name, code, or section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open Sessions</option>
              <option value="CLOSED">Closed Sessions</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500"
            />

            {(searchQuery || statusFilter !== "ALL" || dateFilter) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setDateFilter("");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-sm">Loading attendance sessions...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              <p>{error}</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No attendance sessions found.</p>
              <p className="text-xs text-gray-400 mt-1">
                Sessions you open will appear here with student headcounts and verification logs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Cohort</th>
                    <th className="py-3 px-4">Session Date</th>
                    <th className="py-3 px-4">Started At</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Present Count</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-gray-900 block">
                          {session.subjectName}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {session.subjectCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 px-2 py-1 rounded">
                          <GraduationCap className="w-3.5 h-3.5 text-gray-500" />
                          Y{session.year} S{session.semester} - Sec {session.section}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-700 text-xs">
                        {session.sessionDate}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 font-mono">
                        {new Date(session.startedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            session.status === "OPEN"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-gray-100 text-gray-700 border border-gray-200"
                          }`}
                        >
                          {session.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-gray-900 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs">
                          <Users className="w-3.5 h-3.5" />
                          {session.presentCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenDetails(session)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                        >
                          View Attendees
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* ATTENDEE DRILLDOWN MODAL                                       */}
        {/* ============================================================== */}
        {selectedSession && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-white/20 rounded text-xs uppercase font-mono tracking-wider">
                      {selectedSession.subjectCode}
                    </span>
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded">
                      {selectedSession.sessionDate}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold">{selectedSession.subjectName}</h3>
                  <p className="text-xs text-blue-100 mt-1">
                    Cohort: Year {selectedSession.year}, Semester {selectedSession.semester}, Section {selectedSession.section} • Total Present: {selectedSession.presentCount}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Subheader & Actions */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search student or method..."
                    value={recordsSearch}
                    onChange={(e) => setRecordsSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => exportToCsv(selectedSession, sessionRecords)}
                  disabled={sessionRecords.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>

              {/* Records List */}
              <div className="flex-1 overflow-y-auto p-4">
                {recordsLoading ? (
                  <div className="text-center py-12 text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="text-sm">Loading attendance entries...</p>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No attendance records found.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600 text-xs font-semibold uppercase sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Verification Method</th>
                        <th className="py-2.5 px-3">Marked At</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRecords.map((r, i) => (
                        <tr key={r.id} className="hover:bg-blue-50/40 transition">
                          <td className="py-2.5 px-3 text-xs text-gray-400">{i + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-gray-900">
                            {r.studentName}
                            <span className="block text-xs text-gray-400 font-mono">
                              Student ID #{r.studentId}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                r.method === "QR"
                                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                                  : "bg-blue-100 text-blue-800 border border-blue-200"
                              }`}
                            >
                              {r.method}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-gray-500 font-mono">
                            {new Date(r.markedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              PRESENT
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <span>{filteredRecords.length} attendees displayed</span>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
