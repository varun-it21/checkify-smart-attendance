import React, { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import api from "../api/api";
import {
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  User,
  GraduationCap,
  Sparkles,
  LayoutGrid,
  ListOrdered,
  AlertCircle
} from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

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

function StudentViewTimetable() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTabDay, setActiveTabDay] = useState(() => {
    // Current day of week: Sunday = 0, Monday = 1, etc.
    const today = new Date().getDay();
    return today >= 1 && today <= 6 ? today : 1;
  });
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "agenda"

  // Fetch timetable for authenticated student
  useEffect(() => {
    const fetchTimetable = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/student/timetable");
        setSessions(res.data || []);
      } catch (err) {
        console.error("Failed to load student timetable:", err);
        setError(
          err.response?.data?.message ||
          "Failed to load your timetable. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, []);

  // Today's day number for badge highlighting
  const currentDayNum = new Date().getDay();

  // Group classes by day of week
  const sessionsByDay = useMemo(() => {
    const map = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    sessions.forEach((session) => {
      if (map[session.dayOfWeek]) {
        map[session.dayOfWeek].push(session);
      }
    });

    // Sort each day's sessions by start time
    Object.keys(map).forEach((dayKey) => {
      map[dayKey].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return map;
  }, [sessions]);

  // Cohort metadata from first session (if available)
  const cohortInfo = useMemo(() => {
    if (sessions.length === 0) return null;
    const first = sessions[0];
    return {
      department: first.departmentName,
      year: first.year,
      semester: first.semester,
      section: first.section,
    };
  }, [sessions]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Banner Card */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-200 text-xs sm:text-sm font-semibold uppercase tracking-wider mb-1">
                <Calendar size={18} />
                <span>Academic Timetable</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                My Weekly Class Schedule
              </h1>
              <p className="text-blue-100 text-sm mt-1 max-w-xl">
                View your registered courses, daily class hours, assigned faculty, and classroom locations.
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-white/15 p-1 rounded-xl backdrop-blur-xs border border-white/20 self-stretch sm:self-auto justify-center">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === "grid"
                    ? "bg-white text-blue-800 shadow"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <LayoutGrid size={15} />
                <span>Weekly Grid</span>
              </button>
              <button
                onClick={() => setViewMode("agenda")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === "agenda"
                    ? "bg-white text-blue-800 shadow"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <ListOrdered size={15} />
                <span>Day Agenda</span>
              </button>
            </div>
          </div>

          {/* Student Cohort Details */}
          {cohortInfo && (
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mt-6 pt-5 border-t border-white/20 text-xs sm:text-sm">
              <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-lg backdrop-blur-xs font-medium">
                <GraduationCap size={15} className="text-blue-200" />
                {cohortInfo.department}
              </span>
              <span className="bg-white/15 px-3 py-1 rounded-lg backdrop-blur-xs font-medium">
                Year {cohortInfo.year}
              </span>
              <span className="bg-white/15 px-3 py-1 rounded-lg backdrop-blur-xs font-medium">
                Semester {cohortInfo.semester}
              </span>
              <span className="bg-white/15 px-3 py-1 rounded-lg backdrop-blur-xs font-medium">
                Section {cohortInfo.section}
              </span>
              <span className="ml-auto text-xs text-blue-200 font-medium">
                Total Classes: {sessions.length}
              </span>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-sm text-sm">
            <AlertCircle size={18} className="text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-500 shadow-sm border border-gray-100">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
            <p className="font-medium text-sm">Fetching your personalized timetable...</p>
          </div>
        ) : sessions.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl p-12 text-center text-gray-500 shadow-sm border border-gray-100">
            <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">No Scheduled Classes Found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Your department or HOD has not yet published timetable assignments for your cohort.
              Please check back later or contact your department coordinator.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          /* WEEKLY GRID VIEW */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {DAYS_OF_WEEK.map((day) => {
                const daySessions = sessionsByDay[day.value] || [];
                const isToday = currentDayNum === day.value;

                return (
                  <div
                    key={day.value}
                    className={`bg-white rounded-2xl shadow-sm border transition-all overflow-hidden flex flex-col ${
                      isToday
                        ? "border-blue-400 ring-2 ring-blue-100"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    {/* Day Card Header */}
                    <div
                      className={`px-5 py-3.5 flex items-center justify-between border-b ${
                        isToday
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-gray-50/80 text-gray-800 border-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base">{day.label}</span>
                        {isToday && (
                          <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                            <Sparkles size={10} />
                            Today
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isToday
                            ? "bg-white/20 text-white"
                            : "bg-gray-200/80 text-gray-600"
                        }`}
                      >
                        {daySessions.length} {daySessions.length === 1 ? "class" : "classes"}
                      </span>
                    </div>

                    {/* Classes in Day */}
                    <div className="p-4 space-y-3 flex-1">
                      {daySessions.length === 0 ? (
                        <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center text-gray-400 text-xs py-6">
                          <BookOpen size={24} className="text-gray-300 mb-1" />
                          <span>No classes scheduled</span>
                        </div>
                      ) : (
                        daySessions.map((cs) => (
                          <div
                            key={cs.id}
                            className="bg-gray-50/70 hover:bg-blue-50/50 p-3.5 rounded-xl border border-gray-100 transition-colors space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="inline-block text-[11px] font-mono font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md mb-1">
                                  {cs.subjectCode}
                                </span>
                                <h4 className="font-semibold text-gray-900 text-sm leading-snug">
                                  {cs.subjectName}
                                </h4>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 pt-1 border-t border-gray-200/50">
                              <span className="flex items-center gap-1 font-mono font-medium text-gray-700">
                                <Clock size={13} className="text-gray-400" />
                                {formatDisplayTime(cs.startTime)} – {formatDisplayTime(cs.endTime)}
                              </span>

                              {cs.roomLocation && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={13} className="text-gray-400" />
                                  {cs.roomLocation}
                                </span>
                              )}

                              <span className="flex items-center gap-1 text-gray-700 font-medium">
                                <User size={13} className="text-emerald-600" />
                                {cs.staffName}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* DAY-BY-DAY AGENDA VIEW */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Day Selector Tabs */}
            <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/60 p-2 gap-1.5">
              {DAYS_OF_WEEK.map((day) => {
                const count = (sessionsByDay[day.value] || []).length;
                const isSelected = activeTabDay === day.value;
                const isToday = currentDayNum === day.value;

                return (
                  <button
                    key={day.value}
                    onClick={() => setActiveTabDay(day.value)}
                    className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-center text-xs font-bold transition flex flex-col items-center gap-0.5 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{day.label}</span>
                      {isToday && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isSelected ? "bg-white" : "bg-blue-600"
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-normal ${
                        isSelected ? "text-blue-100" : "text-gray-400"
                      }`}
                    >
                      {count} {count === 1 ? "class" : "classes"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Day's Classes */}
            <div className="p-6">
              {(sessionsByDay[activeTabDay] || []).length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">
                  <BookOpen size={36} className="mx-auto text-gray-300 mb-2" />
                  <p className="font-semibold text-gray-600">No classes on this day</p>
                  <p className="text-xs text-gray-400 mt-1">Enjoy your study time or free period!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(sessionsByDay[activeTabDay] || []).map((cs, idx) => (
                    <div
                      key={cs.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-blue-50/40 border border-gray-100 transition gap-4"
                    >
                      <div className="flex items-start sm:items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
                              {cs.subjectCode}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{cs.departmentName}</span>
                          </div>
                          <h4 className="text-base font-bold text-gray-900 mt-0.5">
                            {cs.subjectName}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                            <span className="flex items-center gap-1 font-medium text-gray-800">
                              <User size={13} className="text-emerald-600" />
                              Faculty: {cs.staffName}
                            </span>
                            {cs.roomLocation && (
                              <span className="flex items-center gap-1 text-gray-500">
                                <MapPin size={13} className="text-gray-400" />
                                {cs.roomLocation}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0 bg-white sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-gray-200/60">
                        <div className="text-sm font-bold text-gray-900 flex sm:justify-end items-center gap-1.5 font-mono">
                          <Clock size={14} className="text-blue-600" />
                          {formatDisplayTime(cs.startTime)} – {formatDisplayTime(cs.endTime)}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Section {cs.section} • Year {cs.year}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default StudentViewTimetable;
