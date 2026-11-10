import api from "../api/api";

export const reportService = {
  // 1. Dashboard overall stats
  getDashboardStats: (params = {}) => {
    return api.get("/api/analytics/dashboard", { params });
  },

  // 2. Department & cohort analytics
  getDepartmentAnalytics: (params = {}) => {
    return api.get("/api/analytics/department", { params });
  },

  // 3. Individual student summary
  getStudentSummary: (studentId, params = {}) => {
    return api.get(`/api/analytics/students/${studentId}/summary`, { params });
  },

  // 4. Current student self summary
  getMyStudentSummary: (params = {}) => {
    return api.get("/api/analytics/student/summary", { params });
  },

  // 5. Defaulters report (< 75% threshold)
  getDefaulters: (params = {}) => {
    return api.get("/api/analytics/defaulters", { params });
  },

  // 6. Staff teaching insights
  getStaffInsights: (params = {}) => {
    return api.get("/api/analytics/staff/insights", { params });
  },

  // 7. Daily & weekly attendance trends
  getTrends: (params = {}) => {
    return api.get("/api/analytics/trends", { params });
  },

  // 8. Fetch departments for dropdowns
  getDepartments: async () => {
    try {
      const res = await api.get("/manager/departments");
      return res.data || [];
    } catch {
      return [];
    }
  },

  // 9. Client-side CSV export utility
  exportToCsv: (filename, headers, rows) => {
    if (!rows || rows.length === 0) return;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((field) => {
              const str = String(field ?? "");
              return str.includes(",") || str.includes('"') || str.includes("\n")
                ? `"${str.replace(/"/g, '""')}"`
                : str;
            })
            .join(",")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename.replace(/\.csv$/, "")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

export default reportService;

