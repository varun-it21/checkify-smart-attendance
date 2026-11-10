import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import api from "../api/api";
import "../CSS/AddStudent.css";

const initialFormData = {
  staffName: "",
  email: "",
  mobileNumber: "",
  experience: "",
  specialization: "",
  position: "",
  gender: "",
  address: "",
  department: "",
  initialPassword: "",
};

function AddStaff() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState(initialFormData);

  // Fetch departments from Checkify API
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/manager/departments");
        setDepartments(res.data || []);
      } catch (err) {
        setError(
          err.response?.data?.message ||
          "Failed to load departments."
        );
      } finally {
        setDepartmentsLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // Submit staff details
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.staffName.trim()) {
      setError("Staff name is required.");
      return;
    }

    if (!formData.department) {
      setError("Please select a department.");
      return;
    }

    if (!formData.position) {
      setError("Please select a position.");
      return;
    }

    if (!formData.gender) {
      setError("Please select gender.");
      return;
    }

    if (formData.initialPassword.length < 12) {
      setError("Initial password must contain at least 12 characters.");
      return;
    }

    const experience = Number(formData.experience || 0);

    if (
      !Number.isFinite(experience) ||
      experience < 0 ||
      experience > 999.9 ||
      Math.round(experience * 10) !== experience * 10
    ) {
      setError("Experience must be between 0 and 999.9, with at most one decimal place.");
      return;
    }

    const payload = {
      staffName: formData.staffName.trim(),
      email: formData.email.trim(),
      mobileNumber: formData.mobileNumber.trim(),
      experience,
      specialization: formData.specialization.trim(),
      position: formData.position,
      gender: formData.gender,
      address: formData.address.trim(),
      department: formData.department,
      initialPassword: formData.initialPassword,
    };

    try {
      setLoading(true);

      await api.post("/manager/add-staff", payload);

      setSuccess("Staff member added successfully.");
      setFormData(initialFormData);
    } catch (err) {
      const responseData = err.response?.data;

      let message =
        responseData?.message ||
        responseData?.title ||
        "Staff creation failed. Please try again.";

      // Handle ASP.NET Core validation error responses
      if (responseData?.errors) {
        message = Object.values(responseData.errors)
          .flat()
          .join(" ");
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="addstudent-container">
        <h1 className="page-title">Add Staff</h1>

        {error && <p className="error-text">{error}</p>}

        {success && (
          <p className="success-text">{success}</p>
        )}

        <form className="form-grid" onSubmit={handleSubmit}>
          <h2 className="section-title">Staff Details</h2>

          <div className="form-group">
            <label>Staff Name</label>
            <input
              type="text"
              name="staffName"
              value={formData.staffName}
              onChange={handleChange}
              maxLength={150}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              maxLength={255}
              required
            />
          </div>

          <div className="form-group">
            <label>Mobile Number</label>
            <input
              type="tel"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              pattern="^\+?[0-9]{7,15}$"
              title="Enter 7 to 15 digits, optionally starting with +"
              required
            />
          </div>

          <div className="form-group">
            <label>Department</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
              disabled={departmentsLoading}
            >
              <option value="">
                {departmentsLoading
                  ? "Loading departments..."
                  : "Select Department"}
              </option>

              {departments.map((department) => (
                <option
                  key={department.id}
                  value={department.name}
                >
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Experience (Years)</label>
            <input
              type="number"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              min="0"
              max="999.9"
              step="0.1"
            />
          </div>

          <div className="form-group">
            <label>Specialization</label>
            <input
              type="text"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              maxLength={150}
            />
          </div>

          <div className="form-group">
            <label>Position</label>
            <select
              name="position"
              value={formData.position}
              onChange={handleChange}
              required
            >
              <option value="">Select Position</option>
              <option value="HOD">HOD</option>
              <option value="STAFF">Staff</option>
            </select>
          </div>

          <div className="form-group">
            <label>Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Initial Password</label>
            <input
              type="password"
              name="initialPassword"
              value={formData.initialPassword}
              onChange={handleChange}
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              placeholder="Minimum 12 characters"
              required
            />
          </div>

          <h2 className="section-title">Address</h2>

          <div className="form-group-full">
            <label>Residential Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              maxLength={500}
            />
          </div>

          <div className="button-row">
            <button
              type="submit"
              className="btn submit"
              disabled={loading || departmentsLoading}
            >
              {loading ? "Saving..." : "Add Staff"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export default AddStaff;
