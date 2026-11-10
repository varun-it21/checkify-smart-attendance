import React, { useMemo } from "react";
import { ShieldCheck, Mail, User, KeyRound } from "lucide-react";
import Layout from "../components/Layout";

const ROLE_LABELS = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  HOD: "Head of Department",
  STAFF: "Staff",
  STUDENT: "Student",
};

// Read non-sensitive display claims from the session JWT (no verification needed for display).
const readClaims = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return {};
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(payload))));
  } catch {
    return {};
  }
};

const pick = (claims, ...keys) => {
  for (const key of keys) {
    if (claims[key]) return String(claims[key]);
  }
  return "";
};

const Profile = () => {
  const role = (localStorage.getItem("role") || "").toUpperCase();
  const claims = useMemo(() => readClaims(), []);

  const email = pick(
    claims,
    "email",
    "unique_name",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
  );
  const name = pick(claims, "name", "given_name") || email.split("@")[0] || "My Account";
  const roleLabel = ROLE_LABELS[role] || "Unknown role";

  const details = [
    { icon: User, label: "Name", value: name },
    { icon: Mail, label: "Email", value: email || "Not available" },
    { icon: ShieldCheck, label: "Role", value: roleLabel },
  ];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-full bg-gradient-to-br from-indigo-600 to-blue-500 text-white flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-md"
            aria-hidden="true"
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{name}</h1>
            <span className="inline-block mt-1 rounded-md bg-indigo-100 px-2 py-0.5 text-sm font-medium text-indigo-700">
              {roleLabel}
            </span>
          </div>
        </div>

        <section className="bg-white rounded-xl border shadow-sm p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account details</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {details.map((item) => (
              <div key={item.label} className="flex items-start gap-3 min-w-0">
                <item.icon className="w-5 h-5 mt-0.5 text-gray-400 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-sm text-gray-500">{item.label}</dt>
                  <dd className="font-medium text-gray-900 break-words">{item.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        <section className="bg-white rounded-xl border shadow-sm p-5 sm:p-6 flex items-start gap-3">
          <KeyRound className="w-5 h-5 mt-0.5 text-gray-400 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Password</h2>
            <p className="text-sm text-gray-600 mt-1">
              Passwords are managed by an administrator. Contact your institution administrator to reset yours.
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Profile;
