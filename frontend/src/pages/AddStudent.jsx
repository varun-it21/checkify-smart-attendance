import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/api";
import "../CSS/AddStudent.css";

const initialFormData = {
  name: "",
  email: "",
  initialPassword: "",
  dob: "",
  gender: "",
  year: "",
  semester: "",
  section: "",
  mobileNo: "",
  relation: "",
  relationName: "",
  relationMobile: "",
  relationAddress: "",
};

function getErrorMessage(error, fallback) {
  const data = error.response?.data;

  if (data?.message) return data.message;
  if (data?.errors) return Object.values(data.errors).flat().join(" ");
  if (data?.title) return data.title;

  // ASP.NET Core validation response
  if (data?.errors) {
    return Object.values(data.errors).flat().join(" ");
  }

  return fallback;
}

const getSemestersForYear = (yearRoman) => {
  switch (yearRoman) {
    case "I":
      return [1, 2];
    case "II":
      return [3, 4];
    case "III":
      return [5, 6];
    case "IV":
      return [7, 8];
    default:
      return [];
  }
};

function AddStudent() {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const [formData, setFormData] = useState(initialFormData);

  const [loading, setLoading] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ================= FETCH DEPARTMENTS =================

  useEffect(() => {
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
        setError(
          getErrorMessage(err, "Failed to load departments.")
        );
      } finally {
        setLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

  // ================= HANDLE INPUT CHANGE =================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => {
      const updated = {
        ...previous,
        [name]: value,
      };

      if (name === "year") {
        const validSemesters = getSemestersForYear(value);
        if (!validSemesters.includes(Number(previous.semester))) {
          updated.semester = "";
        }
      }

      return updated;
    });

    setError("");
    setSuccess("");
  };

  // ================= RESET FORM =================

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedDepartment("");
    setError("");
    setSuccess("");
  };

  // ================= SUBMIT STUDENT =================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedDepartment) {
      setError("Please select a department.");
      return;
    }

    if (!formData.name.trim() || !formData.email.trim()) {
      setError("Student name and email are required.");
      return;
    }

    if (formData.initialPassword.length < 12) {
      setError("Initial password must contain at least 12 characters.");
      return;
    }

    if (!formData.year) {
      setError("Please select the student's academic year.");
      return;
    }

    if (!formData.semester) {
      setError("Please select the student's semester.");
      return;
    }

    if (!formData.section) {
      setError("Please select the student's section.");
      return;
    }

    if (
      formData.mobileNo &&
      !/^\+?[0-9]{7,15}$/.test(formData.mobileNo.trim())
    ) {
      setError("Please enter a valid student mobile number.");
      return;
    }

    if (
      formData.relationMobile &&
      !/^\+?[0-9]{7,15}$/.test(formData.relationMobile.trim())
    ) {
      setError("Please enter a valid parent/guardian mobile number.");
      return;
    }

    if (
      formData.dob &&
      new Date(`${formData.dob}T00:00:00`) > new Date()
    ) {
      setError("Date of birth cannot be in the future.");
      return;
    }

    // Convert Roman numeral year into backend integer.
    const yearMapping = {
      I: 1,
      II: 2,
      III: 3,
      IV: 4,
    };

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      initialPassword: formData.initialPassword,
      dob: formData.dob,
      gender: formData.gender,
      year: yearMapping[formData.year],
      semester: Number(formData.semester),
      section: formData.section.trim().toUpperCase(),
      mobileNo: formData.mobileNo.trim(),
      departmentName: selectedDepartment,
      relation: formData.relation || null,
      relationName: formData.relationName ? formData.relationName.trim() : null,
      relationMobile: formData.relationMobile ? formData.relationMobile.trim() : null,
      relationAddress: formData.relationAddress ? formData.relationAddress.trim() : null,
    };

    setLoading(true);

    try {
      await api.post("/manager/add-student", payload);

      resetForm();
      setSuccess("Student added successfully.");
    } catch (err) {
      console.error("Student adding failed:", err);

      setError(
        getErrorMessage(
          err,
          "Student adding failed. Please check the entered details."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const availableSemesters = getSemestersForYear(formData.year);

  return (
    <Layout>
      <div className="addstudent-container">
        <h1 className="page-title">Add Student</h1>

        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="success-text" role="status">
            {success}
          </p>
        )}

        <form className="form-grid" onSubmit={handleSubmit}>
          <h2 className="section-title">Student Details</h2>

          <div className="form-group">
            <label>Student Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Arun Kumar"
              required
            />
          </div>

          <div className="form-group">
            <label>Email ID</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="student@checkify.edu"
              required
            />
          </div>

          <div className="form-group">
            <label>Initial Password</label>
            <input
              type="password"
              name="initialPassword"
              value={formData.initialPassword}
              onChange={handleChange}
              placeholder="Minimum 12 characters"
              minLength={12}
              required
            />
          </div>

          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="form-group">
            <label>Department</label>
            <select
              value={selectedDepartment}
              onChange={(event) =>
                setSelectedDepartment(event.target.value)
              }
              required
              disabled={loadingDepartments}
            >
              <option value="">
                {loadingDepartments
                  ? "Loading departments..."
                  : "Select Department"}
              </option>

              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Year</label>
            <select
              name="year"
              value={formData.year}
              onChange={handleChange}
              required
            >
              <option value="">Select Year</option>
              <option value="I">I</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
            </select>
          </div>

          <div className="form-group">
            <label>Semester</label>
            <select
              name="semester"
              value={formData.semester}
              onChange={handleChange}
              required
              disabled={!formData.year}
            >
              <option value="">
                {!formData.year
                  ? "Select Year first"
                  : "Select Semester"}
              </option>
              {availableSemesters.map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Section</label>
            <select
              name="section"
              value={formData.section}
              onChange={handleChange}
              required
            >
              <option value="">Select Section</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="mobileNo"
              value={formData.mobileNo}
              onChange={handleChange}
              pattern="^\+?[0-9]{7,15}$"
              title="Enter a valid phone number."
            />
          </div>

          {/* PARENT / GUARDIAN DETAILS */}

          <h2 className="section-title">Contact Relation</h2>

          <div className="form-group-full">
            <label>Select Relation</label>
            <select
              name="relation"
              value={formData.relation}
              onChange={handleChange}
            >
              <option value="">-- Choose --</option>
              <option value="parent">Parent</option>
              <option value="guardian">Guardian</option>
            </select>
          </div>

          {(formData.relation === "parent" ||
            formData.relation === "guardian") && (
            <>
              <h2 className="section-title">
                {formData.relation === "parent"
                  ? "Parent Details"
                  : "Guardian Details"}
              </h2>

              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="relationName"
                  value={formData.relationName}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Mobile Number</label>
                <input
                  type="tel"
                  name="relationMobile"
                  value={formData.relationMobile}
                  onChange={handleChange}
                  pattern="^\+?[0-9]{7,15}$"
                  title="Enter a valid phone number."
                />
              </div>

              <div className="form-group-full">
                <label>Address</label>
                <textarea
                  name="relationAddress"
                  value={formData.relationAddress}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          <div className="button-group">
            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Student"}
            </button>

            <button
              type="button"
              className="reset-btn"
              onClick={resetForm}
              disabled={loading}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export default AddStudent;
