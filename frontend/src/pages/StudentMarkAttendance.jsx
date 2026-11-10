import React, { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../api/api";
import {
  KeyRound,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  User,
  GraduationCap,
  RefreshCw,
  Send,
  Lock,
  Sparkles,
  ShieldCheck,
  Calendar
} from "lucide-react";

export default function StudentMarkAttendance() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [loadingActive, setLoadingActive] = useState(true);

  // Verification mode: "OTP" or "QR"
  const [activeMode, setActiveMode] = useState("OTP");

  // OTP State: 6 digits
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);

  // QR State
  const [qrToken, setQrToken] = useState("");

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // -------------------------------------------------------------
  // 1. Fetch active session(s) for the student's cohort
  // -------------------------------------------------------------
  const fetchActiveSessions = useCallback(async () => {
    setLoadingActive(true);
    setErrorMessage("");
    try {
      const res = await api.get("/api/student/attendance/active");
      const sessions = res.data || [];
      setActiveSessions(sessions);
      if (sessions.length > 0) {
        setSelectedSessionId((prev) => (prev ? prev : sessions[0].id));
      } else {
        setSelectedSessionId(null);
      }
    } catch (err) {
      console.error("Failed to load active attendance sessions:", err);
      setErrorMessage(
        err.response?.data?.message || "Failed to query active sessions."
      );
    } finally {
      setLoadingActive(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchActiveSessions]);

  // Focus first OTP input on mount or when mode switches to OTP
  useEffect(() => {
    if (activeMode === "OTP" && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [activeMode, selectedSessionId]);

  // -------------------------------------------------------------
  // OTP input handlers: auto-advance, backspace, paste
  // -------------------------------------------------------------
  const handleOtpChange = (value, index) => {
    // Only accept numeric digit
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value ? value.slice(-1) : "";
    setOtp(newOtp);

    // Auto-advance to next input if digit entered
    if (value && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split("");
      setOtp(digits);
      inputRefs.current[5]?.focus();
    }
  };

  // -------------------------------------------------------------
  // 2. Submit OTP Attendance
  // -------------------------------------------------------------
  const handleSubmitOtp = async (e) => {
    e.preventDefault();
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the OTP.");
      return;
    }
    if (!selectedSessionId) {
      setErrorMessage("Please select an active attendance session.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessResult(null);

    try {
      const payload = {
        attendanceSessionId: selectedSessionId,
        otpCode: enteredOtp,
      };

      const res = await api.post("/api/student/attendance/submit-otp", payload);
      setSuccessResult(res.data);
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      console.error("Failed to submit OTP attendance:", err);
      const msg = err.response?.data?.message || "Attendance submission failed.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // 3. Submit QR Attendance
  // -------------------------------------------------------------
  const handleSubmitQr = async (e) => {
    e.preventDefault();
    const trimmed = qrToken.trim();
    if (!trimmed) {
      setErrorMessage("Please enter or scan a valid QR code token.");
      return;
    }
    if (!selectedSessionId) {
      setErrorMessage("Please select an active attendance session.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessResult(null);

    try {
      const payload = {
        attendanceSessionId: selectedSessionId,
        qrToken: trimmed,
      };

      const res = await api.post("/api/student/attendance/submit-qr", payload);
      setSuccessResult(res.data);
      setQrToken("");
    } catch (err) {
      console.error("Failed to submit QR attendance:", err);
      const msg = err.response?.data?.message || "QR attendance verification failed.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSession = activeSessions.find((s) => s.id === selectedSessionId);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Ribbon */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
              <p className="text-sm text-gray-500">
                Verify your class attendance with the 6-digit OTP or rotating QR code
              </p>
            </div>
          </div>

          <button
            onClick={fetchActiveSessions}
            title="Check for active sessions"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 ${loadingActive ? "animate-spin" : ""}`} />
            <span>Check for Active Classes</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* CASE 1: SUCCESS CONFIRMATION BANNER                            */}
        {/* ============================================================== */}
        {successResult && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <span className="text-xs font-semibold bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Verified • Method: {successResult.method}
                </span>
                <h2 className="text-xl font-bold mt-1">Attendance Marked Successfully!</h2>
                <p className="text-sm text-emerald-100">
                  Your status is recorded as <strong>{successResult.status}</strong> on{" "}
                  {new Date(successResult.markedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSuccessResult(null)}
              className="px-4 py-2 bg-white text-emerald-800 text-xs font-bold rounded-lg shadow hover:bg-emerald-50 transition"
            >
              Done
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-sm text-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-semibold block">Submission Error</strong>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage("")}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              &times;
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* CASE 2: NO ACTIVE SESSION AVAILABLE                            */}
        {/* ============================================================== */}
        {!loadingActive && activeSessions.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 opacity-75" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">No Active Sessions for Your Cohort</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              There are currently no attendance sessions open for your department, year, semester, and section. When your faculty starts attendance, it will automatically appear here.
            </p>
            <div className="pt-2">
              <button
                onClick={fetchActiveSessions}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Now</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CASE 3: ACTIVE ATTENDANCE SESSION PRESENT                      */}
        {/* ============================================================== */}
        {activeSessions.length > 0 && selectedSession && (
          <div className="space-y-6">
            {/* Active Class Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Session In Progress
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  Started at {new Date(selectedSession.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              {/* Class Selector if multiple active */}
              {activeSessions.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">
                    Select Class Session
                  </label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-800 focus:ring-2 focus:ring-blue-500"
                  >
                    {activeSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subjectCode} - {s.subjectName} ({s.staffName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-mono font-bold">
                      {selectedSession.subjectCode}
                    </span>
                    <span className="text-xs text-gray-500">
                      {selectedSession.sessionDate}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedSession.subjectName}</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      Faculty: <strong>{selectedSession.staffName}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                      Year {selectedSession.year}, Sem {selectedSession.semester}, Sec {selectedSession.section}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-gray-400 block">Class Attendance</span>
                  <span className="text-lg font-bold text-blue-600">
                    {selectedSession.presentCount} Students Present
                  </span>
                </div>
              </div>
            </div>

            {/* Verification Method Box */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Mode Toggle Tabs */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode("OTP");
                    setErrorMessage("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-semibold transition border-b-2 ${
                    activeMode === "OTP"
                      ? "border-blue-600 text-blue-600 bg-white"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Enter 6-Digit OTP</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode("QR");
                    setErrorMessage("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-semibold transition border-b-2 ${
                    activeMode === "QR"
                      ? "border-blue-600 text-blue-600 bg-white"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Submit QR Token</span>
                </button>
              </div>

              {/* TAB 1: OTP SUBMISSION FORM */}
              {activeMode === "OTP" && (
                <form onSubmit={handleSubmitOtp} className="p-8 text-center space-y-6">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">Enter Class Attendance Code</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Type the 6-digit code shown on your faculty's screen or whiteboard
                    </p>
                  </div>

                  {/* 6 Digit Input Boxes */}
                  <div className="flex justify-center gap-2 sm:gap-4 my-6" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOtpChange(e.target.value, index)}
                        onKeyDown={(e) => handleOtpKeyDown(e, index)}
                        className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold font-mono border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition shadow-sm"
                        autoComplete="off"
                      />
                    ))}
                  </div>

                  <div className="max-w-xs mx-auto">
                    <button
                      type="submit"
                      disabled={submitting || otp.join("").length !== 6}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-xl shadow-md transition duration-200"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Attendance</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-gray-400">
                    Max 5 incorrect attempts before temporary lockout.
                  </p>
                </form>
              )}

              {/* TAB 2: QR CODE TOKEN SUBMISSION FORM */}
              {activeMode === "QR" && (
                <form onSubmit={handleSubmitQr} className="p-8 text-center space-y-6">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">Submit QR Token</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Paste or enter the token scanned from the faculty projector QR code
                    </p>
                  </div>

                  <div className="max-w-md mx-auto">
                    <input
                      type="text"
                      placeholder="Paste QR Code Token..."
                      value={qrToken}
                      onChange={(e) => setQrToken(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                      autoFocus
                    />
                  </div>

                  <div className="max-w-xs mx-auto">
                    <button
                      type="submit"
                      disabled={submitting || !qrToken.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-semibold rounded-xl shadow-md transition duration-200"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Verifying QR...</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4" />
                          <span>Submit QR Attendance</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-gray-400">
                    Tokens expire every 60 seconds. Ensure you submit before rotation.
                  </p>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
