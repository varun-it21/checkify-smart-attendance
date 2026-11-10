import React, { useState } from "react";
import logins from "../assets/login.png";
import logo from "../assets/logo.png";
import { useNavigate } from "react-router-dom";

import api from "../api/api";
import {
  saveAuthSession,
  getDashboardPath,
} from "../utils/auth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <>
      <style>{`
        .login-btn {
          width: 100%;
          background: white;
          color: #2563eb;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 600;
          transition: 0.3s;
          border: 2px solid #2563eb;
        }
        .login-btn:hover {
          background: #1e3a8a;
          color: white;
        }
        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>

      <div className="flex flex-col md:flex-row h-screen w-full">
        {/* LEFT IMAGE */}
        <div className="md:w-1/2 w-full h-1/2 md:h-full flex items-center justify-center bg-white p-6">
          <img
            src={logins}
            alt="login"
            className="w-3/4 h-auto object-contain rounded-xl"
          />
        </div>

        {/* RIGHT FORM */}
        <div className="md:w-1/2 w-full h-1/2 md:h-full flex items-center justify-center bg-blue-600 p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col justify-center p-6"><br />

            {/* LOGO */}
            <div className="flex justify-center mb-6">
              <img
                src={logo}
                alt="logo"
                className="h-28 w-28 rounded-full shadow-lg"
              />
            </div><br />

            <h2 className="text-lg font-bold text-center mb-1">
              Welcome back to Checkify
            </h2>
            <h3 className="text-sm text-center mb-5">
              Please login to continue
            </h3>

            {/* ERROR MESSAGE */}
            {error && (
              <div className="mb-4 p-3 text-red-700 bg-red-100 border border-red-300 rounded-md text-center text-sm">
                {error}
              </div>
            )}

            {/* FORM */}
            <form className="space-y-4 p-3" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="login-btn flex items-center justify-center gap-2 mt-4"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></span>
                    Please wait...
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
