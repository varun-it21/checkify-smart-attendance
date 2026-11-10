import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../api/api";
import {
  Settings,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  Sliders,
  Shield,
  BookOpen,
  Building
} from "lucide-react";

export default function AdminSettings() {
  const [settings, setSettings] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/admin/settings");
      const list = res.data || [];
      setSettings(list);

      const map = {};
      list.forEach((s) => {
        map[s.key] = s.value;
      });
      setFormData(map);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load system settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleSaveSetting = async (key) => {
    try {
      setSavingKey(key);
      setError("");
      const val = formData[key] ?? "";
      await api.put("/api/admin/settings", {
        key: key,
        value: val.toString(),
      });
      showSuccess(`Setting '${key}' saved successfully.`);
      fetchSettings();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to update setting '${key}'.`);
    } finally {
      setSavingKey(null);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "GENERAL":
        return <Building className="w-5 h-5 text-blue-600" />;
      case "ACADEMIC":
        return <BookOpen className="w-5 h-5 text-indigo-600" />;
      case "ATTENDANCE":
        return <Sliders className="w-5 h-5 text-emerald-600" />;
      case "SECURITY":
        return <Shield className="w-5 h-5 text-amber-600" />;
      default:
        return <Settings className="w-5 h-5 text-gray-600" />;
    }
  };

  // Group settings by category
  const categories = ["GENERAL", "ACADEMIC", "ATTENDANCE", "SECURITY"];

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-7 h-7 text-blue-600" />
              Institutional System Settings
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure institution-wide parameters, dynamic attendance thresholds, and security timers.
            </p>
          </div>
          <button
            onClick={fetchSettings}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-700 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="hover:text-red-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between text-green-700 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="hover:text-green-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Categories Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading settings...</div>
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => {
              const catSettings = settings.filter((s) => s.category === cat);
              if (catSettings.length === 0) return null;

              return (
                <div key={cat} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="bg-gray-50 px-6 py-3 border-b flex items-center gap-2">
                    {getCategoryIcon(cat)}
                    <h2 className="font-bold text-gray-800 text-sm tracking-wide">
                      {cat} SETTINGS
                    </h2>
                  </div>
                  <div className="p-6 divide-y divide-gray-100">
                    {catSettings.map((s) => (
                      <div
                        key={s.key}
                        className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="md:w-1/2">
                          <label className="font-semibold text-gray-900 text-sm block">
                            {s.key}
                          </label>
                          <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                          {s.updatedAt && (
                            <p className="text-[11px] text-gray-400 mt-1">
                              Last updated: {new Date(s.updatedAt).toLocaleString()}
                              {s.updatedByName && ` by ${s.updatedByName}`}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 md:w-1/2">
                          <input
                            type="text"
                            value={formData[s.key] ?? ""}
                            onChange={(e) =>
                              setFormData({ ...formData, [s.key]: e.target.value })
                            }
                            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveSetting(s.key)}
                            disabled={savingKey === s.key || formData[s.key] === s.value}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                          >
                            <Save className={`w-3.5 h-3.5 ${savingKey === s.key ? "animate-spin" : ""}`} />
                            Save
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

