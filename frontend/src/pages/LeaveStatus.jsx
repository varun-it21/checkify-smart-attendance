import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/api";

const LeaveStatus = () => {
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const fetchMyLeaves = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/leaves/my?limit=50");
      const data = response.data;
      setLeaves(data.leaves || []);
      setStats({
        total: data.totalCount || 0,
        pending: data.pendingCount || 0,
        approved: data.approvedCount || 0,
        rejected: data.rejectedCount || 0,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load leave history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  const handleCancel = async (leaveId) => {
    if (!window.confirm("Are you sure you want to cancel this leave application?")) {
      return;
    }

    try {
      await api.put(`/api/leaves/${leaveId}/cancel`);
      setActionMsg("Leave request cancelled successfully.");
      setTimeout(() => setActionMsg(""), 4000);
      fetchMyLeaves();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel leave request.");
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "APPROVED") {
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Approved</span>;
    }
    if (s === "REJECTED") {
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Rejected</span>;
    }
    if (s === "CANCELLED") {
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">Cancelled</span>;
    }
    return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">My Leave Applications</h2>
            <p className="text-sm text-gray-500">Track and manage your submitted leave requests</p>
          </div>
          <button
            onClick={fetchMyLeaves}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
          >
            Refresh
          </button>
        </div>

        {actionMsg && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
            {actionMsg}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
            <span className="text-xs text-gray-500 uppercase font-medium">Total</span>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-yellow-100 shadow-sm text-center">
            <span className="text-xs text-yellow-600 uppercase font-medium">Pending</span>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm text-center">
            <span className="text-xs text-green-600 uppercase font-medium">Approved</span>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm text-center">
            <span className="text-xs text-red-600 uppercase font-medium">Rejected</span>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
          </div>
        </div>

        {/* Leave Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading leave requests...</div>
          ) : leaves.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No leave requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">From</th>
                    <th className="py-3 px-4">To</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Reviewer Remarks</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-medium text-gray-800">{l.leaveType}</td>
                      <td className="py-3 px-4 text-gray-600">{l.startDate}</td>
                      <td className="py-3 px-4 text-gray-600">{l.endDate}</td>
                      <td className="py-3 px-4 text-gray-700 font-medium">{l.daysCount}</td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={l.reason}>
                        {l.reason}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(l.status)}
                        {(l.status || "").toUpperCase() === "PENDING" && l.approverRole && (
                          <div className="mt-1 text-xs text-gray-500">Waiting for {l.approverRole}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500 italic max-w-xs truncate" title={l.reviewerRemarks || ""}>
                        {l.reviewerRemarks || "-"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {l.status === "PENDING" ? (
                          <button
                            onClick={() => handleCancel(l.id)}
                            className="px-2.5 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 transition"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
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
};

export default LeaveStatus;
