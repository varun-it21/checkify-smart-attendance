export const saveAuthSession = ({ token, role, expiresAt }) => {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role.toUpperCase());
  localStorage.setItem("expiresAt", expiresAt);
};

export const getAuthSession = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const expiresAt = localStorage.getItem("expiresAt");

  if (!token || !role || !expiresAt) {
    return null;
  }

  if (Date.parse(expiresAt) <= Date.now()) {
    clearAuthSession();
    return null;
  }

  return { token, role };
};

export const clearAuthSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("expiresAt");
};

export const getDashboardPath = (role) => {
  const paths = {
    ADMIN: "/admin/dashboard",
    MANAGER: "/manager/dashboard",
    HOD: "/hod/dashboard",
    STAFF: "/staff/dashboard",
    STUDENT: "/student/dashboard",
  };

  return paths[role?.toUpperCase()] || "/";
};

