import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../api/api";
import {
  Users,
  Search,
  Shield,
  Key,
  UserCheck,
  UserX,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  Filter
} from "lucide-react";

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters & Pagination
  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Modals state
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [newRole, setNewRole] = useState("");

  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [statusConfirmUser, setStatusConfirmUser] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
      });
      if (roleFilter) params.append("role", roleFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await api.get(`/api/admin/users?${params.toString()}`);
      setUsers(res.data.users || []);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users list.");
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleRoleChange = async () => {
    if (!roleModalUser || !newRole) return;
    try {
      setError("");
      await api.put(`/api/admin/users/${roleModalUser.id}/role`, { role: newRole });
      showSuccess(`Role for ${roleModalUser.name} successfully updated to ${newRole}.`);
      setRoleModalUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user role.");
    }
  };

  const handleResetPassword = async () => {
    if (!passwordModalUser) return;
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setError("");
      await api.put(`/api/admin/users/${passwordModalUser.id}/reset-password`, {
        newPassword: newPassword,
      });
      showSuccess(`Password for ${passwordModalUser.name} successfully reset.`);
      setPasswordModalUser(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password.");
    }
  };

  const handleToggleStatus = async () => {
    if (!statusConfirmUser) return;
    try {
      setError("");
      const newStatus = !statusConfirmUser.isActive;
      await api.put(`/api/admin/users/${statusConfirmUser.id}/status`, {
        isActive: newStatus,
      });
      showSuccess(
        `User ${statusConfirmUser.name} has been ${newStatus ? "activated" : "deactivated"}.`
      );
      setStatusConfirmUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user status.");
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role?.toUpperCase()) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "MANAGER":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "HOD":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "STAFF":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "STUDENT":
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
              <Users className="w-7 h-7 text-blue-600" />
              User & Access Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage accounts, assign roles, reset passwords, and toggle active status across all institutional users.
            </p>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Alerts */}
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

        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between text-green-700 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="hover:text-green-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="HOD">HOD</option>
              <option value="STAFF">Staff</option>
              <option value="STUDENT">Student</option>
            </select>
            <span className="text-xs text-gray-500">
              Total: <strong>{totalCount}</strong> users
            </span>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-400">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-400">
                      No users match the search criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getRoleBadgeClass(
                            u.role
                          )}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {u.role === "STUDENT" && u.student ? (
                          <div>
                            <div>{u.student.departmentName || "Dept N/A"}</div>
                            <div className="text-gray-400">
                              Yr {u.student.year} | Sem {u.student.semester} | Sec {u.student.section}
                            </div>
                          </div>
                        ) : u.staff ? (
                          <div>
                            <div>{u.staff.departmentName || "Dept N/A"}</div>
                            <div className="text-gray-400">{u.staff.position || "Staff"}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Institutional User</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <UserCheck className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <UserX className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setRoleModalUser(u);
                              setNewRole(u.role);
                            }}
                            title="Change Role"
                            className="p-1.5 hover:bg-purple-50 text-purple-600 rounded-lg transition"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setPasswordModalUser(u);
                              setNewPassword("");
                              setConfirmPassword("");
                            }}
                            title="Reset Password"
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setStatusConfirmUser(u)}
                            title={u.isActive ? "Deactivate User" : "Activate User"}
                            className={`p-1.5 rounded-lg transition ${
                              u.isActive
                                ? "hover:bg-red-50 text-red-600"
                                : "hover:bg-green-50 text-green-600"
                            }`}
                          >
                            {u.isActive ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                        </div>
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
              Showing {users.length > 0 ? page * pageSize + 1 : 0} to{" "}
              {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} users
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

      {/* Role Change Modal */}
      {roleModalUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Change Role for {roleModalUser.name}</h3>
            <p className="text-sm text-gray-500">
              Select the new security and authorization role for this user account.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">New Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="ADMIN">ADMIN (Superuser)</option>
                <option value="MANAGER">MANAGER (Academic Operations)</option>
                <option value="HOD">HOD (Department Head)</option>
                <option value="STAFF">STAFF (Teaching Faculty)</option>
                <option value="STUDENT">STUDENT</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                onClick={() => setRoleModalUser(null)}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {passwordModalUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Reset Password for {passwordModalUser.name}</h3>
            <p className="text-sm text-gray-500">
              Enter a new secure password (minimum 6 characters) for this user.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Re-enter password"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                onClick={() => setPasswordModalUser(null)}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Confirmation Modal */}
      {statusConfirmUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              {statusConfirmUser.isActive ? "Deactivate User Account" : "Activate User Account"}
            </h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to {statusConfirmUser.isActive ? "deactivate" : "activate"}{" "}
              <strong>{statusConfirmUser.name}</strong> ({statusConfirmUser.email})?
              {statusConfirmUser.isActive && " They will immediately lose login access to the system."}
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                onClick={() => setStatusConfirmUser(null)}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStatus}
                className={`px-4 py-2 text-white rounded-lg text-sm font-medium ${
                  statusConfirmUser.isActive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                Yes, {statusConfirmUser.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

