import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  QrCode,
  CalendarCheck,
  BarChart2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

import logo from "../assets/logo.png";
import logo1 from "../assets/logo1.png";
import api from "../api/api";
import {
  saveAuthSession,
  getDashboardPath,
} from "../utils/auth";

const FEATURES = [
  { icon: QrCode, title: "OTP & QR attendance", text: "Mark attendance in seconds with secure, expiring codes." },
  { icon: CalendarCheck, title: "Leave management", text: "Apply, approve and track leave through a clear approval chain." },
  { icon: BarChart2, title: "Live analytics", text: "Reports, defaulter alerts and trends for every department." },
];

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const login = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const { token, role, expiresAt } = res.data;

      if (!token || !role || !expiresAt) {
        throw new Error("Invalid authentication response");
      }

      const normalizedRole = role.toUpperCase();

      saveAuthSession({
        token,
        role: normalizedRole,
        expiresAt,
      });

      navigate(getDashboardPath(normalizedRole), {
        replace: true,
      });

    } catch (err) {
      if (err.response?.status === 401) {
        setError("Invalid email or password.");
      } else if (err.response) {
        setError("Unable to login. Please try again.");
      } else {
        setError("Cannot connect to the server. Please check whether the API is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (event) => {
    event.preventDefault();
    login();
  };

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-3 text-sm text-gray-900 placeholder-gray-400 " +
    "transition focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100";

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      {/* ===== BRAND PANEL (large screens) ===== */}
      <aside className="relative hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-600 p-12 text-white">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" aria-hidden="true" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-lg">
            <img src={logo1} alt="" className="h-5 w-auto" />
          </span>
          <span className="text-xl font-bold tracking-wide">Checkify</span>
        </div>

        <div className="relative max-w-xl">
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight">
            Smart attendance,
            <br />
            <span className="text-blue-200">simplified.</span>
          </h1>
          <p className="mt-4 text-lg text-blue-100">
            One place for classes, attendance, leave and reports across your institution.
          </p>

          <ul className="mt-8 space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <f.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-blue-100">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-end justify-between gap-6">
          <p className="flex items-center gap-2 text-sm text-blue-100">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Secure sign-in with role-based access
          </p>
        </div>
      </aside>

      {/* ===== FORM PANEL ===== */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          {/* logo shown when the brand panel is hidden */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <img src={logo} alt="Checkify" className="h-20 w-20 rounded-full shadow-lg" />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-1 mb-6 text-sm text-gray-500">
              Sign in to your Checkify account to continue.
            </p>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleLogin} noValidate={false}>
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    className={inputClass}
                    placeholder="you@institution.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className={inputClass + " pr-11"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Trouble signing in? Contact your institution administrator.
          </p>
        </div>
      </main>
    </div>
  );
}

export default Login;
