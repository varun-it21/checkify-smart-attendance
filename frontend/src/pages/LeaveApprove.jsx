import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/api";

const LeaveApprove = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [remarksState, setRemarksState] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [actionAlert, setActionAlert] = useState(null);

  const fetchPendingLeaves = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/leaves/pending?limit=50");
      setLeaves(response.data.leaves || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load pending leave requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingLeaves();
  }, []);

  const handleRemarksChange = (id, value) => {
    setRemarksState((prev) => ({ ...prev, [id]: value }));
  };

  const handleReview = async (id, status) => {
    const remarks = remarksState[id] || "";
    setProcessingId(id);
    setActionAlert(null);

    try {
      await api.put(`/api/leaves/${id}/review`, {
        status,
        reviewerRemarks: remarks,
      });

      setActionAlert({
        type: "success",
        text: `Leave request successfully ${status.toLowerCase()}!`,
      });

      // Remove decided leave from pending list
      setLeaves((prev) => prev.filter((l) => l.id !== id));
      setTimeout(() => setActionAlert(null), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to ${status.toLowerCase()} leave request.`;
      setActionAlert({ type: "error", text: msg });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Leave Approval Queue</h2>
            <p className="text-sm text-gray-500">Review and decide pending student and staff leave requests</p>
          </div>
          <button
            onClick={fetchPendingLeaves}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
          >
            Refresh Queue
          </button>
        </div>

        {actionAlert && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm border ${
              actionAlert.type === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {actionAlert.text}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading pending leave requests...</div>
          ) : leaves.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <svg
                className="w-12 h-12 text-gray-300 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-base font-semibold text-gray-700">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">There are no pending leave requests to review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Applicant</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4 min-w-[200px]">Reviewer Remarks</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-800">{l.applicantName}</div>
                        <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          {l.applicantRole}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{l.departmentName}</td>
                      <td className="py-3 px-4 font-medium text-gray-700">{l.leaveType}</td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                        {l.startDate} &rarr; {l.endDate}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-800 text-center">{l.daysCount}</td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs" title={l.reason}>
                        {l.reason}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={remarksState[l.id] || ""}
                          onChange={(e) => handleRemarksChange(l.id, e.target.value)}
                          placeholder="Optional remarks..."
                          className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            disabled={processingId === l.id}
                            onClick={() => handleReview(l.id, "APPROVED")}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md shadow-sm transition"
                          >
                            Approve
                          </button>
                          <button
                            disabled={processingId === l.id}
                            onClick={() => handleReview(l.id, "REJECTED")}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md shadow-sm transition"
                          >
                            Reject
                          </button>
                        </div>
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

export default LeaveApprove;
