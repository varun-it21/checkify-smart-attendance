import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/api";

function getErrorMessage(error, fallback) {
  const data = error.response?.data;

  if (data?.message) return data.message;
  if (data?.title) return data.title;

  // ASP.NET Core validation response
  if (data?.errors) {
    return Object.values(data.errors).flat().join(" ");
  }

  return fallback;
}

function EditStaff() {
  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");

  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ================= FETCH STAFF =================

  const fetchStaffs = async () => {
    setLoadingStaff(true);
    setError("");

    try {
      const response = await api.get("/manager/get-staffs");
      setStaffList(response.data || []);
    } catch (err) {
      console.error("Failed to load staff:", err);
      setError(getErrorMessage(err, "Failed to load staff members."));
    } finally {
      setLoadingStaff(false);
    }
  };

  // ================= FETCH DEPARTMENTS =================

  const fetchDepartments = async () => {
    setLoadingDepartments(true);

    try {
      const response = await api.get("/manager/departments");
      setDepartments(response.data || []);
    } catch (err) {
      console.error("Failed to load departments:", err);
      setError(
        getErrorMessage(err, "Failed to load departments.")
      );
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    fetchStaffs();
    fetchDepartments();
  }, []);

  // ================= FILTER =================

  const filteredStaff = staffList.filter((staff) => {
    const searchValue = search.trim().toLowerCase();

    const matchesSearch =
      (staff.staffName || "").toLowerCase().includes(searchValue) ||
      (staff.email || "").toLowerCase().includes(searchValue) ||
      (staff.mobileNumber || "").toLowerCase().includes(searchValue);

    const matchesDepartment =
      filterDept === "" || staff.departmentName === filterDept;

    return matchesSearch && matchesDepartment;
  });

  // ================= PAGINATION =================

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const lastIndex = currentPage * itemsPerPage;
  const firstIndex = lastIndex - itemsPerPage;

  const paginatedStaff = filteredStaff.slice(firstIndex, lastIndex);

  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    } else if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleDepartmentFilter = (value) => {
    setFilterDept(value);
    setCurrentPage(1);
  };

  // ================= EDIT: FETCH BY ID =================

  const handleEdit = async (id) => {
    setLoadingEdit(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.get(`/manager/get-staff/${id}`);
      const staff = response.data;

      // Map the API response to the update form.
      // The backend UpdateStaffRequest expects "department",
      // while the response contains "departmentName".
      setEditData({
        id: staff.id,
        staffName: staff.staffName || "",
        email: staff.email || "",
        mobileNumber: staff.mobileNumber || "",
        experience: staff.experience ?? 0,
        specialization: staff.specialization || "",
        gender: staff.gender || "",
        address: staff.address || "",
        department: staff.departmentName || "",
        position: staff.position || "",
      });
    } catch (err) {
      console.error("Failed to fetch staff:", err);
      setError(getErrorMessage(err, "Failed to fetch staff details."));
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleEditChange = (field, value) => {
    setEditData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // ================= UPDATE STAFF =================

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editData) return;

    const experience = Number(editData.experience);

    if (!Number.isFinite(experience) || experience < 0 || experience > 999.9) {
      setError("Experience must be between 0 and 999.9.");
      return;
    }

    if (!Number.isInteger(experience * 10)) {
      setError("Experience can have at most one decimal place.");
      return;
    }

    const payload = {
      staffName: editData.staffName.trim(),
      email: editData.email.trim(),
      mobileNumber: editData.mobileNumber.trim(),
      experience,
      specialization: editData.specialization.trim(),
      gender: editData.gender.trim(),
      address: editData.address.trim(),
      department: editData.department,
    };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.put(
        `/manager/update-staff/${editData.id}`,
        payload
      );

      setEditData(null);
      setSuccess("Staff details updated successfully.");

      await fetchStaffs();
    } catch (err) {
      console.error("Update failed:", err);
      setError(getErrorMessage(err, "Failed to update staff details."));
    } finally {
      setSaving(false);
    }
  };

  // ================= DELETE STAFF =================

  const confirmDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/manager/delete-staff/${deleteId}`);

      setDeleteId(null);
      setSuccess("Staff member deleted successfully.");

      await fetchStaffs();
    } catch (err) {
      console.error("Delete failed:", err);
      setError(getErrorMessage(err, "Failed to delete staff member."));
    } finally {
      setDeleting(false);
    }
  };

  // ================= CLOSE MODALS =================

  const closeEditModal = () => {
    if (!saving) {
      setEditData(null);
    }
  };

  const closeDeleteModal = () => {
    if (!deleting) {
      setDeleteId(null);
    }
  };

  return (
    <Layout>
      <style>{`
        .edit-staff-container {
          padding: 20px;
        }

        .top-bar {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .top-bar input,
        .top-bar select {
          padding: 10px;
          width: 250px;
          border: 1px solid #ccc;
          border-radius: 5px;
        }

        .staff-status {
          margin-bottom: 15px;
          padding: 10px 12px;
          border-radius: 5px;
        }

        .staff-error {
          color: #842029;
          background: #f8d7da;
          border: 1px solid #f5c2c7;
        }

        .staff-success {
          color: #0f5132;
          background: #d1e7dd;
          border: 1px solid #badbcc;
        }

        .table-container {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #ddd;
          border-radius: 8px;
        }

        .staff-table {
          min-width: 1600px;
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        .staff-table th,
        .staff-table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
          white-space: nowrap;
          text-align: left;
        }

        .staff-table th {
          background: #f4f4f4;
        }

        .edit-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 6px 10px;
          border-radius: 5px;
          margin-right: 6px;
          cursor: pointer;
        }

        .delete-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 6px 10px;
          border-radius: 5px;
          cursor: pointer;
        }

        .edit-btn:disabled,
        .delete-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pagination {
          margin-top: 20px;
        }

        .pagination button {
          padding: 8px 12px;
          margin-right: 5px;
          border: none;
          border-radius: 5px;
          background: #ddd;
          cursor: pointer;
        }

        .pagination .active {
          background: #007bff;
          color: white;
        }

        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 15px;
        }

        .modal-content {
          width: 500px;
          max-width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          padding: 20px;
          border-radius: 10px;
        }

        .modal-content label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }

        .modal-content input,
        .modal-content select,
        .modal-content textarea {
          box-sizing: border-box;
          width: 100%;
          padding: 10px;
          margin-bottom: 12px;
          border: 1px solid #ccc;
          border-radius: 5px;
        }

        .modal-content textarea {
          min-height: 75px;
          resize: vertical;
        }

        .modal-content input:disabled {
          background: #eee;
          cursor: not-allowed;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
        }

        .save-btn,
        .close-btn,
        .delete-confirm {
          color: white;
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }

        .save-btn {
          background: green;
        }

        .close-btn {
          background: gray;
        }

        .delete-confirm {
          background: #d9534f;
        }

        .save-btn:disabled,
        .delete-confirm:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .empty-row {
          text-align: center !important;
          padding: 25px !important;
        }
      `}</style>

      <div className="edit-staff-container">
        <h2>Edit Staff</h2>

        {error && (
          <div className="staff-status staff-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="staff-status staff-success" role="status">
            {success}
          </div>
        )}

        {/* SEARCH AND DEPARTMENT FILTER */}

        <div className="top-bar">
          <input
            type="text"
            placeholder="Search by name, email or mobile..."
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
          />

          <select
            value={filterDept}
            onChange={(event) => handleDepartmentFilter(event.target.value)}
            disabled={loadingDepartments}
          >
            <option value="">All Departments</option>

            {departments.map((department) => (
              <option key={department.id} value={department.name}>
                {department.name}
              </option>
            ))}
          </select>
        </div>

        {/* STAFF TABLE */}

        <div className="table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Department</th>
                <th>Experience</th>
                <th>Specialization</th>
                <th>Position</th>
                <th>Gender</th>
                <th>Address</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loadingStaff ? (
                <tr>
                  <td colSpan="10" className="empty-row">
                    Loading staff...
                  </td>
                </tr>
              ) : paginatedStaff.length === 0 ? (
                <tr>
                  <td colSpan="10" className="empty-row">
                    No staff members found.
                  </td>
                </tr>
              ) : (
                paginatedStaff.map((staff) => (
                  <tr key={staff.id}>
                    <td>{staff.staffName}</td>
                    <td>{staff.email}</td>
                    <td>{staff.mobileNumber}</td>
                    <td>{staff.departmentName}</td>
                    <td>{staff.experience}</td>
                    <td>{staff.specialization}</td>
                    <td>{staff.position}</td>
                    <td>{staff.gender}</td>
                    <td>{staff.address}</td>
                    <td>
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(staff.id)}
                        disabled={loadingEdit}
                      >
                        Edit
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => setDeleteId(staff.id)}
                        disabled={deleting}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage((page) => page - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index}
                className={currentPage === index + 1 ? "active" : ""}
                onClick={() => setCurrentPage(index + 1)}
              >
                {index + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((page) => page + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}

        {/* EDIT MODAL */}

        {editData && (
          <div className="modal">
            <div className="modal-content">
              <h3>Edit Staff Details</h3>

              <form onSubmit={handleUpdate}>
                <label>Staff Name</label>
                <input
                  type="text"
                  value={editData.staffName}
                  onChange={(event) =>
                    handleEditChange("staffName", event.target.value)
                  }
                  required
                />

                <label>Email</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(event) =>
                    handleEditChange("email", event.target.value)
                  }
                  required
                />

                <label>Mobile Number</label>
                <input
                  type="tel"
                  value={editData.mobileNumber}
                  onChange={(event) =>
                    handleEditChange("mobileNumber", event.target.value)
                  }
                  required
                />

                <label>Experience (years)</label>
                <input
                  type="number"
                  min="0"
                  max="999.9"
                  step="0.1"
                  value={editData.experience}
                  onChange={(event) =>
                    handleEditChange("experience", event.target.value)
                  }
                  required
                />

                <label>Specialization</label>
                <input
                  type="text"
                  value={editData.specialization}
                  onChange={(event) =>
                    handleEditChange("specialization", event.target.value)
                  }
                />

                <label>Gender</label>
                <input
                  type="text"
                  value={editData.gender}
                  onChange={(event) =>
                    handleEditChange("gender", event.target.value)
                  }
                  required
                />

                <label>Department</label>
                <select
                  value={editData.department}
                  onChange={(event) =>
                    handleEditChange("department", event.target.value)
                  }
                  required
                  disabled={loadingDepartments}
                >
                  <option value="">Select Department</option>

                  {departments.map((department) => (
                    <option key={department.id} value={department.name}>
                      {department.name}
                    </option>
                  ))}
                </select>

                <label>Position</label>
                <input
                  type="text"
                  value={editData.position}
                  disabled
                  readOnly
                />

                <label>Address</label>
                <textarea
                  value={editData.address}
                  onChange={(event) =>
                    handleEditChange("address", event.target.value)
                  }
                />

                <div className="modal-actions">
                  <button
                    type="submit"
                    className="save-btn"
                    disabled={saving || loadingDepartments}
                  >
                    {saving ? "Updating..." : "Update"}
                  </button>

                  <button
                    type="button"
                    className="close-btn"
                    onClick={closeEditModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}

        {deleteId !== null && (
          <div className="modal">
            <div className="modal-content">
              <h3>Confirm Delete</h3>

              <p>
                Are you sure you want to delete this staff member and their
                associated user account? This action cannot be undone.
              </p>

              <div className="modal-actions">
                <button
                  className="delete-confirm"
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>

                <button
                  className="close-btn"
                  onClick={closeDeleteModal}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default EditStaff;
