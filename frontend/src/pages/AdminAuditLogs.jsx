import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../api/api";
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  X,
  Clock,
  User,
  ShieldAlert
} from "lucide-react";

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Pagination
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
      });
      if (actionFilter) params.append("action", actionFilter);
      if (entityFilter) params.append("entityName", entityFilter);

      const res = await api.get(`/api/admin/audit-logs?${params.toString()}`);
      setLogs(res.data.logs || []);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadgeClass = (action) => {
    switch (action?.toUpperCase()) {
      case "USER_LOGIN":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "SETTING_UPDATED":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "USER_ROLE_UPDATED":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "USER_PASSWORD_RESET":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "USER_STATUS_UPDATED":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "LEAVE_REVIEWED":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-blue-600" />
              Institutional Audit Logs
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Immutable record of security events, administrative updates, access changes, and system activities.
            </p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-700 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="hover:text-red-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600">Action:</span>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(0);
                }}
                className="px-3 py-1.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">All Actions</option>
                <option value="USER_LOGIN">User Login</option>
                <option value="SETTING_UPDATED">Setting Updated</option>
                <option value="USER_ROLE_UPDATED">Role Changed</option>
                <option value="USER_PASSWORD_RESET">Password Reset</option>
                <option value="USER_STATUS_UPDATED">Status Updated</option>
                <option value="LEAVE_REVIEWED">Leave Reviewed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">Entity:</span>
              <select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(0);
                }}
                className="px-3 py-1.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">All Entities</option>
                <option value="User">User</option>
                <option value="SystemSetting">SystemSetting</option>
                <option value="LeaveRequest">LeaveRequest</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Total Logged Events: <strong>{totalCount}</strong>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400">
                      Loading audit events...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded border ${getActionBadgeClass(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-gray-800">
                        {log.entityName} {log.entityId && <span className="text-gray-400">#{log.entityId}</span>}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-700 max-w-md truncate">
                        {log.details}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-600">
                        {log.userName ? (
                          <div>
                            <div className="font-medium text-gray-900">{log.userName}</div>
                            <div className="text-[11px] text-gray-400">{log.userRole || "User"}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">System / Anonymous</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                        {log.ipAddress || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t flex items-center justify-between text-sm text-gray-500 bg-gray-50">
            <span>
              Showing {logs.length > 0 ? page * pageSize + 1 : 0} to{" "}
              {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} events
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs"
              >
                Previous
              </button>
              <button
                disabled={(page + 1) * pageSize >= totalCount}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

