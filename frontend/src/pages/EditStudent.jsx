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

const yearToRoman = (year) => {
  switch (Number(year)) {
    case 1:
      return "I";
    case 2:
      return "II";
    case 3:
      return "III";
    case 4:
      return "IV";
    default:
      return year ? String(year) : "";
  }
};

const romanToYear = (roman) => {
  switch (roman) {
    case "I":
      return 1;
    case "II":
      return 2;
    case "III":
      return 3;
    case "IV":
      return 4;
    default:
      return Number(roman);
  }
};

const getSemestersForYear = (yearRomanOrNumber) => {
  const yearNum = typeof yearRomanOrNumber === "string" && ["I", "II", "III", "IV"].includes(yearRomanOrNumber)
    ? romanToYear(yearRomanOrNumber)
    : Number(yearRomanOrNumber);

  switch (yearNum) {
    case 1:
      return [1, 2];
    case 2:
      return [3, 4];
    case 3:
      return [5, 6];
    case 4:
      return [7, 8];
    default:
      return [];
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return dateStr.split("T")[0];
};

function EditStudent() {
  const [studentList, setStudentList] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");

  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ================= FETCH STUDENTS =================
  const fetchStudents = async () => {
    setLoadingStudents(true);
    setError("");

    try {
      const response = await api.get("/manager/get-students");
      const data = Array.isArray(response.data) ? response.data : [];
      setStudentList(data);
    } catch (err) {
      console.error("Failed to load students:", err);
      setError(getErrorMessage(err, "Failed to load students."));
    } finally {
      setLoadingStudents(false);
    }
  };

  // ================= FETCH DEPARTMENTS =================
  const fetchDepartments = async () => {
    setLoadingDepartments(true);

    try {
      const response = await api.get("/manager/departments");
      const deptData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setDepartments(deptData);
    } catch (err) {
      console.error("Failed to load departments:", err);
      setError(getErrorMessage(err, "Failed to load departments."));
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchDepartments();
  }, []);

  // ================= FILTER =================
  const filteredStudents = studentList.filter((stu) => {
    const searchValue = search.trim().toLowerCase();

    const matchesSearch =
      (stu.name || "").toLowerCase().includes(searchValue) ||
      (stu.email || "").toLowerCase().includes(searchValue) ||
      (stu.mobileNo || "").toLowerCase().includes(searchValue);

    const matchesDepartment =
      filterDept === "" || stu.departmentName === filterDept;

    return matchesSearch && matchesDepartment;
  });

  // ================= PAGINATION =================
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const lastIndex = currentPage * itemsPerPage;
  const firstIndex = lastIndex - itemsPerPage;
  const paginatedStudents = filteredStudents.slice(firstIndex, lastIndex);

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
      const response = await api.get(`/manager/get-student/${id}`);
      const stu = response.data;

      setEditData({
        id: stu.id,
        name: stu.name || "",
        email: stu.email || "",
        dob: formatDate(stu.dob),
        gender: stu.gender || "",
        departmentName: stu.departmentName || "",
        year: yearToRoman(stu.year),
        semester: stu.semester || "",
        section: stu.section || "A",
        mobileNo: stu.mobileNo || "",
        relation: stu.relation || "",
        relationName: stu.relationName || "",
        relationMobile: stu.relationMobile || "",
        relationAddress: stu.relationAddress || "",
      });
    } catch (err) {
      console.error("Failed to fetch student details:", err);
      setError(getErrorMessage(err, "Failed to fetch student details."));
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleEditChange = (field, value) => {
    setEditData((previous) => {
      const updated = {
        ...previous,
        [field]: value,
      };

      if (field === "year") {
        const validSemesters = getSemestersForYear(value);
        if (!validSemesters.includes(Number(previous.semester))) {
          updated.semester = validSemesters.length > 0 ? validSemesters[0] : "";
        }
      }

      return updated;
    });
  };

  // ================= UPDATE STUDENT =================
  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editData) return;

    if (!editData.name.trim() || !editData.email.trim()) {
      setError("Student name and email are required.");
      return;
    }

    if (!editData.departmentName) {
      setError("Please select a department.");
      return;
    }

    if (!editData.dob) {
      setError("Date of birth is required.");
      return;
    }

    if (new Date(`${editData.dob}T00:00:00`) > new Date()) {
      setError("Date of birth cannot be in the future.");
      return;
    }

    const yearNumber = romanToYear(editData.year);
    if (![1, 2, 3, 4].includes(yearNumber)) {
      setError("Please select a valid academic year (I to IV).");
      return;
    }

    const semesterNumber = Number(editData.semester);
    const validSemesters = getSemestersForYear(yearNumber);
    if (!validSemesters.includes(semesterNumber)) {
      setError(`Year ${yearNumber} must have semester ${validSemesters.join(" or ")}.`);
      return;
    }

    if (!editData.section.trim()) {
      setError("Please select the student's section.");
      return;
    }

    if (
      editData.mobileNo &&
      !/^\+?[0-9]{7,15}$/.test(editData.mobileNo.trim())
    ) {
      setError("Please enter a valid student mobile number.");
      return;
    }

    if (
      editData.relationMobile &&
      !/^\+?[0-9]{7,15}$/.test(editData.relationMobile.trim())
    ) {
      setError("Please enter a valid relation mobile number.");
      return;
    }

    const payload = {
      name: editData.name.trim(),
      email: editData.email.trim(),
      gender: editData.gender.trim(),
      dob: editData.dob,
      year: yearNumber,
      semester: semesterNumber,
      section: editData.section.trim().toUpperCase(),
      mobileNo: editData.mobileNo.trim(),
      departmentName: editData.departmentName,
      relation: editData.relation ? editData.relation.trim() : null,
      relationName: editData.relationName ? editData.relationName.trim() : null,
      relationMobile: editData.relationMobile
        ? editData.relationMobile.trim()
        : null,
      relationAddress: editData.relationAddress
        ? editData.relationAddress.trim()
        : null,
    };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.put(`/manager/update-student/${editData.id}`, payload);
      setEditData(null);
      setSuccess("Student details updated successfully.");
      await fetchStudents();
    } catch (err) {
      console.error("Update failed:", err);
      setError(getErrorMessage(err, "Failed to update student details."));
    } finally {
      setSaving(false);
    }
  };

  // ================= DELETE STUDENT =================
  const confirmDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/manager/delete-student/${deleteId}`);
      setDeleteId(null);
      setSuccess("Student deleted successfully.");
      await fetchStudents();
    } catch (err) {
      console.error("Delete failed:", err);
      setError(getErrorMessage(err, "Failed to delete student."));
    } finally {
      setDeleting(false);
    }
  };

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

  const editAvailableSemesters = editData ? getSemestersForYear(editData.year) : [];

  return (
    <Layout>
      {/* ================= STYLES ================= */}
      <style>{`
        .edit-student-container {
          padding: 20px;
          width: 100%;
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

        .student-status {
          margin-bottom: 15px;
          padding: 10px 12px;
          border-radius: 5px;
        }

        .student-error {
          color: #842029;
          background: #f8d7da;
          border: 1px solid #f5c2c7;
        }

        .student-success {
          color: #0f5132;
          background: #d1e7dd;
          border: 1px solid #badbcc;
        }

        /* FIXED WIDTH TABLE AREA */
        .table-container {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
        }

        /* FORCE TABLE TO BE WIDER */
        .student-table {
          min-width: 2000px;
          width: 100%;
          border-collapse: collapse;
        }

        .student-table th,
        .student-table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
          white-space: nowrap;
          text-align: left;
        }

        .student-table th {
          background: #f4f4f4;
          position: sticky;
          top: 0;
          z-index: 1;
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

        /* MODAL STYLES */
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
          width: 550px;
          max-width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          padding: 24px;
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
          min-height: 70px;
          resize: vertical;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 15px;
        }

        .save-btn,
        .close-btn,
        .delete-confirm {
          color: white;
          padding: 10px 16px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
        }

        .save-btn {
          background: #28a745;
        }

        .close-btn {
          background: #6c757d;
        }

        .delete-confirm {
          background: #dc3545;
        }

        .save-btn:disabled,
        .delete-confirm:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      <div className="edit-student-container">
        <h2>Edit Student</h2>

        {error && (
          <div className="student-status student-error">{error}</div>
        )}

        {success && (
          <div className="student-status student-success">{success}</div>
        )}

        {/* SEARCH + FILTER */}
        <div className="top-bar">
          <input
            placeholder="Search Student..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />

          <select
            value={filterDept}
            onChange={(e) => handleDepartmentFilter(e.target.value)}
            disabled={loadingDepartments}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* TABLE WITH HORIZONTAL SCROLL */}
        <div className="table-container">
          <table className="student-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>DOB</th>
                <th>Gender</th>
                <th>Department</th>
                <th>Year</th>
                <th>Semester</th>
                <th>Section</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>Relation</th>
                <th>Relation Name</th>
                <th>Relation Mobile</th>
                <th>Relation Address</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loadingStudents ? (
                <tr>
                  <td colSpan="14" style={{ textAlign: "center", padding: "20px" }}>
                    Loading students...
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan="14" style={{ textAlign: "center", padding: "20px" }}>
                    No students found.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((stu) => (
                  <tr key={stu.id}>
                    <td>{stu.name}</td>
                    <td>{formatDate(stu.dob)}</td>
                    <td>{stu.gender}</td>
                    <td>{stu.departmentName}</td>
                    <td>{yearToRoman(stu.year)}</td>
                    <td>{stu.semester}</td>
                    <td>{stu.section}</td>
                    <td>{stu.mobileNo}</td>
                    <td>{stu.email}</td>
                    <td>{stu.relation || "-"}</td>
                    <td>{stu.relationName || "-"}</td>
                    <td>{stu.relationMobile || "-"}</td>
                    <td>{stu.relationAddress || "-"}</td>
                    <td>
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(stu.id)}
                        disabled={loadingEdit}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => setDeleteId(stu.id)}
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
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                className={currentPage === i + 1 ? "active" : ""}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* ================= EDIT MODAL ================= */}
        {editData && (
          <div className="modal" onClick={closeEditModal}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Edit Student</h3>

              <form onSubmit={handleUpdate}>
                <label>Name</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => handleEditChange("name", e.target.value)}
                  required
                />

                <label>Email</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => handleEditChange("email", e.target.value)}
                  required
                />

                <label>Date of Birth</label>
                <input
                  type="date"
                  value={editData.dob}
                  onChange={(e) => handleEditChange("dob", e.target.value)}
                  required
                />

                <label>Gender</label>
                <select
                  value={editData.gender}
                  onChange={(e) => handleEditChange("gender", e.target.value)}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>

                <label>Department</label>
                <select
                  value={editData.departmentName}
                  onChange={(e) =>
                    handleEditChange("departmentName", e.target.value)
                  }
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>

                <label>Year</label>
                <select
                  value={editData.year}
                  onChange={(e) => handleEditChange("year", e.target.value)}
                  required
                >
                  <option value="">Select Year</option>
                  <option value="I">I</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                </select>

                <label>Semester</label>
                <select
                  value={editData.semester}
                  onChange={(e) => handleEditChange("semester", e.target.value)}
                  required
                >
                  <option value="">Select Semester</option>
                  {editAvailableSemesters.map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>

                <label>Section</label>
                <select
                  value={editData.section}
                  onChange={(e) => handleEditChange("section", e.target.value)}
                  required
                >
                  <option value="">Select Section</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>

                <label>Mobile Number</label>
                <input
                  type="tel"
                  value={editData.mobileNo}
                  onChange={(e) =>
                    handleEditChange("mobileNo", e.target.value)
                  }
                  required
                />

                <label>Relation</label>
                <select
                  value={editData.relation || ""}
                  onChange={(e) =>
                    handleEditChange("relation", e.target.value)
                  }
                >
                  <option value="">-- Choose --</option>
                  <option value="parent">Parent</option>
                  <option value="guardian">Guardian</option>
                </select>

                <label>Relation Name</label>
                <input
                  type="text"
                  value={editData.relationName || ""}
                  onChange={(e) =>
                    handleEditChange("relationName", e.target.value)
                  }
                />

                <label>Relation Mobile Number</label>
                <input
                  type="tel"
                  value={editData.relationMobile || ""}
                  onChange={(e) =>
                    handleEditChange("relationMobile", e.target.value)
                  }
                />

                <label>Relation Address</label>
                <textarea
                  value={editData.relationAddress || ""}
                  onChange={(e) =>
                    handleEditChange("relationAddress", e.target.value)
                  }
                />

                <div className="modal-actions">
                  <button
                    type="submit"
                    className="save-btn"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
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

        {/* ================= DELETE CONFIRMATION MODAL ================= */}
        {deleteId && (
          <div className="modal" onClick={closeDeleteModal}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ width: "420px" }}
            >
              <h3>Confirm Deletion</h3>
              <p>
                Are you sure you want to delete this student? Both the student
                profile and login account will be permanently removed.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="delete-confirm"
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="button"
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

export default EditStudent;
