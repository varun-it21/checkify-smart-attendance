import React, { useState, useEffect } from "react";
import Layout from "./Layout";
import api from "../api/api";

const Leave = ({ role }) => {
  const [user, setUser] = useState({ name: "", department: "" });
  const [form, setForm] = useState({
    leaveType: "CASUAL",
    reason: "",
    from: "",
    to: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
    } else {
      const storedRole = localStorage.getItem("role");
      const roleData = JSON.parse(localStorage.getItem(storedRole || ""));
      if (roleData) {
        setUser({
          name: roleData.name || roleData.staffName || "",
          department: roleData.departmentName || roleData.department || "",
        });
      }
    }
  }, [role]);

  const today = new Date().toISOString().slice(0, 10);
  const minDate = form.leaveType === "MEDICAL" ? undefined : today;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (form.from > form.to) {
      setStatusMessage({
        type: "error",
        text: "Start date cannot be after end date.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        leaveType: form.leaveType,
        startDate: form.from,
        endDate: form.to,
        reason: form.reason,
      };

      await api.post("/api/leaves/apply", payload);

      setStatusMessage({
        type: "success",
        text: "Leave application submitted successfully! Your reviewer has been notified.",
      });
      setForm({
        leaveType: "CASUAL",
        reason: "",
        from: "",
        to: "",
      });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors && Object.values(err.response.data.errors).flat().join(" ")) ||
        err.response?.data?.title ||
        "Failed to submit leave request. Please check your dates and try again.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        .leave-container {
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 24px 12px;
        }

        .leave-card {
          margin-top: 30px;
          width: 100%;
          max-width: 540px;
          background: white;
          padding: 28px;
          border-radius: 14px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }

        .leave-title {
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 18px;
          text-align: center;
          color: #1f2937;
        }

        .leave-alert {
          padding: 12px 14px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 500;
        }

        .leave-alert.success {
          background-color: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .leave-alert.error {
          background-color: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .leave-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 6px;
          color: #374151;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 14px;
        }

        .form-group textarea {
          resize: vertical;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .submit-wrapper {
          display: flex;
          justify-content: center;
          margin-top: 8px;
        }

        .submit-btn {
          background: #2563eb;
          color: white;
          padding: 11px 32px;
          font-size: 15px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
      `}</style>

      <Layout>
        <div className="leave-container">
          <div className="leave-card">
            <h2 className="leave-title">Apply For Leave</h2>

            {statusMessage && (
              <div className={`leave-alert ${statusMessage.type}`}>
                {statusMessage.text}
              </div>
            )}

            <form className="leave-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Applicant Role</label>
                <input value={role ? role.toUpperCase() : "APPLICANT"} disabled />
              </div>

              {user.name && (
                <div className="form-group">
                  <label>Applicant Name</label>
                  <input value={user.name} disabled />
                </div>
              )}

              <div className="form-group">
                <label>Leave Type</label>
                <select
                  name="leaveType"
                  value={form.leaveType}
                  onChange={handleChange}
                  required
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="MEDICAL">Medical Leave</option>
                  <option value="ON_DUTY">On Duty (OD)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>From Date</label>
                  <input
                    type="date"
                    name="from"
                    min={minDate}
                    value={form.from}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>To Date</label>
                  <input
                    type="date"
                    name="to"
                    min={form.from || minDate}
                    value={form.to}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Reason for Leave</label>
                <textarea
                  name="reason"
                  rows="3"
                  value={form.reason}
                  onChange={handleChange}
                  placeholder="Specify clear reason for leave..."
                  required
                />
              </div>

              <div className="submit-wrapper">
                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Leave Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Leave;
