import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../api/api";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode,
  KeyRound,
  Play,
  Square,
  RefreshCw,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar,
  BookOpen,
  Copy,
  Check,
  Sparkles,
  Search,
  Maximize2,
  Minimize2,
  Radio,
  GraduationCap
} from "lucide-react";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Helper to calculate the next/current calendar date that matches a day-of-week integer (1=Mon ... 6=Sat, 0=Sun)
function getMatchingDateForDayOfWeek(targetDayOfWeek) {
  const d = new Date();
  const currentDay = d.getDay();
  let diff = targetDayOfWeek - currentDay;
  if (diff < 0) diff += 7; // next occurrence if already past this week
  d.setDate(d.getDate() + diff);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayTime(timeStr) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const hour = parseInt(parts[0], 10);
  const minute = parts[1];
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
}

export default function GenerateOTP() {
  // Active session state
  const [activeSession, setActiveSession] = useState(null);
  const [loadingActive, setLoadingActive] = useState(true);

  // Timetable & opening session state
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [openingLoading, setOpeningLoading] = useState(false);
  const [openError, setOpenError] = useState("");

  // Attendance credentials mode: "OTP" or "QR"
  const [activeTab, setActiveTab] = useState("OTP");

  // OTP State
  const [otpCode, setOtpCode] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);

  // QR State
  const [qrToken, setQrToken] = useState("");
  const [qrExpiresAt, setQrExpiresAt] = useState(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(0);
  const [qrLoading, setQrLoading] = useState(false);
  const [autoRotateQr, setAutoRotateQr] = useState(true);
  const [fullScreenQr, setFullScreenQr] = useState(false);

  // Live Records
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Session Closing State
  const [closingLoading, setClosingLoading] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });


  // -------------------------------------------------------------
  // 1. Fetch active session for the authenticated staff
  // -------------------------------------------------------------
  const fetchActiveSession = useCallback(async () => {
    try {
      setLoadingActive(true);
      const res = await api.get("/api/staff/attendance/active");
      const sessions = res.data || [];
      if (sessions.length > 0) {
        setActiveSession(sessions[0]);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Failed to fetch active attendance session:", err);
    } finally {
      setLoadingActive(false);
    }
  }, []);

  // -------------------------------------------------------------
  // 2. Fetch staff timetable / assigned classes
  // -------------------------------------------------------------
  const fetchTimetable = useCallback(async () => {
    try {
      const res = await api.get("/staff/timetable");
      const list = res.data || [];
      setAssignedClasses(list);
      if (list.length > 0 && !selectedClassId) {
        setSelectedClassId(String(list[0].id));
        setSessionDate(getMatchingDateForDayOfWeek(list[0].dayOfWeek));
      }
    } catch (err) {
      console.error("Failed to fetch staff timetable:", err);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchActiveSession();
    fetchTimetable();
  }, [fetchActiveSession, fetchTimetable]);

  // When class selection changes in the dropdown, auto-update the date to a valid day
  const handleClassSelectionChange = (classId) => {
    setSelectedClassId(classId);
    const selected = assignedClasses.find((c) => String(c.id) === String(classId));
    if (selected) {
      setSessionDate(getMatchingDateForDayOfWeek(selected.dayOfWeek));
    }
  };

  // -------------------------------------------------------------
  // 3. Start a new attendance session
  // -------------------------------------------------------------
  const handleOpenSession = async (e) => {
    e.preventDefault();
    if (!selectedClassId) {
      setOpenError("Please select a scheduled class.");
      return;
    }

    setOpenError("");
    setOpeningLoading(true);
    setStatusMessage({ text: "", type: "" });

    try {
      const payload = {
        classSessionId: parseInt(selectedClassId, 10),
        sessionDate: sessionDate || undefined,
      };

      const res = await api.post("/api/staff/attendance/open", payload);
      setActiveSession(res.data);
      setStatusMessage({
        text: `Attendance session opened for ${res.data.subjectCode} - ${res.data.subjectName}!`,
        type: "success",
      });

      // Automatically generate initial OTP
      await handleGenerateOtp(res.data.id);
    } catch (err) {
      console.error("Failed to open attendance session:", err);
      const msg = err.response?.data?.message || "Failed to start attendance session.";
      setOpenError(msg);
    } finally {
      setOpeningLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 4. Generate / Rotate OTP
  // -------------------------------------------------------------
  const handleGenerateOtp = async (sessionIdParam) => {
    const id = sessionIdParam || activeSession?.id;
    if (!id) return;

    setOtpLoading(true);
    try {
      const res = await api.post(`/api/staff/attendance/${id}/otp`);
      setOtpCode(res.data.otpCode);
      setOtpExpiresAt(new Date(res.data.expiresAt));
      setOtpSecondsLeft(res.data.remainingSeconds || 300);
      setStatusMessage({
        text: "New 6-digit OTP generated successfully (valid for 5 minutes).",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to generate OTP:", err);
      setStatusMessage({
        text: err.response?.data?.message || "Failed to generate OTP.",
        type: "error",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 5. Generate / Rotate QR Code
  // -------------------------------------------------------------
  const handleGenerateQr = useCallback(async (sessionIdParam) => {
    const id = sessionIdParam || activeSession?.id;
    if (!id) return;

    setQrLoading(true);
    try {
      const res = await api.post(`/api/staff/attendance/${id}/qr`);
      setQrToken(res.data.qrToken);
      setQrExpiresAt(new Date(res.data.expiresAt));
      setQrSecondsLeft(res.data.remainingSeconds || 60);
    } catch (err) {
      console.error("Failed to generate QR token:", err);
      setStatusMessage({
        text: err.response?.data?.message || "Failed to generate QR token.",
        type: "error",
      });
    } finally {
      setQrLoading(false);
    }
  }, [activeSession?.id]);

  // When switching to QR mode for the first time, generate a QR if empty
  useEffect(() => {
    if (activeSession && activeTab === "QR" && !qrToken) {
      handleGenerateQr();
    }
  }, [activeSession, activeTab, qrToken, handleGenerateQr]);

  // -------------------------------------------------------------
  // 6. Countdown Timers
  // -------------------------------------------------------------
  // OTP Countdown (seconds left)
  useEffect(() => {
    if (!otpExpiresAt) return;
    const interval = setInterval(() => {
      const now = new Date();
      const diffSec = Math.max(0, Math.floor((otpExpiresAt.getTime() - now.getTime()) / 1000));
      setOtpSecondsLeft(diffSec);
    }, 1000);

    return () => clearInterval(interval);
  }, [otpExpiresAt]);

  // QR Countdown & Auto-rotate
  useEffect(() => {
    if (!qrExpiresAt || activeTab !== "QR") return;
    const interval = setInterval(() => {
      const now = new Date();
      const diffSec = Math.max(0, Math.floor((qrExpiresAt.getTime() - now.getTime()) / 1000));
      setQrSecondsLeft(diffSec);

      // Auto-rotate QR when expired if autoRotate is enabled
      if (diffSec <= 0 && autoRotateQr && activeSession) {
        handleGenerateQr();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrExpiresAt, activeTab, autoRotateQr, activeSession, handleGenerateQr]);

  // -------------------------------------------------------------
  // 7. Live Attendance Records Fetching & Auto-Polling
  // -------------------------------------------------------------
  const fetchRecords = useCallback(async () => {
    if (!activeSession?.id) return;
    try {
      const res = await api.get(`/api/staff/attendance/${activeSession.id}/records`);
      setRecords(res.data || []);
    } catch (err) {
      console.error("Failed to fetch session records:", err);
    }
  }, [activeSession?.id]);

  // Poll records every 4 seconds when session is active
  useEffect(() => {
    if (!activeSession?.id) return;
    fetchRecords();
    const interval = setInterval(fetchRecords, 4000);
    return () => clearInterval(interval);
  }, [activeSession?.id, fetchRecords]);

  // -------------------------------------------------------------
  // 8. Close Attendance Session
  // -------------------------------------------------------------
  const handleCloseSession = async () => {
    if (!activeSession?.id) return;
    setClosingLoading(true);
    setStatusMessage({ text: "", type: "" });

    try {
      await api.post(`/api/staff/attendance/${activeSession.id}/close`);
      setStatusMessage({
        text: `Attendance session closed. Total Present: ${records.length} students.`,
        type: "success",
      });
      setActiveSession(null);
      setOtpCode("");
      setQrToken("");
      setRecords([]);
      setShowCloseConfirm(false);
      fetchActiveSession();
    } catch (err) {
      console.error("Failed to close attendance session:", err);
      setStatusMessage({
        text: err.response?.data?.message || "Failed to close attendance session.",
        type: "error",
      });
    } finally {
      setClosingLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  // Filtered live records
  const filteredRecords = records.filter(
    (r) =>
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.studentId).includes(searchQuery) ||
      r.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const otpCount = records.filter((r) => r.method === "OTP").length;
  const qrCount = records.filter((r) => r.method === "QR").length;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Title & Status Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
                <Radio className="w-6 h-6 animate-pulse text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Attendance Session Manager</h1>
                <p className="text-sm text-gray-500">
                  Control live class attendance, broadcast secure OTPs, and display rotating QR codes
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeSession ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                SESSION LIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                NO ACTIVE SESSION
              </span>
            )}
            <button
              onClick={() => {
                fetchActiveSession();
                fetchTimetable();
                if (activeSession) fetchRecords();
              }}
              title="Refresh status"
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {statusMessage.text && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium ${
              statusMessage.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage({ text: "", type: "" })}
              className="text-gray-400 hover:text-gray-600"
            >
              &times;
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* CASE A: NO ACTIVE SESSION -> CLASS SELECTION & START SESSION   */}
        {/* ============================================================== */}
        {!loadingActive && !activeSession && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="max-w-2xl mx-auto text-center space-y-4 mb-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Start an Attendance Session</h2>
              <p className="text-gray-600 text-sm">
                Select your assigned class from the schedule to open attendance for students. Once opened, you can broadcast an OTP or display a dynamic QR code.
              </p>
            </div>

            {openError && (
              <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{openError}</span>
              </div>
            )}

            <form onSubmit={handleOpenSession} className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Assigned Class
                </label>
                {assignedClasses.length === 0 ? (
                  <p className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg">
                    No classes currently assigned to your profile. Please check with your HOD.
                  </p>
                ) : (
                  <select
                    value={selectedClassId}
                    onChange={(e) => handleClassSelectionChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    {assignedClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.subjectCode} - {cls.subjectName} | Year {cls.year} Sem {cls.semester} Sec {cls.section} ({DAY_NAMES[cls.dayOfWeek]} {formatDisplayTime(cls.startTime)}-{formatDisplayTime(cls.endTime)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Session Date (Must match class day)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    required
                  />
                  <Calendar className="w-5 h-5 text-gray-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Preset to the scheduled class day. Ensure the date matches your class timetable day.
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={openingLoading || assignedClasses.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg shadow-md transition duration-200"
                >
                  {openingLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Opening Session...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      <span>Open Attendance Session</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* CASE B: ACTIVE SESSION RUNNING                                 */}
        {/* ============================================================== */}
        {activeSession && (
          <div className="space-y-6">
            {/* Session Info Ribbon */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl text-white p-6 shadow-md">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-md text-xs font-semibold tracking-wider uppercase">
                      {activeSession.subjectCode}
                    </span>
                    <span className="text-xs bg-emerald-500/80 text-white px-2 py-0.5 rounded-full font-medium">
                      Active
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold">{activeSession.subjectName}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-blue-100 mt-2">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" />
                      Year {activeSession.year}, Semester {activeSession.semester}, Section {activeSession.section}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {activeSession.sessionDate}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      Started {new Date(activeSession.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {/* Session Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowCloseConfirm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow transition"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    Close Session
                  </button>
                </div>
              </div>
            </div>

            {/* Grid Layout: Credential Broadcaster (Left) + Live Records Table (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: Mode Switcher & Code/QR Display (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Mode Selector Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 flex gap-2">
                  <button
                    onClick={() => setActiveTab("OTP")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition ${
                      activeTab === "OTP"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>6-Digit OTP</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("QR")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition ${
                      activeTab === "QR"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Rotating QR</span>
                  </button>
                </div>

                {/* TAB 1: OTP BROADCAST CARD */}
                {activeTab === "OTP" && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Live Attendance OTP</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Announce or project this code to students in the classroom
                      </p>
                    </div>

                    {otpCode ? (
                      <div className="space-y-4">
                        {/* Huge 6-Digit OTP Display */}
                        <div className="flex justify-center gap-2 sm:gap-3">
                          {otpCode.split("").map((digit, idx) => (
                            <div
                              key={idx}
                              className="w-12 h-16 sm:w-14 sm:h-20 bg-blue-50 border-2 border-blue-500 rounded-xl flex items-center justify-center text-3xl sm:text-4xl font-extrabold text-blue-800 shadow-inner tracking-widest font-mono"
                            >
                              {digit}
                            </div>
                          ))}
                        </div>

                        {/* Copy Button & Expiry Timer */}
                        <div className="flex items-center justify-center gap-4 text-sm">
                          <button
                            onClick={() => copyToClipboard(otpCode)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                          >
                            {copiedOtp ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-green-600">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>

                          <div
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                              otpSecondsLeft > 60
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200 animate-pulse"
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              Expires in {Math.floor(otpSecondsLeft / 60)}:
                              {String(otpSecondsLeft % 60).padStart(2, "0")}
                            </span>
                          </div>
                        </div>

                        {/* Timer Progress Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${
                              otpSecondsLeft > 60 ? "bg-blue-600" : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(100, (otpSecondsLeft / 300) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-gray-400">
                        <KeyRound className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No OTP generated yet.</p>
                      </div>
                    )}

                    {/* Action Button: Rotate OTP */}
                    <div className="pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleGenerateOtp()}
                        disabled={otpLoading}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg border border-blue-200 transition"
                      >
                        <RefreshCw className={`w-4 h-4 ${otpLoading ? "animate-spin" : ""}`} />
                        <span>{otpCode ? "Rotate OTP (New 5-Min Code)" : "Generate OTP"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: ROTATING QR BROADCAST CARD */}
                {activeTab === "QR" && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-gray-900">Dynamic QR Code</h3>
                        <p className="text-xs text-gray-500">Auto-rotates every 60 seconds</p>
                      </div>
                      <button
                        onClick={() => setFullScreenQr(!fullScreenQr)}
                        title="Toggle full screen for projector"
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>

                    {qrToken ? (
                      <div className="space-y-4">
                        {/* High-Contrast QR Code Display */}
                        <div className="flex justify-center p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm inline-block mx-auto">
                          <QRCodeSVG
                            value={qrToken}
                            size={220}
                            level="M"
                            includeMargin={true}
                          />
                        </div>

                        {/* Fallback for students without a camera: copy the token text */}
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(qrToken)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedOtp ? "Copied!" : "Copy QR token"}</span>
                          </button>
                        </div>

                        {/* 60s Countdown Bar & Indicator */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-gray-500">Validity Window</span>
                            <span
                              className={`flex items-center gap-1 ${
                                qrSecondsLeft <= 10 ? "text-red-600 animate-pulse" : "text-blue-600"
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              {qrSecondsLeft}s remaining
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 ${
                                qrSecondsLeft <= 10 ? "bg-red-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, (qrSecondsLeft / 60) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Auto Rotate Control */}
                        <div className="flex items-center justify-between text-xs p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-gray-700 font-medium">Auto-rotate on expiry</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={autoRotateQr}
                              onChange={(e) => setAutoRotateQr(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-gray-400">
                        <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Click below to generate initial QR.</p>
                      </div>
                    )}

                    {/* Manual Rotate Button */}
                    <div className="pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleGenerateQr()}
                        disabled={qrLoading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg border border-emerald-200 transition"
                      >
                        <RefreshCw className={`w-4 h-4 ${qrLoading ? "animate-spin" : ""}`} />
                        <span>Rotate QR Code Now</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Live Attendance Present Feed (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                <div>
                  {/* Top Stats Ribbon */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-bold text-gray-900">Live Attendance List</h3>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Real-time feed of students who verified attendance
                      </p>
                    </div>

                    {/* Counters */}
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-center">
                        <div className="text-xs text-blue-600 font-medium">Present</div>
                        <div className="text-lg font-bold text-blue-900">{records.length}</div>
                      </div>
                      <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-center text-xs">
                        <span className="text-gray-500">OTP: </span>
                        <span className="font-bold text-gray-800">{otpCount}</span>
                        <span className="mx-1 text-gray-300">|</span>
                        <span className="text-gray-500">QR: </span>
                        <span className="font-bold text-gray-800">{qrCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="my-4 relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search student name or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Table of Records */}
                  <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                    {filteredRecords.length === 0 ? (
                      <div className="text-center py-16 text-gray-400">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">
                          {records.length === 0
                            ? "Waiting for students to submit attendance..."
                            : "No students matching your search."}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Entries will update automatically as students submit.
                        </p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-xs font-semibold sticky top-0 uppercase">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Student Name</th>
                            <th className="py-2.5 px-3">Method</th>
                            <th className="py-2.5 px-3">Marked Time</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredRecords.map((rec, index) => (
                            <tr key={rec.id} className="hover:bg-blue-50/50 transition">
                              <td className="py-3 px-3 text-xs text-gray-400">{index + 1}</td>
                              <td className="py-3 px-3 font-medium text-gray-900">
                                {rec.studentName}
                                <span className="block text-xs text-gray-400">ID #{rec.studentId}</span>
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                    rec.method === "QR"
                                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                                      : "bg-blue-100 text-blue-800 border border-blue-200"
                                  }`}
                                >
                                  {rec.method}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-xs text-gray-500 font-mono">
                                {new Date(rec.markedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Check className="w-3 h-3" />
                                  PRESENT
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Footer status text */}
                <div className="pt-3 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
                  <span>Auto-syncing every 4s</span>
                  <span>Total {records.length} marked</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* FULLSCREEN QR PROJECTOR MODAL                                 */}
        {/* ============================================================== */}
        {fullScreenQr && qrToken && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 text-white">
            <button
              onClick={() => setFullScreenQr(false)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
              title="Close projector view"
            >
              <Minimize2 className="w-6 h-6 text-white" />
            </button>

            <div className="text-center space-y-4 max-w-xl">
              <span className="px-3 py-1 bg-blue-600 rounded-full text-xs font-semibold uppercase tracking-wider">
                {activeSession?.subjectCode} • {activeSession?.subjectName}
              </span>
              <h2 className="text-3xl font-bold">Scan QR for Attendance</h2>
              <p className="text-sm text-gray-300">
                Scan using your student camera / attendance app. Token automatically refreshes.
              </p>

              <div className="p-6 bg-white rounded-3xl inline-block shadow-2xl my-4">
                <QRCodeSVG value={qrToken} size={320} level="M" includeMargin={true} />
              </div>

              <div className="flex items-center justify-center gap-2 text-lg font-mono">
                <Clock className="w-5 h-5 text-amber-400" />
                <span>Expires in {qrSecondsLeft}s</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CONFIRM CLOSE SESSION MODAL                                    */}
        {/* ============================================================== */}
        {showCloseConfirm && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900">Close Attendance Session?</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Closing will finalize attendance records ({records.length} students marked PRESENT) and permanently invalidate the current OTP and QR credentials.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCloseConfirm(false)}
                  disabled={closingLoading}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCloseSession}
                  disabled={closingLoading}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow transition flex items-center justify-center gap-2"
                >
                  {closingLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Closing...</span>
                    </>
                  ) : (
                    <span>Confirm Close</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
