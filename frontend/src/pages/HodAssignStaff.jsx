import React, { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import api from "../api/api";
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  BookOpen,
  MapPin,
  UserCheck,
  Building,
  GraduationCap,
  AlertCircle,
  CheckCircle,
  X,
  Users
} from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const SEMESTERS_BY_YEAR = {
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
};

const INITIAL_FORM = {
  departmentId: "",
  subjectCode: "",
  subjectName: "",
  year: 1,
  semester: 1,
  section: "A",
  staffId: "",
  dayOfWeek: 1,
  startTime: "09:00",
  endTime: "10:00",
  roomLocation: "",
};

function getErrorMessage(error, fallback) {
  const data = error.response?.data;
  if (data?.message) return data.message;
  if (data?.errors) return Object.values(data.errors).flat().join(" ");
  if (data?.title) return data.title;
  if (data?.errors) {
    return Object.values(data.errors).flat().join(" ");
  }
  return fallback;
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

function formatTimeForApi(timeStr) {
  if (!timeStr) return "";
  return timeStr.length === 5 ? `${timeStr}:00` : timeStr;
}

function formatTimeForInput(timeStr) {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
}

function HodAssignStaff() {

  // Data states
  const [sessions, setSessions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [deletingSession, setDeletingSession] = useState(null);
  const [modalError, setModalError] = useState("");

  // Form states
  const [formData, setFormData] = useState(INITIAL_FORM);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterYear, setFilterYear] = useState("");

  // Fetch all initial data
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [sessionsRes, deptsRes, staffRes] = await Promise.all([
        api.get("/hod/assigned-classes"),
        api.get("/manager/departments").catch(() => ({ data: [] })),
        api.get("/manager/get-staffs").catch(() => ({ data: [] })),
      ]);

      setSessions(sessionsRes.data || []);
      setDepartments(deptsRes.data || []);
      setStaffList(staffRes.data || []);
    } catch (err) {
      console.error("Failed to load class sessions:", err);
      setError(getErrorMessage(err, "Failed to load class sessions and reference data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // The staff API returns departmentName (not departmentId), so match by id when present, else by name.
  const staffInDepartment = (staff, deptId) => {
    if (staff.departmentId != null) return staff.departmentId === deptId;
    const dept = departments.find((d) => d.id === deptId);
    return !!dept && staff.departmentName === dept.name;
  };

  // Filter staff by selected department
  const availableStaff = useMemo(() => {
    if (!formData.departmentId) return staffList;
    const deptId = Number(formData.departmentId);
    return staffList.filter((s) => staffInDepartment(s, deptId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.departmentId, staffList, departments]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalError("");
    const defaultDept = departments.length === 1 ? departments[0].id : departments[0]?.id || "";
    setFormData({
      ...INITIAL_FORM,
      departmentId: defaultDept,
    });
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (session) => {
    setModalError("");
    setEditingSession(session);
    setFormData({
      departmentId: session.departmentId,
      subjectCode: session.subjectCode,
      subjectName: session.subjectName,
      year: session.year,
      semester: session.semester,
      section: session.section,
      staffId: session.staffId,
      dayOfWeek: session.dayOfWeek,
      startTime: formatTimeForInput(session.startTime),
      endTime: formatTimeForInput(session.endTime),
      roomLocation: session.roomLocation || "",
    });
  };

  // Form field change handler
  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // When academic year changes, auto-align semester
      if (name === "year") {
        const yearNum = Number(value);
        const validSems = SEMESTERS_BY_YEAR[yearNum] || [1];
        if (!validSems.includes(Number(prev.semester))) {
          updated.semester = validSems[0];
        }
      }

      // If department changed, reset staff selection if staff doesn't belong to new dept
      if (name === "departmentId") {
        const deptId = Number(value);
        const staffStillValid = staffList.some(
          (s) => s.id === Number(prev.staffId) && staffInDepartment(s, deptId)
        );
        if (!staffStillValid) {
          updated.staffId = "";
        }
      }

      return updated;
    });

    setModalError("");
  };

  // Submit Create Assignment
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError("");

    try {
      const payload = {
        departmentId: Number(formData.departmentId),
        subjectCode: formData.subjectCode.trim(),
        subjectName: formData.subjectName.trim(),
        year: Number(formData.year),
        semester: Number(formData.semester),
        section: formData.section.trim().toUpperCase(),
        staffId: Number(formData.staffId),
        dayOfWeek: Number(formData.dayOfWeek),
        startTime: formatTimeForApi(formData.startTime),
        endTime: formatTimeForApi(formData.endTime),
        roomLocation: formData.roomLocation.trim() || null,
      };

      await api.post("/hod/assign-staff", payload);
      setSuccess("Class assignment created successfully!");
      setIsCreateOpen(false);
      await loadData();
    } catch (err) {
      console.error("Create assignment error:", err);
      setModalError(getErrorMessage(err, "Failed to create class assignment."));
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Update Assignment
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingSession) return;
    setSubmitting(true);
    setModalError("");

    try {
      const payload = {
        departmentId: Number(formData.departmentId),
        subjectCode: formData.subjectCode.trim(),
        subjectName: formData.subjectName.trim(),
        year: Number(formData.year),
        semester: Number(formData.semester),
        section: formData.section.trim().toUpperCase(),
        staffId: Number(formData.staffId),
        dayOfWeek: Number(formData.dayOfWeek),
        startTime: formatTimeForApi(formData.startTime),
        endTime: formatTimeForApi(formData.endTime),
        roomLocation: formData.roomLocation.trim() || null,
      };

      await api.put(`/hod/update-assignment/${editingSession.id}`, payload);
      setSuccess("Class assignment updated successfully!");
      setEditingSession(null);
      await loadData();
    } catch (err) {
      console.error("Update assignment error:", err);
      setModalError(getErrorMessage(err, "Failed to update class assignment."));
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Delete Assignment
  const handleDeleteSubmit = async () => {
    if (!deletingSession) return;
    setSubmitting(true);
    try {
      await api.delete(`/hod/delete-assignment/${deletingSession.id}`);
      setSuccess("Class assignment removed successfully.");
      setDeletingSession(null);
      await loadData();
    } catch (err) {
      console.error("Delete assignment error:", err);
      setError(getErrorMessage(err, "Failed to delete class assignment."));
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered session list
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        s.subjectCode.toLowerCase().includes(query) ||
        s.subjectName.toLowerCase().includes(query) ||
        s.staffName.toLowerCase().includes(query) ||
        (s.roomLocation && s.roomLocation.toLowerCase().includes(query));

      const matchesDept =
        !filterDepartment || s.departmentId === Number(filterDepartment);

      const matchesDay = !filterDay || s.dayOfWeek === Number(filterDay);

      const matchesYear = !filterYear || s.year === Number(filterYear);

      return matchesSearch && matchesDept && matchesDay && matchesYear;
    });
  }, [sessions, searchQuery, filterDepartment, filterDay, filterYear]);

  // Statistics
  const stats = useMemo(() => {
    const uniqueFaculty = new Set(sessions.map((s) => s.staffId)).size;
    const uniqueSubjects = new Set(sessions.map((s) => s.subjectCode)).size;
    return {
      totalClasses: sessions.length,
      activeFaculty: uniqueFaculty,
      totalSubjects: uniqueSubjects,
    };
  }, [sessions]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-200 text-sm font-semibold uppercase tracking-wider mb-1">
                <Calendar size={18} />
                <span>Class Timetable & Schedule Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Staff Class Assignments
              </h1>
              <p className="text-blue-100 text-sm sm:text-base mt-1 max-w-2xl">
                Configure weekly recurring class schedules, assign subjects to faculty members, and ensure timetable conflict integrity.
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 bg-white text-blue-800 hover:bg-blue-50 font-bold px-5 py-3 rounded-xl shadow-lg transition-transform active:scale-95"
            >
              <Plus size={20} />
              <span>Assign New Class</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
            <div>
              <p className="text-xs sm:text-sm text-blue-200">Total Classes</p>
              <p className="text-xl sm:text-2xl font-black">{stats.totalClasses}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-blue-200">Active Faculty</p>
              <p className="text-xl sm:text-2xl font-black">{stats.activeFaculty}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-blue-200">Unique Subjects</p>
              <p className="text-xl sm:text-2xl font-black">{stats.totalSubjects}</p>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {success && (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              <span className="font-medium text-sm">{success}</span>
            </div>
            <button onClick={() => setSuccess("")} className="text-green-600 hover:text-green-800">
              <X size={18} />
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-red-600" />
              <span className="font-medium text-sm">{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-red-600 hover:text-red-800">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search subject, faculty, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Department Filter (Only shown if multiple departments exist) */}
            {departments.length > 1 && (
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            {/* Day Filter */}
            <select
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All Days</option>
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>

            {(searchQuery || filterDepartment || filterDay || filterYear) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterDepartment("");
                  setFilterDay("");
                  setFilterYear("");
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-semibold px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Classes Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
              <p className="font-medium text-sm">Loading class sessions...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-base font-bold text-gray-700">No Class Sessions Found</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                {sessions.length === 0
                  ? "No classes have been assigned yet. Click the button below to assign your first class."
                  : "No classes match your current search and filter criteria."}
              </p>
              {sessions.length === 0 && (
                <button
                  onClick={handleOpenCreate}
                  className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-blue-700 transition"
                >
                  <Plus size={16} />
                  <span>Assign Class</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/75">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Cohort (Year / Sem / Sec)
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Day & Time
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Assigned Faculty
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Room
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredSessions.map((session) => {
                    const dayMatch = DAYS_OF_WEEK.find((d) => d.value === session.dayOfWeek);
                    const dayName = dayMatch ? dayMatch.label : `Day ${session.dayOfWeek}`;

                    return (
                      <tr key={session.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                              {session.subjectCode.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">
                                {session.subjectName}
                              </div>
                              <div className="text-xs text-blue-600 font-mono font-medium">
                                {session.subjectCode} • {session.departmentName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            <GraduationCap size={14} className="text-gray-500" />
                            Year {session.year} • Sem {session.semester} • Sec {session.section}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                            <Calendar size={14} className="text-gray-400" />
                            {dayName}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 font-mono">
                            <Clock size={12} className="text-gray-400" />
                            {formatDisplayTime(session.startTime)} – {formatDisplayTime(session.endTime)}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-semibold text-xs">
                              {session.staffName.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-gray-800">
                              {session.staffName}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                          {session.roomLocation ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                              <MapPin size={12} className="text-gray-400" />
                              {session.roomLocation}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Not set</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(session)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Assignment"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeletingSession(session)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Assignment"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CREATE / EDIT MODAL */}
        {(isCreateOpen || editingSession) && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingSession ? "Edit Class Assignment" : "Assign Staff to Class"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editingSession
                      ? "Update session timing, subject, room, or faculty member."
                      : "Create a recurring weekly session and assign it to a teacher."}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingSession(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={editingSession ? handleUpdateSubmit : handleCreateSubmit}>
                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                  {modalError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-sm">
                      <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                      <span>{modalError}</span>
                    </div>
                  )}

                  {/* Department & Staff Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Department *
                      </label>
                      <select
                        name="departmentId"
                        value={formData.departmentId}
                        onChange={handleFormChange}
                        required
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">Select Department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Assigned Faculty *
                      </label>
                      <select
                        name="staffId"
                        value={formData.staffId}
                        onChange={handleFormChange}
                        required
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">Select Faculty Member</option>
                        {availableStaff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.staffName} ({s.position || "Faculty"})
                          </option>
                        ))}
                      </select>
                      {formData.departmentId && availableStaff.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          No faculty found in the selected department.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Subject Code & Subject Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Subject Code *
                      </label>
                      <input
                        type="text"
                        name="subjectCode"
                        value={formData.subjectCode}
                        onChange={handleFormChange}
                        placeholder="e.g. CS301"
                        required
                        maxLength={20}
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Subject Name *
                      </label>
                      <input
                        type="text"
                        name="subjectName"
                        value={formData.subjectName}
                        onChange={handleFormChange}
                        placeholder="e.g. Data Structures & Algorithms"
                        required
                        maxLength={150}
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* Academic Cohort: Year, Semester, Section */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Academic Year *
                      </label>
                      <select
                        name="year"
                        value={formData.year}
                        onChange={handleFormChange}
                        required
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value={1}>Year 1</option>
                        <option value={2}>Year 2</option>
                        <option value={3}>Year 3</option>
                        <option value={4}>Year 4</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Semester *
                      </label>
                      <select
                        name="semester"
                        value={formData.semester}
                        onChange={handleFormChange}
                        required
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        {(SEMESTERS_BY_YEAR[formData.year] || [1, 2]).map((sem) => (
                          <option key={sem} value={sem}>
                            Semester {sem}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Section *
                      </label>
                      <select
                        name="section"
                        value={formData.section}
                        onChange={handleFormChange}
                        required
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                        <option value="C">Section C</option>
                        <option value="D">Section D</option>
                      </select>
                    </div>
                  </div>

                  {/* Schedule: Day of Week, Start Time, End Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Day of Week *
                      </label>
                      <select
                        name="dayOfWeek"
                        value={formData.dayOfWeek}
                        onChange={handleFormChange}
                        required
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Start Time *
                      </label>
                      <input
                        type="time"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleFormChange}
                        required
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        End Time *
                      </label>
                      <input
                        type="time"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleFormChange}
                        required
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* Room Location */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Room / Hall / Lab Location
                    </label>
                    <input
                      type="text"
                      name="roomLocation"
                      value={formData.roomLocation}
                      onChange={handleFormChange}
                      placeholder="e.g. CS-LH-101 or Computer Lab 2"
                      maxLength={100}
                      className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setEditingSession(null);
                    }}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl text-sm shadow transition disabled:opacity-50"
                  >
                    {submitting && (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{editingSession ? "Save Changes" : "Create Assignment"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deletingSession && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-red-600 mb-3">
                <div className="p-3 bg-red-50 rounded-xl">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Delete Class Assignment?</h3>
                  <p className="text-xs text-gray-500">This action cannot be undone.</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl text-xs space-y-1.5 text-gray-600 mb-6">
                <div>
                  <span className="font-semibold text-gray-800">Subject: </span>
                  {deletingSession.subjectCode} – {deletingSession.subjectName}
                </div>
                <div>
                  <span className="font-semibold text-gray-800">Cohort: </span>
                  Year {deletingSession.year}, Sem {deletingSession.semester}, Sec {deletingSession.section}
                </div>
                <div>
                  <span className="font-semibold text-gray-800">Assigned Faculty: </span>
                  {deletingSession.staffName}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingSession(null)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-sm shadow transition disabled:opacity-50"
                >
                  {submitting && (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default HodAssignStaff;
