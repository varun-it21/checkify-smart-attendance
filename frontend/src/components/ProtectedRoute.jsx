import React from "react";
import { Navigate } from "react-router-dom";

import {
  getAuthSession,
  getDashboardPath,
} from "../utils/auth";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const session = getAuthSession();

  // No valid frontend session
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Check permitted roles
  if (
    allowedRoles &&
    !allowedRoles.includes(session.role)
  ) {
    return (
      <Navigate
        to={getDashboardPath(session.role)}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
